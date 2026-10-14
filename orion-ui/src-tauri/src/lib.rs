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

#[tauri::command]
fn remove_api_credential(provider: &str) -> Result<(), String> {
    // Remove from canonical service
    if let Ok(entry) = Entry::new(CANONICAL_SERVICE, provider) {
        let _ = entry.delete_credential();
    }
    // Also remove from legacy service if present
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, provider) {
        let _ = legacy_entry.delete_credential();
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
