use keyring::Entry;

const CANONICAL_SERVICE: &str = "orion_app";
const LEGACY_SERVICE: &str = "orion_ai";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_api_credential(provider: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new(CANONICAL_SERVICE, provider).map_err(|e| e.to_string())?;
    entry.set_password(secret).map_err(|e| e.to_string())?;
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
        if entry.get_password().is_ok() {
            return Ok(true);
        }
    }
    // 2. Check legacy service and migrate safely if found
    if let Ok(legacy_entry) = Entry::new(LEGACY_SERVICE, provider) {
        if let Ok(secret) = legacy_entry.get_password() {
            if let Ok(canonical_entry) = Entry::new(CANONICAL_SERVICE, provider) {
                let _ = canonical_entry.set_password(&secret);
                let _ = legacy_entry.delete_credential();
            }
            return Ok(true);
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
