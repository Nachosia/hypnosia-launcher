use base64::Engine;
use std::path::PathBuf;
use std::sync::mpsc::sync_channel;
use tauri::Emitter;
use tauri::async_runtime::Mutex;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::{UpdaterExt, Update};

mod hardware_fingerprint;
mod minecraft;

#[tauri::command]
async fn get_hwid() -> Result<String, String> {
    Ok(hardware_fingerprint::current_key32())
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
    download_url: String,
}

// Cached update so install_update can reuse the exact release discovered by
// check_update instead of re-fetching latest.json (which GitHub may cache).
static LAST_UPDATE: Mutex<Option<Update>> = Mutex::const_new(None);

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    log::info!("check_update invoked");
    let updater = app.updater().map_err(|e| {
        log::error!("updater init failed: {}", e);
        e.to_string()
    })?;
    match updater.check().await.map_err(|e| {
        log::error!("updater check failed: {}", e);
        e.to_string()
    })? {
        Some(update) => {
            log::info!("update available: {} from {}", update.version, update.download_url);
            let info = UpdateInfo {
                version: update.version.clone(),
                body: update.body.clone(),
                download_url: update.download_url.to_string(),
            };
            *LAST_UPDATE.lock().await = Some(update);
            Ok(Some(info))
        }
        None => {
            *LAST_UPDATE.lock().await = None;
            log::info!("no update available");
            Ok(None)
        }
    }
}

const SITE_TRPC_BASE: &str = "https://nachosia.site/api/trpc";

async fn site_trpc_query(procedure: &str, input: serde_json::Value) -> Result<serde_json::Value, String> {
    let input_json = serde_json::json!({ "json": input });
    let input_string = input_json.to_string();
    let encoded = urlencoding::encode(&input_string);
    let url = format!("{}/{}?input={}", SITE_TRPC_BASE, procedure, encoded);

    log::info!("site_trpc_query: {}", url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("Site {} returned {}: {}", procedure, status, body));
    }
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    Ok(json["result"]["data"]["json"].clone())
}

#[tauri::command]
async fn fetch_site_profile(account_id: i64) -> Result<serde_json::Value, String> {
    log::info!("fetch_site_profile: {}", account_id);
    site_trpc_query("profile.getById", serde_json::json!({ "id": account_id.to_string() })).await
}

#[tauri::command]
async fn fetch_site_activity(discord_id: String) -> Result<serde_json::Value, String> {
    log::info!("fetch_site_activity: {}", discord_id);
    site_trpc_query("profile.activity", serde_json::json!({ "discordId": discord_id })).await
}

#[tauri::command]
async fn fetch_site_server_stats(account_id: i64) -> Result<serde_json::Value, String> {
    log::info!("fetch_site_server_stats: {}", account_id);
    site_trpc_query("profile.serverStats", serde_json::json!({ "accountId": account_id })).await
}

#[tauri::command]
async fn fetch_image_as_base64(url: String) -> Result<String, String> {
    log::info!("fetch_image_as_base64: {}", url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .header("Accept", "image/png,image/*,*/*")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Image fetch failed: {}", status));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[derive(serde::Serialize)]
struct InstallUpdateResponse {
    installed: bool,
    manual_download_url: Option<String>,
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<InstallUpdateResponse, String> {
    log::info!("install_update invoked");

    // Prefer the update discovered by the last check_update call.
    let mut last = LAST_UPDATE.lock().await;
    let update = if let Some(update) = last.take() {
        log::info!("reusing update {} from last check", update.version);
        update
    } else {
        log::info!("no cached update, checking again");
        let updater = app.updater().map_err(|e| {
            log::error!("updater init failed: {}", e);
            e.to_string()
        })?;
        updater
            .check()
            .await
            .map_err(|e| {
                log::error!("updater check failed: {}", e);
                e.to_string()
            })?
            .ok_or("No update available")?
    };
    drop(last);

    let manual_download_url = update.download_url.to_string();
    log::info!(
        "downloading update {} from {}",
        update.version,
        manual_download_url
    );
    let app_handle = app.clone();
    let app_handle2 = app.clone();
    match update
        .download_and_install(
            move |chunk_length, content_length| {
                log::debug!("download progress {}/{:?}", chunk_length, content_length);
                let _ = app_handle.emit(
                    "updater-progress",
                    serde_json::json!({
                        "chunkLength": chunk_length,
                        "contentLength": content_length,
                    }),
                );
            },
            move || {
                log::info!("download finished");
                let _ = app_handle2.emit("updater-progress", serde_json::json!({"finished": true}));
            },
        )
        .await
    {
        Ok(()) => {
            log::info!("update installed successfully");
            Ok(InstallUpdateResponse {
                installed: true,
                manual_download_url: None,
            })
        }
        Err(e) => {
            log::error!("download_and_install failed: {}", e);
            // Return a structured response so the UI can offer a manual download.
            Ok(InstallUpdateResponse {
                installed: false,
                manual_download_url: Some(manual_download_url),
            })
        }
    }
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
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("hypnosia-launcher".into()),
                    }))
                    .build(),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hwid,
            pick_directory,
            launch_minecraft,
            open_discord_auth,
            check_update,
            install_update,
            fetch_site_profile,
            fetch_site_activity,
            fetch_site_server_stats,
            fetch_image_as_base64,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
