"""
ORION - The Mouth (Text-to-Speech)
Uses Kokoro for ultra-realistic offline voice synthesis.
Designed to be spawned as a subprocess by the Orchestrator.
Usage: python speak.py "Text to speak here"
"""
import os
import sys
import pygame
import soundfile as sf

# --- WINDOWS ESPEAK FIX ---
if os.name == 'nt':
    espeak_path = r"C:\Program Files\eSpeak NG"
    os.environ["PATH"] = f"{espeak_path};{os.environ.get('PATH', '')}"
# --------------------------

from kokoro import KPipeline

def log(msg):
    """Print status messages to stderr so they don't pollute stdout."""
    print(msg, file=sys.stderr, flush=True)

log("Loading Kokoro AI Voice Model...")
pipeline = KPipeline(lang_code='a')

pygame.mixer.init()

def speak(text):
    log(f"\n🗣️ ORION: {text}")
    
    generator = pipeline(text, voice='af_heart', speed=1)
    
    for i, (gs, ps, audio) in enumerate(generator):
        output_file = f"temp_response_{i}.wav"
        sf.write(output_file, audio, 24000)
        
        pygame.mixer.music.load(output_file)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)
        
        pygame.mixer.music.unload()
        os.remove(output_file)
    
    # Signal to orchestrator that speaking is done
    print("SPEAK_DONE", flush=True)

if __name__ == "__main__":
    # Accept text from command line argument
    if len(sys.argv) > 1:
        text_to_speak = " ".join(sys.argv[1:])
    else:
        text_to_speak = "Hello Sriram. I am ORION. My voice is fully operational."
    
    speak(text_to_speak)
