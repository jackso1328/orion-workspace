# ORION ARCHITECTURE ARCHAEOLOGY

## EXECUTIVE OVERVIEW

This document is an exhaustive forensic reconstruction of the Orion Workspace project. It traces the project's evolution, architectural decisions, failures, experiments, and current state. The goal is to provide a "First Principles" understanding of the project so a beginner can reconstruct it without AI assistance.

**Key Findings:**
1. **The Disconnect:** Orion is not a single application. It is currently two separate, isolated architectures (a React/Tauri UI and a Python CLI AI engine) that do not communicate.
2. **The "Big Bang" AI Commit:** The entire Python AI backend was dropped into the repository in a single initial commit (`e9ee6ae`). Its evolution occurred out-of-band and its history cannot be traced via Git.
3. **The VRAM Swapping Strategy:** The core innovation of the backend is solving the GPU Out-Of-Memory (OOM) problem by aggressively loading and killing processes (Whisper and Kokoro) and forcing Ollama to drop models from VRAM immediately after inference (`keep_alive=0`).

---

## PART 1 — CURRENT REPOSITORY RECONSTRUCTION

**Project Tree (Verified from source):**
```
ORION/
├── backend/ (Python AI Orchestration CLI)
│   ├── orchestrator.py (Master CLI loop)
│   ├── main.py (Entry point for orchestrator)
│   ├── listen.py (faster-whisper STT subprocess)
│   ├── llm.py (Async OpenAI wrapper - unused in main loop)
│   ├── speak.py (Kokoro TTS subprocess)
│   ├── documents.py (RAG document ingestor - experimental)
│   └── memory.py (mem0/Qdrant wrapper - experimental)
├── orion-ui/ (Frontend application)
│   ├── src/
│   │   ├── App.tsx (React Router entry)
│   │   ├── AppShell.tsx (Layout wrapper)
│   │   ├── components/ (All UI modules)
│   │   ├── store/useOrionStore.ts (Zustand state)
│   │   └── domain/ (Pure logic separation for Today mode)
│   ├── src-tauri/
│   │   └── src/lib.rs (Rust keychain IPC)
└── ORION_PROJECT_KNOWLEDGE_PACKAGE.md (Previous analysis)
```

### Important Files Breakdown:

**`backend/orchestrator.py`**
* **PURPOSE:** Master AI pipeline controller.
* **CURRENT ROLE:** Controls the HEAR -> THINK -> SPEAK loop.
* **ACTIVE/UNUSED/EXPERIMENTAL:** Active.
* **IMPORTANT FUNCTIONS:** `hear()`, `think()`, `speak()`, `main()`.
* **DEPENDENCIES:** `subprocess`, `requests`.
* **DATA FLOW:** Standard In/Out, HTTP POST to Ollama.
* **DIFFICULTY:** Advanced (Process & Memory management).
* **LEARNING IMPORTANCE:** Critical. Demonstrates how to solve hardware constraints through software orchestration.

**`backend/documents.py`**
* **PURPOSE:** RAG document ingestor.
* **CURRENT ROLE:** None. It is not imported by `orchestrator.py`.
* **ACTIVE/UNUSED/EXPERIMENTAL:** Experimental.
* **DEPENDENCIES:** `PyMuPDF`, `pytesseract`, `mem0`.
* **DIFFICULTY:** Intermediate.
* **LEARNING IMPORTANCE:** Low currently, but high for future RAG features.

**`orion-ui/src/store/useOrionStore.ts`**
* **PURPOSE:** Global state management.
* **CURRENT ROLE:** Holds all application data (Tasks, Projects, Quizzes, etc.).
* **ACTIVE/UNUSED/EXPERIMENTAL:** Active.
* **DEPENDENCIES:** `zustand`, `uuid`.
* **DATA FLOW:** Components -> Actions -> LocalStorage.
* **DIFFICULTY:** Intermediate.
* **LEARNING IMPORTANCE:** Critical. The backbone of the React application.

---

## PART 2 — GIT ARCHAEOLOGY

*Note: The project contains exactly 10 commits. The AI backend has ZERO evolutionary history in Git; it was committed fully formed.*

**DATE:** Day 1
**COMMIT:** `e9ee6ae`
**COMMIT MESSAGE:** "Initial commit: Orion Workspace UI and Dashboard"
**WHAT CHANGED:** The entire Python backend and initial React frontend were committed.
**EVIDENCE:** `git log --oneline -- backend/` shows only this commit.
**CONFIDENCE:** FACT.

