use keyring::Entry;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_api_credential(provider: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new("orion_app", provider).map_err(|e| e.to_string())?;
    entry.set_password(secret).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn check_api_credential(provider: &str) -> Result<bool, String> {
    let entry = Entry::new("orion_app", provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn remove_api_credential(provider: &str) -> Result<(), String> {
    let entry = Entry::new("orion_app", provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
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

