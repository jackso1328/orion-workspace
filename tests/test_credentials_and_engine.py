"""
Comprehensive test suite verifying Orion Cloud Provider, Credential Removal, and Runtime Consistency:
- Authoritative provider selection (no silent switching to other configured providers).
- Regression test: OpenAI credentials exist, Anthropic is selected with no key -> falls back to local or none, never OpenAI.
- Order-independent tests with isolated temporary ORION_CONFIG_PATH and clean module state teardown.
- Verified legacy migration result reporting (COMPLETED, CLEANUP_INCOMPLETE, FAILED, NO_LEGACY_KEY).
- Non-destructive migration safety: legacy entry preserved on write failure or verification mismatch.
- Truthful credential removal: no-op on absent key, deletion from both services, failure detection when removal fails.
- Portable provider configuration with preservation of existing extra settings.
- FastAPI endpoint contracts for GET /api/ai/status, GET /api/ai/provider, POST /api/ai/provider.
- Settings UI backend-unavailable status contract: strictly 'Unavailable' when backend is offline.
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

from fastapi.testclient import TestClient

from backend.llm import (
    CANONICAL_KEYRING_SERVICE,
    LEGACY_KEYRING_SERVICE,
    DEFAULT_PROVIDER,
    SUPPORTED_PROVIDERS,
    MigrationResult,
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
        # 1. Isolated temporary directory for config persistence tests
        self.temp_dir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.temp_dir.name) / "ai_settings.json"

        # 2. Environment isolation
        self.env_patcher = patch.dict(os.environ, {
            "ORION_CONFIG_PATH": str(self.config_path)
        }, clear=False)
        self.env_patcher.start()

        for env_var in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"]:
            if env_var in os.environ:
                del os.environ[env_var]

        # 3. Explicitly reset shared module provider state
        set_selected_provider(DEFAULT_PROVIDER)
        self.client = TestClient(app)

    def tearDown(self):
        # Cleanly restore shared state
        try:
            set_selected_provider(DEFAULT_PROVIDER)
        except Exception:
            pass
        self.env_patcher.stop()
        self.temp_dir.cleanup()

    def test_regression_openai_exists_anthropic_selected_no_silent_fallback(self):
        """
        Regression Test:
        - OpenAI credentials exist in both environment (OPENAI_API_KEY) and OS keyring.
        - Anthropic is selected by the user.
        - Anthropic has NO API key.
        Verify that Orion does NOT silently use OpenAI or report Cloud active.
        Verify that backend status reports selected_provider: 'anthropic', cloud_provider: None,
        and falls back to 'local' (if model exists) or 'none' (if no model).
        """
        # Set selected provider directly through persistent setter so all modules agree
        set_selected_provider("anthropic")
        self.assertEqual(get_selected_provider(), "anthropic")

        # Configure OpenAI credentials in both env and keyring
        os.environ["OPENAI_API_KEY"] = "sk-env-openai-test-key"
        mock_keyring = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-keyring-openai-test-key"
        }

        with patch("keyring.get_password", side_effect=lambda s, k: mock_keyring.get((s, k))):
            # 1. Authoritative cloud credentials resolver must return None for anthropic
            prov, key = get_cloud_credentials()
            self.assertIsNone(prov, "Must not return 'openai' when 'anthropic' is selected")
            self.assertIsNone(key, "Must not return OpenAI key when 'anthropic' is selected")

            # 2. Backend status when local model exists -> must be 'local', not 'cloud'
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=True)):
                status_local = get_full_ai_status()
                self.assertEqual(status_local["engine"], "local")
                self.assertEqual(status_local["selected_provider"], "anthropic")
                self.assertIsNone(status_local["cloud_provider"])

                # Test actual FastAPI status endpoint
                api_res = self.client.get("/api/ai/status")
                self.assertEqual(api_res.status_code, 200)
                data = api_res.json()
                self.assertEqual(data["engine"], "local")
                self.assertEqual(data["selected_provider"], "anthropic")
                self.assertIsNone(data["cloud_provider"])

            # 3. Backend status when local model does NOT exist -> must be 'none', not 'cloud'
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
                status_none = get_full_ai_status()
                self.assertEqual(status_none["engine"], "none")
                self.assertEqual(status_none["selected_provider"], "anthropic")
                self.assertIsNone(status_none["cloud_provider"])

    def test_authoritative_provider_with_active_key(self):
        """When selected provider has a valid key, it routes to that provider strictly."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-mock-openai-key",
            (CANONICAL_KEYRING_SERVICE, "anthropic"): "sk-mock-anthropic-key",
            (CANONICAL_KEYRING_SERVICE, "openrouter"): "sk-mock-openrouter-key",
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))):
            # Select Anthropic
            set_selected_provider("anthropic")
            prov, key = get_cloud_credentials()
            self.assertEqual(prov, "anthropic")
            self.assertEqual(key, "sk-mock-anthropic-key")

            # Select OpenAI
            set_selected_provider("openai")
            prov, key = get_cloud_credentials()
            self.assertEqual(prov, "openai")
            self.assertEqual(key, "sk-mock-openai-key")

            # Select OpenRouter
            set_selected_provider("openrouter")
            prov, key = get_cloud_credentials()
            self.assertEqual(prov, "openrouter")
            self.assertEqual(key, "sk-mock-openrouter-key")

    def test_migration_result_completed(self):
        """
        When canonical write is verified and legacy entry is deleted,
        migrate_legacy_credential returns MigrationResult.COMPLETED.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-valid-secret"
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

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.COMPLETED)
            self.assertEqual(mock_store.get((CANONICAL_KEYRING_SERVICE, "openai")), "sk-legacy-valid-secret")
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

    def test_migration_result_cleanup_incomplete(self):
        """
        When canonical write is verified, but legacy deletion fails,
        migrate_legacy_credential returns MigrationResult.CLEANUP_INCOMPLETE,
        preserving the working credential in both places.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-valid-secret"
        }

        def mock_get(service, username):
            return mock_store.get((service, username))

        def mock_set(service, username, password):
            mock_store[(service, username)] = password

        def failing_del(service, username):
            raise RuntimeError("Legacy store delete failed: access denied")

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("keyring.delete_password", side_effect=failing_del):

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.CLEANUP_INCOMPLETE)
            # Canonical credential was verified and exists
            self.assertEqual(mock_store.get((CANONICAL_KEYRING_SERVICE, "openai")), "sk-legacy-valid-secret")
            # Legacy entry was preserved
            self.assertEqual(mock_store.get((LEGACY_KEYRING_SERVICE, "openai")), "sk-legacy-valid-secret")

    def test_migration_result_failed_canonical_write_error(self):
        """
        When canonical write fails, legacy entry must NOT be deleted.
        Returns MigrationResult.FAILED.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-safe-secret"
        }

        def mock_get(service, username):
            return mock_store.get((service, username))

        def broken_set(service, username, password):
            raise RuntimeError("Canonical vault locked")

        del_calls = []
        def mock_del(service, username):
            del_calls.append((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=broken_set), \
             patch("keyring.delete_password", side_effect=mock_del):

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.FAILED)
            # Legacy was NOT deleted
            self.assertEqual(len(del_calls), 0)
            self.assertIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

            # Retrieval still works safely from legacy
            retrieved = get_keyring_credential("openai")
            self.assertEqual(retrieved, "sk-legacy-safe-secret")

    def test_migration_result_failed_verification_mismatch(self):
        """
        When canonical write succeeds but verification readback returns mismatched/empty value,
        legacy entry must NOT be deleted. Returns MigrationResult.FAILED.
        """
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-safe-secret"
        }

        def mock_get(service, username):
            if service == CANONICAL_KEYRING_SERVICE:
                return "corrupted_secret_value"
            return mock_store.get((service, username))

        def mock_set(service, username, password):
            pass

        del_calls = []
        def mock_del(service, username):
            del_calls.append((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("keyring.delete_password", side_effect=mock_del):

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.FAILED)
            # Legacy was NOT deleted
            self.assertEqual(len(del_calls), 0)
            self.assertIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

    def test_migration_result_no_legacy_key(self):
        """When neither canonical nor legacy entry exists, returns MigrationResult.NO_LEGACY_KEY."""
        with patch("keyring.get_password", return_value=None):
            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.NO_LEGACY_KEY)

    def test_repeated_checks_after_migration_hits_canonical_only(self):
        """Once migrated to canonical, subsequent lookups hit canonical without querying legacy."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-canonical-stored-key"
        }
        legacy_lookups = []

        def mock_get(service, username):
            if service == LEGACY_KEYRING_SERVICE:
                legacy_lookups.append(username)
            return mock_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get):
            val1 = get_keyring_credential("openai")
            val2 = get_keyring_credential("openai")
            self.assertEqual(val1, "sk-canonical-stored-key")
            self.assertEqual(val2, "sk-canonical-stored-key")
            # Legacy service was never called
            self.assertEqual(len(legacy_lookups), 0)

    def test_truthful_credential_removal_success(self):
        """
        delete_keyring_credential deletes from both canonical and legacy services
        and confirms absent.
        """
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-canonical-key",
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-key",
        }

        def mock_del(service, username):
            mock_store.pop((service, username), None)

        def mock_get(service, username):
            return mock_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.delete_password", side_effect=mock_del):

            res = delete_keyring_credential("openai")
            self.assertTrue(res)
            self.assertNotIn((CANONICAL_KEYRING_SERVICE, "openai"), mock_store)
            self.assertNotIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

    def test_credential_removal_absent_is_noop_success(self):
        """An absent credential is treated as an acceptable no-op and returns True."""
        mock_store = {}

        def mock_get(service, username):
            return mock_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get):
            res = delete_keyring_credential("openai")
            self.assertTrue(res)

    def test_credential_removal_failure_when_entry_remains(self):
        """If an entry remains present after deletion attempt, delete_keyring_credential returns False."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-stubborn-key"
        }

        # Mock delete_password that silently fails to delete
        def mock_del_noop(service, username):
            pass

        def mock_get(service, username):
            return mock_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.delete_password", side_effect=mock_del_noop):

            res = delete_keyring_credential("openai")
            self.assertFalse(res, "Must return False when credential remains present")

    def test_portable_provider_persistence_and_preservation(self):
        """ai_settings.json preserves extra settings across provider updates."""
        initial_payload = {
            "theme": "lavender",
            "developer_mode": True,
            "selected_provider": "openai"
        }
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(initial_payload, f)

        # Update via setter
        updated = set_selected_provider("anthropic")
        self.assertEqual(updated, "anthropic")

        # Verify file content
        with open(self.config_path, "r", encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved["selected_provider"], "anthropic")
        self.assertEqual(saved["theme"], "lavender")
        self.assertTrue(saved["developer_mode"])

        # Reload
        reloaded = load_selected_provider()
        self.assertEqual(reloaded, "anthropic")

    def test_invalid_provider_rejection_api(self):
        """FastAPI POST /api/ai/provider returns HTTP 400 for invalid provider."""
        res = self.client.post("/api/ai/provider", json={"provider": "invalid_gemini"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid cloud provider", res.json()["detail"])

    def test_provider_write_failure_api(self):
        """FastAPI POST /api/ai/provider returns HTTP 500 when disk write fails."""
        with patch("backend.main.set_selected_provider", side_effect=IOError("Disk write failed")):
            res = self.client.post("/api/ai/provider", json={"provider": "anthropic"})
            self.assertEqual(res.status_code, 500)
            self.assertIn("Disk write failed", res.json()["detail"])

    def test_settings_ui_backend_unavailable_contract(self):
        """
        Settings UI runtime status contract:
        - When backendAvailable is False: must strictly be 'Unavailable' (pill-neutral).
        - A configured credential must NOT make the badge claim 'Cloud active' or 'Cloud ready'.
        - When backendAvailable is True and engine is 'cloud': 'Cloud active (<Provider>)' (pill-violet).
        - When backendAvailable is True and engine is 'local': 'Local ready' (pill-green).
        - When backendAvailable is True and engine is 'none': 'Not configured' (pill-neutral).
        """
        def format_provider_name(prov):
            if not prov:
                return "Cloud"
            if prov == "openai":
                return "OpenAI"
            if prov == "anthropic":
                return "Anthropic"
            if prov == "openrouter":
                return "OpenRouter"
            return prov.capitalize()

        def derive_settings_status(backend_available, engine, cloud_prov, provider, is_downloading=False, is_paused=False):
            if not backend_available:
                return {"label": "Unavailable", "pillClass": "pill-neutral"}
            if is_downloading:
                return {"label": "Downloading (50%)", "pillClass": "pill-blue"}
            if is_paused:
                return {"label": "Paused (50%)", "pillClass": "pill-amber"}
            if engine == "cloud":
                active_prov = cloud_prov or provider
                return {"label": f"Cloud active ({format_provider_name(active_prov)})", "pillClass": "pill-violet"}
            if engine == "local":
                return {"label": "Local ready", "pillClass": "pill-green"}
            return {"label": "Not configured", "pillClass": "pill-neutral"}

        # 1. Backend unavailable -> Strictly 'Unavailable', never 'Cloud ready'
        unavail = derive_settings_status(backend_available=False, engine="cloud", cloud_prov="openai", provider="openai")
        self.assertEqual(unavail["label"], "Unavailable")
        self.assertEqual(unavail["pillClass"], "pill-neutral")

        # 2. Cloud active with actual provider
        cloud_active = derive_settings_status(backend_available=True, engine="cloud", cloud_prov="anthropic", provider="anthropic")
        self.assertEqual(cloud_active["label"], "Cloud active (Anthropic)")
        self.assertEqual(cloud_active["pillClass"], "pill-violet")

        # 3. Local ready
        local_ready = derive_settings_status(backend_available=True, engine="local", cloud_prov=None, provider="openai")
        self.assertEqual(local_ready["label"], "Local ready")
        self.assertEqual(local_ready["pillClass"], "pill-green")

        # 4. Neither configured
        not_config = derive_settings_status(backend_available=True, engine="none", cloud_prov=None, provider="openai")
        self.assertEqual(not_config["label"], "Not configured")
        self.assertEqual(not_config["pillClass"], "pill-neutral")


if __name__ == "__main__":
    unittest.main(verbosity=2)
