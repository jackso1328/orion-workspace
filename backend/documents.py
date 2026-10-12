"""
ORION - The Library (Document Intelligence)
Handles document upload, parsing, chunking, and vector storage.

Supported formats:
  - .pdf  (via PyMuPDF)
  - .docx (via python-docx)
  - .txt / .md (direct read)
  - .png / .jpg / .jpeg (via Tesseract OCR / PIL)

Documents are chunked into ~500-word overlapping segments and embedded using
in-process FastEmbed (BAAI/bge-small-en-v1.5, 384 dims) running entirely on CPU
in ~60 MB RAM with zero external processes (no Ollama required), stored in Qdrant.
"""
import os
import uuid
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# --- Document Parsing Libraries ---
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz  # PyMuPDF fallback
    except ImportError:
        fitz = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None

# --- In-Process Embeddings & Vector Storage ---
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

logger = logging.getLogger("orion.documents")

# ============================================================
# CONFIGURATION
# ============================================================

UPLOAD_DIR = Path("C:/Users/proud/ORION/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DOC_INDEX_PATH = Path("C:/Users/proud/ORION/data/doc_index.json")
QDRANT_PATH = Path("C:/Users/proud/ORION/data/qdrant")
QDRANT_PATH.mkdir(parents=True, exist_ok=True)

COLLECTION_NAME = "orion_documents"
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
VECTOR_DIMENSION = 384

# Lazy singletons
_embedding_model: Optional[TextEmbedding] = None
_qdrant_client: Optional[QdrantClient] = None


def get_embedding_model() -> TextEmbedding:
    """Lazy-load the FastEmbed embedding model."""
    global _embedding_model
    if _embedding_model is None:
        logger.info("Initializing in-process FastEmbed model (%s)...", EMBEDDING_MODEL_NAME)
        _embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
    return _embedding_model


def get_qdrant_client() -> QdrantClient:
    """Lazy-load the local persistent Qdrant client."""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(path=str(QDRANT_PATH))
        # Ensure collection exists and verify vector dimensions
        collections = [c.name for c in _qdrant_client.get_collections().collections]
        if COLLECTION_NAME in collections:
            try:
                coll_info = _qdrant_client.get_collection(collection_name=COLLECTION_NAME)
                existing_dim = coll_info.config.params.vectors.size
                if existing_dim != VECTOR_DIMENSION:
                    logger.info("Upgrading collection '%s' from %d to %d dimensions for FastEmbed...", COLLECTION_NAME, existing_dim, VECTOR_DIMENSION)
                    _qdrant_client.delete_collection(collection_name=COLLECTION_NAME)
                    _qdrant_client.create_collection(
                        collection_name=COLLECTION_NAME,
                        vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
                    )
            except Exception as e:
                logger.warning("Could not verify collection dimensions: %s", e)
        else:
            logger.info("Creating Qdrant collection '%s' (dim=%d, cosine)...", COLLECTION_NAME, VECTOR_DIMENSION)
            _qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )
    return _qdrant_client


def close_qdrant_client() -> None:
    """Gracefully close the local Qdrant client before interpreter shutdown."""
    global _qdrant_client
    if _qdrant_client is not None:
        try:
            _qdrant_client.close()
        except Exception:
            pass
        _qdrant_client = None


import atexit
atexit.register(close_qdrant_client)


# ============================================================
# DOCUMENT INDEX (JSON Tracker)
# ============================================================

def load_doc_index() -> dict:
    """Load the document index from disk."""
    if DOC_INDEX_PATH.exists():
        try:
            with open(DOC_INDEX_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading doc index: %s", e)
    return {"documents": []}


def save_doc_index(index: dict) -> None:
    """Save the document index to disk."""
    DOC_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DOC_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)


# ============================================================
# TEXT EXTRACTION (The Parser)
# ============================================================

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    if not fitz:
        return "[Error: PyMuPDF (fitz) is not installed]"
    doc = fitz.open(file_path)
    text = ""
    for page_num, page in enumerate(doc):
        page_text = page.get_text()
        if page_text.strip():
            text += f"\n--- Page {page_num + 1} ---\n{page_text}"
    doc.close()
    return text.strip()