**DATE:** Day 2 (approx)
**COMMIT:** `297e6de`
**COMMIT MESSAGE:** "Extract Today domain logic to pure selectors (Task 07)"
**WHAT CHANGED:** Business logic (date calculations, filtering) was moved out of React components and into `src/domain/today/selectors.ts`.
**WHY IT APPEARS TO HAVE CHANGED:** To enforce separation of concerns and prevent components from becoming bloated with logic.
**CONFIDENCE:** FACT.

**DATE:** Day X
**COMMIT:** `f61bbf8`
**COMMIT MESSAGE:** "feat: complete Orion Task 19 Consumer UI Phase 1-3"
**WHAT CHANGED:** 
1. The UI was massively expanded.
2. Rust Tauri IPC commands for `save_api_credential` were added using the `keyring` crate.
**WHY IT APPEARS TO HAVE CHANGED:** The app needed secure storage for API keys (e.g., OpenRouter) that `localStorage` could not provide safely.
**CONFIDENCE:** FACT.

**DATE:** Day X+1
**COMMIT:** `790094e`
**COMMIT MESSAGE:** "feat(orion): expand UI architecture with new mode-specific workspace options"
**WHAT CHANGED:** Added 15 new UI components (DataLogs, HypothesisTracker, etc.) and expanded the Zustand store.
**CONFIDENCE:** FACT.

---

## PART 3 — ARCHITECTURAL EVOLUTION

**ARCHITECTURE VERSION 1 (Out-of-band development)**
**[INFERENCE]** The developer likely built the Python AI scripts independently to solve the local GPU constraints before starting the React UI.

**ARCHITECTURE VERSION 2 (Initial Commit `e9ee6ae`)**
The frontend was a basic Dashboard. The backend was a standalone CLI. There was an **INTENTION** to connect them (based on the project description), but no technical bridge was implemented.

**ARCHITECTURE VERSION 3 (Current State)**
The frontend evolved rapidly, adopting strict Domain-Driven Design for some parts (e.g., Today selectors) and massive module expansion. The backend remained completely frozen.

---

## PART 4 — LOCAL AI HISTORY

**MODEL: WHISPER**
* **VERSION:** large-v3-turbo
* **RUNTIME:** `faster-whisper`
* **DEVICE:** CUDA (GPU)
* **HOW LOADED:** Initialized natively via Python when `listen.py` executes.
* **HOW UNLOADED:** Process termination (`sys.exit()`).
* **PROCESS OWNER:** OS (Spawned by `orchestrator.py`).
* **CURRENT STATUS:** Active in CLI.

**MODEL: GEMMA**
* **VERSION:** gemma4:e4b
* **RUNTIME:** Ollama
* **DEVICE:** CUDA (GPU)
* **HOW LOADED:** On-demand via Ollama REST API.
* **HOW UNLOADED:** Using the `keep_alive: 0` JSON payload flag.
* **CURRENT STATUS:** Active in CLI.

**MODEL: KOKORO**
* **RUNTIME:** `KPipeline`
* **DEVICE:** CUDA (GPU)
* **HOW LOADED:** Initialized when `speak.py` executes.
* **HOW UNLOADED:** Process termination.
* **CURRENT STATUS:** Active in CLI.

---

## PART 5 — VRAM ENGINEERING ARCHAEOLOGY

**PROBLEM [INFERENCE]:**
Consumer GPUs typically have 8GB to 24GB of VRAM. Loading a 4B parameter LLM (Gemma), a Large Whisper model, and a Kokoro TTS pipeline simultaneously requires far more VRAM than consumer hardware allows, leading to CUDA Out-Of-Memory (OOM) crashes.

**SELECTED APPROACH [FACT]:**
The developer implemented a **"Strict Sequential VRAM Eviction Strategy"**.

**LIFECYCLE:**
1. **DISK -> SYSTEM RAM -> VRAM:** `listen.py` is spawned. Whisper loads to VRAM.
2. **INFERENCE:** User speaks. Audio transcribed.
3. **VRAM RELEASE:** `listen.py` exits. OS reclaims VRAM instantly.
4. **DISK -> SYSTEM RAM -> VRAM:** `orchestrator.py` pings Ollama. Ollama loads Gemma.
5. **INFERENCE:** Gemma generates text.
6. **VRAM RELEASE:** Ollama instantly unloads Gemma because the request included `"keep_alive": 0`.
7. **DISK -> SYSTEM RAM -> VRAM:** `speak.py` is spawned. Kokoro loads.
8. **INFERENCE:** Kokoro generates WAV. Plays audio.
9. **VRAM RELEASE:** `speak.py` exits.

