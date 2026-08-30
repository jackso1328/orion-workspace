"""
ORION - The Ears (Speech-to-Text)
Uses faster-whisper with GPU acceleration to transcribe microphone input.
Designed to be spawned as a subprocess by the Orchestrator.
Output format: Prints "TRANSCRIPT:<text>" to stdout for the Orchestrator to parse.
"""
import os
import sys

# --- WINDOWS CUDA FIX ---
if os.name == 'nt':
    cublas_path = os.path.join(sys.prefix, "Lib", "site-packages", "nvidia", "cublas", "bin")
    cudnn_path = os.path.join(sys.prefix, "Lib", "site-packages", "nvidia", "cudnn", "bin")
    os.environ["PATH"] = f"{cublas_path};{cudnn_path};{os.environ.get('PATH', '')}"
# ------------------------

import logging
logging.basicConfig(level=logging.WARNING)  # Suppress INFO logs so orchestrator gets clean output

from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np

def log(msg):
    """Print status messages to stderr so they don't pollute stdout for the orchestrator."""
    print(msg, file=sys.stderr, flush=True)

# Load model
log("Loading Whisper large-v3-turbo onto GPU...")
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
log("✅ Whisper is loaded on GPU!")

MIC_DEVICE_ID = 1
WHISPER_PROMPT = "The user's name is Sriram Roshan. This is a voice assistant for task management and scheduling."

def record_audio(duration=7, fs=16000):
    log(f"\n🎤 RECORDING FOR {duration} SECONDS... SPEAK NOW!")
    recording = sd.rec(
        int(duration * fs),
        samplerate=fs,
        channels=1,
        dtype=np.float32,
        device=MIC_DEVICE_ID
    )
    sd.wait()
    log("✅ Recording complete. Thinking...")
    return recording.flatten()

def transcribe():
    audio_data = record_audio()
    segments, info = model.transcribe(
        audio_data,
        language="en",
        initial_prompt=WHISPER_PROMPT,
        beam_size=5
    )
    full_text = " ".join([segment.text for segment in segments]).strip()
    
    # This is the ONLY line that goes to stdout — the orchestrator reads this.
    print(f"TRANSCRIPT:{full_text}", flush=True)

if __name__ == "__main__":
    transcribe()
