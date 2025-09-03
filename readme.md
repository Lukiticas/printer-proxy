# Elgin Printer Proxy (Electron Tray App)

Lightweight Windows background (tray) application that exposes simple HTTP endpoints for printing through an Elgin printer driver. Bundles a minimal local Express server + Electron tray for quick access (logs, settings, restart). Designed for large‑scale deployment with silent background operation.

> Status: Early release (0.x). APIs may evolve. Code signing & auto‑update pipeline not yet enabled.

---

## Features
- Runs in the system tray (auto‑start with Windows).
- Local HTTP API for printing (and future endpoints).
- Enumerates printers and uses the selected Windows default (or a configured one).
- Simple static Settings UI (served from /settings).
- Graceful restart & single‑instance lock.
- Structured startup logging (userData/logs/startup.log).
- Portable EXE and NSIS installer builds.

---

## Requirements
- Windows 10+ (x64)
- Installed Elgin printer driver (accessible via standard Windows print spooler)
- Node.js only required if building from source (v20 recommended)

---

## Quick Start (End User)
1. Download the latest installer or portable EXE from Releases.
2. Run installer (or launch portable EXE).
3. Tray icon appears (Printer Proxy).
4. Visit: http://127.0.0.1:<assigned_port>/settings (use “Open Settings” from tray menu).
5. Send print requests to the exposed endpoint(s).

---

## Default Behavior
- Binds to 127.0.0.1 on a dynamic port (or configured static port via .env).
- Auto‑starts with Windows.
- Only one instance allowed (second launch shows “Already running” balloon).
- Logs rotate can be added later (currently single growing startup.log).

---

## Configuration (.env)
Create a `.env` beside the executable (or in working dir during development):

```
HTTP_HOST=127.0.0.1
HTTP_PORT=0         # 0 = pick a free port
FORCE_PRINTER_NAME= # Leave blank to use system default
LOG_LEVEL=info
```

---

## API (Initial Minimal Set)
(Your exact implemented endpoints may differ; adjust if needed.)

| Method | Endpoint            | Description                                  |
|--------|---------------------|----------------------------------------------|
| GET    | /health             | Returns JSON status + version + uptime       |
| GET    | /available           | (If implemented) list available printers     |
| POST   | /write          | Print raw text / bytes (body = data)         |
| POST   | /read         | Read raw text / bytes (body = data)   |

Example (raw text):
```bash
curl -X POST --data "Hello Printer\n" http://127.0.0.1:PORT/print/raw
```

Health:
```bash
curl http://127.0.0.1:PORT/health
```

---

## Tray Menu
- Open Settings (opens browser to /settings)
- Open Logs Folder
- Reload Config (.env)
- Restart Server
- Quit

---

## Building From Source (Developers)
```bash
git clone https://github.com/YourOrg/elgin-printer-proxy.git
cd elgin-printer-proxy
npm ci
npm run dev:electron     # Development (rebuild TS + run Electron)
npm run package:win      # Produces installer + portable in dist/
```

Artifacts:
- dist/*Setup*.exe (NSIS installer)
- dist/*-portable.exe (portable)

---

## Release Process (CI)
1. Bump version: `npm run release:patch` (or patch/minor/major).
2. `git push && git push --tags`
3. GitHub Actions workflow builds and attaches installer + portable + SHA256SUMS.txt to a Release.

---

## Troubleshooting
| Symptom | Hint |
|---------|------|
| Tray icon blank | Ensure multi-size `assets/icon.ico` (16..256) present |
| /settings 404   | Public assets not copied into packaged build |
| “Module not found” in packaged app | Dependency in devDependencies instead of dependencies |
| Second run opens duplicate | Single instance lock prevents (balloon indicates already running) |
| GH_TOKEN error in CI | Add `--publish=never` or set `ELECTRON_BUILDER_SKIP_PUBLISH=true` |

Logs: `%APPDATA%/<AppName>/logs/startup.log`

---

## Security Notes
- Binds only to `127.0.0.1` by default (not exposed externally).
- No authentication layer yet. Add a shared secret if deploying on shared terminals.
- Future updates: signed binaries + integrity-verified update channel.

---

## Contributing
Small project; open issues or PRs (keep commits concise; prefer conventional-ish messages: `fix:`, `feat:`, `chore:`).

---

## License
Specify your license here (MIT / Apache-2.0 / Proprietary). Example:

```
MIT License – Copyright (c) 2025 ...
```

---

## Disclaimer
This is an early-stage utility focused on Elgin printer integration. Stability improvements, auto-update, and code signing to follow as adoption grows.

---

Happy printing!
