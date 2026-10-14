"""
ORION - Unified Hybrid LLM Engine & Router
Routes inference requests through the Hybrid Fallback Hierarchy:
  1. Engine A: Cloud API (OpenAI / OpenRouter / Anthropic) if an API key is available
  2. Engine B: Local In-Process GGUF (via llama-cpp-python) if local weights exist
  3. Engine C: Inactive / Disabled fallback if neither is available (never crashes)

Includes Dynamic Auto-Sleep / Memory Lifecycle Manager:
  - In 'eco' mode (default), the model automatically unloads from RAM after 5 minutes of inactivity.
  - Returns ~2.1 GB of RAM to Windows when idle during whiteboard / task / study workflows.
  - Automatically re-maps weights in ~2 seconds on the next query.
"""
import os
import sys
import gc
import time
import json
import logging
import threading
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from openai import AsyncOpenAI

try:
    from backend.model_manager import model_manager
    from backend.hardware_detector import detect_hardware
except ImportError:
    from model_manager import model_manager
    from hardware_detector import detect_hardware

logger = logging.getLogger("orion.llm")

# Canonical and backward-compatible legacy OS Keyring service identifiers
CANONICAL_KEYRING_SERVICE = "orion_app"
LEGACY_KEYRING_SERVICE = "orion_ai"
SUPPORTED_PROVIDERS = ["openai", "anthropic", "openrouter"]

CONFIG_FILE_PATH = Path("C:/Users/proud/ORION/data/ai_settings.json")

# In-memory cached selected provider
_selected_provider: str = "openai"


def load_selected_provider() -> str:
    """Load persisted cloud provider preference from disk, defaulting to 'openai'."""
    global _selected_provider
    try:
        if CONFIG_FILE_PATH.exists():
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                prov = data.get("selected_provider", "").strip().lower()
                if prov in SUPPORTED_PROVIDERS:
                    _selected_provider = prov
                    return _selected_provider
    except Exception as e:
        logger.debug("Could not read ai_settings.json: %s", e)
    _selected_provider = "openai"
    return _selected_provider


def set_selected_provider(prov: str) -> str:
    """Persist and update the active cloud provider selection."""
    global _selected_provider
    prov_clean = prov.strip().lower()
    if prov_clean in SUPPORTED_PROVIDERS:
        _selected_provider = prov_clean
        try:
            CONFIG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
            existing_data = {}
            if CONFIG_FILE_PATH.exists():
                try:
                    with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                except Exception:
                    pass
            existing_data["selected_provider"] = _selected_provider
            with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, indent=2)
        except Exception as e:
            logger.warning("Could not persist selected provider: %s", e)
    return _selected_provider


def get_selected_provider() -> str:
    """Retrieve the currently authoritative cloud provider selection."""
    global _selected_provider
    return _selected_provider


# Initialize on module import
load_selected_provider()

# Lazy-loaded in-process Llama instance & lifecycle state
_local_llama = None
_local_model_path = None
_last_used_timestamp: float = 0.0
_idle_timeout_seconds: float = 300.0  # 5 minutes idle TTL
_memory_mode: str = "eco"  # "eco" (auto-sleep) | "performance" (stay in RAM)
_sleep_timer_lock = threading.Lock()
_sleep_timer: Optional[threading.Timer] = None

DEFAULT_SYSTEM_PROMPT = (
    "You are ORION, a highly capable, friendly, and conversational AI assistant. "
    "You act as the user's personal Chief Operating Officer, helping them manage tasks, "
    "schedules, and knowledge, while always maintaining a warm, helpful, and concise tone."
)


