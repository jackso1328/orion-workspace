"""
ORION - FastAPI Backend Bridge
This API connects the Tauri Desktop UI to the Python AI architecture.
It acts as the frontend-facing Orchestrator and Agentic Gateway.
"""
import os
import sys
import shutil
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("orion.backend")

# --- ORION Modules (with flexible import fallback) ---
try:
    from backend.llm import (
        generate_response, get_cloud_credentials, get_active_engine_info,
        get_memory_status, hibernate_local_model, set_memory_mode,
        get_selected_provider, set_selected_provider
    )
    from backend.model_manager import model_manager
    from backend.hardware_detector import detect_hardware
    from backend.documents import ingest_document, search_documents, list_documents, delete_document
    from backend.agent.react_loop import run_agent_loop
except ImportError:
    from llm import (
        generate_response, get_cloud_credentials, get_active_engine_info,
        get_memory_status, hibernate_local_model, set_memory_mode,
        get_selected_provider, set_selected_provider
    )
    from model_manager import model_manager
    from hardware_detector import detect_hardware
    from documents import ingest_document, search_documents, list_documents, delete_document
    try:
        from agent.react_loop import run_agent_loop
    except ImportError:
        from react_loop import run_agent_loop

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


def get_full_ai_status() -> dict:
    """Build the comprehensive AI status payload for REST and WebSocket."""
    base_status = model_manager.get_status()
    selected_prov = get_selected_provider()
    cloud_prov, _ = get_cloud_credentials(selected_prov)

    base_status["selected_provider"] = selected_prov
    base_status["selectedProvider"] = selected_prov

    if cloud_prov:
        base_status["engine"] = "cloud"
        base_status["cloud_provider"] = cloud_prov
        base_status["cloudProvider"] = cloud_prov
    else:
        base_status["engine"] = "local" if model_manager.model_exists else "none"
        base_status["cloud_provider"] = None
        base_status["cloudProvider"] = None

    base_status["memory"] = get_memory_status()
    return base_status


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
    for line in result.stdout.strip().split("\n"):
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
    for line in result.stdout.strip().split("\n"):
        if line.startswith("TRANSCRIPT:"):
            transcript = line.replace("TRANSCRIPT:", "").strip()

    # Clean up temp file
    if os.path.exists(temp_file):
        os.remove(temp_file)

    return {"transcript": transcript}


class ChatRequest(BaseModel):
    message: str
    state_snapshot: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None
    provider: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


@app.post("/api/think")
async def trigger_think(request: ChatRequest):
    """
    Agentic ReAct Pipeline:
    Executes multi-step reasoning, runs data tools (live web search, document search)
    as autonomous steps, and returns the synthesis with actions.
    """
    try:
        result = await run_agent_loop(
            user_message=request.message,
            conversation_history=request.conversation_history,
            state_snapshot=request.state_snapshot
        )
        engine_info = get_active_engine_info()
        return {
            "reply": result.reply,
            "actions": result.actions,
            "steps": result.steps,
            "model": getattr(result, "engine", None) or engine_info.get("model", "orion-brain")
        }
    except Exception as e:
        logger.warning("ReAct Agent Loop encountered error, falling back to direct LLM: %s", e)
        # Resilient fallback to direct LLM generation
        reply = await generate_response(
            user_message=request.message,
            api_key=request.api_key,
            provider=request.provider,
        )
        engine_info = get_active_engine_info()
        return {
            "reply": reply,
            "actions": [],
            "steps": [],
            "model": engine_info.get("model", "orion-fallback")
        }


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
# 2. AI RUNTIME & MODEL DOWNLOAD MANAGER ENDPOINTS
# ============================================================

@app.get("/api/ai/status")
def get_ai_status():
    """Returns runtime engine status, model presence, download state, and hardware profile."""
    return get_full_ai_status()


class ProviderRequest(BaseModel):
    provider: str


@app.get("/api/ai/provider")
def get_ai_provider():
    """Returns the currently active cloud provider preference."""
    return {"provider": get_selected_provider()}


@app.post("/api/ai/provider")
def update_ai_provider(request: ProviderRequest):
    """Sets the active cloud provider preference."""
    updated = set_selected_provider(request.provider)
    return {"status": "ok", "provider": updated}


