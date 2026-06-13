# Frontend Architecture — Flowsint Desktop

## Overview

The React frontend is intentionally minimal. Its sole responsibility is the **startup sequence**: checking Docker, initialising app data, pulling images, starting the stack, and navigating the webview to `http://127.0.0.1:5173` once Flowsint is ready.

After navigation, the webview loads the Flowsint UI directly. The Tauri shell (tray icon, window resize, close-to-tray) continues to operate transparently.

## Folder structure

```
src/
├── pages/
│   └── Startup.tsx          # The only page: full startup state machine
│
├── composables/
│   ├── useDocker.ts          # useDocker(), useSetup(), usePullProgress()
│   ├── useWindow.ts          # Window control (minimize, resize, hide, …)
│   ├── useTheme.ts           # Dark/light theme from localStorage
│   ├── useLocalStorage.ts    # Typed localStorage hook
│   ├── useTauri.ts           # useTauriCommand(), useIsTauri()
│   ├── useNotification.ts    # Native system notifications
│   ├── useLanguage.ts        # i18n language switching
│   ├── useDebounce.ts        # Value debounce
│   └── index.ts              # Barrel export
│
├── components/
│   ├── Updater.tsx           # Auto-update notification overlay
│   └── ui/                   # shadcn/ui primitives (Button, Card, …)
│
├── layouts/
│   └── RootLayout.tsx        # Minimal wrapper: theme + <Updater>
│
├── router/
│   └── index.tsx             # Single route: / → <Startup>
│
├── i18n/
│   └── locales/
│       ├── en.json           # English strings
│       └── fr.json           # French strings
│
└── index.css                 # Flowsint OKLCH colour palette, Tailwind v4
```

## Startup state machine (`Startup.tsx`)

```
idle
 └─ checking_docker
     ├─ docker_not_found    (error, recoverable via Retry)
     ├─ docker_not_running  (error, recoverable via Retry)
     └─ [ok]
         └─ setting_up      (first run only)
             └─ pulling     (first run only, streams docker://pull-progress)
                 └─ starting
                     └─ waiting  (health-check loop, 1s interval, 2min timeout)
                         └─ ready → resize window → window.location.href = :5173
```

## Key design decisions

- **No React Router navigation after startup** — once ready, the webview navigates away from the Tauri-served page entirely. The startup page is a one-shot component.
- **Dark theme by default** — applied before first render in `main.tsx` to match Flowsint's dark-first design.
- **Pull progress via Tauri events** — the Rust side emits `docker://pull-progress` string events; `usePullProgress()` subscribes and surfaces the last few lines.
- **Path separator normalisation** — AppData paths from Rust use `/`; they are normalised to `\` on Windows before being passed back to `docker compose`.
