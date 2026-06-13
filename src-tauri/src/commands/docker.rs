use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DockerStatus {
    Ok,
    NotFound,
    NotRunning,
}

// ── Helpers ────────────────────────────────────────────────────────────────

/// Build a tokio::process::Command with CREATE_NO_WINDOW on Windows
/// so that no console window flashes on screen.
fn docker_cmd() -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new("docker");
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    cmd
}

/// Strip ANSI escape codes and carriage returns from a string.
fn strip_ansi_and_cr(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            for ch in chars.by_ref() {
                if ch.is_ascii_alphabetic() {
                    break;
                }
            }
        } else if c != '\r' {
            result.push(c);
        }
    }
    result
}

// ── Commands ───────────────────────────────────────────────────────────────

/// Check if Docker is installed and its daemon is running.
#[tauri::command]
pub async fn check_docker() -> DockerStatus {
    match docker_cmd()
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
        .await
    {
        Err(_) => DockerStatus::NotFound,
        Ok(output) => {
            if output.status.success() {
                DockerStatus::Ok
            } else {
                DockerStatus::NotRunning
            }
        }
    }
}

/// Stream docker compose pull progress to the frontend via events.
#[tauri::command]
pub async fn pull_images(
    app: AppHandle,
    compose_path: String,
    env_path: String,
) -> Result<(), String> {
    let mut cmd = docker_cmd();
    cmd.args([
        "compose",
        "-f",
        &compose_path,
        "--env-file",
        &env_path,
        "-p",
        "flowsint-desktop",
        "pull",
    ])
    .stdout(std::process::Stdio::null())
    .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start docker compose pull: {e}"))?;

    if let Some(stderr) = child.stderr.take() {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let clean = strip_ansi_and_cr(&line);
            let clean = clean.trim().to_string();
            if !clean.is_empty() {
                let _ = app.emit("docker://pull-progress", &clean);
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("docker compose pull failed: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("docker compose pull exited with a non-zero status.".to_string())
    }
}

/// Start the Flowsint stack in detached mode.
#[tauri::command]
pub async fn start_stack(compose_path: String, env_path: String) -> Result<(), String> {
    let output = docker_cmd()
        .args([
            "compose",
            "-f",
            &compose_path,
            "--env-file",
            &env_path,
            "-p",
            "flowsint-desktop",
            "up",
            "-d",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to start stack: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("docker compose up failed: {stderr}"))
    }
}

/// Stop the Flowsint stack gracefully.
#[tauri::command]
pub async fn stop_stack(compose_path: String, env_path: String) -> Result<(), String> {
    let output = docker_cmd()
        .args([
            "compose",
            "-f",
            &compose_path,
            "--env-file",
            &env_path,
            "-p",
            "flowsint-desktop",
            "stop",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to stop stack: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("docker compose stop failed: {stderr}"))
    }
}

/// Check if the Flowsint UI is reachable on port 5173.
/// Uses a non-blocking async TCP connect so the window stays responsive.
#[tauri::command]
pub async fn health_check() -> bool {
    tokio::net::TcpStream::connect("127.0.0.1:5173")
        .await
        .is_ok()
}
