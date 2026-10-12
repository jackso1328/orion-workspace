# ORION Brain: The Definitive Architecture Blueprint

> This document is the single source of truth for how ORION's local AI system should be built. It replaces all previous analysis documents.

---

## Part 1: The Honest Hardware Audit

Before designing anything, we must face the hardware reality without illusions.

### Your Machine

| Component | Spec | What It Means for AI |
|---|---|---|
| **CPU** | AMD Ryzen 7 4800H (8C/16T, Zen 2) | Strong. 15–30 tok/s on a 3B Q4 model via `llama.cpp`. |
| **RAM** | 16 GB DDR4 | Good. Can hold the LLM, Whisper, and Kokoro in RAM simultaneously (~5–6 GB total). |
| **dGPU** | NVIDIA RTX 3050 Laptop (4 GB VRAM) | **Disabled for battery**. When enabled: can run one quantized model at a time. |
| **iGPU** | AMD Radeon Vega 7 (512 MB shared) | **Useless for AI inference**. Cannot load any model. |

### The Core Constraint

You have **two distinct operating modes**, and the architecture MUST handle both gracefully:

| Mode | GPU State | AI Strategy |
|---|---|---|
| **Battery Mode** (dGPU off) | CPU + 16 GB RAM only | All inference on CPU. Use small, quantized models. |
| **Performance Mode** (dGPU on) | RTX 3050 + 4 GB VRAM | VRAM hot-swap. One model in VRAM at a time. |

**The architecture must detect which mode is active at startup and adapt automatically.** This is the single most important design decision.

---

## Part 2: The Current State of ORION (What Exists Today)

### 2.1 Frontend (Working, Polished)

A massive, feature-complete React/Tauri UI shell with **53 components**, **6 contextual modes**, and a Zustand store managing **15+ domains**:

```
Tasks, Projects, Goals, Courses, Assignments, Exams, Quizzes,
Flashcards, Documents, Notes, Plans, Snippets, Whiteboards,
Citations, Hypotheses, DataLogs, Issues, LessonPlans, Students,
Communications, Meetings, TimeLogs, Contacts, Inbox
```

