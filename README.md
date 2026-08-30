<div align="center">
  <h1>Orion Workspace 🌌</h1>
  <p>A futuristic, personalized OS and productivity workspace powered by an ambient AI assistant.</p>
</div>

---

## 📖 Overview

**Orion Workspace** is a custom-built, sci-fi-inspired personal operating system designed to centralize your productivity, learning, and research workflows. It merges a premium glassmorphic UI with a powerful AI backend.

At the core of the workspace is **Orion**—an ambient, interactive AI assistant represented by a fluid, WebGL-powered glowing energy entity. Orion is not just a chatbox; it is an intelligent, voice-capable agent that helps you navigate your daily tasks, summarize notes, and learn new concepts.

## ✨ Current Features & Modules

The workspace is divided into three main operational pillars:

### 1. Workspace & Dashboard
- **Operational Dashboard:** Real-time task tracking with visual streaks, completion stats, and an integrated daily calendar.
- **Talk to Orion:** The central AI hub featuring a custom 3D WebGL glowing energy orb. Allows for natural, ambient interactions with the AI.
- **Pomodoro Timer:** Integrated focus timers to maintain productivity.

### 2. Learning Hub
- **Study Planner & Goals:** Manage your learning objectives and schedule.
- **Course & Assignment Management:** Track ongoing coursework, upcoming deadlines, and grades.
- **Exams & Quizzes:** Specialized modules for test preparation.
- **Flashcards:** Built-in review system for active recall.

### 3. Knowledge & Research
- **Notes System & Document Reader:** Centralized knowledge base for all your reading and writing.
- **Digital Whiteboard:** Free-form canvas for brainstorming and architecture diagrams.

## 🚀 Installation & Setup

Orion Workspace consists of a **Python Backend** for the AI logic and a **Tauri + React (TypeScript)** Frontend.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (Required for Tauri)
- [Python 3.10+](https://www.python.org/)

### 1. Backend Setup
The Python backend handles the LLM orchestration, voice transcription, speech synthesis, and memory.
`ash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv .venv
# On Windows: 
.venv\Scripts\activate

# Install the dependencies
pip install -r requirements.txt

# Run the backend server
python main.py
`

### 2. Frontend Setup
The frontend is built with React, Vite, and Tauri for native desktop capabilities.
`ash
# Navigate to the frontend directory
cd orion-ui

# Install dependencies
npm install

# Run the development server
npm run tauri dev
`

## 🔮 Future Scope & Roadmap

Orion is continuously evolving. Planned features include:
- **Spaced-Repetition System (SRS):** Full integration of an algorithm-driven flashcard review system.
- **Advanced Document Parsing:** Ability for Orion to automatically read and summarize large PDFs and research papers directly from the Document Reader.
- **Voice Activation (Wake Word):** Hands-free interaction.
- **Developer Portfolio Module:** A built-in tracker for programming challenges and personal dev projects.
- **Advanced 3D Interactions:** Expanding the WebGL orb to react physically to audio frequency and voice tone.

## 🛠️ Technology Stack
- **Frontend:** React, TypeScript, Vite, CSS (Glassmorphism), Three.js (WebGL).
- **Desktop Framework:** Tauri (Rust).
- **Backend:** Python.
