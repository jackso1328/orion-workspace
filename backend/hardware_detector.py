"""
ORION - Hardware Detector
Inspects CPU and GPU capabilities at boot to select the optimal GGUF model
profile and inference parameters.

Profiles:
  - Battery/CPU: Qwen2.5-3B-Instruct-Q4_K_M.gguf (~2.1 GB), n_gpu_layers=0, n_threads=8
  - Performance/GPU: Qwen2.5-7B-Instruct-Q4_K_M.gguf (~4.4 GB), n_gpu_layers=-1, n_threads=4

Detection hierarchy:
  1. CPU: WinReg processor string on Windows (instant, zero overhead), fallback to stdlib platform/multiprocessing
  2. GPU: nvidia-smi with fallback to Win32_VideoController (CIM) and ctypes
"""
import os
import platform
import subprocess
import logging

logger = logging.getLogger("orion.hardware")


def _get_cpu_info() -> dict:
    """Gather human-friendly CPU model name and core count."""
    import multiprocessing

    cpu_count = multiprocessing.cpu_count()
    cpu_name = platform.processor() or "Unknown CPU"

    # On Windows, read marketing name directly from the registry
    if os.name == "nt":
        try:
            import winreg

            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            )
            reg_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            if reg_name and reg_name.strip():
                cpu_name = reg_name.strip()
        except Exception:
            pass

    return {
        "name": cpu_name,
        "cores": cpu_count,
    }


def _detect_cuda_gpu() -> dict | None:
    """
    Attempt to detect an NVIDIA dedicated GPU via nvidia-smi or Windows Management/CIM.
    Returns dict with name, vram_total_mb, vram_free_mb, or None.
    """
    # 1. Try nvidia-smi first
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            line = result.stdout.strip().split("\n")[0]
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                return {
                    "name": parts[0],
                    "vram_total_mb": int(parts[1]),
                    "vram_free_mb": int(parts[2]),
                }
    except Exception:
        pass

    # 2. On Windows, if nvidia-smi had permission restrictions or was blocked in battery mode,
    # inspect Win32_VideoController via PowerShell CIM
    if os.name == "nt":
        try:
            cmd = "Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json"
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", cmd],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                import json

                data = json.loads(result.stdout.strip())
                gpus = data if isinstance(data, list) else [data]
                for g in gpus:
                    g_name = g.get("Name", "")
                    g_name_lower = g_name.lower()
                    if "nvidia" in g_name_lower or "geforce" in g_name_lower or "rtx" in g_name_lower:
                        ram_bytes = g.get("AdapterRAM") or 0
                        vram_mb = int(ram_bytes // (1024 * 1024)) if ram_bytes else 4096
                        return {
                            "name": g_name,
                            "vram_total_mb": vram_mb,
                            "vram_free_mb": max(0, vram_mb - 500),
                        }
        except Exception:
            pass

    return None


# ── Model Catalog ──────────────────────────────────────────────
# Each profile maps to a verified GGUF quant on Hugging Face.

MODEL_CATALOG = {
    "battery": {
        "model_name": "Qwen2.5-3B-Instruct-Q4_K_M",
        "filename": "qwen2.5-3b-instruct-q4_k_m.gguf",
        "repo_id": "Qwen/Qwen2.5-3B-Instruct-GGUF",
        "hf_filename": "qwen2.5-3b-instruct-q4_k_m.gguf",
        "size_bytes": 2_147_483_648,  # ~2.0 GiB
        "size_formatted": "2.1 GB",
        "n_gpu_layers": 0,
        "n_ctx": 4096,
        "n_threads": 8,
        "description": "CPU-optimized 3B model for battery / integrated GPU mode",
    },
    "performance": {
        "model_name": "Qwen2.5-7B-Instruct-Q4_K_M",
        "filename": "qwen2.5-7b-instruct-q4_k_m.gguf",
        "repo_id": "Qwen/Qwen2.5-7B-Instruct-GGUF",
        "hf_filename": "qwen2.5-7b-instruct-q4_k_m.gguf",
        "size_bytes": 4_718_592_000,  # ~4.4 GiB
        "size_formatted": "4.4 GB",
        "n_gpu_layers": -1,  # offload all layers to GPU
        "n_ctx": 4096,
        "n_threads": 4,
        "description": "GPU-accelerated 7B model for dedicated NVIDIA GPU",
    },
}


def detect_hardware() -> dict:
    """
    Run hardware detection and select optimal model profile.
    """
    cpu = _get_cpu_info()
    gpu = _detect_cuda_gpu()

    has_cuda = gpu is not None
    vram_free = gpu["vram_free_mb"] if gpu else 0
    vram_total = gpu["vram_total_mb"] if gpu else 0

    # Decision logic: Use the 7B GPU model only if we have an active
    # dedicated NVIDIA GPU with at least 3500 MB free VRAM (or >= 4GB total VRAM).
    if has_cuda and (vram_free >= 3500 or vram_total >= 4000):
        profile = "performance"
    else:
        profile = "battery"

    model_info = MODEL_CATALOG[profile]

    result = {
        "cpu": cpu,
        "gpu": gpu,
        "has_cuda": has_cuda,
        "vram_free_mb": vram_free,
        "vram_total_mb": vram_total,
        "selected_profile": profile,
        "model": model_info,
    }

    logger.info(
        "Hardware detection complete: cpu='%s' (%d cores), profile=%s, gpu=%s, vram_free=%d MB",
        cpu["name"],
        cpu["cores"],
        profile,
        gpu["name"] if gpu else "None",
        vram_free,
    )
    return result


if __name__ == "__main__":
    import json

    logging.basicConfig(level=logging.INFO)
    hw = detect_hardware()
    print(json.dumps(hw, indent=2))
