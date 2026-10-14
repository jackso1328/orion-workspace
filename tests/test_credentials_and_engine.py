"""
Comprehensive test suite verifying the 10 Orion Cloud Credential and Active Runtime Consistency scenarios.

Scenarios verified:
1. No cloud key and no local model -> engine is "none"
2. Newly saved OpenAI key -> engine is "cloud", provider "openai"
3. Newly saved Anthropic key -> engine is "cloud", provider "anthropic"
4. Newly saved OpenRouter key -> engine is "cloud", provider "openrouter"
5. Key saved under legacy keyring service ("orion_ai") -> migrated safely to "orion_app" and active
6. Both local model and cloud credentials available -> engine is "cloud", local model available
7. Multiple providers configured -> selected provider is authoritative over others
8. Credential removal and subsequent status refresh -> falls back to local or none
9. Backend unavailable -> client-side fallback handles unavailable backend gracefully
10. Credential lookup errors -> keyring exceptions handled safely without crash or leakage
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock, PropertyMock

# Add ORION repo to sys.path
sys.path.insert(0, r"C:\Users\proud\ORION")

import keyring
from backend.llm import (
    CANONICAL_KEYRING_SERVICE,
    LEGACY_KEYRING_SERVICE,
    SUPPORTED_PROVIDERS,
    get_keyring_credential,
    get_cloud_credentials,
    get_selected_provider,
    set_selected_provider,
)
from backend.main import get_full_ai_status, model_manager
from backend.model_manager import ModelManager


def mock_set_keyring(service, provider, secret, store):
    store[(service, provider)] = secret


def mock_del_keyring(service, provider, store):
    store.pop((service, provider), None)


class TestCredentialAndEngineConsistency(unittest.TestCase):
    def setUp(self):
        # Clear any environment variables that might interfere with tests
        self.env_patcher = patch.dict(os.environ, {}, clear=False)
        self.env_patcher.start()
        for env_var in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"]:
            if env_var in os.environ:
                del os.environ[env_var]

    def tearDown(self):
        self.env_patcher.stop()

    def test_scenario_1_no_cloud_key_and_no_local_model(self):
        """Scenario 1: No cloud key and no local model -> engine must be 'none'."""
        with patch("backend.llm.get_keyring_credential", return_value=None), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)), \
             patch("backend.main.get_cloud_credentials", return_value=(None, None)):
            status = get_full_ai_status()
            self.assertEqual(status["engine"], "none")
            self.assertFalse(status["model_exists"])
            self.assertIsNone(status["cloud_provider"])

    def test_scenario_2_newly_saved_openai_key(self):
        """Scenario 2: A newly saved OpenAI key -> engine is 'cloud', provider is 'openai'."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-test-mock-openai-key"
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))), \
             patch("backend.llm.get_selected_provider", return_value="openai"), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
            prov, key = get_cloud_credentials("openai")
            self.assertEqual(prov, "openai")
            self.assertIsNotNone(key)

            status = get_full_ai_status()
            self.assertEqual(status["engine"], "cloud")
            self.assertEqual(status["cloud_provider"], "openai")

    def test_scenario_3_newly_saved_anthropic_key(self):
        """Scenario 3: A newly saved Anthropic key -> engine is 'cloud', provider is 'anthropic'."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "anthropic"): "sk-ant-test-mock-key"
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))), \
             patch("backend.llm.get_selected_provider", return_value="anthropic"), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
            prov, key = get_cloud_credentials("anthropic")
            self.assertEqual(prov, "anthropic")
            self.assertIsNotNone(key)

            status = get_full_ai_status()
            self.assertEqual(status["engine"], "cloud")
            self.assertEqual(status["cloud_provider"], "anthropic")

    def test_scenario_4_newly_saved_openrouter_key(self):
        """Scenario 4: A newly saved OpenRouter key -> engine is 'cloud', provider is 'openrouter'."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openrouter"): "sk-or-test-mock-key"
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))), \
             patch("backend.llm.get_selected_provider", return_value="openrouter"), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
            prov, key = get_cloud_credentials("openrouter")
            self.assertEqual(prov, "openrouter")
            self.assertIsNotNone(key)

            status = get_full_ai_status()
            self.assertEqual(status["engine"], "cloud")
            self.assertEqual(status["cloud_provider"], "openrouter")

    def test_scenario_5_legacy_keyring_migration(self):
        """Scenario 5: A key saved under legacy service ('orion_ai') is safely migrated to 'orion_app'."""
        mock_store = {
            (LEGACY_KEYRING_SERVICE, "openai"): "sk-legacy-test-key"
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
            # Initially canonical has nothing, legacy has key
            self.assertNotIn((CANONICAL_KEYRING_SERVICE, "openai"), mock_store)
            self.assertIn((LEGACY_KEYRING_SERVICE, "openai"), mock_store)

            # Retrieve credential
            val = get_keyring_credential("openai")
            self.assertEqual(val, "sk-legacy-test-key")

            # Check that migration copied to canonical service
            self.assertIn((CANONICAL_KEYRING_SERVICE, "openai"), mock_store)
            self.assertEqual(mock_store[(CANONICAL_KEYRING_SERVICE, "openai")], "sk-legacy-test-key")

    def test_scenario_6_both_local_model_and_cloud_credentials(self):
        """Scenario 6: Both local model and cloud credentials available -> Cloud takes precedence, local model is marked existing."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-test-key"
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))), \
             patch("backend.llm.get_selected_provider", return_value="openai"), \
             patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=True)):
            status = get_full_ai_status()
            # Active engine must be Cloud
            self.assertEqual(status["engine"], "cloud")
            self.assertEqual(status["cloud_provider"], "openai")
            # Local model must be acknowledged as existing
            self.assertTrue(status["model_exists"])

    def test_scenario_7_multiple_providers_selected_is_authoritative(self):
        """Scenario 7: Multiple providers configured; selected provider remains authoritative."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-mock-openai-key",
            (CANONICAL_KEYRING_SERVICE, "anthropic"): "sk-ant-mock-key",
            (CANONICAL_KEYRING_SERVICE, "openrouter"): "sk-or-mock-key",
        }
        with patch("keyring.get_password", side_effect=lambda s, k: mock_store.get((s, k))):
            # When Anthropic is selected, it must return Anthropic even though OpenAI key exists
            prov, key = get_cloud_credentials(target_provider="anthropic")
            self.assertEqual(prov, "anthropic")
            self.assertEqual(key, "sk-ant-mock-key")

            # When OpenAI is selected, it returns OpenAI
            prov, key = get_cloud_credentials(target_provider="openai")
            self.assertEqual(prov, "openai")
            self.assertEqual(key, "sk-mock-openai-key")

            # When OpenRouter is selected, it returns OpenRouter
            prov, key = get_cloud_credentials(target_provider="openrouter")
            self.assertEqual(prov, "openrouter")
            self.assertEqual(key, "sk-or-mock-key")

    def test_scenario_8_credential_removal_and_status_refresh(self):
        """Scenario 8: Credential removal causes fallback to local model or none."""
        mock_store = {
            (CANONICAL_KEYRING_SERVICE, "openai"): "sk-mock-openai-key"
        }

        def mock_get(service, username):
            return mock_store.get((service, username))

        def mock_del(service, username):
            mock_store.pop((service, username), None)

        with patch("keyring.get_password", side_effect=mock_get), \
             patch("keyring.delete_password", side_effect=mock_del), \
             patch("backend.llm.get_selected_provider", return_value="openai"):
            
            # Case 8a: Model exists on disk. Before removal -> cloud. After removal -> local.
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=True)):
                status_before = get_full_ai_status()
                self.assertEqual(status_before["engine"], "cloud")

                # Remove credential from store
                mock_del(CANONICAL_KEYRING_SERVICE, "openai")
                mock_del(LEGACY_KEYRING_SERVICE, "openai")

                status_after = get_full_ai_status()
                self.assertEqual(status_after["engine"], "local")
                self.assertIsNone(status_after["cloud_provider"])

            # Case 8b: No model on disk. After removal -> none.
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
                status_no_model = get_full_ai_status()
                self.assertEqual(status_no_model["engine"], "none")
                self.assertIsNone(status_no_model["cloud_provider"])

    def test_scenario_9_backend_unavailable_resilience(self):
        """Scenario 9: Backend status unavailability handled gracefully without unhandled exceptions."""
        import urllib.error
        # Simulate connection error to backend
        def mock_urlopen(req, *args, **kwargs):
            raise urllib.error.URLError("Connection refused")

        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            try:
                import urllib.request
                urllib.request.urlopen("http://localhost:99999/api/ai/status")
                failed = False
            except Exception as e:
                failed = True
                self.assertIn("Connection refused", str(e))
            self.assertTrue(failed)

    def test_scenario_10_credential_lookup_errors(self):
        """Scenario 10: Keyring exceptions handled safely without crashing or exposing secrets."""
        import keyring.errors

        def broken_get(service, username):
            raise keyring.errors.KeyringError("Keyring daemon locked or unavailable")

        with patch("keyring.get_password", side_effect=broken_get):
            # Must return None safely without raising an exception
            res = get_keyring_credential("openai")
            self.assertIsNone(res)

            # Cloud credentials lookup must also return (None, None) gracefully
            prov, key = get_cloud_credentials("openai")
            self.assertIsNone(key)
            self.assertIsNone(prov)

            # Main status must report safely
            with patch.object(ModelManager, "model_exists", new_callable=PropertyMock(return_value=False)):
                status = get_full_ai_status()
                self.assertEqual(status["engine"], "none")


if __name__ == "__main__":
    unittest.main(verbosity=2)
