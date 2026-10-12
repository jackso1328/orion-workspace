"""
ORION - Unified Hybrid LLM Engine & Router
Routes inference requests through the Hybrid Fallback Hierarchy:
  1. Engine A: Cloud API (OpenAI / OpenRouter / Anthropic) if an API key is available
  2. Engine B: Local In-Process GGUF (via llama-cpp-python) if local weights exist
  3. Engine C: Inactive / Disabled fallback if neither is available (never crashes)
"""
import os
import sys
import json
import logging
from typing import Optional, Tuple, Dict, Any

from openai import AsyncOpenAI

try:
    from backend.model_manager import model_manager
    from backend.hardware_detector import detect_hardware
except ImportError:
    from model_manager import model_manager
    from hardware_detector import detect_hardware

logger = logging.getLogger("orion.llm")

# Lazy-loaded in-process Llama instance
_local_llama = None
_local_model_path = None

DEFAULT_SYSTEM_PROMPT = (
    "You are ORION, a highly capable, friendly, and conversational AI assistant. "
    "You act as the user's personal Chief Operating Officer, helping them manage tasks, "
    "schedules, and knowledge, while always maintaining a warm, helpful, and concise tone."
)


def get_cloud_credentials() -> Tuple[Optional[str], Optional[str]]:
    """
    Detect configured cloud credentials.
    Checks environment variables first, then OS Keychain (keyring) if available.
    Returns (provider, api_key) or (None, None).
    """
    # 1. Environment variables
    env_mapping = [
        ("OPENAI_API_KEY", "openai"),
        ("ANTHROPIC_API_KEY", "anthropic"),
        ("OPENROUTER_API_KEY", "openrouter"),
    ]
    for env_var, prov in env_mapping:
        val = os.environ.get(env_var)
        if val and val.strip():
            return prov, val.strip()

    # 2. OS Keychain (via keyring library)
    try:
        import keyring
        for prov in ["openai", "openrouter", "anthropic"]:
            val = keyring.get_password("orion_app", prov)
            if val and val.strip():
                return prov, val.strip()
    except Exception:
        pass

    return None, None


def get_active_engine_info() -> Dict[str, Any]:
    """
    Inspect the active AI engine status without running inference.
    Used by /api/ai/status and health checks.
    """
    provider, _ = get_cloud_credentials()
    if provider:
        return {
            "engine": "cloud",
            "provider": provider,
            "ready": True,
            "description": f"Cloud AI Active ({provider.capitalize()})",
        }

    if model_manager.model_exists:
        return {
            "engine": "local",
            "provider": "llama-cpp",
            "model_path": str(model_manager.model_path),
            "ready": True,
            "description": f"Local AI Active ({model_manager.model_info['model_name']})",
        }

    return {
        "engine": "none",
        "provider": "none",
        "ready": False,
        "description": "AI Inactive (No API key and local model not downloaded)",
    }


def _get_local_llama():
    """Lazy-load the llama-cpp-python in-process runtime."""
    global _local_llama, _local_model_path

    if not model_manager.model_exists:
        raise FileNotFoundError(f"Local model file not found at {model_manager.model_path}")

    current_path = str(model_manager.model_path)
    if _local_llama is not None and _local_model_path == current_path:
        return _local_llama

    try:
        from llama_cpp import Llama
    except ImportError:
        logger.error("llama-cpp-python is not installed in the Python environment.")
        raise RuntimeError(
            "llama-cpp-python is required for local offline inference. "
            "Please install it using: pip install llama-cpp-python"
        )

    hw = model_manager.hardware_info
    profile = model_manager.model_info

    logger.info(
        "Loading local GGUF model: %s (gpu_layers=%s, ctx=%s, threads=%s)",
        current_path,
        profile.get("n_gpu_layers", 0),
        profile.get("n_ctx", 4096),
        profile.get("n_threads", 4),
    )

    _local_llama = Llama(
        model_path=current_path,
        n_gpu_layers=profile.get("n_gpu_layers", 0),
        n_ctx=profile.get("n_ctx", 4096),
        n_threads=profile.get("n_threads", 4),
        verbose=False,
    )
    _local_model_path = current_path
    return _local_llama


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
      2. Local In-Process GGUF
      3. Fallback message with disabled status
    """
    sys_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

    # 1. Resolve Cloud Provider & Key
    active_prov = provider
    active_key = api_key

    if not active_key:
        active_prov, active_key = get_cloud_credentials()

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
                # If anthropic library available or openai-compatible endpoint
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
                    # Fallback to requests call to Anthropic API
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
            # If cloud fails, attempt to fall back to local model if available
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

    async def test():
        reply = await generate_response("Hello ORION, are you ready?")
        print("\nResponse:\n", reply)

    asyncio.run(test())
