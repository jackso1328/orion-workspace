"""
ORION - The Orchestrator (Brain Stem)
This is the master controller that coordinates the VRAM Hot-Swap pipeline.

Pipeline per conversation turn:
  1. HEAR  → Spawns listen.py → Whisper loads on GPU/CPU → Transcribes → Process dies → VRAM freed
  2. THINK → Calls Unified Hybrid Router (backend/llm.py) → Generates response → VRAM freed
  3. SPEAK → Spawns speak.py  → Kokoro loads → Speaks → Process dies → VRAM freed

At no point are two large models on the GPU simultaneously.
"""
import subprocess
import sys
import os
import asyncio

# --- WINDOWS UTF-8 ENCODING RESILIENCE ---
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
# -----------------------------------------

# ============================================================
# CONFIGURATION
# ============================================================
PYTHON_EXE = os.path.join(sys.prefix, "Scripts", "python.exe")
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
LISTEN_SCRIPT = os.path.join(BACKEND_DIR, "listen.py")
SPEAK_SCRIPT = os.path.join(BACKEND_DIR, "speak.py")

try:
    from backend.llm import generate_response
except ImportError:
    from llm import generate_response

SYSTEM_PROMPT = (
    "You are ORION, a strict, highly logical AI Chief Operating Officer. "
    "You help the user manage their academic schedule, tasks, and productivity. "
    "You give short, precise, and actionable answers. "
    "The user's name is Sriram Roshan."
)


# ============================================================
# PHASE 1: HEAR (Speech-to-Text via Whisper)
# ============================================================
def hear():
    """
    Spawns listen.py as an isolated subprocess.
    Whisper loads, transcribes, and the process exits.
    VRAM is immediately freed when the process exits.
    """
    print("\n" + "=" * 50)
    print("👂 ORION IS LISTENING...")
    print("=" * 50)

    result = subprocess.run(
        [PYTHON_EXE, LISTEN_SCRIPT],
        capture_output=True,
        text=True,
        cwd=BACKEND_DIR,
    )

    # Status logs went to stderr, display them
    if result.stderr:
        for line in result.stderr.strip().split("\n"):
            print(f"  {line}")

    # Parse the transcript from stdout
    transcript = ""
    for line in result.stdout.strip().split("\n"):
        if line.startswith("TRANSCRIPT:"):
            transcript = line.replace("TRANSCRIPT:", "").strip()

    if not transcript:
        print("⚠️ Could not hear anything. Please try again.")
        return None

    print(f'\n📝 You said: "{transcript}"')
    return transcript


# ============================================================
# PHASE 2: THINK (Hybrid LLM Router)
# ============================================================
def think(user_message, conversation_history):
    """
    Routes the prompt through the Hybrid Router:
    Cloud API -> Local GGUF -> Inactive notice.
    """
    print("\n🧠 ORION IS THINKING...")

    # Build contextual prompt with conversation history
    context = ""
    if conversation_history:
        recent = conversation_history[-6:]
        context = "Recent conversation:\n" + "\n".join(
            [f"{m['role'].capitalize()}: {m['content']}" for m in recent]
        ) + "\n\n"

    full_prompt = f"{context}User: {user_message}"

    try:
        reply = asyncio.run(generate_response(full_prompt, system_prompt=SYSTEM_PROMPT))
        print(f"\n💬 ORION: {reply}")
        return reply
    except Exception as e:
        error_msg = f"Brain error: {str(e)}"
        print(f"\n❌ {error_msg}")
        return error_msg


# ============================================================
# PHASE 3: SPEAK (Text-to-Speech via Kokoro)
# ============================================================
def speak(text):
    """
    Spawns speak.py as an isolated subprocess with the text as an argument.
    Kokoro loads, synthesizes speech, plays it, and the process dies.
    VRAM is immediately freed when the process exits.
    """
    print("\n🗣️ ORION IS SPEAKING...")

    subprocess.run(
        [PYTHON_EXE, SPEAK_SCRIPT, text],
        capture_output=False,  # Let audio play through the speakers
        text=True,
        cwd=BACKEND_DIR,
    )


# ============================================================
# MAIN LOOP: The Conversation Engine
# ============================================================
def main():
    print("=" * 60)
    print("  ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗")
    print("  ██╔═══██╗██╔══██╗██║██╔═══██╗████╗  ██║")
    print("  ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║")
    print("  ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║")
    print("  ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║")
    print("   ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝")
    print("=" * 60)
    print("  Your AI Chief Operating Officer")
    print("  Voice-Activated  •  Local  •  Private")
    print("=" * 60)
    print("\n  Press Ctrl+C at any time to exit.\n")

    conversation_history = []

    while True:
        try:
            # --- HEAR ---
            user_text = hear()
            if user_text is None:
                continue

            # Check for exit commands
            exit_phrases = ["exit", "quit", "stop", "goodbye", "shut down", "bye"]
            if any(phrase in user_text.lower() for phrase in exit_phrases):
                speak("Goodbye Sriram. I will be here when you need me.")
                print("\n👋 ORION has shut down gracefully.")
                break

            # --- THINK ---
            reply = think(user_text, conversation_history)

            # Save to conversation history
            conversation_history.append({"role": "user", "content": user_text})
            conversation_history.append({"role": "assistant", "content": reply})
            if len(conversation_history) > 12:
                conversation_history = conversation_history[-12:]

            # --- SPEAK ---
            speak(reply)

        except KeyboardInterrupt:
            print("\n\n👋 ORION has shut down gracefully. Goodbye!")
            break


if __name__ == "__main__":
    main()