def get_keyring_credential(provider: str) -> Optional[str]:
    """
    Safely retrieve API credential for provider from OS Keyring.
    Checks canonical service ('orion_app') first, then legacy service ('orion_ai').
    Automatically and non-destructively migrates legacy entry to canonical service.
    Never logs or exposes the credential value.
    """
    try:
        import keyring
        # 1. Canonical service lookup
        try:
            key = keyring.get_password(CANONICAL_KEYRING_SERVICE, provider)
            if key and key.strip():
                return key.strip()
        except Exception as e:
            logger.debug("Canonical keyring lookup failed for %s: %s", provider, type(e).__name__)

        # 2. Legacy service fallback + non-destructive migration
        try:
            legacy_key = keyring.get_password(LEGACY_KEYRING_SERVICE, provider)
            if legacy_key and legacy_key.strip():
                try:
                    keyring.set_password(CANONICAL_KEYRING_SERVICE, provider, legacy_key.strip())
                    keyring.delete_password(LEGACY_KEYRING_SERVICE, provider)
                except Exception as mig_err:
                    logger.debug("Keyring migration notice: %s", type(mig_err).__name__)
                return legacy_key.strip()
        except Exception as e:
            logger.debug("Legacy keyring lookup failed for %s: %s", provider, type(e).__name__)
    except Exception as e:
        logger.debug("Keyring access unavailable: %s", type(e).__name__)
    return None


