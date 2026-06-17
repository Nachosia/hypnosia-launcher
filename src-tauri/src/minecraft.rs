use minecraft_java_rs_core::launcher::{
    events::LaunchEvent,
    options::{JavaOptions, LaunchOptions, LoaderConfig, MemoryConfig, ScreenConfig},
    Launcher,
};
use minecraft_java_rs_core::models::loader::LoaderType;
use minecraft_java_rs_core::models::minecraft::Authenticator;
use minecraft_java_rs_core::utils::auth::offline_uuid;
use std::path::PathBuf;
use tokio::fs;
use tokio::process::Child;

// Game version constants.
const MINECRAFT_VERSION: &str = "1.21.11";
const FABRIC_LOADER_BUILD: &str = "0.19.3";

fn default_mod_jar_url() -> String {
    std::env::var("MOD_JAR_URL").unwrap_or_else(|_| {
        "https://github.com/Nachosia/Hypnosia-Visuals/releases/download/v1.0-beta/hypnosia-1.0-beta.jar".to_string()
    })
}

fn fabric_api_url() -> String {
    std::env::var("FABRIC_API_URL").unwrap_or_else(|_| {
        "https://cdn.modrinth.com/data/P7dR8mSH/versions/i5tSkVBH/fabric-api-0.141.3%2B1.21.11.jar".to_string()
    })
}

fn fabric_language_kotlin_url() -> String {
    std::env::var("FABRIC_LANGUAGE_KOTLIN_URL").unwrap_or_else(|_| {
        "https://cdn.modrinth.com/data/Ha28R6CL/versions/21TRTKmh/fabric-language-kotlin-1.13.10%2Bkotlin.2.3.20.jar".to_string()
    })
}

/// Download a file from `url` into `dest` if it does not already exist.
async fn download_if_missing(dest: &PathBuf, url: &str) -> Result<(), String> {
    if dest.exists() {
        log::info!("already exists, skipping download: {}", dest.display());
        return Ok(());
    }

    log::info!("downloading {} -> {}", url, dest.display());
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("failed to download {}: {}", url, e))?;

    if !response.status().is_success() {
        return Err(format!(
            "failed to download {}: HTTP {}",
            url,
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("failed to read bytes from {}: {}", url, e))?;

    fs::write(dest, bytes)
        .await
        .map_err(|e| format!("failed to write {}: {}", dest.display(), e))?;

    Ok(())
}

pub async fn launch_minecraft_offline(
    game_dir: String,
    ram_gb: u32,
    username: String,
    mod_jar_url: Option<String>,
) -> Result<String, String> {
    let path = PathBuf::from(&game_dir);
    let mods_dir = path.join("mods");
    fs::create_dir_all(&mods_dir)
        .await
        .map_err(|e| format!("failed to create mods dir: {e}"))?;

    // Always ensure required dependency mods are present.
    let fabric_api_path = mods_dir.join("fabric-api-0.141.3+1.21.11.jar");
    let flk_path = mods_dir.join("fabric-language-kotlin-1.13.10+kotlin.2.3.20.jar");

    download_if_missing(&fabric_api_path, &fabric_api_url())
        .await
        .map_err(|e| format!("Fabric API download failed: {e}"))?;

    download_if_missing(&flk_path, &fabric_language_kotlin_url())
        .await
        .map_err(|e| format!("Fabric Language Kotlin download failed: {e}"))?;

    // Download the Hypnosia Visuals mod jar. Use the baked-in URL unless overridden.
    let mod_url = mod_jar_url.unwrap_or_else(default_mod_jar_url);
    let mod_file_name = mod_url
        .split('/')
        .next_back()
        .filter(|s| s.ends_with(".jar"))
        .unwrap_or("hypnosia-1.0-beta.jar");
    let mod_path = mods_dir.join(mod_file_name);

    download_if_missing(&mod_path, &mod_url)
        .await
        .map_err(|e| format!("Hypnosia Visuals mod download failed: {e}"))?;

    let auth = Authenticator {
        access_token: "offline".into(),
        name: username.clone(),
        uuid: offline_uuid(&username),
        xbox_account: None,
        user_properties: None,
        client_id: None,
        client_token: None,
    };

    let options = LaunchOptions {
        path,
        version: MINECRAFT_VERSION.into(),
        authenticator: auth,
        memory: MemoryConfig {
            min: format!("{}G", ram_gb.min(2)),
            max: format!("{}G", ram_gb),
        },
        loader: LoaderConfig {
            enable: true,
            loader_type: Some(LoaderType::Fabric),
            build: FABRIC_LOADER_BUILD.into(),
            path: None,
            config: None,
        },
        timeout_secs: 30,
        download_concurrency: 10,
        java: JavaOptions::default(),
        screen: ScreenConfig::default(),
        verify: true,
        game_args: vec![],
        jvm_args: vec![],
        instance: None,
        url: None,
        mcp: None,
        intel_enabled_mac: false,
        bypass_offline: true,
        skip_bundle_check: false,
        verify_concurrency: 4,
    };

    let mut launcher = Launcher::new(options);
    let (tx, mut rx) = tokio::sync::mpsc::channel::<LaunchEvent>(512);

    // Spawn event listener that logs to the Tauri log plugin if available
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                LaunchEvent::Progress { downloaded, total, kind } => {
                    log::info!("[mc:{kind}] {downloaded}/{total}");
                }
                LaunchEvent::Data(line) => {
                    log::info!("[mc] {line}");
                }
                LaunchEvent::Close(code) => {
                    log::info!("[mc] exited with code {code}");
                    break;
                }
                LaunchEvent::Error(err) => {
                    log::error!("[mc] {err}");
                }
                _ => {}
            }
        }
    });

    let mut child: Child = launcher
        .start(tx)
        .await
        .map_err(|e| format!("failed to start minecraft: {e}"))?;

    // Detach the process so the command can return while MC keeps running.
    tokio::spawn(async move {
        let _ = child.wait().await;
    });

    Ok(format!(
        "Minecraft {} (Fabric {}) launched for {}. Game dir: {}",
        MINECRAFT_VERSION, FABRIC_LOADER_BUILD, username, game_dir
    ))
}
