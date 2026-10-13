"""
ORION - Model Download Manager
Thread-safe, resumable GGUF model downloader with pause/resume/cancel.

Features:
  - HTTP Range-based resumable downloads (survives network drops)
  - Thread-safe state machine (idle → downloading → paused → completed | error)
  - Real-time progress metrics (bytes, percent, speed, ETA)
  - Partial file preservation on pause (.part files)
  - Atomic rename on completion
  - Model deletion with disk cleanup
  - Dual-case dictionary serialization (snake_case + camelCase) for seamless UI binding
"""
import os
import time
import threading
import logging
from pathlib import Path
from enum import Enum
from dataclasses import dataclass, asdict

import requests

try:
    from backend.hardware_detector import detect_hardware, MODEL_CATALOG
except ImportError:
    from hardware_detector import detect_hardware, MODEL_CATALOG

logger = logging.getLogger("orion.model_manager")

# ── Configuration ──────────────────────────────────────────────

if os.name == "nt":
    MODEL_DIR = Path(os.environ.get("LOCALAPPDATA", "~")) / "Orion" / "models"
else:
    MODEL_DIR = Path.home() / ".orion" / "models"


class DownloadStatus(str, Enum):
    IDLE = "idle"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class DownloadProgress:
    status: str = DownloadStatus.IDLE
    model_name: str = ""
    total_bytes: int = 0
    downloaded_bytes: int = 0
    percent: float = 0.0
    speed_mbps: float = 0.0
    eta_seconds: float = 0.0
    error: str = ""

    def to_dict(self) -> dict:
        """Returns dictionary containing both snake_case and camelCase keys for UI compatibility."""
        return {
            # snake_case
            "status": self.status,
            "model_name": self.model_name,
            "total_bytes": self.total_bytes,
            "downloaded_bytes": self.downloaded_bytes,
            "percent": self.percent,
            "speed_mbps": self.speed_mbps,
            "eta_seconds": self.eta_seconds,
            "error": self.error,
            # camelCase (Zustand store & React components)
            "modelName": self.model_name,
            "totalBytes": self.total_bytes,
            "downloadedBytes": self.downloaded_bytes,
            "speedMbps": self.speed_mbps,
            "etaSeconds": self.eta_seconds,
        }


