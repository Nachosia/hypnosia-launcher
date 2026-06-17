use std::path::PathBuf;
use std::sync::mpsc::sync_channel;
use sha2::{Digest, Sha256};
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;

mod minecraft;

#[tauri::command]
async fn get_hwid() -> Result<String, String> {
    let os = tauri_plugin_os::type_();
    let arch = tauri_plugin_os::arch();
    let hostname = tauri_plugin_os::hostname();
    let version = tauri_plugin_os::version();

    let raw = format!("{}|{:?}|{}|{:?}", os, arch, hostname, version);
    let hash = format!("{:x}", Sha256::digest(raw.as_bytes()));
    Ok(hash)
}

#[tauri::command]
async fn pick_directory(window: tauri::WebviewWindow) -> Result<Option<String>, String> {
    let (tx, rx) = sync_channel(1);
    let dialog = tauri_plugin_dialog::FileDialogBuilder::new(window.dialog().clone())
        .set_directory(PathBuf::from("%APPDATA%"));

    dialog.pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });

    match rx.recv() {
        Ok(path) => Ok(path),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn launch_minecraft(
    game_dir: String,
    _java_path: String,
    ram_gb: u32,
    username: String,
    mod_jar_url: Option<String>,
) -> Result<String, String> {
    let expanded_dir = if game_dir.starts_with('%') {
        game_dir
            .replace("%APPDATA%", &std::env::var("APPDATA").unwrap_or_default())
            .replace("%LOCALAPPDATA%", &std::env::var("LOCALAPPDATA").unwrap_or_default())
            .replace("%USERPROFILE%", &std::env::var("USERPROFILE").unwrap_or_default())
    } else {
        game_dir
    };

    minecraft::launch_minecraft_offline(expanded_dir, ram_gb, username, mod_jar_url).await
}

#[tauri::command]
async fn open_discord_auth(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.shell().open(&url, None).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, Clone)]
struct UpdateInfo {
    version: String,
    body: Option<String>,
}

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await.map_err(|e| e.to_string())? {
        Some(update) => Ok(Some(UpdateInfo {
            version: update.version,
            body: update.body,
        })),
        None => Ok(None),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No update available")?;

    let app_handle = app.clone();
    let app_handle2 = app.clone();
    update
        .download_and_install(
            move |chunk_length, content_length| {
                let _ = app_handle.emit(
                    "updater-progress",
                    serde_json::json!({
                        "chunkLength": chunk_length,
                        "contentLength": content_length,
                    }),
                );
            },
            move || {
                let _ = app_handle2.emit("updater-progress", serde_json::json!({"finished": true}));
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file if present (ignored in production where env vars are set externally)
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hwid,
            pick_directory,
            launch_minecraft,
            open_discord_auth,
            check_update,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
