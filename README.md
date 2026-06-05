# Hiragana Trainer

A lightweight Windows desktop app that teaches you hiragana through timed drawing practice. A small floating popup appears on a schedule you set — you draw the character with your mouse, reveal the answer, and self-evaluate.

## Features

- Timed popups every 2, 5, 10, or 20 minutes
- Draw hiragana on a canvas with your mouse
- Self-evaluate with **Got it ✓** / **Missed it ✗**
- Weighted practice — characters you miss appear more often
- Per-character progress stats saved between sessions
- Runs silently in the system tray between popups
- All 46 basic hiragana covered

## Screenshots

| Drawing prompt | Filled canvas | Result |
|---|---|---|
| ![Blank popup](screenshots/BlankPopUp.jpeg) | ![Filled popup](screenshots/FilledPopUp.jpeg) | ![After options](screenshots/AfterPopUpOptions.jpeg) |

| Settings | Progress stats |
|---|---|
| ![Settings](screenshots/Settings1.jpeg) | ![Settings progress](screenshots/Settings2.jpeg) |

## Install

Download the latest installer from the [**Releases page**](../../releases/latest):

```
Hiragana-Trainer-Setup-x.x.x.exe
```

Run the `.exe` and follow the setup wizard. No Node.js required — everything is bundled.

> **Windows SmartScreen warning:** Because the installer is not code-signed, Windows may show "Windows protected your PC". Click **More info → Run anyway** to proceed. The source code is fully open here for review.

## Run from source

```bash
git clone https://github.com/Carlostc353/hiragana-trainer.git
cd hiragana-trainer
npm install
npm start
```

Requires [Node.js](https://nodejs.org) v18 or later.

## Build the installer locally

```bash
npm run build
```

Produces `dist/Hiragana-Trainer-Setup-x.x.x.exe`. Bump the `"version"` field in `package.json` to change the version number.

> **First-time build on Windows:** See the note in [CLAUDE.md](CLAUDE.md) about the winCodeSign cache if the build fails with a symlink error.

## Tech

- [Electron](https://www.electronjs.org/) — desktop shell
- Vanilla JS, no frameworks
- [electron-builder](https://www.electron.build/) — packaging & installer
