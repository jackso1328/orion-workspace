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
DEFAULT_PROVIDER = "openai"
SUPPORTED_PROVIDERS = ["openai", "anthropic", "openrouter"]


def get_config_file_path() -> Path:
    """Return portable OS-specific application data config path."""
    if os.environ.get("ORION_CONFIG_PATH"):
        return Path(os.environ["ORION_CONFIG_PATH"])
    if os.name == "nt":
        base_dir = Path(os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))) / "Orion"
    else:
        base_dir = Path.home() / ".orion"
    return base_dir / "ai_settings.json"


# In-memory cached selected provider
_selected_provider: str = DEFAULT_PROVIDER


def load_selected_provider() -> str:
    """
    Load persisted cloud provider preference from portable app-data location.
    Falls back to documented default ('openai') if missing or invalid.
    Preserves other fields in ai_settings.json.
    """
    global _selected_provider
    config_path = get_config_file_path()
    try:
        if not config_path.exists():
            # Check legacy repo data directory for backward compatibility
            repo_data_path = Path(__file__).resolve().parent.parent / "data" / "ai_settings.json"
            if repo_data_path.exists():
                try:
                    config_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(repo_data_path, config_path)
                except Exception as copy_err:
                    logger.debug("Could not copy legacy settings: %s", copy_err)

        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                prov = data.get("selected_provider", "").strip().lower()
                if prov in SUPPORTED_PROVIDERS:
                    _selected_provider = prov
                    return _selected_provider
                else:
                    logger.warning(
                        "Invalid provider '%s' in %s; falling back to default '%s'",
                        prov, config_path, DEFAULT_PROVIDER
                    )
    except Exception as e:
        logger.debug("Could not read ai_settings.json: %s", e)

    _selected_provider = DEFAULT_PROVIDER
    return _selected_provider


def set_selected_provider(prov: str) -> str:
    """
    Persist and update the active cloud provider selection.
    Raises ValueError on invalid provider.
    Raises IOError on persistence failure.
    Preserves other configuration fields in ai_settings.json.
    """
    global _selected_provider
    prov_clean = (prov or "").strip().lower()
    if prov_clean not in SUPPORTED_PROVIDERS:
        raise ValueError(
            f"Invalid cloud provider '{prov}'. Supported providers are: {', '.join(SUPPORTED_PROVIDERS)}"
        )

    config_path = get_config_file_path()
    try:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        existing_data = {}
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            except Exception:
                existing_data = {}
        existing_data["selected_provider"] = prov_clean
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=2)
        _selected_provider = prov_clean
        return _selected_provider
    except Exception as e:
        logger.error("Failed to persist selected provider to %s: %s", config_path, e)
        raise IOError(f"Could not persist provider configuration: {e}")


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
    Checks canonical service ('orion_app') first.
    If missing, checks legacy service ('orion_ai') and performs safe, non-destructive migration:
      1. Read legacy credential.
      2. Write to canonical service.
      3. Verify canonical credential matches without logging or exposing secret.
      4. Only delete legacy entry upon verified write.
      5. If write or verification fails, preserve legacy entry and return the legacy value safely.
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

        # 2. Legacy service fallback + non-destructive verified migration
        try:
            legacy_key = keyring.get_password(LEGACY_KEYRING_SERVICE, provider)
            if legacy_key and legacy_key.strip():
                clean_legacy = legacy_key.strip()
                migrated = False
                try:
                    keyring.set_password(CANONICAL_KEYRING_SERVICE, provider, clean_legacy)
                    # Verify canonical credential is present and matches
                    verified = keyring.get_password(CANONICAL_KEYRING_SERVICE, provider)
                    if verified and verified.strip() == clean_legacy:
                        migrated = True
                except Exception as write_err:
                    logger.debug("Failed writing canonical credential during migration: %s", type(write_err).__name__)

                if migrated:
                    try:
                        keyring.delete_password(LEGACY_KEYRING_SERVICE, provider)
                    except Exception as del_err:
                        logger.debug("Could not remove legacy key after verified migration: %s", type(del_err).__name__)

                # Return the valid credential regardless of whether legacy deletion succeeded,
                # but legacy was NOT deleted if canonical write/verification failed!
                return clean_legacy
        except Exception as e:
            logger.debug("Legacy keyring lookup failed for %s: %s", provider, type(e).__name__)
    except Exception as e:
        logger.debug("Keyring access unavailable: %s", type(e).__name__)
    return None