Every domain has a consistent `addX / updateX / deleteX` CRUD pattern in [`useOrionStore.ts`](file:///C:/Users/proud/ORION/orion-ui/src/store/useOrionStore.ts). This is the **target surface** for the agentic AI to manipulate.

### 2.2 Backend (Broken, Disconnected)

Two separate architectures that don't talk to each other:

| File | Purpose | Status |
|---|---|---|
| [`orchestrator.py`](file:///C:/Users/proud/ORION/backend/orchestrator.py) | CLI loop: HEAR → THINK → SPEAK | ❌ CLI only. Not connected to UI. Hardcoded to `gemma4:e4b` (9.6 GB). |
| [`main.py`](file:///C:/Users/proud/ORION/backend/main.py) | FastAPI server for the Tauri UI | ⚠️ Partially working. Has RAG pipeline but uses wrong model. |
| [`llm.py`](file:///C:/Users/proud/ORION/backend/llm.py) | OpenAI-compatible wrapper for Ollama | ⚠️ Simple passthrough. No tool-calling, no agentic loop. |
| [`documents.py`](file:///C:/Users/proud/ORION/backend/documents.py) | RAG: Extract → Chunk → Embed → Qdrant | ✅ Most complete module. Uses `mem0` + `nomic-embed-text`. |
| [`listen.py`](file:///C:/Users/proud/ORION/backend/listen.py) | Whisper STT subprocess | ❌ Hardcoded to `device="cuda"`. Will crash without dGPU. |
| [`speak.py`](file:///C:/Users/proud/ORION/backend/speak.py) | Kokoro TTS subprocess | ⚠️ Works but subprocess spawn/kill adds 3–5s latency per turn. |
| [`memory.py`](file:///C:/Users/proud/ORION/backend/memory.py) | Qdrant-backed conversational memory | ⚠️ Exists but not integrated into any pipeline. |

### 2.3 The Three Critical Gaps

1. **No Frontend↔Backend Bridge**: The React UI and Python backend cannot communicate. `CommandCenter.tsx` calls `localhost:8000/api/*` but nobody runs that server consistently.
2. **No Agentic Capability**: The LLM returns plain text. It cannot call functions, create tasks, modify the calendar, or trigger any action in the Zustand store.
3. **No Hardware Adaptation**: Every module is hardcoded to `device="cuda"`. With the dGPU disabled, the entire backend crashes on import.

---

## Part 3: The Target Architecture

### 3.1 The Guiding Principles

1. **Hardware-Adaptive**: Detect GPU at boot → choose the right inference profile.
2. **Single Server**: Kill the `orchestrator.py` CLI loop. Everything goes through `main.py` (FastAPI).
3. **Agentic-First**: The LLM does not return plain text. It returns **structured JSON with tool calls**.
4. **Models Stay Loaded**: Instead of spawn-then-kill subprocesses, keep models loaded in RAM (CPU mode) or VRAM (GPU mode) with intelligent swapping.
5. **UI is the Source of Truth**: The Zustand store is the only database. The backend reads it and writes to it via a WebSocket bridge.

### 3.2 Architecture Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    TAURI DESKTOP APP                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              React Frontend (UI Shell)              │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │ Zustand   │  │ Command  │  │  All 53 UI       │  │  │
│  │  │ Store     │←→│ Center   │  │  Components      │  │  │
│  │  └─────┬─────┘  └────┬─────┘  └──────────────────┘  │  │
│  │        │              │                              │  │
│  │        │     WebSocket│Bridge                        │  │
│  │        │              │                              │  │
│  └────────┼──────────────┼──────────────────────────────┘  │
│           │              │                                 │
│  ┌────────▼──────────────▼──────────────────────────────┐  │
│  │           Python Backend (FastAPI + WS)              │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │          HARDWARE DETECTOR (Boot)             │    │  │
│  │  │  Detect CUDA → Choose InferenceProfile       │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                      │  │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────┐  │  │
│  │  │   EARS     │ │   BRAIN    │ │    MOUTH        │  │  │
│  │  │  Whisper   │ │  Ollama    │ │  Kokoro/Piper   │  │  │
│  │  │  (STT)     │ │  (LLM)    │ │  (TTS)          │  │  │
│  │  └────────────┘ └─────┬──────┘ └─────────────────┘  │  │
│  │                       │                              │  │
│  │  ┌────────────────────▼─────────────────────────┐    │  │
│  │  │         AGENTIC TOOL EXECUTOR                │    │  │
│  │  │  Parses LLM JSON → Calls tools → Returns    │    │  │
│  │  │                                              │    │  │
│  │  │  Tools:                                      │    │  │
│  │  │   • add_task()      • search_web()           │    │  │
│  │  │   • add_event()     • search_documents()     │    │  │
│  │  │   • create_quiz()   • add_flashcard()        │    │  │
│  │  │   • update_task()   • get_schedule()         │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │           MEMORY & RAG                       │    │  │
│  │  │  Qdrant (documents) + Conversation History   │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## Part 4: Model Selection (The Most Critical Decision)

### 4.1 The LLM — Orion Brain

The current `gemma4:e4b` at 9.6 GB is unusable on this hardware. It consumes all RAM on CPU and doesn't fit in 4 GB VRAM on GPU.

**Recommendation: Two-tier model with automatic selection.**

| Profile | Model | Format | Size on Disk | RAM/VRAM Usage | Speed | Why |
|---|---|---|---|---|---|---|
| **Battery** | `qwen2.5:3b` | Q4_K_M (GGUF) | ~2.0 GB | ~2.5 GB RAM | 15–30 tok/s CPU | Best function-calling accuracy at this size class. Leaves 13 GB for OS + apps + audio models. |
| **Performance** | `qwen2.5:7b` | Q4_K_M (GGUF) | ~4.4 GB | ~4.0 GB VRAM | 40–80 tok/s GPU | Fits entirely in 4 GB VRAM. Dramatically better reasoning and tool-calling than 3B. |

**Why Qwen?** Extensive research (2024-2026) consistently shows the Qwen family leads in structured output, JSON reliability, and tool-calling for models under 10B parameters. This is validated by:
- The Berkeley Function Calling Leaderboard
- "TinyAgent: Function Calling at the Edge" (EMNLP 2024)
- "Small Models, Big Tasks" (2025)

**Fallback**: If Qwen disappoints in practice, the second-best option is `phi4-mini:3.8b` (Q4_K_M), which excels at STEM reasoning.

### 4.2 STT — Orion Ears (Whisper)

| Profile | Model | Engine | Device | Latency |
|---|---|---|---|---|
| **Battery** | `small` or `distil-medium.en` | `faster-whisper` (CTranslate2, INT8) | CPU | ~2–4s for 7s audio |
| **Performance** | `large-v3-turbo` | `faster-whisper` (CTranslate2, float16) | CUDA | <1s for 7s audio |

Key change: **Whisper stays loaded in memory** (no subprocess spawn/kill). In Battery mode, the ~500 MB RAM footprint is acceptable. In Performance mode, it hot-swaps with the LLM for VRAM.

### 4.3 TTS — Orion Mouth

| Profile | Engine | Device | Latency | Quality |
|---|---|---|---|---|
| **Battery** | **Kokoro** (82M params) | CPU | ~1–2s | High naturalness |
| **Performance** | **Kokoro** | CUDA (if available after LLM unload) or CPU | <0.5s | High naturalness |

Kokoro runs well on the Ryzen 7 CPU. Piper is only needed if Kokoro proves too slow on CPU — but for a conversational assistant, 1–2s synthesis latency is perfectly acceptable.

### 4.4 Embeddings — Orion Memory

| Model | Engine | Size | Purpose |
|---|---|---|---|
| `nomic-embed-text` | Ollama | 274 MB | Document embeddings for RAG (already in use) |

No change needed. This model is tiny and runs fine on CPU.

---

## Part 5: The Agentic Tool-Calling System

This is the feature that transforms ORION from a chatbot into an autonomous assistant.

### 5.1 How It Works

Instead of:
```
User: "Add a task called 'Study Calculus' due tomorrow"
LLM:  "Sure, I've noted that you want to add a task..."  (useless text)
```

The new system does:
```
User: "Add a task called 'Study Calculus' due tomorrow"
LLM:  {
        "thought": "User wants to create a task with a specific title and due date.",
        "actions": [
          {
            "tool": "add_task",
            "params": {
              "title": "Study Calculus",
              "priority": "Medium",
              "dueDate": "2026-10-13T00:00:00+05:30"
            }
          }
        ],
        "response": "Done! I've added 'Study Calculus' to your tasks, due tomorrow."
      }
```

The backend **parses the JSON**, **executes `add_task`** via WebSocket to the frontend's Zustand store, and **speaks the `response`** field.

### 5.2 The Tool Registry

Every tool maps 1:1 to a Zustand store action. This is the complete tool surface for ORION:

```python
TOOL_REGISTRY = {
    # ─── TASKS ───────────────────────────────────
    "add_task": {
        "description": "Create a new task in the user's task list",
        "parameters": {
            "title": {"type": "string", "required": True},
            "priority": {"type": "string", "enum": ["Critical","High","Medium","Low"]},
            "dueDate": {"type": "string", "format": "ISO 8601"},
            "description": {"type": "string"},
            "estimatedMinutes": {"type": "integer"},
            "courseId": {"type": "string"},
            "projectId": {"type": "string"},
        },
        "zustand_action": "addTask"
    },
    "update_task": {
        "description": "Update an existing task's fields",
        "parameters": {
            "id": {"type": "string", "required": True},
            "updates": {"type": "object"}
        },
        "zustand_action": "updateTask"
    },
    "complete_task": {
        "description": "Mark a task as completed",
        "parameters": {"id": {"type": "string", "required": True}},
        "zustand_action": "toggleTaskCompletion"
    },
    "delete_task": {
        "description": "Delete a task permanently",
        "parameters": {"id": {"type": "string", "required": True}},
        "zustand_action": "deleteTask"
    },

    # ─── FLASHCARDS ──────────────────────────────
    "add_flashcard": {
        "description": "Create a new flashcard in a deck",
        "parameters": {
            "deckId": {"type": "string", "required": True},
            "front": {"type": "string", "required": True},
            "back": {"type": "string", "required": True},
        },
        "zustand_action": "addFlashcard"
    },

    # ─── QUIZZES ─────────────────────────────────
    "create_quiz": {
        "description": "Generate a quiz with questions",
        "parameters": {
            "title": {"type": "string", "required": True},
            "courseId": {"type": "string"},
            "questions": {"type": "array", "items": "QuizQuestion"},
        },
        "zustand_action": "addQuiz"
    },

    # ─── CALENDAR / PLANNING ────────────────────
    "create_plan": {
        "description": "Propose a study plan with time-blocked tasks",
        "parameters": {
            "items": {"type": "array", "items": "PlanItem"},
        },
        "zustand_action": "addPlan"
    },

    # ─── INFORMATION RETRIEVAL ──────────────────
    "search_documents": {
        "description": "Search the user's uploaded documents for relevant information",
        "parameters": {"query": {"type": "string", "required": True}},
        "handler": "rag_search"  # Not a Zustand action — returns data to LLM
    },
    "search_web": {
        "description": "Search the internet for current information",
        "parameters": {"query": {"type": "string", "required": True}},
        "handler": "web_search"  # Uses DuckDuckGo API
    },

    # ─── READING STATE ──────────────────────────
    "get_tasks": {
        "description": "Get the user's current task list",
        "parameters": {"filter": {"type": "string", "enum": ["all","pending","today","overdue"]}},
        "handler": "read_store"
    },
    "get_schedule": {
        "description": "Get the user's schedule for a specific date",
        "parameters": {"date": {"type": "string", "format": "ISO 8601"}},
        "handler": "read_store"
    },
}
```

### 5.3 The ReAct Loop (Multi-Step Reasoning)

For complex requests, the LLM needs multiple steps:

```
User: "Create 5 flashcards from my uploaded Calculus notes"

Step 1 → LLM thinks: "I need to search the documents first"
         LLM calls: search_documents(query="calculus")
         System returns: [chunk1, chunk2, chunk3]

Step 2 → LLM thinks: "Now I can generate flashcards from these chunks"
         LLM calls: add_flashcard(deckId="deck-1", front="...", back="...")
                    add_flashcard(deckId="deck-1", front="...", back="...")
                    ... (5 times)
         
Step 3 → LLM responds: "Done! I've created 5 flashcards in your 
                         React Fundamentals deck from your Calculus notes."
```

The orchestrator runs a **maximum of 3 reasoning steps** to prevent infinite loops. Each step feeds the tool results back into the LLM context.

---

## Part 6: The WebSocket Bridge (Frontend ↔ Backend)

### 6.1 Why WebSocket, Not REST

REST is request-response. The agentic system needs the backend to **push** actions to the frontend at any time (e.g., after the LLM decides to create a task). WebSocket gives us bidirectional, real-time communication.

### 6.2 Protocol

```typescript
// Messages FROM backend TO frontend (actions)
interface OrionAction {
  type: "STORE_ACTION";
  action: string;      // e.g., "addTask"
  payload: any;        // e.g., { title: "Study Calculus", priority: "High", ... }
  requestId: string;   // for tracking
}

// Messages FROM frontend TO backend (state sync)
interface OrionStateSync {
  type: "STATE_SNAPSHOT";
  data: {
    tasks: Task[];
    courses: Course[];
    plans: Plan[];
    // ... relevant slices only
  };
}
```

### 6.3 Implementation

**Frontend** (`CommandCenter.tsx`): Opens a WebSocket to `ws://localhost:8000/ws`. When it receives a `STORE_ACTION`, it calls the corresponding Zustand action. When it sends a message, it also sends a lightweight state snapshot so the LLM has context.

**Backend** (`main.py`): FastAPI's WebSocket endpoint receives user messages, runs the agentic loop, and pushes `STORE_ACTION` messages back.

---

## Part 7: The Hardware Detector

At server startup, detect the GPU and choose the right profile:

```python
# hardware_detector.py
import torch
import subprocess

def detect_profile() -> dict:
    """Detect available hardware and return the optimal inference profile."""
    
    cuda_available = torch.cuda.is_available()
    
    if cuda_available:
        vram_mb = torch.cuda.get_device_properties(0).total_mem // (1024 * 1024)
        gpu_name = torch.cuda.get_device_name(0)
        return {
            "profile": "performance",
            "gpu": gpu_name,
            "vram_mb": vram_mb,
            "llm_model": "qwen2.5:7b",
            "whisper_device": "cuda",
            "whisper_model": "large-v3-turbo",
            "whisper_compute": "float16",
            "tts_device": "cpu",        # TTS always on CPU to avoid VRAM contention
            "strategy": "vram_hotswap", # One model in VRAM at a time
        }
    else:
        import psutil
        ram_gb = psutil.virtual_memory().total // (1024**3)
        return {
            "profile": "battery",
            "gpu": "none",
            "vram_mb": 0,
            "ram_gb": ram_gb,
            "llm_model": "qwen2.5:3b",
            "whisper_device": "cpu",
            "whisper_model": "small",
            "whisper_compute": "int8",
            "tts_device": "cpu",
            "strategy": "all_in_ram",   # All models loaded in RAM simultaneously
        }
```

---

## Part 8: Internet Search (Defeating Knowledge Staleness)

The local LLM's training data is frozen. To answer "What's the latest score of IPL?" or "When is the next university holiday?", it needs live web access.

### Implementation

```python
# tools/web_search.py
from duckduckgo_search import DDGS

def search_web(query: str, max_results: int = 3) -> str:
    """Search the web using DuckDuckGo (no API key needed)."""
    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=max_results))
    
    if not results:
        return "No results found."
    
    formatted = []
    for r in results:
        formatted.append(f"**{r['title']}**\n{r['body']}\nSource: {r['href']}")
    
    return "\n\n".join(formatted)
```

This becomes a tool in the LLM's tool registry. The LLM decides when to call it based on the user's question.

---

## Part 9: Phased Implementation Plan

### Phase 1: Foundation (Week 1-2)
> Goal: Get the LLM responding intelligently through the UI.

1. **Pull the right models via Ollama:**
   ```bash
   ollama pull qwen2.5:3b    # Battery mode
   ollama pull qwen2.5:7b    # Performance mode (when dGPU is on)
   ```
2. **Create `hardware_detector.py`** — auto-detect GPU at boot.
3. **Rewrite `llm.py`** — add the system prompt with tool definitions, structured JSON output parsing.
4. **Fix `listen.py`** — make `device` configurable (`cuda` or `cpu`), make model configurable (`small` or `large-v3-turbo`).
5. **Fix `speak.py`** — remove subprocess pattern, load Kokoro once and keep in memory.
6. **Wire `main.py`** — ensure the FastAPI server starts cleanly and `CommandCenter.tsx` can reach it.

### Phase 2: Agentic Bridge (Week 3-4)
> Goal: ORION can execute actions in the UI.

1. **Build the Tool Registry** (`tools/registry.py`) — define all tools with their parameter schemas.
2. **Build the Agentic Loop** (`agent/react_loop.py`) — implements the 3-step ReAct pattern.
3. **Add WebSocket endpoint** to `main.py` — replaces REST for real-time communication.
4. **Update `CommandCenter.tsx`** — connect WebSocket, dispatch received `STORE_ACTION` messages to Zustand.
5. **Add `search_web` tool** — DuckDuckGo integration.
6. **Add `search_documents` tool** — wire existing RAG pipeline as a callable tool.

### Phase 3: Intelligence (Week 5-6)
> Goal: ORION understands context and remembers.

1. **State Injection** — send a lightweight snapshot of the user's tasks/schedule/courses to the LLM with every request, so it knows what "today" looks like.
2. **Conversational Memory** — wire `memory.py` (Qdrant) to persist important facts across sessions ("User has an exam on Friday", "User prefers morning study sessions").
3. **Plan Generation** — wire the existing `domain/planning` types so the LLM can propose study plans that appear in the Planner UI.
4. **Quiz Generation from Documents** — the LLM reads RAG chunks and generates quizzes.

### Phase 4: Polish & Scale (Week 7+)
> Goal: Production-quality experience.

1. **SQLite Migration** — move Zustand persistence from `localStorage` to SQLite via Tauri's `tauri-plugin-sql`, enabling larger datasets.
2. **Streaming Responses** — stream LLM tokens via WebSocket for a "typing" effect in the UI.
3. **Voice Activity Detection (VAD)** — replace fixed 7s recording with `silero-vad` to detect when the user stops speaking.
4. **Multi-turn Planning** — allow the user to negotiate plans ("Move that task to 4 PM instead").
5. **Notification System** — ORION proactively reminds about due tasks or upcoming exams.

---

## Part 10: File-by-File Change Map

| File | Action | What Changes |
|---|---|---|
| `backend/hardware_detector.py` | **CREATE** | New. Auto-detects GPU/CPU profile at boot. |
| `backend/llm.py` | **REWRITE** | New agentic system prompt, JSON output parsing, tool definition injection. |
| `backend/main.py` | **REWRITE** | Add WebSocket endpoint, use hardware detector, unify all endpoints. |
| `backend/listen.py` | **MODIFY** | Accept `device` and `model` as parameters instead of hardcoding. |
| `backend/speak.py` | **MODIFY** | Remove subprocess pattern. Load once, keep in memory. |
| `backend/orchestrator.py` | **DELETE** | The CLI loop is replaced by `main.py` + WebSocket. |
| `backend/tools/registry.py` | **CREATE** | New. Tool definitions + execution logic. |
| `backend/tools/web_search.py` | **CREATE** | New. DuckDuckGo search integration. |
| `backend/agent/react_loop.py` | **CREATE** | New. The 3-step ReAct reasoning loop. |
| `orion-ui/src/sections/CommandCenter.tsx` | **MODIFY** | Add WebSocket connection, dispatch `STORE_ACTION` to Zustand. |
| `Modelfile` | **DELETE** | Replaced by Ollama pulling the right model directly. |

---

## Summary: Why This Architecture Wins

| Requirement | How This Solves It |
|---|---|
| "Use GPU only, sit in VRAM" | When dGPU is ON → `qwen2.5:7b` fits in 4 GB VRAM. VRAM hot-swap ensures only one model at a time. |
| "Don't use full CPU and RAM" | When dGPU is OFF → `qwen2.5:3b` uses only ~2.5 GB RAM. Whisper small uses ~500 MB. Kokoro ~300 MB. Total: ~3.3 GB out of 16 GB. |
| "Adapt to whatever hardware" | The Hardware Detector auto-selects the right model and device at startup. No manual configuration. |
| "Orion should add tasks by itself" | The Tool Registry + WebSocket bridge lets the LLM call `addTask()` directly on the Zustand store. |
| "Search the internet" | `search_web` tool uses DuckDuckGo (no API key, fully local control). |
| "Work with Whisper and Kokoro" | Both are integrated as in-process modules (not subprocess spawns), reducing latency by 3-5 seconds. |
| "Best architecture" | ReAct loop (Reason + Act) is the current industry standard for agentic AI, validated by Google DeepMind, OpenAI, and HuggingFace research. |
