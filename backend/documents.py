"""
ORION - The Library (Document Intelligence)
Handles document upload, parsing, chunking, and vector storage.

Supported formats:
  - .pdf  (via PyMuPDF)
  - .docx (via python-docx)
  - .txt / .md (direct read)
  - .png / .jpg / .jpeg (via Tesseract OCR)

Documents are chunked into ~500-word overlapping segments, embedded using
nomic-embed-text via Ollama, and stored in a dedicated Qdrant collection
so ORION can reference them during conversations (RAG).
"""
import os
import uuid
import json
from datetime import datetime
from pathlib import Path

# --- Document Parsing Libraries ---
import fitz  # PyMuPDF
from docx import Document as DocxDocument

# --- Vector Storage ---
from mem0 import Memory

# ============================================================
# CONFIGURATION
# ============================================================

# Where uploaded files are physically stored
UPLOAD_DIR = Path("C:/Users/proud/ORION/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Document metadata index (tracks what has been uploaded)
DOC_INDEX_PATH = Path("C:/Users/proud/ORION/data/doc_index.json")

# Mem0 config for document vectors (separate collection from chat memory)
DOC_MEMORY_CONFIG = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "orion-brain",
            "temperature": 0,
            "max_tokens": 1500,
        }
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "nomic-embed-text",
            "embedding_dims": 768
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "orion_documents",
            "embedding_model_dims": 768,
            "path": "C:/Users/proud/ORION/data/qdrant"
        }
    }
}

# ============================================================
# DOCUMENT INDEX (Simple JSON tracker)
# ============================================================

def load_doc_index():
    """Load the document index from disk."""
    if DOC_INDEX_PATH.exists():
        with open(DOC_INDEX_PATH, "r") as f:
            return json.load(f)
    return {"documents": []}

def save_doc_index(index):
    """Save the document index to disk."""
    DOC_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DOC_INDEX_PATH, "w") as f:
        json.dump(index, f, indent=2)

# ============================================================
# TEXT EXTRACTION (The Parser)
# ============================================================

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
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
    doc = DocxDocument(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)

def extract_text_from_txt(file_path: str) -> str:
    """Read plain text or markdown files directly."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def extract_text_from_image(file_path: str) -> str:
    """Extract text from images using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        # Set Tesseract path for Windows (default winget install location)
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        return f"[OCR Error: {str(e)}. Install Tesseract with: winget install UB-Mannheim.TesseractOCR]"

def extract_text(file_path: str) -> str:
    """
    Master extraction function. Routes to the correct parser based on file extension.
    """
    ext = Path(file_path).suffix.lower()

    extractors = {
        ".pdf": extract_text_from_pdf,
        ".docx": extract_text_from_docx,
        ".txt": extract_text_from_txt,
        ".md": extract_text_from_txt,
        ".png": extract_text_from_image,
        ".jpg": extract_text_from_image,
        ".jpeg": extract_text_from_image,
    }

    extractor = extractors.get(ext)
    if extractor is None:
        return f"[Unsupported file format: {ext}]"

    return extractor(file_path)