def migrate_legacy_credential(provider: str) -> bool:
    """
    Attempt safe, non-destructive migration of provider credential from legacy to canonical service.
    Returns True ONLY if canonical write was verified and legacy key was deleted.
    Returns False if legacy key doesn't exist, canonical write fails, or verification fails.
    Preserves legacy entry on any write or verification failure.
    Never exposes or logs secrets.
    """
    try:
        import keyring
        legacy_key = keyring.get_password(LEGACY_KEYRING_SERVICE, provider)
        if not legacy_key or not legacy_key.strip():
            return False
        clean = legacy_key.strip()

        try:
            keyring.set_password(CANONICAL_KEYRING_SERVICE, provider, clean)
        except Exception as e:
            logger.debug("Canonical write failed during migration: %s", type(e).__name__)
            return False

        try:
            verified = keyring.get_password(CANONICAL_KEYRING_SERVICE, provider)
            if not verified or verified.strip() != clean:
                logger.debug("Canonical verification failed during migration")
                return False
        except Exception as e:
            logger.debug("Canonical verify lookup failed: %s", type(e).__name__)
            return False

        try:
            keyring.delete_password(LEGACY_KEYRING_SERVICE, provider)
        except Exception as e:
            logger.debug("Legacy deletion notice: %s", type(e).__name__)

        return True
    except Exception as e:
        logger.debug("Migration failed: %s", type(e).__name__)
        return False


def set_keyring_credential(provider: str, secret: str) -> bool:
    """
    Save provider credential to canonical service and verify write before deleting legacy entry.
    Returns True if safely saved and verified, False otherwise.
    """
    clean = (secret or "").strip()
    if not clean:
        return False
    try:
        import keyring
        keyring.set_password(CANONICAL_KEYRING_SERVICE, provider, clean)
        verified = keyring.get_password(CANONICAL_KEYRING_SERVICE, provider)
        if not verified or verified.strip() != clean:
            return False
        try:
            keyring.delete_password(LEGACY_KEYRING_SERVICE, provider)
        except Exception:
            pass
        return True
    except Exception as e:
        logger.debug("Keyring write error: %s", type(e).__name__)
        return False


def delete_keyring_credential(provider: str) -> bool:
    """
    Remove provider credential from both canonical and legacy services.
    Returns True if attempted safely.
    """
    try:
        import keyring
        for service in (CANONICAL_KEYRING_SERVICE, LEGACY_KEYRING_SERVICE):
            try:
                keyring.delete_password(service, provider)
            except Exception:
                pass
        return True
    except Exception as e:
        logger.debug("Keyring delete error: %s", type(e).__name__)
        return False


def get_cloud_credentials(target_provider: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect configured cloud credentials following strict authoritative precedence:
    The selected provider is authoritative:
      1. Environment variable for selected provider (e.g. OPENAI_API_KEY)
      2. Canonical OS Keyring ('orion_app') for selected provider
      3. Legacy OS Keyring ('orion_ai') for selected provider with safe, non-destructive migration
    Returns (provider, api_key) or (None, None).
    Never silently switches to another cloud provider if the selected provider lacks credentials.
    Never logs or exposes secret keys.
    """
    selected = (target_provider or get_selected_provider() or DEFAULT_PROVIDER).strip().lower()
    if selected not in SUPPORTED_PROVIDERS:
        selected = DEFAULT_PROVIDER

    env_map = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }

    # Authoritative: Check selected provider ONLY
    env_var_name = env_map.get(selected, "")
    env_val = os.getenv(env_var_name)
    if env_val and env_val.strip():
        return selected, env_val.strip()

    keyring_val = get_keyring_credential(selected)
    if keyring_val and keyring_val.strip():
        return selected, keyring_val.strip()

    # Do not silently fall back to other cloud providers!
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
