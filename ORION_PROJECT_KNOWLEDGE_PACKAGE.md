# ORION PROJECT KNOWLEDGE PACKAGE

## PART 1 — PROJECT INVENTORY

**Project Tree (High Level):**
```
ORION/
??? backend/ (Python AI Orchestration CLI)
??? data/ (Qdrant vector DB storage)
??? orion-ui/ (Frontend application)
    ??? src/ (React/Zustand UI)
    ??? src-tauri/ (Rust backend/IPC)
```

**Important Directories & Files:**
* `backend/orchestrator.py`: Master AI pipeline controller. Actively used. Controls the HEAR -> THINK -> SPEAK loop. Crucial for VRAM management.
* `backend/main.py`: The entry point for the CLI AI loop. It imports and runs the orchestrator loop.
* `backend/listen.py`, `speak.py`, `transcribe.py`: Subprocesses spawned by orchestrator for Whisper and Kokoro. Actively used.
* `orion-ui/src/App.tsx`: React Router entry point. Defines all UI modes and workspaces. Actively used.
* `orion-ui/src/store/useOrionStore.ts`: Zustand global state. Actively used. The brain of the frontend.
* `orion-ui/src-tauri/src/lib.rs`: Rust backend for Tauri. Currently ONLY used for secure keychain storage.

**Status:** The frontend (`orion-ui`) and backend (`backend`) are currently completely disconnected. The frontend is a highly developed visual shell with local state, and the backend is a functional CLI AI assistant.

---

## PART 2 — TECHNOLOGY STACK

* **React (v19.1.0)**: Core UI framework. Essential.
* **TypeScript (v5.8.3)**: Type safety for the frontend. Essential.
* **Vite (v7.0.4)**: Frontend build tool. Fast HMR. Essential.
* **Tauri (v2.x)**: Desktop application framework. Wraps React in a native window. Essential.
* **Rust**: Powers Tauri backend. Currently used for secure API key storage via `keyring` crate. Essential.
* **Python (v3.10+)**: Powers the AI backend. Essential.
* **Zustand (v5.0.15)**: Global state management. Essential alternative to Redux.
* **React Router (v7.18.2)**: Navigation and view routing. Essential.
* **Tiptap (v3.30.2)**: Rich text editor used in the Notes module. Essential.
* **faster-whisper**: AI Speech-to-text. Used in Python backend.
* **Kokoro**: AI Text-to-speech. Used in Python backend.
* **Ollama**: Local LLM server running Gemma 4B. Used via REST API.
* **Lucide-React**: Iconography library. Essential.
* **Anime.js / GSAP**: Animation libraries. Used for UI transitions.

---

## PART 3 — FRONTEND ARCHITECTURE

**Application Entry & Routing:**
The app boots via `main.tsx` into `App.tsx`. `App.tsx` defines a massive `HashRouter` structure. The main layout wrapper is `AppShell.tsx`, which houses the `Sidebar`, `CommandPalette`, and dynamic `Outlet` content.

**Styling & UI:**
Pure CSS variables (`index.css` and `App.css`) drive the glassmorphic, gradient-heavy aesthetic. There is no Tailwind. Animations (e.g., pulsing Pomodoro circles) are handled via CSS `@keyframes` and Anime.js.

**Data Flow (UI Only):**
User clicks button -> Component calls Zustand action (`useOrionStore`) -> Zustand updates state in memory -> LocalStorage persists state -> React re-renders component with new data.

*(Note: There is NO data flow to the Python backend yet).*

---

## PART 4 — STATE MANAGEMENT

**Store File:** `orion-ui/src/store/useOrionStore.ts`
**Mechanism:** Zustand with `persist` middleware (saves to `localStorage`).

**State Fields:**
* Tasks, Projects, Goals, Snippets, Whiteboards, Documents, Courses, Flashcards, Exams, Quizzes.
* Recently added backend-ready models: Citations, Hypotheses, DataLogs, Issues, LessonPlans, Students, Meetings, TimeLogs, Contacts.

**Architectural Consistency:**
Highly consistent. Almost every domain has a standard `addX`, `updateX`, `deleteX` CRUD action.
**Flaws:** All data is currently stored in `localStorage`, which is not scalable for massive document text or heavy usage. It is currently transient local state disguised as persistent state.

---

## PART 5 — TAURI / RUST

**Tauri Entry Point:** `src-tauri/src/main.rs` delegates to `lib.rs`.
**Rust Files:** `lib.rs` contains the core logic.

**Commands / IPC:**
The Rust layer currently exports exactly 4 commands:
1. `greet(name)` - Placeholder.
2. `save_api_credential(provider, secret)` - Saves to OS keychain.
3. `check_api_credential(provider)` - Reads keychain.
4. `remove_api_credential(provider)` - Deletes from keychain.

