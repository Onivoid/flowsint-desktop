use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use tauri::Manager;

/// Return the AppData directory used by Flowsint Desktop.
/// Windows: %APPDATA%\Flowsint
/// macOS:   ~/Library/Application Support/Flowsint
/// Linux:   ~/.local/share/Flowsint (or $XDG_DATA_HOME/Flowsint)
#[tauri::command]
pub fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_str().unwrap_or("").to_string())
        .map_err(|e| e.to_string())
}

/// Returns true if this is a first run.
///
/// We check for a `.initialized` marker file rather than `.env`, because
/// `initialize_app_data` creates the `.env` early in the sequence — before the
/// image pull. If the pull fails and the user retries, `.env` already exists but
/// the images were never pulled. The `.initialized` marker is only written by
/// `mark_initialized()`, called from the frontend after a successful pull.
#[tauri::command]
pub fn is_first_run(app: tauri::AppHandle) -> bool {
    let Ok(data_dir) = app.path().app_data_dir() else {
        return true;
    };
    !data_dir.join(".initialized").exists()
}

/// Write the `.initialized` marker to signal that the first-run setup
/// (pull + stack start) completed successfully. Subsequent launches will
/// skip the image pull step.
#[tauri::command]
pub fn mark_initialized(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::write(data_dir.join(".initialized"), "")
        .map_err(|e| format!("Cannot write .initialized marker: {e}"))
}

/// Initialise the AppData directory on first run:
/// 1. Create the directory.
/// 2. Copy docker-compose.desktop.yml from bundled resources.
/// 3. Generate a .env file with random secrets.
///
/// Returns the path to the AppData directory as a string.
#[tauri::command]
pub fn initialize_app_data(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Cannot create AppData dir: {e}"))?;

    // Always overwrite docker-compose.desktop.yml from bundled resources.
    // This ensures healthchecks, image versions and service config stay in sync
    // with the installed app version. User data lives in .env and Docker volumes.
    let compose_dest = data_dir.join("docker-compose.desktop.yml");
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let compose_src = resource_dir.join("resources").join("docker-compose.desktop.yml");
    std::fs::copy(&compose_src, &compose_dest).map_err(|e| {
        format!(
            "Cannot copy compose file from {} to {}: {e}",
            compose_src.display(),
            compose_dest.display()
        )
    })?;

    // Generate .env with random secrets
    let env_dest = data_dir.join(".env");
    if !env_dest.exists() {
        let env_content = generate_env_content();
        std::fs::write(&env_dest, env_content)
            .map_err(|e| format!("Cannot write .env: {e}"))?;
    }

    Ok(data_dir.to_str().unwrap_or("").to_string())
}

/// Generate a .env file with randomised secrets for a fresh install.
fn generate_env_content() -> String {
    let mut rng = rand::thread_rng();

    // AUTH_SECRET: 32 random bytes encoded as a 64-character hex string
    let auth_secret_bytes: [u8; 32] = rng.gen();
    let auth_secret = auth_secret_bytes
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();

    // MASTER_VAULT_KEY_V1: 32 random bytes in base64, prefixed with "base64:"
    let vault_key_bytes: [u8; 32] = rng.gen();
    let vault_key = format!(
        "base64:{}",
        general_purpose::STANDARD.encode(vault_key_bytes)
    );

    // NEO4J_PASSWORD and POSTGRES_PASSWORD: 16 random alphanumeric characters each
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut random_pass = |len: usize| -> String {
        (0..len)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    };
    let neo4j_pass = random_pass(16);
    let postgres_pass = random_pass(16);

    format!(
        "NODE_ENV=production\n\
AUTH_SECRET={auth_secret}\n\
MASTER_VAULT_KEY_V1={vault_key}\n\
NEO4J_URI_BOLT=bolt://neo4j:7687\n\
NEO4J_USERNAME=neo4j\n\
NEO4J_PASSWORD={neo4j_pass}\n\
FLOWSINT_VERSION=latest\n\
POSTGRES_USER=flowsint\n\
POSTGRES_PASSWORD={postgres_pass}\n\
POSTGRES_DB=flowsint\n"
    )
}
