"""
ORION - The Ears (Speech-to-Text - Live Microphone)
Uses faster-whisper with hardware-adaptive GPU acceleration and CPU fallback.
Designed to be spawned as a subprocess by the Orchestrator or FastAPI backend.
Output format: Prints "TRANSCRIPT:<text>" to stdout for the caller to parse.
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
logging.basicConfig(level=logging.WARNING)

from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np

try:
    from backend.hardware_detector import detect_hardware
except ImportError:
    from hardware_detector import detect_hardware


def log(msg):
    """Print status messages to stderr so they don't pollute stdout for caller."""
    print(msg, file=sys.stderr, flush=True)


def get_whisper_model():
    hw = detect_hardware()
    has_cuda = hw.get("has_cuda", False)

    if has_cuda:
        try:
            log("Loading Whisper large-v3-turbo onto GPU...")
            m = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
            log("✅ Whisper is loaded on GPU!")
            return m
        except Exception as e:
            log(f"⚠️ GPU Whisper loading failed ({e}). Falling back to CPU...")

    log("Loading Whisper base on CPU...")
    m = WhisperModel("base", device="cpu", compute_type="int8")
    log("✅ Whisper loaded on CPU!")
    return m


MIC_DEVICE_ID = None  # None uses default input device
WHISPER_PROMPT = "The user's name is Sriram Roshan. This is a voice assistant for task management and scheduling."


def record_audio(duration=5, fs=16000):
    log(f"\n🎤 RECORDING FOR {duration} SECONDS... SPEAK NOW!")
    recording = sd.rec(
        int(duration * fs),
        samplerate=fs,
        channels=1,
        dtype=np.float32,
        device=MIC_DEVICE_ID,
    )
    sd.wait()
    log("✅ Recording complete. Transcribing...")
    return recording.flatten()


def transcribe():
    try:
        model = get_whisper_model()
        audio_data = record_audio()
        segments, info = model.transcribe(
            audio_data,
            language="en",
            initial_prompt=WHISPER_PROMPT,
            beam_size=5,
        )
        full_text = " ".join([segment.text for segment in segments]).strip()
        print(f"TRANSCRIPT:{full_text}", flush=True)
    except Exception as e:
        log(f"Transcription error: {e}")
        print("TRANSCRIPT:", flush=True)


if __name__ == "__main__":
    transcribe()
