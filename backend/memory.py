"""
ORION - Conversational Memory System (Long-Term Hippocampus)
Uses in-process FastEmbed ONNX embeddings and persistent Qdrant collection 'orion_memory'.
Enables ORION to remember user habits, academic goals, preferences, and deadlines across sessions.
"""
import os
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

logger = logging.getLogger("orion.memory")

# Configuration
MEMORY_COLLECTION_NAME = "orion_memory"
MEMORY_INDEX_PATH = Path("C:/Users/proud/ORION/data/memory_index.json")
MEMORY_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
VECTOR_DIMENSION = 384


def _get_dependencies():
    """Lazily import shared embedding model and Qdrant client to share SQLite locks."""
    try:
        from backend.documents import get_embedding_model, get_qdrant_client
    except ImportError:
        try:
            from documents import get_embedding_model, get_qdrant_client
        except ImportError:
            raise ImportError("Could not import get_embedding_model/get_qdrant_client from documents")
    return get_embedding_model, get_qdrant_client


def init_memory_collection() -> QdrantClient:
    """Ensure the 'orion_memory' collection exists with correct vector dimensions."""
    _, get_qdrant = _get_dependencies()
    client = get_qdrant()
    
    try:
        collections = [c.name for c in client.get_collections().collections]
        if MEMORY_COLLECTION_NAME in collections:
            coll_info = client.get_collection(collection_name=MEMORY_COLLECTION_NAME)
            existing_dim = coll_info.config.params.vectors.size
            if existing_dim != VECTOR_DIMENSION:
                logger.info("Migrating '%s' collection to %d dimensions...", MEMORY_COLLECTION_NAME, VECTOR_DIMENSION)
                client.delete_collection(collection_name=MEMORY_COLLECTION_NAME)
                client.create_collection(
                    collection_name=MEMORY_COLLECTION_NAME,
                    vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
                )
        else:
            logger.info("Creating Qdrant collection '%s' (dim=%d, cosine)...", MEMORY_COLLECTION_NAME, VECTOR_DIMENSION)
            client.create_collection(
                collection_name=MEMORY_COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )
    except Exception as e:
        logger.warning("Memory collection initialization check: %s", e)

    return client


def load_memory_index() -> Dict[str, Any]:
    """Loads the JSON memory catalog from disk."""
    if MEMORY_INDEX_PATH.exists():
        try:
            with open(MEMORY_INDEX_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading memory index: %s", e)
    return {"memories": []}


def save_memory_index(data: Dict[str, Any]) -> None:
    """Saves the JSON memory catalog to disk."""
    try:
        with open(MEMORY_INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error("Error saving memory index: %s", e)


def save_memory(
    fact: str,
    category: str = "general",
    user_id: str = "sriram"
) -> str:
    """
    Saves a discrete personal fact or preference into long-term memory.
    
    Args:
        fact: The statement to remember (e.g. 'Prefers studying Calculus in the morning').
        category: Category label ('preference', 'academic', 'schedule', 'personal').
        user_id: User identifier (default: 'sriram').
        
    Returns:
        UUID string of the saved memory point.
    """
    clean_fact = fact.strip()
    if not clean_fact:
        return ""

    get_embed_model, _ = _get_dependencies()
    embed_model = get_embed_model()
    client = init_memory_collection()

    memory_id = str(uuid.uuid4())
    now_iso = datetime.now().isoformat()

    # Generate 384-dim FastEmbed vector
    embedding = list(embed_model.embed([clean_fact]))[0].tolist()

    payload = {
        "memory_id": memory_id,
        "fact": clean_fact,
        "category": category,
        "user_id": user_id,
        "created_at": now_iso
    }

    # Store point in Qdrant
    point = PointStruct(
        id=memory_id,
        vector=embedding,
        payload=payload
    )
    client.upsert(
        collection_name=MEMORY_COLLECTION_NAME,
        points=[point]
    )

    # Update JSON index
    index_data = load_memory_index()
    index_data["memories"].append(payload)
    save_memory_index(index_data)

    logger.info("Saved memory [%s]: %s", category, clean_fact)
    return memory_id


def search_memory(
    query: str,
    top_k: int = 3,
    user_id: str = "sriram"
) -> List[str]:
    """
    Retrieves the most semantically relevant memories for a prompt or query.
    
    Args:
        query: Search keywords or conversation turn.
        top_k: Max memories to retrieve (default: 3).
        user_id: User identifier.
        
    Returns:
        List of relevant memory fact strings.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    get_embed_model, _ = _get_dependencies()
    embed_model = get_embed_model()
    client = init_memory_collection()

    try:
        query_vector = list(embed_model.embed([clean_query]))[0].tolist()

        search_filter = Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id)
                )
            ]
        )

        response = client.query_points(
            collection_name=MEMORY_COLLECTION_NAME,
            query=query_vector,
            query_filter=search_filter,
            limit=top_k,
            with_payload=True
        )

        facts = []
        for point in response.points:
            # Only include results with sufficient similarity (cosine score > 0.40)
            if point.score is not None and point.score < 0.40:
                continue
            payload = point.payload or {}
            fact = payload.get("fact")
            if fact and fact not in facts:
                facts.append(fact)

        return facts

    except Exception as e:
        logger.error("Error searching memories: %s", e)
        return []


def list_memories(user_id: str = "sriram") -> List[Dict[str, Any]]:
    """Returns all memories stored for the specified user."""
    index_data = load_memory_index()
    return [m for m in index_data.get("memories", []) if m.get("user_id") == user_id]


def delete_memory(memory_id: str) -> bool:
    """Deletes a memory by ID from both Qdrant and the JSON index."""
    try:
        _, get_qdrant = _get_dependencies()
        client = get_qdrant()
        
        # Delete from Qdrant
        client.delete(
            collection_name=MEMORY_COLLECTION_NAME,
            points_selector=[memory_id]
        )

        # Delete from JSON index
        index_data = load_memory_index()
        orig_count = len(index_data.get("memories", []))
        index_data["memories"] = [m for m in index_data.get("memories", []) if m.get("memory_id") != memory_id]
        save_memory_index(index_data)

        return len(index_data["memories"]) < orig_count
    except Exception as e:
        logger.error("Error deleting memory %s: %s", memory_id, e)
        return False


def auto_detect_and_save_facts(user_text: str) -> List[str]:
    """
    Detects explicit memory phrases in user statements (e.g. 'remember that I have...',
    'keep in mind that my exam is on...', 'I prefer studying...') and persists them automatically.
    """
    import re
    saved_facts = []
    
    triggers = [
        r"(?:please\s+)?remember\s+(?:that\s+)?(.+)",
        r"(?:keep\s+in\s+mind\s+(?:that\s+)?)(.+)",
        r"(?:note\s+down\s+(?:that\s+)?)(.+)",
        r"(?:don't\s+forget\s+(?:that\s+)?)(.+)"
    ]

    for pattern in triggers:
        match = re.search(pattern, user_text, re.IGNORECASE)
        if match:
            fact_candidate = match.group(1).strip().rstrip(".,!?")
            if len(fact_candidate) > 5:
                mem_id = save_memory(fact_candidate, category="preference")
                if mem_id:
                    saved_facts.append(fact_candidate)

    return saved_facts


if __name__ == "__main__":
    print("Testing ORION Memory System...")
    m_id = save_memory("Sriram prefers 50-minute focused study sessions with 10-minute breaks.", category="preference")
    print(f"Saved memory ID: {m_id}")
    
    results = search_memory("How long should study sessions be?")
    print("Search results for study session length:")
    for r in results:
        print(f" - {r}")
