"""
ORION - The Ears (Speech-to-Text - File Mode)
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

try:
    from backend.hardware_detector import detect_hardware
except ImportError:
    from hardware_detector import detect_hardware


def log(msg):
    """Print status messages to stderr so they don't pollute stdout."""
    print(msg, file=sys.stderr, flush=True)


def transcribe_file(file_path):
    hw = detect_hardware()
    has_cuda = hw.get("has_cuda", False)

    model = None
    if has_cuda:
        try:
            log("Loading Whisper onto GPU...")
            model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
            log("✅ Whisper is loaded on GPU!")
        except Exception as e:
            log(f"⚠️ GPU loading failed ({e}). Falling back to CPU...")
            model = None

    if model is None:
        log("Loading Whisper base on CPU...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        log("✅ Whisper loaded on CPU!")

    log(f"Transcribing {file_path}...")
    whisper_prompt = "The user's name is Sriram Roshan. This is a voice assistant for task management and scheduling."

    segments, info = model.transcribe(
        file_path,
        language="en",
        initial_prompt=whisper_prompt,
        beam_size=5,
    )
    full_text = " ".join([segment.text for segment in segments]).strip()

    # This is the ONLY line that goes to stdout
    print(f"TRANSCRIPT:{full_text}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        log("Error: No audio file provided.")
        sys.exit(1)

    audio_file = sys.argv[1]
    if not os.path.exists(audio_file):
        log(f"Error: File {audio_file} not found.")
        sys.exit(1)

    transcribe_file(audio_file)
