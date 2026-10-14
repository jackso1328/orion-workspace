use keyring::Entry;

const CANONICAL_SERVICE: &str = "orion_app";
const LEGACY_SERVICE: &str = "orion_ai";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_api_credential(provider: &str, secret: &str) -> Result<(), String> {
    let clean = secret.trim();
    if clean.is_empty() {
        return Err("Credential cannot be empty".to_string());
    }
    let entry = Entry::new(CANONICAL_SERVICE, provider).map_err(|e| e.to_string())?;
    entry.set_password(clean).map_err(|e| e.to_string())?;

    // Verify canonical write before cleaning up legacy entry
    let verified = entry.get_password().map_err(|e| e.to_string())?;
    if verified != clean {
        return Err("Verification failed: saved credential does not match".to_string());
    }

    // Clean up legacy service entry if present
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, provider) {
        let _ = legacy_entry.delete_credential();
    }
    Ok(())
}

#[tauri::command]
fn check_api_credential(provider: &str) -> Result<bool, String> {
    // 1. Check canonical service
    if let Ok(entry) = Entry::new(CANONICAL_SERVICE, provider) {
        if let Ok(val) = entry.get_password() {
            if !val.trim().is_empty() {
                return Ok(true);
            }
        }
    }
    // 2. Check legacy service and perform verified, non-destructive migration
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, provider) {
        if let Ok(legacy_secret) = legacy_entry.get_password() {
            let clean = legacy_secret.trim();
            if !clean.is_empty() {
                let mut migrated = false;
                // Attempt write to canonical service
                if let Ok(canonical_entry) = Entry::new(CANONICAL_SERVICE, provider) {
                    if canonical_entry.set_password(clean).is_ok() {
                        // Verify canonical credential is present and matches
                        if let Ok(verified) = canonical_entry.get_password() {
                            if verified == clean {
                                migrated = true;
                            }
                        }
                    }
                }

                if migrated {
                    // Only delete legacy after canonical write has been verified!
                    let _ = legacy_entry.delete_credential();
                }
                // Return true because a valid credential exists
                return Ok(true);
            }
        }
    }
    Ok(false)
}

fn delete_service_credential(service: &str, provider: &str) -> Result<(), String> {
    let entry = Entry::new(service, provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Absent credential is an acceptable no-op
        Err(e) => Err(format!("Keyring error on {}: {}", service, e)),
    }
}

#[tauri::command]
fn remove_api_credential(provider: &str) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();

    // 1. Remove from canonical service
    if let Err(e) = delete_service_credential(CANONICAL_SERVICE, provider) {
        errors.push(e);
    }
    // 2. Remove from legacy service
    if let Err(e) = delete_service_credential(LEGACY_SERVICE, provider) {
        errors.push(e);
    }

    if !errors.is_empty() {
        return Err(errors.join("; "));
    }

    // 3. Confirm absent from both services
    if let Ok(entry) = Entry::new(CANONICAL_SERVICE, provider) {
        if entry.get_password().is_ok() {
            return Err("Credential still present in canonical store after deletion attempt".to_string());
        }
    }
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, provider) {
        if legacy_entry.get_password().is_ok() {
            return Err("Credential still present in legacy store after deletion attempt".to_string());
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_api_credential,
            check_api_credential,
            remove_api_credential
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn test_native_keyring_lifecycle() {
        let provider = "orion_interop_test";
        let secret = "test_val_dummy_key_98765";

        // Clean start
        let _ = remove_api_credential(provider);
        assert_eq!(check_api_credential(provider).unwrap(), false);

        // 1. Write via Tauri command
        assert!(save_api_credential(provider, secret).is_ok());
        assert_eq!(check_api_credential(provider).unwrap(), true);

        // 2. Python backend retrieval check via get_keyring_credential
        let python_path = r"C:\Users\proud\ORION\.venv\Scripts\python.exe";
        let py_script = r#"
import sys
sys.path.insert(0, r'C:\Users\proud\ORION')
from backend.llm import get_keyring_credential
val = get_keyring_credential('orion_interop_test')
if val == 'test_val_dummy_key_98765':
    sys.exit(0)
else:
    sys.exit(1)
"#;
        let py_check = Command::new(python_path)
            .args(["-c", py_script])
            .output();

        let py_read_success = match py_check {
            Ok(ref output) => output.status.success(),
            Err(_) => false,
        };

        // 3. Remove via Tauri command
        assert!(remove_api_credential(provider).is_ok());
        assert_eq!(check_api_credential(provider).unwrap(), false);

        // 4. Verify Python backend can no longer retrieve it
        let py_verify_absent_script = r#"
import sys
sys.path.insert(0, r'C:\Users\proud\ORION')
from backend.llm import get_keyring_credential
val = get_keyring_credential('orion_interop_test')
if val is None:
    sys.exit(0)
else:
    sys.exit(1)
"#;
        let py_absent_check = Command::new(python_path)
            .args(["-c", py_verify_absent_script])
            .output();

        let py_absent_success = match py_absent_check {
            Ok(output) => output.status.success(),
            Err(_) => false,
        };

        assert!(py_read_success, "Python backend should retrieve credential saved by Rust Tauri command");
        assert!(py_absent_success, "Python backend should see None after removal by Rust Tauri command");
    }
}