def extract_text_from_docx(file_path: str) -> str:
    """Extract all text from a Word document."""
    if not DocxDocument:
        return "[Error: python-docx is not installed]"
    doc = DocxDocument(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_txt(file_path: str) -> str:
    """Read plain text or markdown files directly."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_text_from_image(file_path: str) -> str:
    """Extract text from images using Tesseract OCR."""
    if not Image or not pytesseract:
        return "[Error: Pillow and pytesseract are required for image OCR]"
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image)
    return text.strip()


def extract_text(file_path: str) -> str:
    """Determine file type by extension and extract its text content."""
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext in [".txt", ".md", ".csv", ".json", ".py", ".ts", ".tsx", ".js"]:
        return extract_text_from_txt(file_path)
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
        return extract_text_from_image(file_path)
    else:
        return f"[Unsupported file type: {ext}]"


# ============================================================
# TEXT CHUNKING (The Splitter)
# ============================================================

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks based on word count.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)

        if end >= len(words):
            break
        start += chunk_size - overlap

    return chunks


# ============================================================
# DOCUMENT INGESTION (FastEmbed Pipeline)
# ============================================================

def ingest_document(file_path: str, user_id: str = "karna") -> dict:
    """
    The full document ingestion pipeline:
    1. Extract text from the file
    2. Chunk the text into overlapping segments
    3. Generate embeddings with FastEmbed on CPU
    4. Store chunks and vectors in Qdrant
    5. Track the document in doc_index.json
    """
    file_path = str(file_path)
    filename = Path(file_path).name
    doc_id = str(uuid.uuid4())

    logger.info("Processing document: %s", filename)

    # 1. Extract text
    raw_text = extract_text(file_path)
    if not raw_text or raw_text.startswith("["):
        logger.error("Failed to extract text: %s", raw_text)
        return {"error": raw_text}

    word_count = len(raw_text.split())

    # 2. Chunk text
    chunks = chunk_text(raw_text)
    if not chunks:
        return {"error": "Document contains no readable text"}

    # 3. Generate FastEmbed embeddings
    embed_model = get_embedding_model()
    tagged_chunks = [f"[Document: {filename}] {chunk}" for chunk in chunks]
    embeddings = list(embed_model.embed(tagged_chunks))

    # 4. Upsert into Qdrant
    client = get_qdrant_client()
    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=vector.tolist(),
                payload={
                    "doc_id": doc_id,
                    "chunk_index": i,
                    "filename": filename,
                    "user_id": user_id,
                    "text": chunk,
                    "tagged_text": tagged_chunks[i],
                },
            )
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)

    # 5. Record in document index
    doc_entry = {
        "id": doc_id,
        "filename": filename,
        "file_path": file_path,
        "word_count": word_count,
        "chunk_count": len(chunks),
        "uploaded_at": datetime.now().isoformat(),
        "user_id": user_id,
    }

    index = load_doc_index()
    index["documents"].append(doc_entry)
    save_doc_index(index)

    logger.info(
        "Successfully ingested '%s': %d words, %d chunks, ID=%s",
        filename, word_count, len(chunks), doc_id[:8]
    )
    return doc_entry


# ============================================================
# DOCUMENT SEARCH (The FastEmbed Retriever)
# ============================================================

def search_documents(query: str, user_id: str = "karna", top_k: int = 3) -> List[str]:
    """
    Search the document vector database for chunks relevant to the query
    using FastEmbed embeddings and local Qdrant cosine similarity.
    """
    if not query.strip():
        return []

    try:
        client = get_qdrant_client()
        embed_model = get_embedding_model()

        # Compute query vector
        query_vector = list(embed_model.embed([query]))[0].tolist()

        # Check if collection is empty
        try:
            count = client.count(collection_name=COLLECTION_NAME).count
            if count == 0:
                return []
        except Exception:
            return []

        search_filter = Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id))
            ]
        )

        try:
            res = client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                query_filter=search_filter,
                limit=top_k,
            )
            points = res.points
        except Exception:
            res = client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                limit=top_k,
            )
            points = res.points

        chunks = []
        for pt in points:
            if pt.payload and "tagged_text" in pt.payload:
                chunks.append(pt.payload["tagged_text"])
            elif pt.payload and "text" in pt.payload:
                chunks.append(pt.payload["text"])

        return chunks
    except Exception as e:
        logger.error("Error in search_documents: %s", e)
        return []


def list_documents() -> List[dict]:
    """List all uploaded documents."""
    index = load_doc_index()
    return index["documents"]


def delete_document(doc_id: str) -> bool:
    """Remove a document from index and delete its vectors from Qdrant."""
    index = load_doc_index()
    original_count = len(index["documents"])
    index["documents"] = [d for d in index["documents"] if d["id"] != doc_id]

    if len(index["documents"]) < original_count:
        save_doc_index(index)

        # Cleanup points in Qdrant
        try:
            client = get_qdrant_client()
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
                    ]
                ),
            )
        except Exception as e:
            logger.warning("Error deleting vectors for doc %s from Qdrant: %s", doc_id, e)

        logger.info("Document %s removed from index and Qdrant.", doc_id[:8])
        return True
    return False


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)
    docs = list_documents()
    print(f"Uploaded documents: {len(docs)}")
    for d in docs:
        print(f"  - {d['filename']} ({d['chunk_count']} chunks)")
