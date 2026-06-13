# Changelog

All notable changes to Flowsint Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial release of Flowsint Desktop
- Automatic Docker detection and daemon status check
- First-run setup: AppData directory creation, `.env` generation with random secrets, `docker-compose.desktop.yml` deployment
- Image pull with streaming progress on first run
- `docker compose up -d` / `stop` orchestration (project: `flowsint-desktop`)
- Health-check polling loop until Flowsint UI is reachable on port 5173
- Window navigation + resize (520×420 splash → 1440×900 main) once ready
- System tray icon with "Open Flowsint" and "Quit Flowsint" actions
- Close-to-tray behaviour (Docker stack stays active)
- Graceful stack shutdown on quit
- Single-instance enforcement
- Automatic update check via Tauri updater
- Flowsint OKLCH colour palette (dark-first)