**WHAT IS GUARANTEED:** VRAM is successfully managed. The system will not crash from OOM if the GPU can hold at least the largest single model.
**WHAT IS COMPROMISED:** Latency. The user experiences massive delays (5-15 seconds) because models are loading from Disk -> VRAM on every single turn of the conversation.

---

## PART 6 — WHISPER INVESTIGATION

**File:** `backend/listen.py`
**Process:**
1. Fixes Windows CUDA paths dynamically.
2. Initializes `WhisperModel("large-v3-turbo", device="cuda")`.
3. Records audio (Wait, `listen.py` expects a file path as `sys.argv[1]`, but `orchestrator.py` calls it WITHOUT arguments in `hear()`. **[FACT: There is a bug/disconnect here. `orchestrator.py` calls `[PYTHON_EXE, LISTEN_SCRIPT]` but `listen.py` expects an audio file. This means the microphone recording logic is actually MISSING from the current codebase.]**)
4. Transcribes and prints `TRANSCRIPT:<text>`.

---

## PART 7 — GEMMA INVESTIGATION

**File:** `backend/orchestrator.py` (Function `think()`)
**Process:**
1. Constructs messages array with `SYSTEM_PROMPT`.
2. Appends conversation history (limited to last 6 exchanges to manage context window).
3. Sends POST to `http://localhost:11434/api/chat`.
4. Payload: `{"model": "gemma4:e4b", "messages": messages, "stream": False, "keep_alive": 0}`.
5. Parses JSON response.

---

## PART 8 — KOKORO INVESTIGATION

**File:** `backend/speak.py`
**Process:**
1. Fixes Windows eSpeak paths dynamically.
2. Initializes `KPipeline(lang_code='a')`.
3. Synthesizes text using voice `af_heart`.
4. Writes to temporary WAV files.
5. Uses `pygame.mixer` to play the files sequentially.
6. Deletes temporary files.

---

## PART 9 — COMPLETE VOICE ASSISTANT LIFECYCLE (RECONSTRUCTED)

1. **USER SPEAKS**
2. **MICROPHONE** -> **[UNKNOWN/GAP]** The logic to record the mic to a file is missing.
3. **ORCHESTRATOR** -> Spawns `listen.py`.
4. **WHISPER** -> Loads, transcribes, dies.
5. **ORCHESTRATOR** -> Parses stdout for `TRANSCRIPT:`.
6. **ORCHESTRATOR** -> POST request to Ollama.
7. **GEMMA** -> Generates response, unloads.
8. **ORCHESTRATOR** -> Spawns `speak.py`.
9. **KOKORO** -> Generates WAV.
10. **PYGAME** -> Plays audio via speakers.

---

## PART 10 — FRONTEND ARCHAEOLOGY

**Major Decisions:**
1. **Zustand over Redux:** Chosen for simplicity and direct state mutation.
2. **React Router DOM HashRouter:** Appears to be used for compatibility with Tauri's static file serving (HashRouter avoids server-side routing issues in desktop apps).
3. **Pure CSS over Tailwind:** The developer explicitly maintained a massive `App.css` for glassmorphic styling rather than utility classes. **[INTENTION]** This provides total control over complex WebGL/UI layering.

---

## PART 11 — TAURI / RUST ARCHAEOLOGY

**History:** Tauri was heavily underutilized until commit `f61bbf8`.
**Current State:** Uses the `keyring` crate to store API keys securely.
**Python Integration:** **[FACT]** There is ZERO evidence in the Git history or source code of any attempt to use Tauri Sidecars or child processes to manage the Python backend. The two systems are completely disjointed.

---

## PART 12 — FRONTEND/BACKEND INTEGRATION HISTORY

**WHAT WAS ATTEMPTED:** Nothing.
**WHY:** **[INFERENCE]** The developer likely built the UI as a "mock" shell to perfect the visual experience before tackling the extreme complexity of bridging a React app to a fragile, VRAM-swapping Python CLI via IPC/WebSockets.
**CURRENT STATUS:** Non-existent.

---

## PART 13 — RAG / QDRANT HISTORY

**File:** `backend/documents.py`
**State:** Experimental.
**Implementation:** Uses `PyMuPDF` and `pytesseract` to extract text, chunks it, and pushes it to Qdrant via the `mem0` wrapper.
**Integration:** Not integrated. `orchestrator.py` does not import or use this file.

---

## PART 14 — EXPERIMENTS / DEAD ENDS

