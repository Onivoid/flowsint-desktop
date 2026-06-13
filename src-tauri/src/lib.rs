mod commands;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
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
                        // Stop docker stack before quitting (best-effort)
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
                                let _ = std::process::Command::new("docker")
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
                                    .output();
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
            // system (kept from boilerplate)
            greet,
            get_system_info,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Flowsint Desktop");
}
