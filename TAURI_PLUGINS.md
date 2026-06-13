# Tauri Plugins used in Flowsint Desktop

| Plugin | Purpose |
|---|---|
| `tauri-plugin-updater` | Checks for new releases and installs updates |
| `tauri-plugin-process` | Allows the app to exit cleanly |
| `tauri-plugin-opener` | Opens external URLs (e.g. Docker install page) in the default browser |
| `tauri-plugin-notification` | Native OS notifications |
| `tauri-plugin-single-instance` | Prevents multiple instances of the app from running simultaneously |
| `tray-icon` (Tauri feature) | System tray icon with Open / Quit menu |

## Permissions

Defined in `src-tauri/capabilities/default.json`. Notable additions over the base boilerplate:

- `core:window:allow-set-size` — resize window after startup
- `core:window:allow-set-resizable` — make window resizable after startup
- `core:window:allow-center` — re-centre window after resize
- `core:event:allow-listen` / `allow-emit` — receive `docker://pull-progress` events from Rust
