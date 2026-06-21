use rand::RngCore;
use sha2::{Digest, Sha256};
use std::process::Command;

const VERSION: &str = "hypnosia-hwid-v1";
const FALLBACK_INSTALL_ID_FILE: &str = "install-id.dat";

/// 32-character stable public identifier, matching the Hypnosia mod.
pub fn current_key32() -> String {
    sha256_hex(&canonical_source()).chars().take(32).collect()
}

/// Full 64-character SHA-256 hash.
#[allow(dead_code)]
pub fn current_hash64() -> String {
    sha256_hex(&canonical_source())
}

fn canonical_source() -> String {
    let os_name = std::env::consts::OS.to_lowercase();
    let os_arch = std::env::consts::ARCH.to_lowercase();
    let machine_id = platform_machine_id(&os_name).unwrap_or_else(fallback_install_id);
    format!("{}|{}|{}|{}", VERSION, os_name, os_arch, machine_id)
}

fn platform_machine_id(os_name: &str) -> Option<String> {
    let raw = match os_name {
        "windows" => windows_machine_guid()?,
        "linux" => linux_machine_id()?,
        "macos" => mac_platform_uuid()?,
        _ => return None,
    };
    let normalized = raw.trim().to_lowercase();
    if normalized.is_empty() {
        return None;
    }
    Some(normalized)
}

#[cfg(target_os = "windows")]
fn windows_machine_guid() -> Option<String> {
    let output = Command::new("reg")
        .args([
            "query",
            "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .find(|line| line.to_lowercase().contains("machineguid"))
        .and_then(|line| line.split_whitespace().last())
        .map(|s| s.to_string())
}

#[cfg(not(target_os = "windows"))]
fn windows_machine_guid() -> Option<String> {
    None
}

#[cfg(target_os = "linux")]
fn linux_machine_id() -> Option<String> {
    read_first_existing(&["/etc/machine-id", "/var/lib/dbus/machine-id"])
}

#[cfg(not(target_os = "linux"))]
fn linux_machine_id() -> Option<String> {
    None
}

#[cfg(target_os = "macos")]
fn mac_platform_uuid() -> Option<String> {
    let output = Command::new("ioreg")
        .args(["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .find(|line| line.contains("IOPlatformUUID"))
        .map(|line| {
            line.split('=')
                .nth(1)
                .unwrap_or("")
                .replace('"', "")
                .trim()
                .to_string()
        })
}

#[cfg(not(target_os = "macos"))]
fn mac_platform_uuid() -> Option<String> {
    None
}

fn fallback_install_id() -> String {
    let file = fallback_file_path();
    if let Some(parent) = file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    if let Ok(content) = std::fs::read_to_string(&file) {
        let trimmed = content.trim();
        if trimmed.len() >= 32 {
            return trimmed.to_string();
        }
    }

    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let id = hex_encode(&bytes);
    let _ = std::fs::write(&file, &id);
    id
}

fn fallback_file_path() -> std::path::PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
        .join("Hypnosia Launcher")
        .join(FALLBACK_INSTALL_ID_FILE)
}

#[allow(dead_code)]
fn read_first_existing(paths: &[&str]) -> Option<String> {
    for path in paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn sha256_hex(value: &str) -> String {
    hex_encode(&Sha256::digest(value.as_bytes()))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}