class ModelManager:
    """
    Singleton-style download manager.
    All public methods are thread-safe.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._progress = DownloadProgress()
        self._thread: threading.Thread | None = None
        self._pause_event = threading.Event()   # clear = paused, set = running
        self._cancel_event = threading.Event()  # set = cancel requested
        self._pause_event.set()  # start in "running" mode

        # Hardware & model profile (detected once at init)
        self._hw = detect_hardware()
        self._profile = dict(self._hw["model"])

        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        # Check if an existing catalog model is already on disk
        for prof_key, prof_val in MODEL_CATALOG.items():
            candidate = MODEL_DIR / prof_val["filename"]
            if candidate.exists():
                self._profile = dict(prof_val)
                if self._hw.get("has_cuda"):
                    self._profile["n_gpu_layers"] = -1
                break

        self._progress.model_name = self._profile["model_name"]
        self._progress.total_bytes = self._profile["size_bytes"]

        # Check if already completed on disk
        if self.model_exists:
            self._progress.status = DownloadStatus.COMPLETED
            self._progress.percent = 100.0
            self._progress.downloaded_bytes = self._profile["size_bytes"]
        elif self.part_path.exists():
            part_size = self.part_path.stat().st_size
            self._progress.status = DownloadStatus.PAUSED
            self._progress.downloaded_bytes = part_size
            if self._profile["size_bytes"] > 0:
                self._progress.percent = round((part_size / self._profile["size_bytes"]) * 100, 2)

    # ── Properties ─────────────────────────────────────────────

    @property
    def model_path(self) -> Path:
        primary = MODEL_DIR / self._profile["filename"]
        if primary.exists():
            return primary
        for prof_key, prof_val in MODEL_CATALOG.items():
            candidate = MODEL_DIR / prof_val["filename"]
            if candidate.exists():
                return candidate
        return primary

    @property
    def part_path(self) -> Path:
        return MODEL_DIR / (self._profile["filename"] + ".part")

    @property
    def model_exists(self) -> bool:
        return self.model_path.exists()

    @property
    def progress(self) -> DownloadProgress:
        with self._lock:
            return DownloadProgress(
                status=self._progress.status,
                model_name=self._progress.model_name,
                total_bytes=self._progress.total_bytes,
                downloaded_bytes=self._progress.downloaded_bytes,
                percent=self._progress.percent,
                speed_mbps=self._progress.speed_mbps,
                eta_seconds=self._progress.eta_seconds,
                error=self._progress.error,
            )

    @property
    def hardware_info(self) -> dict:
        return self._hw

    @property
    def model_info(self) -> dict:
        return self._profile

    # ── Public API ─────────────────────────────────────────────

    def get_status(self) -> dict:
        """Full status snapshot for the /api/ai/status endpoint."""
        # Ensure self._profile stays in sync with on-disk model if present
        if not (MODEL_DIR / self._profile["filename"]).exists():
            for prof_key, prof_val in MODEL_CATALOG.items():
                if (MODEL_DIR / prof_val["filename"]).exists():
                    self._profile = dict(prof_val)
                    if self._hw.get("has_cuda"):
                        self._profile["n_gpu_layers"] = -1
                    self._progress.model_name = self._profile["model_name"]
                    self._progress.total_bytes = self._profile["size_bytes"]
                    self._progress.status = DownloadStatus.COMPLETED
                    self._progress.percent = 100.0
                    self._progress.downloaded_bytes = self._profile["size_bytes"]
                    break

        p = self.progress
        p_dict = p.to_dict()

        engine = "none"
        if self.model_exists and p.status != DownloadStatus.DOWNLOADING:
            engine = "local"

        has_gpu = bool(self._hw.get("has_cuda"))
        device_type = "gpu" if has_gpu else "cpu"
        device_name = self._hw.get("gpu", {}).get("name", "NVIDIA Dedicated GPU") if has_gpu else self._hw.get("cpu", {}).get("name", "Multi-core CPU")

        return {
            "engine": engine,
            "model_exists": self.model_exists,
            "modelExists": self.model_exists,
            "model_path": str(self.model_path),
            "model_size_formatted": self._profile["size_formatted"],
            "modelSizeFormatted": self._profile["size_formatted"],
            "execution_device": device_type,
            "executionDevice": device_type,
            "device_name": device_name,
            "deviceName": device_name,
            "gpu_accelerated": has_gpu,
            "gpuAccelerated": has_gpu,
            "download_state": p_dict,
            "downloadProgress": p_dict,
            "hardware": {
                "cpu": self._hw["cpu"],
                "gpu": self._hw["gpu"],
                "has_cuda": self._hw["has_cuda"],
                "vram_free_mb": self._hw.get("vram_free_mb", 0),
                "vram_total_mb": self._hw.get("vram_total_mb", 0),
                "selected_profile": self._hw["selected_profile"],
            },
            "model_info": {
                "name": self._profile["model_name"],
                "filename": self._profile["filename"],
                "size_formatted": self._profile["size_formatted"],
                "n_gpu_layers": -1 if has_gpu else 0,
                "requires_gpu": self._profile.get("requires_gpu", False),
                "execution_mode": "GPU Accelerated" if has_gpu else "CPU Mode",
            },
        }

    def start_download(self) -> dict:
        """Begin or restart the model download in a background thread."""
        with self._lock:
            if self._progress.status == DownloadStatus.DOWNLOADING:
                return {"detail": "Download already in progress"}

            if self.model_exists:
                self._progress.status = DownloadStatus.COMPLETED
                self._progress.percent = 100.0
                return {"detail": "Model already downloaded"}

            self._cancel_event.clear()
            self._pause_event.set()
            self._progress.status = DownloadStatus.DOWNLOADING
            self._progress.error = ""

        self._thread = threading.Thread(target=self._download_worker, daemon=True)
        self._thread.start()
        return {"detail": "Download started"}

    def pause_download(self) -> dict:
        """Pause the active download. Partial file is preserved."""
        with self._lock:
            if self._progress.status != DownloadStatus.DOWNLOADING:
                return {"detail": "No active download to pause"}
            self._pause_event.clear()
            self._progress.status = DownloadStatus.PAUSED
            self._progress.speed_mbps = 0.0
        return {"detail": "Download paused"}

    def resume_download(self) -> dict:
        """Resume a paused download from saved byte offset."""
        with self._lock:
            if self._progress.status == DownloadStatus.DOWNLOADING:
                return {"detail": "Download already running"}

            # If the thread died or wasn't running, start it
            if self._thread is None or not self._thread.is_alive():
                self._cancel_event.clear()
                self._pause_event.set()
                self._progress.status = DownloadStatus.DOWNLOADING
                self._progress.error = ""
                self._thread = threading.Thread(target=self._download_worker, daemon=True)
                self._thread.start()
                return {"detail": "Download resumed"}

            self._pause_event.set()
            self._progress.status = DownloadStatus.DOWNLOADING
        return {"detail": "Download resumed"}

    def cancel_download(self) -> dict:
        """Cancel download and remove partial file."""
        with self._lock:
            self._cancel_event.set()
            self._pause_event.set()  # unblock if paused
            self._progress.status = DownloadStatus.IDLE
            self._progress.downloaded_bytes = 0
            self._progress.percent = 0.0
            self._progress.speed_mbps = 0.0

        # Wait briefly for thread to exit
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3)

        # Remove partial file
        if self.part_path.exists():
            try:
                self.part_path.unlink()
            except OSError:
                pass

        return {"detail": "Download cancelled"}

    def delete_model(self) -> dict:
        """Delete the downloaded model file to free disk space."""
        self.cancel_download()

        deleted = False
        for path in [self.model_path, self.part_path]:
            if path.exists():
                try:
                    path.unlink()
                    deleted = True
                except OSError as e:
                    logger.error("Failed to delete %s: %s", path, e)

        with self._lock:
            self._progress = DownloadProgress(
                model_name=self._profile["model_name"],
                total_bytes=self._profile["size_bytes"],
            )

        return {"detail": "Model deleted" if deleted else "No model file found"}

    # ── Download Worker (runs in background thread) ────────────

    def _download_worker(self):
        """Stream-download the GGUF file with resume support."""
        profile = self._profile
        url = self._build_download_url(profile)

        # Determine starting byte offset from existing .part file
        existing_bytes = 0
        if self.part_path.exists():
            existing_bytes = self.part_path.stat().st_size

        headers = {}
        if existing_bytes > 0:
            headers["Range"] = f"bytes={existing_bytes}-"
            logger.info("Resuming download from byte %d", existing_bytes)

        try:
            resp = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)

            # Handle range response
            if resp.status_code == 416:
                # Range not satisfiable — file is already complete
                self._finalize_download(existing_bytes)
                return

            if resp.status_code not in (200, 206):
                raise requests.HTTPError(
                    f"HTTP {resp.status_code}: {resp.reason}", response=resp
                )

            # Determine total size
            if resp.status_code == 206:
                content_range = resp.headers.get("Content-Range", "")
                if "/" in content_range:
                    total = int(content_range.split("/")[-1])
                else:
                    total = existing_bytes + int(resp.headers.get("Content-Length", 0))
            else:
                total = int(resp.headers.get("Content-Length", profile["size_bytes"]))
                existing_bytes = 0  # server didn't honor Range, start over

            with self._lock:
                self._progress.total_bytes = total
                self._progress.downloaded_bytes = existing_bytes

            mode = "ab" if existing_bytes > 0 and resp.status_code == 206 else "wb"
            chunk_size = 1024 * 256  # 256 KB chunks
            speed_window_start = time.monotonic()
            speed_window_bytes = 0

            with open(self.part_path, mode) as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    # Check cancel
                    if self._cancel_event.is_set():
                        logger.info("Download cancelled by user")
                        return

                    # Check pause (blocks here until resumed)
                    self._pause_event.wait()

                    if chunk:
                        f.write(chunk)
                        bytes_written = len(chunk)

                        with self._lock:
                            self._progress.downloaded_bytes += bytes_written
                            if self._progress.total_bytes > 0:
                                self._progress.percent = round(
                                    (self._progress.downloaded_bytes / self._progress.total_bytes) * 100,
                                    2,
                                )

                        # Speed calculation (rolling window)
                        speed_window_bytes += bytes_written
                        elapsed = time.monotonic() - speed_window_start
                        if elapsed >= 0.5:
                            speed_bps = speed_window_bytes / elapsed
                            speed_mbps = round(speed_bps / (1024 * 1024), 2)
                            remaining = total - self._progress.downloaded_bytes
                            eta = round(remaining / speed_bps, 1) if speed_bps > 0 else 0.0

                            with self._lock:
                                self._progress.speed_mbps = speed_mbps
                                self._progress.eta_seconds = eta

                            speed_window_start = time.monotonic()
                            speed_window_bytes = 0

            # Download complete — atomic rename
            self._finalize_download(total)

        except requests.ConnectionError:
            self._set_error("Network error: Could not connect to download server. Check your internet connection.")
        except requests.Timeout:
            self._set_error("Download timed out. Please retry.")
        except Exception as e:
            self._set_error(f"Download failed: {str(e)}")
            logger.exception("Download worker error")

    def _finalize_download(self, total_bytes: int):
        """Rename .part → final and update status to completed."""
        try:
            if self.part_path.exists():
                if self.model_path.exists():
                    self.model_path.unlink()
                self.part_path.rename(self.model_path)

            with self._lock:
                self._progress.status = DownloadStatus.COMPLETED
                self._progress.percent = 100.0
                self._progress.downloaded_bytes = total_bytes
                self._progress.total_bytes = total_bytes
                self._progress.speed_mbps = 0.0
                self._progress.eta_seconds = 0.0

            logger.info("Download complete: %s", self.model_path)
        except OSError as e:
            self._set_error(f"Failed to finalize download: {e}")

    def _set_error(self, msg: str):
        with self._lock:
            self._progress.status = DownloadStatus.ERROR
            self._progress.error = msg
            self._progress.speed_mbps = 0.0
        logger.error("Download error: %s", msg)

    @staticmethod
    def _build_download_url(profile: dict) -> str:
        """Build the Hugging Face direct download URL for the GGUF file."""
        repo = profile["repo_id"]
        filename = profile["hf_filename"]
        return f"https://huggingface.co/{repo}/resolve/main/{filename}"


# Global singleton instance
model_manager = ModelManager()


if __name__ == "__main__":
    import json

    logging.basicConfig(level=logging.INFO)
    print(json.dumps(model_manager.get_status(), indent=2))