@app.post("/api/ai/download/start")
def start_ai_download():
    """Starts resumable background download of the local GGUF model."""
    return model_manager.start_download()


@app.post("/api/ai/download/pause")
def pause_ai_download():
    """Pauses download while preserving partial .part bytes on disk."""
    return model_manager.pause_download()


@app.post("/api/ai/download/resume")
def resume_ai_download():
    """Resumes download from saved byte offset."""
    return model_manager.resume_download()


@app.post("/api/ai/download/cancel")
def cancel_ai_download():
    """Cancels download and purges partial .part file."""
    return model_manager.cancel_download()


@app.post("/api/ai/model/delete")
def delete_ai_model():
    """Deletes local GGUF model and frees disk space."""
    hibernate_local_model()
    return model_manager.delete_model()


class MemoryModeRequest(BaseModel):
    mode: str


@app.post("/api/ai/memory/hibernate")
def trigger_hibernate():
    """Forces immediate unload of local model from RAM and runs garbage collection."""
    return hibernate_local_model()


@app.post("/api/ai/memory/mode")
def update_memory_mode(request: MemoryModeRequest):
    """Sets memory lifecycle mode: 'eco' (auto-unload after 5m idle) or 'always_on'."""
    return set_memory_mode(request.mode)


@app.websocket("/ws/ai-status")
async def websocket_ai_status(websocket: WebSocket):
    """
    Real-time WebSocket streaming download progress (10Hz) and engine state changes.
    Emits both { type: "DOWNLOAD_PROGRESS", progress: ... } and direct status fields
    for full compatibility with ModelDownloadModal and useOrionStore.
    """
    await websocket.accept()
    try:
        while True:
            status_payload = get_full_ai_status()
            download_state = status_payload.get("download_state", {})
            payload = {
                "type": "DOWNLOAD_PROGRESS",
                "progress": download_state,
                **status_payload,
            }
            await websocket.send_json(payload)
            is_downloading = model_manager.progress.status == "downloading"
            await asyncio.sleep(0.1 if is_downloading else 1.0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug("WebSocket disconnected: %s", e)


@app.websocket("/ws/agent")
async def websocket_agent_channel(websocket: WebSocket):
    """
    Bidirectional Agentic WebSocket channel.
    Connects CommandCenter to the ReAct agent loop for streaming thoughts,
    live tool status, STORE_ACTION events, and final responses.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "USER_INPUT")
            if msg_type != "USER_INPUT":
                continue

            user_message = data.get("message", "")
            state_snapshot = data.get("state_snapshot")
            conversation_history = data.get("conversation_history")
            request_id = data.get("requestId", "req_" + str(int(asyncio.get_event_loop().time() * 1000)))

            async def send_agent_event(event_type: str, payload: Any):
                try:
                    await websocket.send_json({
                        "type": "AGENT_EVENT",
                        "eventType": event_type,
                        "data": payload,
                        "requestId": request_id
                    })
                except Exception as send_err:
                    logger.debug("Failed sending agent WS event: %s", send_err)

            # Run ReAct loop with real-time event streaming
            result = await run_agent_loop(
                user_message=user_message,
                conversation_history=conversation_history,
                state_snapshot=state_snapshot,
                on_event=send_agent_event
            )

            # Emit all queued STORE_ACTION events
            for act in result.actions:
                await websocket.send_json({
                    "type": "STORE_ACTION",
                    "action": act.get("action"),
                    "payload": act.get("payload"),
                    "requestId": request_id
                })

            # Emit final agent response
            await websocket.send_json({
                "type": "AGENT_RESPONSE",
                "reply": result.reply,
                "actions": result.actions,
                "steps": result.steps,
                "requestId": request_id
            })

    except WebSocketDisconnect:
        logger.debug("Agent WebSocket client disconnected")
    except Exception as e:
        logger.error("Error in agent WebSocket: %s", e)


# ============================================================
# 3. THE LIBRARY (Document Vault Endpoints)
# ============================================================

UPLOAD_DIR = Path("C:/Users/proud/ORION/data/uploads")


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Accepts a file from the UI, saves it, and runs the FastEmbed RAG ingestion pipeline."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run the ingestion pipeline (extract, chunk, embed via FastEmbed)
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
    """Deletes a document from the index and Qdrant."""
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