**EXPERIMENT 1:** `backend/llm.py`
* **GOAL:** Async OpenAI API calls.
* **RESULT:** Abandoned. `orchestrator.py` uses synchronous `requests.post` instead.

**EXPERIMENT 2:** `backend/documents.py`
* **GOAL:** RAG pipeline.
* **RESULT:** Unfinished CLI experiment.

---

## PART 15 — WHY QUESTIONS

* **WHY TAURI?** To access native OS features (keychain) while keeping a web stack.
* **WHY ZUSTAND?** Minimal boilerplate compared to Redux.
* **WHY `keep_alive=0`?** To prevent Ollama from hogging VRAM after inference, allowing Kokoro to load.
* **WHY NO WEBSOCKETS?** The backend was built as a simple blocking CLI. Adding async WebSockets would require rewriting `orchestrator.py` into an `asyncio` event loop.

---

## PART 16 — ENGINEERING TRADEOFFS

**DECISION: Subprocess VRAM Swapping**
* **PROBLEM:** OOM crashes.
* **APPROACH:** Cold-boot models via subprocesses and API flags.
* **ADVANTAGES:** 100% reliable VRAM eviction.
* **DISADVANTAGES:** Terrible latency (I/O bound loading).
* **WHY ACCEPTABLE:** It was the *only* way to run these specific massive models on consumer hardware.

---

## PART 17 — BEGINNER LEARNING DEPENDENCY GRAPH

To rebuild Orion, a beginner MUST learn concepts in this order:

**PHASE 1: THE SHELL (Frontend)**
HTML/CSS (Glassmorphism) -> React Components -> React Router -> Zustand (Global State & LocalStorage) -> Tauri (Desktop Wrapping).

**PHASE 2: THE BRAIN (Backend)**
Python Basics -> CLI Loops -> Subprocess Management (IPC via stdout) -> HTTP REST (Ollama API).

**PHASE 3: THE SENSES (AI)**
Hardware/CUDA Concepts -> VRAM Constraints -> Whisper (STT) -> Kokoro (TTS).

**PHASE 4: THE BRIDGE (Integration - Future)**
WebSockets / IPC -> Connecting React to Python.

---

## PART 18 — TEXTBOOK SOURCE MAP

* **Chapter 1: State Management** -> `useOrionStore.ts`
* **Chapter 2: Routing in Desktop Apps** -> `App.tsx`, `AppShell.tsx`
* **Chapter 3: Domain Driven Design in React** -> `src/domain/today/selectors.ts`
* **Chapter 4: Secure Native Storage** -> `src-tauri/src/lib.rs`
* **Chapter 5: Managing VRAM Constraints** -> `orchestrator.py`
* **Chapter 6: Subprocess IPC** -> `listen.py`, `speak.py`

---

## PART 19 — REBUILD PATH

**PROJECT 1:** A simple React Todo list with Zustand (teaches state).
**PROJECT 2:** A Python script that calls Ollama (teaches REST/LLMs).
**PROJECT 3:** A Python script that calls a subprocess and reads its output (teaches IPC).
**PROJECT 4:** A Python script that loads Whisper, transcribes a file, and proves VRAM drops after exit (teaches VRAM eviction).
**PROJECT 5:** Rebuild `orchestrator.py` CLI.
**PROJECT 6:** Wrap Project 1 in Tauri.
**PROJECT 7:** Combine all into Orion.

---

## PART 20 — KNOWLEDGE GAPS

1. **MISSING MIC RECORDING:** `listen.py` requires an audio file, but `orchestrator.py` doesn't pass one, nor does it record one. 
   * **WHY IT MATTERS:** The voice assistant cannot actually hear anything right now.
   * **CAN IT BE INFERRED:** No. The actual PyAudio/SoundDevice recording script is missing from the repository.

2. **MISSING FRONTEND BRIDGE:**
   * **WHAT IS MISSING:** Any code linking Python to React.
   * **CONFIDENCE:** FACT. The code simply doesn't exist.

---

## EVIDENCE INDEX

* **VRAM Eviction via Subprocess:** Verified in `backend/orchestrator.py`, line 21 (`hear()` function spawning `subprocess.run`).
* **VRAM Eviction via Ollama:** Verified in `backend/orchestrator.py`, line 60 (`"keep_alive": 0`).
* **Missing Mic Logic:** Verified in `backend/listen.py`, line 35 (`sys.argv[1]` required but not supplied by orchestrator).
* **Rust Keychain:** Verified in `src-tauri/src/lib.rs`, line 8.
* **React State:** Verified in `orion-ui/src/store/useOrionStore.ts`.
