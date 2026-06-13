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

/// Returns true if this is a first run (no .env file in AppData).
#[tauri::command]
pub fn is_first_run(app: tauri::AppHandle) -> bool {
    let Ok(data_dir) = app.path().app_data_dir() else {
        return true;
    };
    !data_dir.join(".env").exists()
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

    // Copy docker-compose.desktop.yml from bundled resources
    let compose_dest = data_dir.join("docker-compose.desktop.yml");
    if !compose_dest.exists() {
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
    }

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

    // NEO4J_PASSWORD: 16 random alphanumeric characters
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let neo4j_pass: String = (0..16)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();

    format!(
        "NODE_ENV=production\n\
AUTH_SECRET={auth_secret}\n\
MASTER_VAULT_KEY_V1={vault_key}\n\
NEO4J_URI_BOLT=bolt://neo4j:7687\n\
NEO4J_USERNAME=neo4j\n\
NEO4J_PASSWORD={neo4j_pass}\n\
FLOWSINT_VERSION=latest\n\
POSTGRES_USER=flowsint\n\
POSTGRES_PASSWORD=flowsint\n\
POSTGRES_DB=flowsint\n"
    )
}
