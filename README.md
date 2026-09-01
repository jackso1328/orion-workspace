<div align="center">
  <h1>Orion Workspace 🌌</h1>
  <p>A futuristic, highly-personalized OS and productivity workspace powered by an ambient, local AI assistant.</p>
</div>

---

## 🚀 Overview

**Orion Workspace** is a custom-built, sci-fi-inspired personal operating system designed to centralize your productivity, learning, teaching, and research workflows. It merges a premium glassmorphic UI with a powerful, locally-hosted AI backend capable of VRAM hot-swapping.

The system is currently divided into two primary, disconnected architectures:
1. **The UI Shell (React/Tauri)**: A massive suite of productivity tools segmented by context (Modes).
2. **The AI Engine (Python)**: A high-performance, strictly synchronous local AI pipeline that manages GPU memory aggressively.

## 🏗️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Zustand, React Router DOM, Tiptap, Lucide-React.
* **Desktop Runtime:** Tauri v2, Rust (used for OS keychain access via `keyring`).
* **Backend AI Orchestration:** Python 3.10+.
* **Local Inference:** `faster-whisper` (STT), `ollama` (running `gemma4:e4b`), `Kokoro` (TTS).
* **Storage:** `localStorage` (UI state), Qdrant (Vector memory - experimental).
* **Styling:** Vanilla CSS (CSS variables, Glassmorphism, CSS Animations).

## 🪐 Workspace Modes & Modules

Orion adapts to your current context using a dedicated **Mode Selector**, exposing completely different routing and toolsets:

### 📚 Study Mode
- **Syllabus Tracker**: Map out semesters and track completion.
- **Study Analytics**: Data on spacing intervals and retention.
- **Planner & Calendar**: Schedule study sessions.
- **Exams, Quizzes, Flashcards**: Built-in review systems.

### 🔬 Research Mode
- **Citation Manager**: Handle bibliographies and paper references.
- **Hypothesis Tracker**: Track research proposals and validation.
- **Data & Experiment Logs**: Structured journaling for lab data.
- **Whiteboard**: Free-form canvas for architecture diagrams.

### 💻 Developer Mode
- **Code Snippets**: Storing and searching reusable algorithms.
- **Issue Tracker**: Kanban style bug and feature tracking.
- **API Documentation**: Endpoint references.
- **Architecture**: System design and diagrams.

### 🎓 Teaching Mode
- **Lesson Planner**: Build curriculums.
- **Student Roster**: Track performance and attendance.
- **Communications**: Broadcast announcements.

### 💼 Professional Mode
- **Meetings & Agendas**: Prep and track outcomes.
- **Time Tracking**: Log professional hours.
- **Network / Contacts**: Manage professional relationships.

## 🧠 The Local AI Architecture (VRAM Hot-Swapping)

Orion is designed to run entirely locally on consumer hardware. Because loading a powerful LLM, a Whisper transcription model, and a Kokoro TTS model simultaneously would crash most GPUs (Out Of Memory), the backend employs a strict **Process-Lifetime VRAM Eviction Strategy**.

**The Pipeline:**
1. **Hear:** Subprocess runs Whisper -> Transcribes -> Dies -> **VRAM Freed**.
2. **Think:** Orchestrator calls Ollama with `keep_alive=0` -> Infers -> **VRAM Freed**.
3. **Speak:** Subprocess runs Kokoro -> Synthesizes Speech -> Dies -> **VRAM Freed**.

At no point are two AI models in VRAM at the same time.

## ⚙️ Installation & Setup

### 1. The Frontend (UI Shell)
The frontend uses Tauri to run as a native desktop application.
```bash
# Navigate to the frontend directory
cd orion-ui

# Install dependencies
npm install

# Run the development server
npm run tauri dev
```

### 2. The Backend (AI Engine)
The backend is a standalone Python CLI that currently operates independently of the UI.
```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the Orchestrator
python main.py
```

## ⚠️ Current Status & Technical Debt

* ✅ **FRONTEND UI:** Working. Visually complete, local state (Zustand) is fully wired for 15+ domains.
* 🟡 **LOCAL AI PIPELINE:** Partially Working. Operates via CLI with high latency due to cold-booting models to manage VRAM.
* 🚧 **FRONTEND-TO-BACKEND SYNC:** Not Implemented. The React UI and Python backend are not yet talking to each other (Planned via HTTP/WebSockets).
* 🧪 **RAG / DOCUMENTS:** Experimental. Vector DB chunking scripts exist but are not integrated.

*Note: All UI data is currently stored in browser `localStorage`. Heavy usage will require migration to a local database (e.g., SQLite via Tauri).*
