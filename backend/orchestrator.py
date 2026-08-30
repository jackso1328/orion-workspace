"""
ORION - The Orchestrator (Brain Stem)
This is the master controller that coordinates the VRAM Hot-Swap pipeline.

Pipeline per conversation turn:
  1. HEAR  → Spawns listen.py → Whisper loads on GPU → Transcribes → Process dies → VRAM freed
  2. THINK → Calls Ollama API with keep_alive=0 → Gemma generates response → VRAM freed
  3. SPEAK → Spawns speak.py  → Kokoro loads → Speaks → Process dies → VRAM freed

At no point are two models on the GPU simultaneously.
"""
import subprocess
import sys
import os
import requests

# ============================================================
# CONFIGURATION
# ============================================================
PYTHON_EXE = os.path.join(sys.prefix, "Scripts", "python.exe")
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
LISTEN_SCRIPT = os.path.join(BACKEND_DIR, "listen.py")
SPEAK_SCRIPT = os.path.join(BACKEND_DIR, "speak.py")

OLLAMA_URL = "http://localhost:11434/api/chat"
LLM_MODEL = "gemma4:e4b"

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
    Whisper loads onto the GPU, transcribes, and the process dies.
    VRAM is immediately freed when the process exits.
    """
    print("\n" + "="*50)
    print("👂 ORION IS LISTENING...")
    print("="*50)
    
    result = subprocess.run(
        [PYTHON_EXE, LISTEN_SCRIPT],
        capture_output=True,
        text=True,
        cwd=BACKEND_DIR
    )
    
    # Status logs went to stderr, display them
    if result.stderr:
        for line in result.stderr.strip().split('\n'):
            print(f"  {line}")
    
    # Parse the transcript from stdout
    transcript = ""
    for line in result.stdout.strip().split('\n'):
        if line.startswith("TRANSCRIPT:"):
            transcript = line.replace("TRANSCRIPT:", "").strip()
    
    if not transcript:
        print("⚠️ Could not hear anything. Please try again.")
        return None
    
    print(f"\n📝 You said: \"{transcript}\"")
    return transcript


# ============================================================
# PHASE 2: THINK (LLM via Ollama API)
# ============================================================
def think(user_message, conversation_history):
    """
    Sends the user's message to Ollama's REST API.
    Uses keep_alive=0 to force Ollama to unload the model from VRAM
    immediately after generating the response.
    """
    print("\n🧠 ORION IS THINKING...")
    
    # Build the messages array with conversation history
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "stream": False,
                "keep_alive": 0  # THE SECRET WEAPON: Instantly unload from VRAM after response
            },
            timeout=120  # 2 minute timeout for slow CPU inference
        )
        response.raise_for_status()
        
        reply = response.json()["message"]["content"]
        print(f"\n💬 ORION: {reply}")
        return reply
        
    except requests.exceptions.ConnectionError:
        error_msg = "I cannot reach my brain. Is Ollama running? Start it with: ollama serve"
        print(f"\n❌ {error_msg}")
        return error_msg
    except requests.exceptions.Timeout:
        error_msg = "My brain took too long to respond. The model may be loading."
        print(f"\n❌ {error_msg}")
        return error_msg
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
    
    result = subprocess.run(
        [PYTHON_EXE, SPEAK_SCRIPT, text],
        capture_output=False,  # Let audio play through the speakers
        text=True,
        cwd=BACKEND_DIR
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
            
            # Save to conversation history (keep last 6 exchanges to stay within context window)
            conversation_history.append({"role": "user", "content": user_text})
            conversation_history.append({"role": "assistant", "content": reply})
            if len(conversation_history) > 12:  # 6 exchanges x 2 messages each
                conversation_history = conversation_history[-12:]
            
            # --- SPEAK ---
            speak(reply)
            
        except KeyboardInterrupt:
            print("\n\n👋 ORION has shut down gracefully. Goodbye!")
            break

if __name__ == "__main__":
    main()