**Process Management:** None. Tauri does NOT launch the Python backend currently.
**Security:** API keys are stored in the OS-level secure enclaves (Keychain/Credential Manager) via the `keyring` crate, adhering to strict security rules.

---

## PART 6 — PYTHON BACKEND

**Entry Point:** `main.py` -> calls functions in `orchestrator.py`
**Architecture:** It is a blocking, synchronous CLI loop (`while True`). There is no HTTP server (like FastAPI) running. 

**Modules:**
* `listen.py`: Spawns Whisper STT.
* `think()` in `orchestrator.py`: Calls Ollama API.
* `speak.py`: Spawns Kokoro TTS.
* `documents.py`: Ingests and chunks documents, stores in Qdrant memory.
* `memory.py`: Vector database interfacing.

**Communication with Frontend:** **NONE.** The Python backend runs completely independently of the React UI.

---

## PART 7 — LOCAL AI SYSTEM

**Gemma:** Run via Ollama REST API. Used for the "Brain".
**Whisper:** Run via `faster-whisper` in a standalone Python subprocess.
**Kokoro:** Run via `KPipeline` in a standalone Python subprocess.

**VRAM Management Strategy:**
The system uses a "Process-Lifetime VRAM Eviction" strategy.
Because GPU VRAM is limited, multiple models cannot fit at once.

---

## PART 8 — WHISPER PIPELINE

**Flow:** Microphone -> Audio File (implied/mocked in current scripts) -> `subprocess.run(["python", "listen.py"])` -> `faster-whisper` loads large-v3-turbo -> transcribes -> prints `TRANSCRIPT: <text>` to stdout -> process dies.
**Format:** Subprocess string stdout extraction.

---

## PART 9 — GEMMA PIPELINE

**Flow:** Text from Whisper -> `think(user_message)` -> HTTP POST to `http://localhost:11434/api/chat` -> Ollama loads `gemma4:e4b` into VRAM -> inference -> Ollama unloads model (due to `keep_alive: 0`) -> returns JSON -> Orchestrator parses response.

---

## PART 10 — KOKORO PIPELINE

**Flow:** Text from Gemma -> `speak(text)` -> `subprocess.run(["python", "speak.py", text])` -> Kokoro pipeline loads -> generates `.wav` slices -> `pygame` plays them sequentially -> process dies.

---

## PART 11 — VRAM / MODEL SWAPPING ARCHITECTURE

**The Problem:** GPUs have limited VRAM. Loading Whisper (STT), Gemma (LLM), and Kokoro (TTS) simultaneously crashes the GPU.
**The Solution (Implemented):**
1. **Load:** Models are loaded into VRAM only when their specific subprocess starts (Whisper/Kokoro) or via strict API flags (Ollama).
2. **Unload:** Subprocesses (Whisper/Kokoro) are allowed to naturally terminate (`sys.exit()`). When the OS kills the Python process, the CUDA context is destroyed, instantly freeing all VRAM. Ollama uses the `keep_alive=0` API flag to immediately evict Gemma after inference.
**Concurrency:** Strictly synchronous. Only one AI model runs at any given millisecond.
**Fragility:** High. If a subprocess hangs, VRAM is locked.

---

## PART 12 — AUDIO ARCHITECTURE

**Latency:** Very high. Because processes must spin up, load model weights from disk to RAM to VRAM, infer, and then die, there is massive latency between speaking and hearing a response.
**Bottlenecks:** Model loading times (I/O bound).

---

## PART 13 — DATA FLOW

**A. UI Data Flow:**
User Click -> React Component -> Zustand Store -> LocalStorage -> React Rerender

**B. AI Data Flow (CLI):**
Microphone -> `listen.py` (VRAM Load -> Transcribe -> VRAM Unload) -> Orchestrator -> Ollama HTTP (VRAM Load -> Generate -> VRAM Unload) -> Orchestrator -> `speak.py` (VRAM Load -> Speak -> VRAM Unload)

**C. Frontend <-> Backend:**
Does not exist. (Planned future implementation).

---

## PART 14 — FILE-BY-FILE LEARNING MAP

**orion-ui/src/store/useOrionStore.ts**
* PURPOSE: Global State.
* CONCEPTS: Zustand, Persistence.
* DIFFICULTY: Intermediate.
* PRIORITY: Level 4 (High).

**backend/orchestrator.py**
* PURPOSE: VRAM Hot-swapping pipeline.
* CONCEPTS: Subprocesses, IPC via Stdout, memory eviction.
* DIFFICULTY: Advanced.
* PRIORITY: Level 7 (High).

**orion-ui/src/AppShell.tsx**
* PURPOSE: Main layout and routing wrapper.
* CONCEPTS: React Router Outlet, Layouts.
* DIFFICULTY: Beginner.
* PRIORITY: Level 3.

---

## PART 15 — CODE CONCEPT INVENTORY

