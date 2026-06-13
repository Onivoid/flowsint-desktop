use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DockerStatus {
    Ok,
    NotFound,
    NotRunning,
}

/// Check if Docker is installed and its daemon is running.
#[tauri::command]
pub fn check_docker() -> DockerStatus {
    match std::process::Command::new("docker").arg("info").output() {
        Err(_) => DockerStatus::NotFound,
        Ok(output) => {
            if output.status.success() {
                DockerStatus::Ok
            } else {
                // "docker info" fails when daemon is not running
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("Cannot connect")
                    || stderr.contains("Is the docker daemon running")
                    || stderr.contains("pipe")
                    || stderr.contains("refused")
                    || !output.status.success()
                {
                    DockerStatus::NotRunning
                } else {
                    DockerStatus::NotRunning
                }
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
    let mut child = tokio::process::Command::new("docker")
        .args([
            "compose",
            "-f",
            &compose_path,
            "--env-file",
            &env_path,
            "-p",
            "flowsint-desktop",
            "pull",
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start docker compose pull: {e}"))?;

    // Docker pull progress goes to stderr
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

/// Start the Flowsint stack (detached).
#[tauri::command]
pub fn start_stack(compose_path: String, env_path: String) -> Result<(), String> {
    let output = std::process::Command::new("docker")
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
        .output()
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
pub fn stop_stack(compose_path: String, env_path: String) -> Result<(), String> {
    let output = std::process::Command::new("docker")
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
        .output()
        .map_err(|e| format!("Failed to stop stack: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("docker compose stop failed: {stderr}"))
    }
}

/// Check if the Flowsint UI is reachable on port 5173.
#[tauri::command]
pub fn health_check() -> bool {
    let addr = "127.0.0.1:5173";
    TcpStream::connect_timeout(&addr.parse().unwrap(), Duration::from_secs(2)).is_ok()
}

/// Strip ANSI escape codes and carriage returns from a string.
fn strip_ansi_and_cr(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // Skip until we hit a letter (end of escape sequence)
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
