# Flowsint Desktop

[![License](https://img.shields.io/badge/License-AGPLv3-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://tauri.app/)
[![Community](https://img.shields.io/badge/community-initiative-orange.svg)](#disclaimer)

**Flowsint Desktop** is an unofficial, community-built desktop wrapper for [Flowsint](https://github.com/reconurge/flowsint) — the open-source OSINT graph exploration tool.

It packages the full Flowsint stack into a native desktop application: one double-click starts Docker, pulls the images on first run, launches all services, and opens the UI — no terminal, no manual configuration.

> **This project is not affiliated with, endorsed by, or maintained by the Flowsint team.**
> It is an independent community initiative. All credit for the underlying tool goes to the original Flowsint project and its contributors.

---

## Why this exists

Flowsint is a powerful tool, but its current setup requires technical knowledge:
cloning the repository, editing `.env` files, running `docker compose` commands from a terminal.
This is perfectly fine for developers — but it creates a barrier for analysts, investigators, and researchers who just want to use the tool.

**Flowsint Desktop removes that barrier.** It wraps the existing, unmodified Flowsint Docker stack inside a Tauri application that:

- Detects whether Docker Desktop is installed and running
- Initialises the app data directory and generates secure secrets automatically on first run
- Pulls the official Flowsint images from GHCR
- Starts all services (`postgres`, `neo4j`, `redis`, `api`, `celery`, `app`)
- Polls until the UI is reachable, then navigates to it and resizes the window
- Stays alive in the system tray when the window is closed (the stack keeps running)
- Stops the stack cleanly when you choose "Quit Flowsint" from the tray menu
- Checks for updates to the desktop wrapper automatically via GitHub Releases

The Flowsint application itself — its backend, its database schema, its enrichers — is **not modified in any way**.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Docker Desktop](https://docs.docker.com/desktop/) | Latest | Must be running before launching the app |
| Windows 10/11 or macOS 13+ | — | Linux support is untested but should work |

No Rust, Node.js, or terminal knowledge required for end users.

---

## Installation

Download the latest installer from the [Releases](https://github.com/Onivoid/flowsint-desktop/releases) page.

| Platform | File |
|---|---|
| Windows | `Flowsint_x.x.x_x64-setup.exe` |
| macOS (Apple Silicon) | `Flowsint_x.x.x_aarch64.dmg` |
| macOS (Intel) | `Flowsint_x.x.x_x64.dmg` |

Run the installer, then launch Flowsint Desktop. On first launch it will download the Docker images (~1–5 minutes depending on your connection).

---

## How it works

```
Launch app
    │
    ├─ Docker not installed? → Error screen + link to docker.com
    ├─ Docker not running?   → Error screen + Retry button
    │
    ├─ First run?
    │   ├─ Generate AppData dir  (%APPDATA%\Flowsint on Windows)
    │   ├─ Write docker-compose.desktop.yml
    │   ├─ Generate .env with random secrets (AUTH_SECRET, NEO4J_PASSWORD, …)
    │   └─ Pull Flowsint images from GHCR
    │
    ├─ docker compose up -d   (project: flowsint-desktop)
    ├─ Poll http://127.0.0.1:5173  until ready
    └─ Resize window → navigate to Flowsint UI
```

Closing the window hides it to the tray — the Docker stack stays active.
Right-clicking the tray icon gives you **Open Flowsint** and **Quit Flowsint**.
Quitting runs `docker compose stop` before exiting.

---

## Data & configuration

All runtime data lives in the platform AppData directory:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\Flowsint\` |
| macOS | `~/Library/Application Support/Flowsint/` |
| Linux | `~/.local/share/Flowsint/` |

Files stored there:
- `.env` — generated secrets (do not share this file)
- `docker-compose.desktop.yml` — the compose file used by the app

Docker volumes are named `pg_data_desktop`, `neo4j_data_desktop`, etc. and are scoped to the `flowsint-desktop` compose project, so they coexist safely with a manual Flowsint install.

---

## Building from source

### Prerequisites (developers)

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Docker Desktop](https://docs.docker.com/desktop/)

### Steps

```bash
# Clone this repository
git clone https://github.com/Onivoid/flowsint-desktop.git
cd flowsint-desktop

# Install JS dependencies
pnpm install

# Run in development mode (hot reload)
pnpm tauri dev

# Build a production installer
pnpm tauri build
```

### Project structure

```
flowsint-desktop/
├── src/
│   ├── pages/
│   │   └── Startup.tsx          # Splash / loading screen
│   ├── composables/
│   │   ├── useDocker.ts         # Rust command wrappers
│   │   └── ...                  # Boilerplate composables (theme, window, …)
│   └── router/index.tsx         # Single route → Startup
│
└── src-tauri/
    ├── src/
    │   ├── commands/
    │   │   ├── docker.rs        # check_docker, pull_images, start_stack, …
    │   │   └── setup.rs         # get_app_data_dir, is_first_run, initialize_app_data
    │   └── lib.rs               # Tauri builder, tray icon, close→hide handler
    ├── resources/
    │   └── docker-compose.desktop.yml
    └── tauri.conf.json
```

---

## Auto-updates

Flowsint Desktop checks for new releases automatically on startup using Tauri's signed updater.

The updater endpoint is already configured for `Onivoid/flowsint-desktop`. The only remaining step before publishing a first release is to configure the signing keys as GitHub Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

The included CI workflow (`.github/workflows/`) builds and signs for Windows, macOS (ARM + Intel), and Linux.

---

## Disclaimer

This project is a **community initiative** and is **not affiliated with, endorsed by, or supported by the Flowsint project or its authors**.

Flowsint Desktop simply automates what the official Flowsint documentation asks you to do manually. It does not modify the Flowsint source code, does not redistribute it, and does not claim any rights over it.

All trademarks, logos, and brand assets associated with Flowsint belong to their respective owners.

**Please read and follow the [Flowsint ethics guidelines](https://github.com/reconurge/flowsint/blob/main/ETHICS.md) when using this tool.**

---

## Acknowledgements

A huge thank you to the [Flowsint team](https://github.com/reconurge/flowsint) and all its contributors for building such an extraordinary open-source OSINT tool. This project would not exist without their work.

If Flowsint Desktop has been useful to you, please consider supporting the **original Flowsint developer** directly — not us:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support%20Flowsint's%20dev-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dextmorgn)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support%20Flowsint's%20dev-F16061?logo=ko-fi&logoColor=white)](https://ko-fi.com/P5P01W3GPJ)

- [Flowsint](https://github.com/reconurge/flowsint) — the original project
- [Tauri](https://tauri.app/) — desktop framework
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Onivoid/Tauri-React-Boilerplate](https://github.com/Onivoid/Tauri-React-Boilerplate) — React + Tauri boilerplate this project is built upon

---

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE) for details.

This license covers the desktop wrapper only. The Flowsint application is licensed under the [Apache 2.0 License](https://github.com/reconurge/flowsint/blob/main/LICENSE).
