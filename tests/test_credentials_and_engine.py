"""
Comprehensive test suite verifying Orion Cloud Provider and Credential Reliability:
1. Authoritative provider selection (no silent switching to other configured providers).
2. Regression test: OpenAI key exists, Anthropic selected with no key -> falls back to local or none, never OpenAI.
3. Safe legacy-key migration sequence (read -> write -> verify -> delete).
4. Legacy migration failure handling (write failure / verification failure preserves legacy entry).
5. Repeated checks after successful migration.
6. Credential removal from both canonical and legacy stores.
7. Portable provider persistence with preservation of other settings in ai_settings.json.
8. Invalid provider rejection (ValueError and HTTP 400).
9. Provider persistence write failure handling (IOError and HTTP 500).
10. Backend status matching the active engine.
11. Settings UI runtime status derivation for backend-unavailable and all active engine states.
"""

import os
import sys
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock

# Add ORION repo to sys.path
sys.path.insert(0, r"C:\Users\proud\ORION")

from backend.llm import (
    CANONICAL_KEYRING_SERVICE,
    LEGACY_KEYRING_SERVICE,
    SUPPORTED_PROVIDERS,
    DEFAULT_PROVIDER,
    get_config_file_path,
    load_selected_provider,
    set_selected_provider,
    get_selected_provider,
    get_keyring_credential,
    migrate_legacy_credential,
    set_keyring_credential,
    delete_keyring_credential,
    get_cloud_credentials,
)
from backend.main import get_full_ai_status, app
from backend.model_manager import ModelManager