* **React Hooks (`useState`, `useEffect`)**: Found in almost every `.tsx` file (e.g., `SettingsModule.tsx`).
* **Zustand Stores (`create`, `set`)**: Found in `useOrionStore.ts`.
* **Subprocesses / IPC**: Found in `backend/orchestrator.py` (`subprocess.run`).
* **REST APIs / HTTP (`requests`)**: Found in `backend/orchestrator.py` calling Ollama.
* **OS File System / Keychains**: Found in `src-tauri/src/lib.rs` (`keyring::Entry`).

---

## PART 16 — ARCHITECTURAL DECISIONS

**DECISION:** Tauri + React for Frontend
* WHY: We needed a beautiful, web-native UI but required deep desktop access (keychains, eventually local processes).
* TRADEOFFS: Cannot easily be hosted as a pure web app without losing features.

**DECISION:** Subprocess VRAM Swapping
* WHY: To run massive AI models on consumer hardware.
* ADVANTAGES: 100% guaranteed VRAM eviction when process dies.
* DISADVANTAGES: Horrendous latency due to cold-booting models every conversation turn.

**DECISION:** No UI-to-Backend Integration (Yet)
* WHY: Separating concerns. Building the perfect UI shell before wiring the fragile AI backend.

---

## PART 17 — EXPERIMENTS AND DEAD ENDS

* **Dead End:** Direct Python-to-Frontend WebSocket binding.
* **Current Status:** Not implemented. The Python backend currently runs strictly as a terminal CLI application.
* **Experiment:** `backend/documents.py` implements a Qdrant-backed chunking/RAG pipeline, but it is executed strictly via CLI arguments (`if __name__ == "__main__":`).

---

## PART 18 — CURRENT STATE

* ? FRONTEND UI: **WORKING** (Visually complete, local state works).
* ? LOCAL AI PIPELINE: **PARTIALLY WORKING** (CLI only, slow latency).
* ? VRAM MANAGEMENT: **EXPERIMENTAL** (Works via process-killing, but fragile).
* ? FRONTEND-TO-BACKEND SYNC: **NOT IMPLEMENTED**.
* ? RAG / DOCUMENTS: **EXPERIMENTAL** (Backend scripts exist, not wired to UI).

---

## PART 19 — TECHNICAL DEBT

* **Architecture Smell:** The frontend and backend are completely distinct applications with no communication bridge.
* **Performance Concern:** Process-spawning for every AI turn causes 5-15 seconds of latency per conversation turn.
* **Storage Concern:** Pushing massive amounts of text (e.g., full rich-text documents) into `localStorage` via Zustand will eventually crash the browser engine.

---

## PART 20 — SECURITY

* **API Keys:** Secure. Handled by native OS keychains via Rust Tauri. Not exposed to React state.
* **Filesystem:** Tauri limits scope.
* **Subprocesses:** Python backend spawns processes wildly via `subprocess.run()`. Highly susceptible to command injection if user input ever reaches the CLI arguments directly (e.g., `speak.py` arguments).

---

## PART 21 — COMPLETE ARCHITECTURE (ACTUAL CODE)

There are currently TWO disconnected architectures:

**Architecture A: The UI (React/Tauri)**
User -> React Component -> Zustand (Memory) -> LocalStorage

**Architecture B: The AI (Python CLI)**
Microphone -> `orchestrator.py` -> spawns `listen.py` (VRAM load/unload) -> `requests.post(Ollama)` (VRAM load/unload) -> spawns `speak.py` (VRAM load/unload) -> Speakers.

*(They do not talk to each other).*

---

## PART 22 — TEACHING ORDER

**LEVEL 1: React & Zustand (The Shell)**
* Inspect: `App.tsx`, `AppShell.tsx`, `useOrionStore.ts`.
* Goal: Understand how UI state updates without a backend.

**LEVEL 2: Rust & Tauri (The Bridge)**
* Inspect: `lib.rs`, `SettingsModule.tsx`.
* Goal: Understand how the browser talks to the Desktop OS securely.

**LEVEL 3: Python & Subprocesses (The Engine)**
* Inspect: `orchestrator.py`, `listen.py`, `speak.py`.
* Goal: Understand isolated processes and standard output parsing.

**LEVEL 4: Local AI & VRAM Constraints (The Future)**
* Inspect: `llm.py` (if exists), `orchestrator.py` (`keep_alive=0` logic).
* Goal: Understand why running AI locally is fundamentally a memory management problem, not just a software problem.

---

### Questions / Unknowns
* **Audio Capture Details:** The `listen.py` script relies on an audio file being present (or captures it silently). The exact live microphone buffer logic is obscured or missing from the current scripts.
* **Frontend Integration Strategy:** It is unknown whether the intention is to communicate via Tauri Rust sidecars, WebSockets, or HTTP REST to bridge the React UI and Python backend.
