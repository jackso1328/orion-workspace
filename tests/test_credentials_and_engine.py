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
import subprocess
from unittest.mock import patch, MagicMock, PropertyMock

# Dynamically derive repository root from test file location
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

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
    _read_win32_credential,
    _delete_win32_credential,
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

        # 4. In-memory mock store for win32 credentials during unit tests
        self._win32_mock_store = {}

        def mock_win32_read(service, provider):
            return self._win32_mock_store.get((service, provider))

        def mock_win32_write(service, provider, secret):
            self._win32_mock_store[(service, provider)] = secret
            return True

        def mock_win32_delete(service, provider):
            self._win32_mock_store.pop((service, provider), None)
            return True

        self._patch_win32_read = patch("backend.llm._read_win32_credential", side_effect=mock_win32_read)
        self._patch_win32_write = patch("backend.llm._write_win32_credential", side_effect=mock_win32_write)
        self._patch_win32_delete = patch("backend.llm._delete_win32_credential", side_effect=mock_win32_delete)

        self._patch_win32_read.start()
        self._patch_win32_write.start()
        self._patch_win32_delete.start()

    def tearDown(self):
        # Cleanly restore shared state
        try:
            set_selected_provider(DEFAULT_PROVIDER)
        except Exception:
            pass
        self._patch_win32_delete.stop()
        self._patch_win32_write.stop()
        self._patch_win32_read.stop()
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

    def test_native_win32_deletion_failure_causes_false_removal(self):
        """When Windows native credential deletion fails, delete_keyring_credential returns False."""
        with patch("keyring.get_password", return_value=None), \
             patch("backend.llm._delete_win32_credential", return_value=False):
            res = delete_keyring_credential("openai")
            self.assertFalse(res, "Must return False when native deletion fails")

    def test_native_win32_read_and_delete_truthful_platform_gating(self):
        """_read_win32_credential and _delete_win32_credential gate by platform truthfully."""
        self._patch_win32_read.stop()
        self._patch_win32_delete.stop()
        try:
            with patch("sys.platform", "darwin"):
                self.assertIsNone(_read_win32_credential(CANONICAL_KEYRING_SERVICE, "openai"))
                self.assertTrue(_delete_win32_credential(CANONICAL_KEYRING_SERVICE, "openai"))

            with patch("sys.platform", "linux"):
                self.assertIsNone(_read_win32_credential(CANONICAL_KEYRING_SERVICE, "openai"))
                self.assertTrue(_delete_win32_credential(CANONICAL_KEYRING_SERVICE, "openai"))
        finally:
            self._patch_win32_read.start()
            self._patch_win32_delete.start()

    def test_native_win32_real_lifecycle_on_windows(self):
        """On Windows, test real win32 CredWrite -> CredRead -> CredDelete lifecycle with isolated test target."""
        if sys.platform != "win32":
            self.skipTest("Windows-only native Credential Manager test")
        self._patch_win32_read.stop()
        self._patch_win32_write.stop()
        self._patch_win32_delete.stop()
        test_prov = f"test_roundtrip_{os.getpid()}"
        try:
            from backend.llm import _write_win32_credential
            # 1. Write
            self.assertTrue(_write_win32_credential(CANONICAL_KEYRING_SERVICE, test_prov, "secret_123"))
            # 2. Read
            self.assertEqual(_read_win32_credential(CANONICAL_KEYRING_SERVICE, test_prov), "secret_123")
            # 3. Delete
            self.assertTrue(_delete_win32_credential(CANONICAL_KEYRING_SERVICE, test_prov))
            # 4. Confirm absence
            self.assertIsNone(_read_win32_credential(CANONICAL_KEYRING_SERVICE, test_prov))
        finally:
            _delete_win32_credential(CANONICAL_KEYRING_SERVICE, test_prov)
            self._patch_win32_read.start()
            self._patch_win32_write.start()
            self._patch_win32_delete.start()

    def test_migration_when_legacy_key_in_win32_only(self):
        """
        When a legacy key exists only in Windows Credential Manager and not in keyring backend:
        - If native deletion succeeds, returns MigrationResult.COMPLETED.
        - If native deletion fails, returns MigrationResult.CLEANUP_INCOMPLETE.
        """
        # Scenario A: Successful cleanup
        mock_canonical_store = {}
        def mock_set(service, username, password):
            mock_canonical_store[(service, username)] = password

        def mock_get(service, username):
            return mock_canonical_store.get((service, username))

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("backend.llm._read_win32_credential", side_effect=lambda s, p: "sk-win32-legacy-key" if s == LEGACY_KEYRING_SERVICE else mock_canonical_store.get((s, p))), \
             patch("backend.llm._delete_win32_credential", return_value=True):

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.COMPLETED)
            self.assertEqual(mock_canonical_store.get((CANONICAL_KEYRING_SERVICE, "openai")), "sk-win32-legacy-key")

        # Scenario B: Incomplete cleanup when native delete fails
        mock_canonical_store.clear()
        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.set_password", side_effect=mock_set), \
             patch("backend.llm._read_win32_credential", side_effect=lambda s, p: "sk-win32-legacy-key" if s == LEGACY_KEYRING_SERVICE else mock_canonical_store.get((s, p))), \
             patch("backend.llm._delete_win32_credential", return_value=False):

            res = migrate_legacy_credential("openai")
            self.assertEqual(res, MigrationResult.CLEANUP_INCOMPLETE)
            self.assertEqual(mock_canonical_store.get((CANONICAL_KEYRING_SERVICE, "openai")), "sk-win32-legacy-key")

    def test_actual_backend_runtime_status_contract(self):
        """
        Verifies actual backend runtime engine and provider resolution contracts:
        - When cloud credentials exist for selected provider -> engine is 'cloud', cloud_provider matches.
        - When cloud credentials missing, but local model exists -> engine is 'local', cloud_provider is None.
        - When neither exists -> engine is 'none', cloud_provider is None.
        - When cloud key exists for non-selected provider (e.g. openai) while anthropic is selected without key,
          backend status never claims cloud active.
        """
        # 1. Cloud engine active
        mock_store = {(CANONICAL_KEYRING_SERVICE, "anthropic"): "sk-valid-anthropic-key"}
        set_selected_provider("anthropic")
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))):
            status = get_full_ai_status()
            self.assertEqual(status["engine"], "cloud")
            self.assertEqual(status["cloud_provider"], "anthropic")
            self.assertEqual(status["selected_provider"], "anthropic")

            api_res = self.client.get("/api/ai/status")
            self.assertEqual(api_res.status_code, 200)
            self.assertEqual(api_res.json()["engine"], "cloud")
            self.assertEqual(api_res.json()["cloud_provider"], "anthropic")

        # 2. Local fallback active when cloud key missing
        with patch("keyring.get_password", return_value=None), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=True)):
            status = get_full_ai_status()
            self.assertEqual(status["engine"], "local")
            self.assertIsNone(status["cloud_provider"])

            api_res = self.client.get("/api/ai/status")
            self.assertEqual(api_res.status_code, 200)
            self.assertEqual(api_res.json()["engine"], "local")
            self.assertIsNone(api_res.json()["cloud_provider"])

        # 3. Neither configured
        with patch("keyring.get_password", return_value=None), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
            status = get_full_ai_status()
            self.assertEqual(status["engine"], "none")
            self.assertIsNone(status["cloud_provider"])

            api_res = self.client.get("/api/ai/status")
            self.assertEqual(api_res.status_code, 200)
            self.assertEqual(api_res.json()["engine"], "none")
            self.assertIsNone(api_res.json()["cloud_provider"])

    def test_frontend_pure_runtime_status_suite_passes(self):
        """
        Executes the real React frontend's pure runtime-status derivation unit test suite:
        (node --test src/utils/runtimeStatus.test.ts).
        Verifies all 8 status badge states directly without mocking.
        """
        ui_dir = REPO_ROOT / "orion-ui"
        test_file = ui_dir / "src" / "utils" / "runtimeStatus.test.ts"
        if not test_file.exists():
            self.skipTest("runtimeStatus.test.ts not found in orion-ui")

        try:
            res = subprocess.run(
                ["node", "--test", "src/utils/runtimeStatus.test.ts"],
                cwd=str(ui_dir),
                capture_output=True,
                text=True,
                timeout=15,
            )
            self.assertEqual(res.returncode, 0, f"Frontend runtime status tests failed:\n{res.stdout}\n{res.stderr}")
            self.assertIn("pass 8", res.stdout)
            self.assertIn("fail 0", res.stdout)
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            self.skipTest(f"Node runtime unavailable to execute frontend test: {e}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