def get_cloud_credentials(target_provider: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect configured cloud credentials following strict precedence:
    1. Selected Provider (target_provider or persisted user selection in Settings):
       a. Environment variable (e.g. OPENAI_API_KEY)
       b. Canonical OS Keyring ('orion_app')
       c. Legacy OS Keyring ('orion_ai') with auto-migration
    2. Fallback Providers (in order: openai -> anthropic -> openrouter):
       a. Environment variable
       b. Canonical OS Keyring
       c. Legacy OS Keyring with auto-migration
    Returns (provider, api_key) or (None, None). Never logs secret keys.
    """
    selected = (target_provider or get_selected_provider() or "openai").strip().lower()
    if selected not in SUPPORTED_PROVIDERS:
        selected = "openai"

    env_map = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }

    # Priority 1: Check selected provider first (authoritative!)
    env_val = os.getenv(env_map.get(selected, ""))
    if env_val and env_val.strip():
        return selected, env_val.strip()

    keyring_val = get_keyring_credential(selected)
    if keyring_val and keyring_val.strip():
        return selected, keyring_val.strip()

    # Priority 2: Fallback to remaining configured providers if selected has no key
    for prov in SUPPORTED_PROVIDERS:
        if prov == selected:
            continue
        env_val = os.getenv(env_map.get(prov, ""))
        if env_val and env_val.strip():
            return prov, env_val.strip()

        keyring_val = get_keyring_credential(prov)
        if keyring_val and keyring_val.strip():
            return prov, keyring_val.strip()

    return None, None


def get_active_engine_info() -> dict:
    """Returns active inference engine and provider for UI badges and diagnostics."""
    prov, key = get_cloud_credentials(get_selected_provider())
    if prov and key:
        return {
            "engine": "cloud",
            "provider": prov,
            "ready": True,
            "description": f"Cloud AI Active ({prov.capitalize()})",
        }

    if model_manager.model_exists:
        mem = get_memory_status()
        state_str = "Active in RAM (~2.1 GB)" if mem["is_loaded"] else "Sleeping (0 MB RAM used)"
        has_gpu = bool(model_manager.hardware_info.get("has_cuda"))
        hw_desc = f"GPU: {model_manager.hardware_info.get('gpu', {}).get('name', 'NVIDIA CUDA')}" if has_gpu else "CPU Mode"
        model_display_name = model_manager.model_info.get("model_name") or model_manager.model_info.get("name", "Qwen 2.5")
        return {
            "engine": "local",
            "provider": "llama-cpp",
            "model_path": str(model_manager.model_path),
            "ready": True,
            "description": f"Local AI ({model_display_name} • {hw_desc} • {state_str})",
            "device": "gpu" if has_gpu else "cpu",
            "device_name": model_manager.hardware_info.get("gpu", {}).get("name", "NVIDIA CUDA") if has_gpu else model_manager.hardware_info.get("cpu", {}).get("name", "Multi-core CPU"),
            "gpu_accelerated": has_gpu,
            "memory": mem,
        }

    return {
        "engine": "none",
        "provider": "none",
        "ready": False,
        "description": "AI Inactive (No API key and local model not downloaded)",
    }


# ============================================================
# MEMORY LIFECYCLE & AUTO-SLEEP MANAGER
# ============================================================

def get_memory_status() -> Dict[str, Any]:
    """Returns current RAM residency, idle time, and sleep state of the local model."""
    global _local_llama, _last_used_timestamp, _memory_mode, _idle_timeout_seconds
    is_loaded = _local_llama is not None
    idle_seconds = int(time.time() - _last_used_timestamp) if (is_loaded and _last_used_timestamp > 0) else 0
    return {
        "is_loaded": is_loaded,
        "isLoaded": is_loaded,
        "memory_mode": _memory_mode,
        "memoryMode": _memory_mode,
        "idle_seconds": idle_seconds,
        "idleSeconds": idle_seconds,
        "idle_timeout_seconds": int(_idle_timeout_seconds),
        "idleTimeoutSeconds": int(_idle_timeout_seconds),
        "estimated_ram_mb": 2100 if is_loaded else 0,
        "estimatedRamMb": 2100 if is_loaded else 0,
    }


def set_memory_mode(mode: str) -> Dict[str, Any]:
    """Switch between 'eco' (auto-unload after 5m) and 'performance' (stay loaded)."""
    global _memory_mode
    if mode in ("eco", "performance"):
        _memory_mode = mode
        logger.info("Local LLM memory mode set to '%s'", _memory_mode)
        if _memory_mode == "eco":
            _schedule_idle_sleep()
        else:
            _cancel_idle_sleep()
    return get_memory_status()


def hibernate_local_model() -> Dict[str, Any]:
    """Instantly unload the local LLM from RAM and trigger garbage collection."""
    global _local_llama, _local_model_path, _last_used_timestamp
    with _sleep_timer_lock:
        _cancel_idle_sleep()
        if _local_llama is not None:
            logger.info("Hibernating local LLM: Reclaiming ~2.1 GB RAM back to Windows...")
            try:
                del _local_llama
            except Exception as e:
                logger.warning("Error deleting llama instance: %s", e)
            _local_llama = None
            _local_model_path = None
            _last_used_timestamp = 0.0
            gc.collect()
            logger.info("Local LLM successfully hibernated. 0 MB passive RAM used.")
    return get_memory_status()


def _schedule_idle_sleep():
    """Schedule or reset the background timer to hibernate the model if idle."""
    global _sleep_timer
    with _sleep_timer_lock:
        if _sleep_timer is not None:
            _sleep_timer.cancel()
            _sleep_timer = None

        if _memory_mode == "eco" and _local_llama is not None:
            _sleep_timer = threading.Timer(_idle_timeout_seconds, _auto_sleep_worker)
            _sleep_timer.daemon = True
            _sleep_timer.start()


def _cancel_idle_sleep():
    """Cancel any pending sleep timer."""
    global _sleep_timer
    if _sleep_timer is not None:
        _sleep_timer.cancel()
        _sleep_timer = None


def _auto_sleep_worker():
    """Worker executed when the idle timer expires."""
    logger.info("Idle TTL reached (%.0fs). Auto-hibernating local LLM to free RAM...", _idle_timeout_seconds)
    hibernate_local_model()


def _get_local_llama():
    """
    Lazy-load or wake up the llama-cpp-python in-process runtime.
    Uses memory mapping (use_mmap=True) and compact context (2048) to minimize RAM footprint.
    """
    global _local_llama, _local_model_path, _last_used_timestamp

    if not model_manager.model_exists:
        raise FileNotFoundError(f"Local model file not found at {model_manager.model_path}")

    current_path = str(model_manager.model_path)
    _last_used_timestamp = time.time()

    if _local_llama is not None and _local_model_path == current_path:
        _schedule_idle_sleep()
        return _local_llama

    try:
        from llama_cpp import Llama
    except ImportError:
        logger.error("llama-cpp-python is not installed in the Python environment.")
        raise RuntimeError(
            "llama-cpp-python is required for local offline inference. "
            "Please install it using: pip install llama-cpp-python"
        )

    profile = model_manager.model_info
    has_gpu = bool(model_manager.hardware_info.get("has_cuda"))
    requires_gpu = profile.get("requires_gpu", False)

    # 1. Enforcement for large models (e.g. 7B):
    if requires_gpu and not has_gpu:
        raise RuntimeError(
            f"The {profile.get('name', '7B')} model strictly requires a dedicated NVIDIA GPU with CUDA. "
            "No compatible dedicated GPU was detected. Please switch to the adaptive 3B model which supports CPU execution."
        )

    # 2. Adaptive offloading for small models (and GPU execution for large models):
    if has_gpu:
        gpu_layers = -1
        threads = 4
        device_label = f"Dedicated GPU ({model_manager.hardware_info.get('gpu', {}).get('name', 'NVIDIA CUDA')})"
    else:
        gpu_layers = 0
        threads = max(4, model_manager.hardware_info.get("cpu", {}).get("cores", 8))
        device_label = f"CPU ({model_manager.hardware_info.get('cpu', {}).get('name', 'Multi-core CPU')})"

    logger.info(
        "Waking local GGUF model from sleep: %s on %s (gpu_layers=%s, ctx=2048, threads=%s, mmap=True)",
        current_path,
        device_label,
        gpu_layers,
        threads,
    )

    _local_llama = Llama(
        model_path=current_path,
        n_gpu_layers=gpu_layers,
        n_ctx=2048,
        n_threads=threads,
        use_mmap=True,
        verbose=False,
    )
    _local_model_path = current_path
    _last_used_timestamp = time.time()
    _schedule_idle_sleep()
    return _local_llama


# ============================================================
# INFERENCE ROUTER
# ============================================================

async def generate_response(
    user_message: str,
    system_prompt: Optional[str] = None,
    api_key: Optional[str] = None,
    provider: Optional[str] = None,
) -> str:
    """
    Main entry point for conversational inference.
    Executes through the Hybrid Router:
      1. Cloud API
      2. Local In-Process GGUF (with Auto-Sleep)
      3. Fallback message with disabled status
    """
    sys_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

    # 1. Resolve Cloud Provider & Key
    active_prov = provider
    active_key = api_key

    if not active_key:
        active_prov, active_key = get_cloud_credentials(provider or get_selected_provider())

    # --- Engine A: Cloud API ---
    if active_key and active_prov:
        logger.info("Routing query to Cloud API (%s)...", active_prov)
        try:
            if active_prov == "openai":
                client = AsyncOpenAI(api_key=active_key)
                model_name = "gpt-4o-mini"
            elif active_prov == "openrouter":
                client = AsyncOpenAI(
                    api_key=active_key,
                    base_url="https://openrouter.ai/api/v1",
                )
                model_name = "meta-llama/llama-3.3-70b-instruct"
            elif active_prov == "anthropic":
                try:
                    import anthropic
                    a_client = anthropic.AsyncAnthropic(api_key=active_key)
                    resp = await a_client.messages.create(
                        model="claude-3-5-haiku-20241022",
                        max_tokens=1024,
                        system=sys_prompt,
                        messages=[{"role": "user", "content": user_message}],
                    )
                    return resp.content[0].text
                except ImportError:
                    import requests
                    res = requests.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": active_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": "claude-3-5-haiku-20241022",
                            "max_tokens": 1024,
                            "system": sys_prompt,
                            "messages": [{"role": "user", "content": user_message}],
                        },
                        timeout=30,
                    )
                    data = res.json()
                    if "content" in data and len(data["content"]) > 0:
                        return data["content"][0]["text"]
                    raise RuntimeError(f"Anthropic error: {data.get('error', res.text)}")
            else:
                client = AsyncOpenAI(api_key=active_key)
                model_name = "gpt-4o-mini"

            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("Cloud API execution failed: %s", e)
            if not model_manager.model_exists:
                return f"Error contacting {active_prov.capitalize()} AI: {str(e)}"

    # --- Engine B: Local In-Process GGUF ---
    if model_manager.model_exists:
        logger.info("Routing query to Local In-Process Engine (GGUF)...")
        try:
            llm = _get_local_llama()
            output = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            # Update idle timer after inference
            _schedule_idle_sleep()
            return output["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error("Local inference failed: %s", e)
            return f"Error running local AI model: {str(e)}"

    # --- Engine C: Inactive Fallback ---
    logger.warning("Neither cloud key nor local model available.")
    return (
        "ORION AI is currently inactive. "
        "To enable conversational intelligence, please either configure a cloud API key "
        "(OpenAI, Anthropic, or OpenRouter) in Settings, or download the 100% offline local model."
    )


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO)
    info = get_active_engine_info()
    print("Engine info:", json.dumps(info, indent=2))