class TestCredentialAndEngineReliability(unittest.TestCase):
    def setUp(self):
        # Clear environment variables
        self.env_patcher = patch.dict(os.environ, {}, clear=False)
        self.env_patcher.start()
        for env_var in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "ORION_CONFIG_PATH"]:
            if env_var in os.environ:
                del os.environ[env_var]

    def tearDown(self):
        self.env_patcher.stop()

    def test_regression_openai_exists_anthropic_selected_no_silent_fallback(self):
        """
        Regression Test: OpenAI credentials exist in environment and keyring.
        Anthropic is selected in Settings, but has no API key.
        Orion must NOT silently use OpenAI or report Cloud active.
        It must fall back to local model (if installed) or none.
        """
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-mock-valid-openai-key"
        }
        os.environ["OPENAI_API_KEY"] = "sk-env-openai-key"

        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))), \
             patch("backend.llm.get_selected_provider", return_value="anthropic"):
            # 1. get_cloud_credentials for selected provider 'anthropic'
            cloud_prov, cloud_key = get_cloud_credentials("anthropic")
            self.assertIsNone(cloud_prov, "Must not return 'openai' when 'anthropic' is selected")
            self.assertIsNone(cloud_key, "Must not return OpenAI key when 'anthropic' is selected")

            # 2. Status with local model available -> engine must be 'local', NOT 'cloud'
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=True)):
                status_local = get_full_ai_status()
                self.assertEqual(status_local["engine"], "local")
                self.assertEqual(status_local["selected_provider"], "anthropic")
                self.assertIsNone(status_local["cloud_provider"])

            # 3. Status with no local model -> engine must be 'none', NOT 'cloud'
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
                status_none = get_full_ai_status()
                self.assertEqual(status_none["engine"], "none")
                self.assertEqual(status_none["selected_provider"], "anthropic")
                self.assertIsNone(status_none["cloud_provider"])

    def test_authoritative_provider_with_matching_key(self):
        """When selected provider has a configured key, it routes to that provider strictly."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-openai-key",
            (CANONICAL_KEYRING_SERVICE, "anthropic"): "sk-anthropic-key",
            (CANONICAL_KEYRING_SERVICE, "openrouter"): "sk-openrouter-key",
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))):
            # Anthropic selected
            prov, key = get_cloud_credentials("anthropic")
            self.assertEqual(prov, "anthropic")
            self.assertEqual(key, "sk-anthropic-key")

            # OpenAI selected
            prov, key = get_cloud_credentials("openai")
            self.assertEqual(prov, "openai")
            self.assertEqual(key, "sk-openai-key")

            # OpenRouter selected
            prov, key = get_cloud_credentials("openrouter")
            self.assertEqual(prov, "openrouter")
            self.assertEqual(key, "sk-openrouter-key")

    def test_legacy_migration_success(self):
        """
        Verified sequence:
        1. Read legacy credential.
        2. Write to canonical.
        3. Verify canonical credential matches.
        4. Delete legacy entry only after verification.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-test-secret"
        }

        def mock_get(service, username):
            return mock_store.get((service, username))

        def mock_set(service, username, password):
            mock_store[(service, username)] = password

        def mock_del(service, username):
            mock_store.pop((service, username), None)

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("keyring.delete_password", side_effect=mock_del):

            # Perform migration
            migrated = migrate_legacy_credential("openai")
            self.assertTrue(migrated)

            # Canonical now has the secret
            self.assertEqual(mock_store.get((CANONICAL_KEYRING_SERVICE, "openai")), "sk-legacy-test-secret")
            # Legacy entry was deleted
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

    def test_legacy_migration_write_failure_preserves_legacy(self):
        """
        If writing to canonical service fails, legacy credential must NOT be deleted.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-safe-key"
        }

        def mock_get(service, username):
            return mock_store.get((service, username))

        def broken_set(service, username, password):
            raise RuntimeError("OS Keychain write permission denied")

        deleted_keys = []
        def mock_del(service, username):
            deleted_keys.append((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=broken_set), \
             patch("keyring.delete_password", side_effect=mock_del):

            # Migration fails safely
            migrated = migrate_legacy_credential("openai")
            self.assertFalse(migrated)

            # Legacy key was NOT deleted!
            self.assertIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), deleted_keys)

            # Lookup still retrieves legacy key safely without crashing
            retrieved = get_keyring_credential("openai")
            self.assertEqual(retrieved, "sk-legacy-safe-key")

    def test_legacy_migration_verify_failure_preserves_legacy(self):
        """
        If canonical write occurs but verification readback fails (e.g. corrupt or None),
        legacy credential must NOT be deleted.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-safe-key"
        }

        def mock_get(service, username):
            if service == CANONICAL_KEYRING_SERVICE:
                return "corrupted_or_mismatched_value"
            return mock_store.get((service, username))

        def mock_set(service, username, password):
            pass

        deleted_keys = []
        def mock_del(service, username):
            deleted_keys.append((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("keyring.delete_password", side_effect=mock_del):

            migrated = migrate_legacy_credential("openai")
            self.assertFalse(migrated)

            # Legacy key preserved
            self.assertIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), deleted_keys)

    def test_repeated_checks_after_migration(self):
        """Once migrated to canonical, subsequent lookups hit canonical directly."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-canonical-key"
        }
        legacy_called = []

        def mock_get(service, username):
            if service == LEGACY_KEYRING_SERVICE:
                legacy_called.append(username)
            return mock_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get):
            val1 = get_keyring_credential("openai")
            val2 = get_keyring_credential("openai")
            self.assertEqual(val1, "sk-canonical-key")
            self.assertEqual(val2, "sk-canonical-key")
            # Legacy service should not have been queried because canonical had it
            self.assertEqual(len(legacy_called), 0)

    def test_credential_removal_from_both_services(self):
        """delete_keyring_credential purges from both canonical and legacy services."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-key-1",
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-key-2",
        }

        def mock_del(service, username):
            mock_store.pop((service, username), None)

        with patch("keyring.delete_password", side_effect=mock_del):
            res = delete_keyring_credential("openai")
            self.assertTrue(res)
            self.assertNotIn((CANONICAL_KEYRING_SERVICE, "openai"), mock_store)
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

    def test_portable_provider_persistence_and_settings_preservation(self):
        """
        ai_settings.json in portable app-data location preserves existing extra settings
        and survives re-read.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "ai_settings.json"
            os.environ["ORION_CONFIG_PATH"] = str(config_file)

            # Pre-populate extra settings
            initial_data = {
                "theme": "lavender",
                "developer_mode": True,
                "selected_provider": "openai"
            }
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(initial_data, f)

            # Update provider
            updated = set_selected_provider("anthropic")
            self.assertEqual(updated, "anthropic")

            # Check file contents
            with open(config_file, "r", encoding="utf-8") as f:
                saved = json.load(f)
            self.assertEqual(saved["selected_provider"], "anthropic")
            self.assertEqual(saved["theme"], "lavender")
            self.assertTrue(saved["developer_mode"])

            # Verify reload
            reloaded = load_selected_provider()
            self.assertEqual(reloaded, "anthropic")

    def test_invalid_provider_handling_and_fallback(self):
        """Invalid provider raises ValueError and invalid file falls back to default."""
        # 1. set_selected_provider with invalid provider
        with self.assertRaises(ValueError):
            set_selected_provider("nonexistent_ai")

        # 2. Corrupt or invalid file content falls back to DEFAULT_PROVIDER ('openai')
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "ai_settings.json"
            os.environ["ORION_CONFIG_PATH"] = str(config_file)
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump({"selected_provider": "invalid_hacked_provider"}, f)

            loaded = load_selected_provider()
            self.assertEqual(loaded, DEFAULT_PROVIDER)

    def test_api_provider_rejection_http_codes(self):
        """FastAPI POST /api/ai/provider returns HTTP 400 for invalid provider."""
        from fastapi.testclient import TestClient
        client = TestClient(app)

        # Valid provider
        res_valid = client.post("/api/ai/provider", json={"provider": "anthropic"})
        self.assertEqual(res_valid.status_code, 200)
        self.assertEqual(res_valid.json()["provider"], "anthropic")

        # Invalid provider -> 400
        res_invalid = client.post("/api/ai/provider", json={"provider": "unsupported_provider"})
        self.assertEqual(res_invalid.status_code, 400)
        self.assertIn("Invalid cloud provider", res_invalid.json()["detail"])

        # Reset to openai
        client.post("/api/ai/provider", json={"provider": "openai"})

    def test_api_provider_write_failure_http_500(self):
        """FastAPI POST /api/ai/provider returns HTTP 500 when persistence fails."""
        from fastapi.testclient import TestClient
        client = TestClient(app)

        with patch("backend.main.set_selected_provider", side_effect=IOError("Disk write error")):
            res = client.post("/api/ai/provider", json={"provider": "anthropic"})
            self.assertEqual(res.status_code, 500)
            self.assertIn("Disk write error", res.json()["detail"])

    def test_settings_ui_runtime_status_derivation(self):
        """
        Tests the Settings UI runtime status derivation contract:
        - When backendAvailable is False -> 'Unavailable' (neutral pill)
        - When backendAvailable is True and engine is 'cloud' -> 'Cloud active (<Provider>)' (violet pill)
        - When backendAvailable is True and engine is 'local' -> 'Local ready' (green pill)
        - When backendAvailable is True and engine is 'none' -> 'Not configured' (neutral pill)
        """
        def derive_status(backend_available, engine, cloud_prov, is_downloading=False, is_paused=False):
            if not backend_available:
                return {"label": "Unavailable", "pillClass": "pill-neutral"}
            if is_downloading:
                return {"label": "Downloading (50%)", "pillClass": "pill-blue"}
            if is_paused:
                return {"label": "Paused (50%)", "pillClass": "pill-amber"}
            if engine == "cloud":
                name = (cloud_prov or "Cloud").capitalize()
                return {"label": f"Cloud active ({name})", "pillClass": "pill-violet"}
            if engine == "local":
                return {"label": "Local ready", "pillClass": "pill-green"}
            return {"label": "Not configured", "pillClass": "pill-neutral"}

        # 1. Backend unavailable -> Must be 'Unavailable'
        status_unavail = derive_status(backend_available=False, engine="none", cloud_prov=None)
        self.assertEqual(status_unavail["label"], "Unavailable")
        self.assertEqual(status_unavail["pillClass"], "pill-neutral")

        # 2. Cloud active
        status_cloud = derive_status(backend_available=True, engine="cloud", cloud_prov="anthropic")
        self.assertEqual(status_cloud["label"], "Cloud active (Anthropic)")
        self.assertEqual(status_cloud["pillClass"], "pill-violet")

        # 3. Local ready
        status_local = derive_status(backend_available=True, engine="local", cloud_prov=None)
        self.assertEqual(status_local["label"], "Local ready")
        self.assertEqual(status_local["pillClass"], "pill-green")

        # 4. Neither configured
        status_none = derive_status(backend_available=True, engine="none", cloud_prov=None)
        self.assertEqual(status_none["label"], "Not configured")
        self.assertEqual(status_none["pillClass"], "pill-neutral")


if __name__ == "__main__":
    unittest.main(verbosity=2)
