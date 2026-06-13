# Rust backend — Flowsint Desktop

## Commands

### `src/commands/docker.rs`

| Command | Signature | Description |
|---|---|---|
| `check_docker` | `() → DockerStatus` | Runs `docker info`; returns `ok`, `not_found`, or `not_running` |
| `pull_images` | `(app, compose_path, env_path) → Result` | Async; streams progress lines to the frontend as `docker://pull-progress` events |
| `start_stack` | `(compose_path, env_path) → Result` | Runs `docker compose up -d` with project name `flowsint-desktop` |
| `stop_stack` | `(compose_path, env_path) → Result` | Runs `docker compose stop` |
| `health_check` | `() → bool` | TCP connect to `127.0.0.1:5173`; returns `true` when the port is open |

### `src/commands/setup.rs`

| Command | Signature | Description |
|---|---|---|
| `get_app_data_dir` | `(app) → Result<String>` | Platform AppData path for Flowsint |
| `is_first_run` | `(app) → bool` | `true` if no `.env` exists in AppData |
| `initialize_app_data` | `(app) → Result<String>` | Creates AppData dir, copies compose file, generates `.env` with random secrets |

## `lib.rs`

- Registers all commands in `invoke_handler`
- Initialises `tauri-plugin-single-instance` (brings existing window to front on duplicate launch)
- Creates a tray icon with "Open Flowsint" and "Quit Flowsint" menu items
- "Quit" calls `docker compose stop` (best-effort) then `app.exit(0)`
- `on_window_event(CloseRequested)` → `prevent_close()` + `window.hide()` (close to tray)

## `resources/docker-compose.desktop.yml`

Bundled at build time via `bundle.resources` in `tauri.conf.json`.  
Copied to AppData on first run by `initialize_app_data`.  
Uses project name `flowsint-desktop` and `_desktop`-suffixed volume names to avoid conflicts with a manual Flowsint installation.
