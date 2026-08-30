"""
ORION - FastAPI Backend Bridge
This API connects the Tauri Desktop UI to the Python AI architecture.
It acts as the frontend-facing Orchestrator.
"""
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import subprocess
import sys
from pathlib import Path

# --- ORION Modules ---
from backend.llm import generate_response
from backend.documents import ingest_document, search_documents, list_documents, delete_document

app = FastAPI(title="ORION AI Backend")

# Allow the Tauri frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PYTHON_EXE = os.path.join(sys.prefix, "Scripts", "python.exe")
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# 1. CORE AI ENDPOINTS (Ears, Brain, Mouth)
# ============================================================

@app.get("/api/listen")
def trigger_listen():
    """Spawns Whisper to listen to the mic. VRAM is safely hot-swapped."""
    result = subprocess.run(
        [PYTHON_EXE, os.path.join(BACKEND_DIR, "listen.py")],
        capture_output=True, text=True, cwd=BACKEND_DIR
    )
    transcript = ""
    for line in result.stdout.strip().split('\n'):
        if line.startswith("TRANSCRIPT:"):
            transcript = line.replace("TRANSCRIPT:", "").strip()
    return {"transcript": transcript}

@app.post("/api/transcribe")
async def trigger_transcribe(file: UploadFile = File(...)):
    """Receives recorded audio from UI and transcribes it."""
    temp_dir = Path("C:/Users/proud/ORION/data/temp")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file = temp_dir / file.filename

    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = subprocess.run(
        [PYTHON_EXE, os.path.join(BACKEND_DIR, "transcribe.py"), str(temp_file)],
        capture_output=True, text=True, cwd=BACKEND_DIR
    )
    transcript = ""
    for line in result.stdout.strip().split('\n'):
        if line.startswith("TRANSCRIPT:"):
            transcript = line.replace("TRANSCRIPT:", "").strip()
            
    # Clean up temp file
    if os.path.exists(temp_file):
        os.remove(temp_file)
        
    return {"transcript": transcript}

class ChatRequest(BaseModel):
    message: str

@app.post("/api/think")
async def trigger_think(request: ChatRequest):
    """
    RAG Pipeline:
    1. Search documents for context
    2. Inject into prompt
    3. Ask LLM
    """
    user_msg = request.message
    
    # 1. Retrieve context from Document Vault
    context_chunks = search_documents(user_msg, top_k=2)
    context_str = "\n\n".join(context_chunks)
    
    # 2. Build the RAG Prompt
    if context_str:
        augmented_prompt = f"Context from the user's documents:\n{context_str}\n\nUser Question: {user_msg}"
    else:
        augmented_prompt = user_msg

    # 3. Generate response (LLM unloads automatically via keep_alive=0 logic if added to llm.py)
    # Wait, llm.py currently doesn't have keep_alive=0. We'll rely on the standard API for now.
    reply = await generate_response(augmented_prompt)
    
    return {"reply": reply}

class SpeakRequest(BaseModel):
    text: str

@app.post("/api/speak")
def trigger_speak(request: SpeakRequest):
    """Spawns Kokoro to speak. VRAM is safely hot-swapped."""
    subprocess.Popen(
        [PYTHON_EXE, os.path.join(BACKEND_DIR, "speak.py"), request.text],
        cwd=BACKEND_DIR
    )
    return {"status": "speaking"}

# ============================================================
# 2. THE LIBRARY (Document Vault Endpoints)
# ============================================================

UPLOAD_DIR = Path("C:/Users/proud/ORION/data/uploads")

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Accepts a file from the UI, saves it, and runs the RAG ingestion pipeline."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / file.filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Run the ingestion pipeline (extract, chunk, embed)
    doc_metadata = ingest_document(str(file_path))
    
    if "error" in doc_metadata:
        raise HTTPException(status_code=500, detail=doc_metadata["error"])
        
    return {"message": "Document ingested successfully", "document": doc_metadata}

@app.get("/api/documents")
def get_documents():
    """Returns the list of all uploaded documents for the UI Vault."""
    return {"documents": list_documents()}

@app.delete("/api/documents/{doc_id}")
def remove_document(doc_id: str):
    """Deletes a document from the index."""
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

