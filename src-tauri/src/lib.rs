mod commands;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

/// Script injecté avant chaque chargement de page dans la webview.
///
/// Deux rôles :
/// 1. Préserver les données du DataTransfer HTML5 si WebView2 les vide
///    (bug connu : le handler OS de file-drop peut vider dataTransfer
///    avant que l'event `drop` n'arrive au DOM de Flowsint).
/// 2. Bloquer les raccourcis natifs WebView2 qui n'ont pas de sens dans
///    une app desktop et pourraient casser l'état de Flowsint :
///    - Ctrl+R / F5 : rechargerait la page → perte du workflow en cours
///    - Ctrl+F : ouvrirait le dialog find-in-page natif de WebView2
const WEBVIEW_INIT_SCRIPT: &str = r#"
(function () {
  // --- Patch DataTransfer : backup/restore des données drag-and-drop ---
  var _store = Object.create(null);
  var _origSet = DataTransfer.prototype.setData;
  var _origGet = DataTransfer.prototype.getData;

  DataTransfer.prototype.setData = function (type, data) {
    _store[type] = data;
    try { _origSet.call(this, type, data); } catch (e) {}
  };

  DataTransfer.prototype.getData = function (type) {
    var v = '';
    try { v = _origGet.call(this, type) || ''; } catch (e) {}
    return v !== '' ? v : (_store[type] || '');
  };

  document.addEventListener('dragend', function () {
    _store = Object.create(null);
  }, true);

  document.addEventListener('drop', function () {
    setTimeout(function () { _store = Object.create(null); }, 50);
  }, true);

  // --- Bloquer les raccourcis WebView2 natifs indésirables ---
  document.addEventListener('keydown', function (e) {
    // Ctrl+R / F5 : rechargement page → perte de l'état du workflow
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Ctrl+F : dialog find-in-page natif parasite
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // If a second instance is launched, bring the existing window to front
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin({
            let mut builder = tauri_plugin_updater::Builder::new();
            #[cfg(target_os = "macos")]
            {
                builder = builder.target("darwin-universal");
            }
            builder.build()
        })
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Création explicite de la fenêtre principale via le builder Rust.
            // Cela permet d'utiliser .file_drop_enabled(false) et
            // .initialization_script() qui ne sont pas disponibles dans tauri.conf.json.
            //
            // Prefixed with `_` so non-Windows builds don't emit an unused-variable
            // warning (the binding is only used inside the Windows cfg block below).
            let _window = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            )
            .title("Flowsint Desktop")
            .inner_size(520.0, 420.0)
            .resizable(false)
            .center()
            .decorations(true)
            // Désactive le handler OS de drag-drop de WebView2 qui intercepte
            // les drag events avant qu'ils n'atteignent le DOM HTML5 de Flowsint.
            .disable_drag_drop_handler()
            // Injecte le script de protection DnD + raccourcis à chaque page.
            .initialization_script(WEBVIEW_INIT_SCRIPT)
            .build()?;

            // On Windows, force the taskbar icon from the bundled PNG.
            // `default_window_icon()` can be None in dev builds, and Windows also
            // caches the previous .exe icon — loading from raw RGBA bytes bypasses both.
            #[cfg(target_os = "windows")]
            {
                let icon_bytes = include_bytes!("../icons/128x128.png");
                if let Ok(img) = image::load_from_memory(icon_bytes) {
                    use image::GenericImageView;
                    let (w, h) = img.dimensions();
                    let rgba = img.into_rgba8().into_raw();
                    let icon = tauri::image::Image::new_owned(rgba, w, h);
                    let _ = _window.set_icon(icon);
                }
            }

            // Build tray icon menu
            let show_item =
                MenuItem::with_id(app, "show", "Open Flowsint", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit Flowsint", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Flowsint")
                // Left-click on the tray icon → show window
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                // Menu item handler
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        // Stop docker stack before quitting (best-effort, hidden window).
                        // We replicate the PATH extension from docker_cmd() in docker.rs
                        // because GUI apps on macOS inherit a minimal PATH that excludes
                        // /usr/local/bin and /opt/homebrew/bin where Docker Desktop
                        // installs its CLI — without this the binary cannot be found.
                        if let Ok(data_dir) = app.path().app_data_dir() {
                            let compose_path = data_dir
                                .join("docker-compose.desktop.yml")
                                .to_str()
                                .unwrap_or("")
                                .to_string();
                            let env_path = data_dir
                                .join(".env")
                                .to_str()
                                .unwrap_or("")
                                .to_string();
                            if !compose_path.is_empty() && !env_path.is_empty() {
                                let mut cmd = std::process::Command::new("docker");
                                cmd.args([
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
                                .stderr(std::process::Stdio::null());

                                #[cfg(target_os = "macos")]
                                {
                                    let current = std::env::var("PATH").unwrap_or_default();
                                    let extended = format!(
                                        "{}:/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin",
                                        current
                                    );
                                    cmd.env("PATH", extended);
                                }

                                #[cfg(target_os = "windows")]
                                {
                                    use std::os::windows::process::CommandExt;
                                    cmd.creation_flags(0x0800_0000);
                                }

                                let _ = cmd.output();
                            }
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        // Intercept window close: hide to tray instead of quitting
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // docker
            check_docker,
            pull_images,
            start_stack,
            stop_stack,
            health_check,
            // setup
            get_app_data_dir,
            is_first_run,
            initialize_app_data,
            mark_initialized,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Flowsint Desktop");
}