# ============================================================
# TEXT CHUNKING (The Splitter)
# ============================================================

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split text into overlapping chunks of approximately `chunk_size` words.
    Overlap ensures no context is lost at chunk boundaries.

    Why overlapping chunks?
    If a sentence sits exactly at the boundary between two chunks,
    without overlap, it would be split in half and lose its meaning.
    The overlap copies the last 50 words of each chunk into the beginning
    of the next one, so every sentence appears fully in at least one chunk.
    """
    words = text.split()

    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)

        # Move forward by (chunk_size - overlap) so the next chunk overlaps
        start += chunk_size - overlap

    return chunks

# ============================================================
# DOCUMENT INGESTION (The Full Pipeline)
# ============================================================

def ingest_document(file_path: str, user_id: str = "karna") -> dict:
    """
    The full document ingestion pipeline:
    1. Extract text from the file
    2. Chunk the text into overlapping segments
    3. Store each chunk as a memory in the vector database
    4. Track the document in our index

    Returns a summary dict with document metadata.
    """
    file_path = str(file_path)
    filename = Path(file_path).name
    doc_id = str(uuid.uuid4())

    print(f"\n📄 Processing: {filename}")

    # Step 1: Extract text
    print("  → Extracting text...")
    raw_text = extract_text(file_path)
    if not raw_text or raw_text.startswith("["):
        print(f"  ❌ Failed to extract text: {raw_text}")
        return {"error": raw_text}

    word_count = len(raw_text.split())
    print(f"  → Extracted {word_count} words")

    # Step 2: Chunk the text
    print("  → Chunking text...")
    chunks = chunk_text(raw_text)
    print(f"  → Created {len(chunks)} chunks")

    # Step 3: Store each chunk in the vector database
    print("  → Embedding and storing in vector database...")
    mem = Memory.from_config(DOC_MEMORY_CONFIG)

    for i, chunk in enumerate(chunks):
        # Prefix each chunk with the document name so ORION knows the source
        tagged_chunk = f"[Document: {filename}] {chunk}"
        mem.add(
            tagged_chunk,
            user_id=user_id,
            metadata={"doc_id": doc_id, "chunk_index": i, "filename": filename}
        )
        print(f"    ✅ Chunk {i + 1}/{len(chunks)} stored")

    # Step 4: Update the document index
    doc_entry = {
        "id": doc_id,
        "filename": filename,
        "file_path": file_path,
        "word_count": word_count,
        "chunk_count": len(chunks),
        "uploaded_at": datetime.now().isoformat(),
        "user_id": user_id
    }

    index = load_doc_index()
    index["documents"].append(doc_entry)
    save_doc_index(index)

    print(f"\n✅ Successfully ingested '{filename}'")
    print(f"   Words: {word_count} | Chunks: {len(chunks)} | ID: {doc_id[:8]}...")

    return doc_entry

# ============================================================
# DOCUMENT SEARCH (The Retriever)
# ============================================================

def search_documents(query: str, user_id: str = "karna", top_k: int = 3) -> list[str]:
    """
    Search the document vector database for chunks relevant to the query.
    Returns the top_k most relevant text chunks.
    """
    mem = Memory.from_config(DOC_MEMORY_CONFIG)
    results = mem.search(query, filters={"user_id": user_id})

    # Extract just the memory text from the results
    chunks = []
    if results and "results" in results:
        for result in results["results"][:top_k]:
            chunks.append(result["memory"])

    return chunks

def list_documents() -> list[dict]:
    """List all uploaded documents."""
    index = load_doc_index()
    return index["documents"]

def delete_document(doc_id: str) -> bool:
    """Remove a document from the index. (Vector cleanup is a future enhancement.)"""
    index = load_doc_index()
    original_count = len(index["documents"])
    index["documents"] = [d for d in index["documents"] if d["id"] != doc_id]

    if len(index["documents"]) < original_count:
        save_doc_index(index)
        print(f"🗑️ Document {doc_id[:8]}... removed from index.")
        return True
    return False

# ============================================================
# TEST (Run this file directly to test the pipeline)
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # Ingest a document passed as argument
        file_to_ingest = sys.argv[1]
        result = ingest_document(file_to_ingest)
        print("\n--- Ingestion Result ---")
        print(json.dumps(result, indent=2, default=str))

        # Test searching it
        print("\n--- Testing Search ---")
        query = input("Ask a question about the document: ")
        results = search_documents(query)
        for i, chunk in enumerate(results):
            print(f"\n📎 Result {i + 1}:")
            print(chunk[:200] + "..." if len(chunk) > 200 else chunk)
    else:
        print("Usage: python documents.py <path_to_file>")
        print("Supported: .pdf, .docx, .txt, .md, .png, .jpg")
        print("\nCurrently uploaded documents:")
        docs = list_documents()
        if docs:
            for doc in docs:
                print(f"  📄 {doc['filename']} ({doc['word_count']} words, {doc['chunk_count']} chunks)")
        else:
            print("  (No documents uploaded yet)")
