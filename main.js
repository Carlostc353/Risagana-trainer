const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const GROUPS = require('./src/hiragana');
const { buildPool } = require('./src/store');
const ALL_CHARS = buildPool(Object.keys(GROUPS));
const VALID_ROMAJI = new Set(Object.keys(ALL_CHARS));
const VALID_INTERVALS = new Set([2, 5, 10, 20]);
const VALID_GROUP_KEYS = new Set(Object.keys(GROUPS));

let tray = null;
let popupWin = null;
let settingsWin = null;
let Store, Scheduler;

app.whenReady().then(() => {
  ({ Store } = require('./src/store'));
  Scheduler = require('./src/scheduler');

  app.store = new Store();
  app.scheduler = new Scheduler();

  setupTray();
  app.scheduler.start(app.store.getSettings().interval, showPopup);
  if (app.isPackaged) setupAutoUpdater();
});

// Keep app alive when all windows close
app.on('window-all-closed', () => {});

function setupTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'src', 'icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('Risagana Trainer');
  rebuildMenu();
}

function rebuildMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Risagana Trainer', enabled: false },
    { type: 'separator' },
    { label: 'Practice Now', click: showPopup },
    { label: 'Settings', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

function applyWindowSecurity(win) {
  // Block navigation away from local files
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });
  // Block all renderer-initiated window.open() calls
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showPopup() {
  if (popupWin) {
    popupWin.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  popupWin = new BrowserWindow({
    width: 380,
    height: 530,
    x: width - 395,
    y: height - 545,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#f0e6d3',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  applyWindowSecurity(popupWin);
  popupWin.loadFile(path.join(__dirname, 'renderer', 'popup.html'));
  popupWin.on('closed', () => { popupWin = null; });
}

function openSettings() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 400,
    height: 480,
    resizable: false,
    title: 'Risagana Trainer — Settings',
    backgroundColor: '#faf8f5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWin.setMenu(null);
  applyWindowSecurity(settingsWin);
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// IPC
ipcMain.handle('get-character', () => app.store.pickCharacter());

ipcMain.handle('record-result', (_, { romaji, correct }) => {
  if (!VALID_ROMAJI.has(romaji)) return;
  app.store.recordResult(romaji, Boolean(correct));
});

ipcMain.handle('skip-character', (_, { romaji }) => {
  if (!VALID_ROMAJI.has(romaji)) return;
  app.store.recordSkip(romaji);
});

ipcMain.handle('close-popup', () => {
  if (popupWin) popupWin.close();
});

ipcMain.handle('get-settings', () => app.store.getSettings());

ipcMain.handle('save-settings', (_, settings) => {
  const interval = Number(settings?.interval);
  if (!VALID_INTERVALS.has(interval)) return;

  const incoming = settings?.enabledGroups;
  if (!Array.isArray(incoming) || incoming.length === 0) return;
  const enabledGroups = incoming.filter(k => VALID_GROUP_KEYS.has(k));
  if (enabledGroups.length === 0) return;

  app.store.saveSettings({ interval, enabledGroups });
  app.scheduler.restart(interval, showPopup);
});

ipcMain.handle('reset-stats', () => app.store.resetStats());

ipcMain.handle('get-stats', () => {
  const stats = app.store.getStats();
  const enabledGroups = app.store.getSettings().enabledGroups || ['basic'];
  const enabledChars = Object.assign({}, ...enabledGroups.map(k => GROUPS[k] || {}));
  const total = Object.keys(enabledChars).length;
  const practiced = Object.keys(stats).filter(k => enabledChars[k] !== undefined).length;
  const totalShown = Object.values(stats).reduce((a, s) => a + s.shown, 0);
  const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0);

  const worstChars = Object.entries(stats)
    .filter(([, s]) => s.shown >= 2)
    .map(([romaji, s]) => ({
      romaji,
      displayRomaji: romaji.replace(/^kata_/, ''),
      character: ALL_CHARS[romaji] ?? '?',
      missRate: s.incorrect / s.shown
    }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 5);

  return { stats, total, practiced, totalShown, totalCorrect, worstChars };
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.logger = null;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Risagana Trainer ${info.version} is available. Install now?`,
      buttons: ['Yes', 'No'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
}
