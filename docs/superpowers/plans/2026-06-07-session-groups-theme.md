# Session Mode, Character Groups & Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5-in-a-row session mode, 17 hiragana character groups with per-group settings toggles, and a white/orange light theme with a branded popup header.

**Architecture:** Data flows from `src/hiragana.js` (groups object) → `src/store.js` (group-filtered pick + skip) → `main.js` (IPC validation + handlers) → renderer files. Session mode is a self-contained state machine in `popup.js`. Theme changes are CSS variable swaps touching no logic. Every task leaves the app in a runnable state.

**Tech Stack:** Electron, vanilla JS, CSS custom properties. No test framework — each task ends with `npm start` verification.

---

### Task 1: Restructure `hiragana.js` and update all consumers

**Files:**
- Modify: `src/hiragana.js`
- Modify: `src/store.js`
- Modify: `main.js`

- [ ] **Step 1: Replace `src/hiragana.js` with a `GROUPS` object**

Overwrite the entire file:

```js
module.exports = {
  basic: {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を',
    'n': 'ん'
  },
  dakuten_k:  { 'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご' },
  dakuten_s:  { 'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ' },
  dakuten_t:  { 'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど' },
  dakuten_h:  { 'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ' },
  handakuten: { 'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ' },
  compound_k: { 'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ' },
  compound_s: { 'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ' },
  compound_t: { 'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ' },
  compound_n: { 'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ' },
  compound_h: { 'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ' },
  compound_m: { 'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ' },
  compound_r: { 'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ' },
  compound_g: { 'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ' },
  compound_j: { 'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ' },
  compound_b: { 'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ' },
  compound_p: { 'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ' }
};
```

- [ ] **Step 2: Update `src/store.js` to use the GROUPS shape**

Replace the entire file:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const GROUPS = require('./hiragana');

const HISTORY_SIZE = 5;

const DEFAULT_DATA = {
  stats: {},
  settings: { interval: 10, enabledGroups: ['basic'] },
  history: []
};

class Store {
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'hiragana-data.json');
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        if (!data.history) {
          data.history = data.lastShown ? [data.lastShown] : [];
          delete data.lastShown;
        }
        if (!data.settings.enabledGroups) {
          data.settings.enabledGroups = ['basic'];
        }
        return data;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  _save() {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  getStats() { return this.data.stats; }
  getSettings() { return this.data.settings; }

  recordResult(romaji, correct) {
    if (!this.data.stats[romaji]) {
      this.data.stats[romaji] = { shown: 0, correct: 0, incorrect: 0 };
    }
    const s = this.data.stats[romaji];
    s.shown++;
    if (correct) s.correct++; else s.incorrect++;
    this._save();
  }

  recordSkip(romaji) {
    if (!this.data.stats[romaji]) {
      this.data.stats[romaji] = { shown: 0, correct: 0, incorrect: 0 };
    }
    this.data.stats[romaji].shown++;
    this._save();
  }

  saveSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this._save();
  }

  resetStats() {
    this.data.stats = {};
    this.data.history = [];
    this._save();
  }

  pickCharacter() {
    const enabledGroups = this.data.settings.enabledGroups || ['basic'];
    const pool = Object.assign({}, ...enabledGroups.map(k => GROUPS[k] || {}));
    const chars = Object.keys(pool);

    if (chars.length === 0) {
      const fallback = Object.keys(GROUPS.basic);
      const picked = fallback[Math.floor(Math.random() * fallback.length)];
      return { romaji: picked, hiragana: GROUPS.basic[picked] };
    }

    const history = new Set(this.data.history || []);
    const stats = this.data.stats;

    const weights = chars.map(romaji => {
      if (history.has(romaji)) return 0;
      const s = stats[romaji];
      if (!s || s.shown === 0) return 10;
      const missRate = s.incorrect / s.shown;
      return 1 + missRate * 9;
    });

    const total = weights.reduce((a, b) => a + b, 0);

    let picked;
    if (total === 0) {
      picked = this.data.history[0] || chars[0];
    } else {
      let rand = Math.random() * total;
      picked = chars[chars.length - 1];
      for (let i = 0; i < chars.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { picked = chars[i]; break; }
      }
    }

    this.data.history = [...(this.data.history || []), picked].slice(-HISTORY_SIZE);
    this._save();
    return { romaji: picked, hiragana: pool[picked] };
  }
}

module.exports = Store;
```

- [ ] **Step 3: Update `main.js` — replace `HIRAGANA` import with `GROUPS`**

Replace lines 11–13 (the HIRAGANA/VALID_ROMAJI block):

```js
const GROUPS = require('./src/hiragana');
const ALL_CHARS = Object.assign({}, ...Object.values(GROUPS));
const VALID_ROMAJI = new Set(Object.keys(ALL_CHARS));
const VALID_INTERVALS = new Set([2, 5, 10, 20]);
```

- [ ] **Step 4: Update `main.js` — fix `get-stats` to use dynamic total**

Replace the `ipcMain.handle('get-stats', ...)` handler (currently at the bottom of the IPC section):

```js
ipcMain.handle('get-stats', () => {
  const stats = app.store.getStats();
  const enabledGroups = app.store.getSettings().enabledGroups || ['basic'];
  const enabledChars = Object.assign({}, ...enabledGroups.map(k => GROUPS[k] || {}));
  const total = Object.keys(enabledChars).length;
  const practiced = Object.keys(stats).length;
  const totalShown = Object.values(stats).reduce((a, s) => a + s.shown, 0);
  const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0);

  const worstChars = Object.entries(stats)
    .filter(([, s]) => s.shown >= 2)
    .map(([romaji, s]) => ({ romaji, missRate: s.incorrect / s.shown }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 5);

  return { stats, total, practiced, totalShown, totalCorrect, worstChars };
});
```

- [ ] **Step 5: Verify the app still launches**

```bash
npm start
```

Expected: tray icon appears, right-click → Practice Now opens the popup, a romaji prompt is shown (basic hiragana only), Got it / Missed it work. Settings window opens and shows stats.

- [ ] **Step 6: Commit**

```bash
git add src/hiragana.js src/store.js main.js
git commit -m "refactor: restructure hiragana as named groups, wire store + IPC"
```

---

### Task 2: Add skip IPC chain

**Files:**
- Modify: `src/store.js` — already done in Task 1 (`recordSkip` is already in the file above)
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: Add `skip-character` IPC handler to `main.js`**

Add after the `record-result` handler:

```js
ipcMain.handle('skip-character', (_, { romaji }) => {
  if (!VALID_ROMAJI.has(romaji)) return;
  app.store.recordSkip(romaji);
});
```

- [ ] **Step 2: Add `skipCharacter` to `preload.js`**

Replace the entire file:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCharacter:   () => ipcRenderer.invoke('get-character'),
  recordResult:   (data) => ipcRenderer.invoke('record-result', data),
  skipCharacter:  (data) => ipcRenderer.invoke('skip-character', data),
  closePopup:     () => ipcRenderer.invoke('close-popup'),
  getSettings:    () => ipcRenderer.invoke('get-settings'),
  saveSettings:   (s) => ipcRenderer.invoke('save-settings', s),
  resetStats:     () => ipcRenderer.invoke('reset-stats'),
  getStats:       () => ipcRenderer.invoke('get-stats'),
});
```

- [ ] **Step 3: Verify the app still launches**

```bash
npm start
```

Expected: app behaves exactly as before — Skip button still closes the popup. No visible change yet; `skipCharacter` will be wired into the session logic in Task 5.

- [ ] **Step 4: Commit**

```bash
git add main.js preload.js
git commit -m "feat: add skip-character IPC handler and preload bridge"
```

---

### Task 3: Add group IPC validation to `main.js`

**Files:**
- Modify: `main.js`

- [ ] **Step 1: Add `VALID_GROUP_KEYS` constant to `main.js`**

Add after the `VALID_INTERVALS` line:

```js
const VALID_GROUP_KEYS = new Set(Object.keys(GROUPS));
```

- [ ] **Step 2: Update the `save-settings` handler in `main.js` to validate groups**

Replace the existing `ipcMain.handle('save-settings', ...)` handler:

```js
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
```

- [ ] **Step 3: Verify the app still launches and settings save works**

```bash
npm start
```

Open Settings → change interval → Save. Expected: interval changes, window closes. The `enabledGroups` key in the save payload doesn't exist yet (settings.js hasn't changed), so the handler will `return` early on the groups check. The interval won't actually save until Task 4 fixes the settings UI.

To confirm no crash: check the tray is still present after saving settings.

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "feat: validate enabledGroups in save-settings IPC handler"
```

---

### Task 4: Settings UI — character groups

**Files:**
- Modify: `renderer/settings.html`
- Modify: `renderer/settings.js`
- Modify: `renderer/settings.css`

- [ ] **Step 1: Replace `renderer/settings.html` with the full new layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self'; script-src 'self'">
  <title>Settings — Risagana Trainer</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
<div id="app">
  <h1>Settings</h1>

  <section>
    <div class="section-label">Popup interval</div>
    <div class="radio-group">
      <div class="radio-option">
        <input type="radio" name="interval" id="i2"  value="2">
        <label for="i2">2 min</label>
      </div>
      <div class="radio-option">
        <input type="radio" name="interval" id="i5"  value="5">
        <label for="i5">5 min</label>
      </div>
      <div class="radio-option">
        <input type="radio" name="interval" id="i10" value="10">
        <label for="i10">10 min</label>
      </div>
      <div class="radio-option">
        <input type="radio" name="interval" id="i20" value="20">
        <label for="i20">20 min</label>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section>
    <div class="section-label">Character sets</div>

    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="basic">
        <span class="group-label">Basic <span class="group-count">(46)</span></span>
        <span class="group-sample">あいうえお…</span>
      </label>
    </div>

    <div class="group-subheader">Dakuten</div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="dakuten_k">
        <span class="group-label">K — ga–go <span class="group-count">(5)</span></span>
        <span class="group-sample">が ぎ ぐ げ ご</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="dakuten_s">
        <span class="group-label">S — za–zo <span class="group-count">(5)</span></span>
        <span class="group-sample">ざ じ ず ぜ ぞ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="dakuten_t">
        <span class="group-label">T — da–do <span class="group-count">(5)</span></span>
        <span class="group-sample">だ ぢ づ で ど</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="dakuten_h">
        <span class="group-label">H — ba–bo <span class="group-count">(5)</span></span>
        <span class="group-sample">ば び ぶ べ ぼ</span>
      </label>
    </div>

    <div class="group-subheader">Handakuten</div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="handakuten">
        <span class="group-label">Handakuten — pa–po <span class="group-count">(5)</span></span>
        <span class="group-sample">ぱ ぴ ぷ ぺ ぽ</span>
      </label>
    </div>

    <div class="group-subheader">Compounds</div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_k">
        <span class="group-label">K <span class="group-count">(3)</span></span>
        <span class="group-sample">きゃ きゅ きょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_s">
        <span class="group-label">S <span class="group-count">(3)</span></span>
        <span class="group-sample">しゃ しゅ しょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_t">
        <span class="group-label">T <span class="group-count">(3)</span></span>
        <span class="group-sample">ちゃ ちゅ ちょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_n">
        <span class="group-label">N <span class="group-count">(3)</span></span>
        <span class="group-sample">にゃ にゅ にょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_h">
        <span class="group-label">H <span class="group-count">(3)</span></span>
        <span class="group-sample">ひゃ ひゅ ひょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_m">
        <span class="group-label">M <span class="group-count">(3)</span></span>
        <span class="group-sample">みゃ みゅ みょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_r">
        <span class="group-label">R <span class="group-count">(3)</span></span>
        <span class="group-sample">りゃ りゅ りょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_g">
        <span class="group-label">G voiced <span class="group-count">(3)</span></span>
        <span class="group-sample">ぎゃ ぎゅ ぎょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_j">
        <span class="group-label">J <span class="group-count">(3)</span></span>
        <span class="group-sample">じゃ じゅ じょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_b">
        <span class="group-label">B <span class="group-count">(3)</span></span>
        <span class="group-sample">びゃ びゅ びょ</span>
      </label>
    </div>
    <div class="group-row">
      <label class="group-check">
        <input type="checkbox" name="group" value="compound_p">
        <span class="group-label">P <span class="group-count">(3)</span></span>
        <span class="group-sample">ぴゃ ぴゅ ぴょ</span>
      </label>
    </div>

    <div id="group-error" class="group-error hidden">Select at least one group.</div>
  </section>

  <div class="divider"></div>

  <section>
    <div class="section-label">Progress</div>
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="stat-practiced">—</div>
        <div class="stat-label">Chars practiced</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-accuracy">—</div>
        <div class="stat-label">Accuracy</div>
      </div>
    </div>
  </section>

  <section id="worst-section" class="hidden">
    <div class="section-label">Needs work</div>
    <div class="worst-list" id="worst-list"></div>
  </section>

  <div class="divider"></div>

  <section>
    <div class="section-label">Danger zone</div>
    <button id="reset-btn" class="btn btn-danger">Reset all progress</button>
    <div id="reset-confirm" class="hidden">All stats cleared.</div>
  </section>

  <div class="actions">
    <button id="save-btn" class="btn btn-primary">Save settings</button>
  </div>
</div>
<script src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace `renderer/settings.js` with the updated version**

```js
'use strict';

let currentTotal = 46;

async function init() {
  const [settings, statsData] = await Promise.all([
    window.api.getSettings(),
    window.api.getStats()
  ]);

  currentTotal = statsData.total;

  const radio = document.querySelector(`input[name="interval"][value="${settings.interval}"]`);
  if (radio) radio.checked = true;

  const groups = settings.enabledGroups || ['basic'];
  document.querySelectorAll('input[name="group"]').forEach(cb => {
    cb.checked = groups.includes(cb.value);
  });

  const accuracy = statsData.totalShown > 0
    ? Math.round((statsData.totalCorrect / statsData.totalShown) * 100) + '%'
    : '—';
  document.getElementById('stat-practiced').textContent =
    `${statsData.practiced} / ${statsData.total}`;
  document.getElementById('stat-accuracy').textContent = accuracy;

  if (statsData.worstChars.length > 0) {
    document.getElementById('worst-section').classList.remove('hidden');
    const list = document.getElementById('worst-list');
    list.innerHTML = statsData.worstChars.map(({ romaji, missRate }) => `
      <div class="worst-item">
        <span class="romaji">${romaji}</span>
        <span class="miss-pct">${Math.round(missRate * 100)}% miss</span>
      </div>
    `).join('');
  }
}

document.querySelectorAll('input[name="group"]').forEach(cb => {
  cb.addEventListener('change', () => {
    document.getElementById('group-error').classList.add('hidden');
  });
});

document.getElementById('save-btn').addEventListener('click', async () => {
  const checked = document.querySelector('input[name="interval"]:checked');
  if (!checked) return;
  const interval = parseInt(checked.value, 10);

  const enabledGroups = [...document.querySelectorAll('input[name="group"]:checked')]
    .map(cb => cb.value);

  if (enabledGroups.length === 0) {
    document.getElementById('group-error').classList.remove('hidden');
    return;
  }

  await window.api.saveSettings({ interval, enabledGroups });
  window.close();
});

let resetPending = false;
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!resetPending) {
    resetPending = true;
    document.getElementById('reset-btn').textContent = 'Click again to confirm';
    return;
  }
  await window.api.resetStats();
  document.getElementById('reset-confirm').classList.remove('hidden');
  document.getElementById('reset-btn').disabled = true;
  document.getElementById('reset-btn').textContent = 'Reset all progress';
  document.getElementById('stat-practiced').textContent = `0 / ${currentTotal}`;
  document.getElementById('stat-accuracy').textContent = '—';
  document.getElementById('worst-section').classList.add('hidden');
  resetPending = false;
  setTimeout(() => {
    document.getElementById('reset-confirm').classList.add('hidden');
  }, 3000);
});

init();
```

- [ ] **Step 3: Add group checkbox styles and scrollable layout to `renderer/settings.css`**

Add the following rules at the end of the existing `settings.css` file (after `#reset-confirm { ... }`):

```css
html, body { overflow-y: auto; }

.group-subheader {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 8px;
  margin-bottom: 2px;
}

.group-row { display: flex; align-items: center; }

.group-check {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  width: 100%;
  padding: 3px 0;
}

.group-check input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}

.group-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
}

.group-count { color: var(--muted); font-weight: 400; }

.group-sample {
  font-family: 'Yu Gothic UI', 'Yu Gothic', 'Hiragino Kaku Gothic ProN',
               'Meiryo', 'MS PGothic', sans-serif;
  font-size: 12px;
  color: var(--muted);
}

.group-error {
  font-size: 12px;
  color: var(--danger);
  padding: 4px 0;
}
```

- [ ] **Step 4: Verify the settings window**

```bash
npm start
```

Open Settings (right-click tray → Settings). Expected:
- Window scrolls to reveal all content
- Basic checkbox is checked, all others unchecked
- Uncheck Basic and click Save → "Select at least one group." appears, window stays open
- Check Basic + dakuten_k, click Save → window closes, next popup only shows basic + ga/gi/gu/ge/go chars
- Stats show dynamic "X / N" count matching enabled chars

- [ ] **Step 5: Commit**

```bash
git add renderer/settings.html renderer/settings.js renderer/settings.css
git commit -m "feat: add character group checkboxes to settings"
```

---

### Task 5: Session mode — popup header and state machine

**Files:**
- Modify: `renderer/popup.html`
- Modify: `renderer/popup.js`
- Modify: `renderer/popup.css`

- [ ] **Step 1: Replace `renderer/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'">
  <title>Hiragana</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
<div id="app">
  <div class="app-header">
    <div class="header-brand">
      <img src="../src/icon.png" alt="Risagana Trainer logo" width="18" height="18">
      <span class="header-title">Risagana Trainer</span>
    </div>
    <span id="session-progress" class="session-progress">1 / 5</span>
  </div>

  <!-- Drawing screen -->
  <div id="draw-screen" class="screen">
    <div>
      <div class="label">Draw the hiragana for</div>
      <div id="romaji-prompt" class="romaji">ku</div>
    </div>
    <canvas id="drawing-canvas"></canvas>
    <div class="btn-row">
      <button id="clear-btn" class="btn btn-secondary">Clear ↺</button>
      <button id="submit-btn" class="btn btn-primary">Reveal →</button>
    </div>
  </div>

  <!-- Result screen -->
  <div id="result-screen" class="screen hidden">
    <div class="result-header">
      <div id="romaji-result" class="romaji-small">ku</div>
      <span id="hiragana-char" class="hiragana-char">く</span>
    </div>
    <div class="compare-hint">Compare with your drawing above</div>
    <div class="btn-row">
      <button id="missed-btn" class="btn btn-danger">Missed it ✗</button>
      <button id="gotit-btn" class="btn btn-success">Got it ✓</button>
    </div>
    <div class="btn-row">
      <button id="next-btn" class="btn btn-ghost">Skip →</button>
    </div>
    <div class="countdown-wrap">
      <div class="countdown-bar">
        <div id="countdown-fill" class="countdown-fill"></div>
      </div>
    </div>
  </div>
</div>
<script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace `renderer/popup.js` with the session state machine**

```js
'use strict';

const SESSION_SIZE = 5;
let sessionIndex = 0;
let currentChar = null;
let isDrawing = false;
let lastX = 0, lastY = 0;
let closeTimer = null;

// ── Canvas setup ────────────────────────────────────────────────
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = rect.width;
  canvas.height = rect.height;
  applyStyle();
  ctx.putImageData(imageData, 0, 0);
}

function applyStyle() {
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

window.addEventListener('DOMContentLoaded', () => { resizeCanvas(); });

// ── Drawing events ───────────────────────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const { x, y } = getPos(e);
  lastX = x; lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  lastX = x; lastY = y;
});

canvas.addEventListener('mouseup', () => { isDrawing = false; ctx.beginPath(); });
canvas.addEventListener('mouseleave', () => { isDrawing = false; ctx.beginPath(); });

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mouseup')); });

// ── Controls ─────────────────────────────────────────────────────
document.getElementById('clear-btn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('submit-btn').addEventListener('click', showResult);

function showResult() {
  document.getElementById('draw-screen').classList.add('hidden');
  const rs = document.getElementById('result-screen');
  rs.classList.remove('hidden');
  document.getElementById('romaji-result').textContent = currentChar.romaji;
  document.getElementById('hiragana-char').textContent = currentChar.hiragana;
  // No countdown here — advanceSession starts it only after the 5th evaluation
}

// ── Evaluation ───────────────────────────────────────────────────
document.getElementById('gotit-btn').addEventListener('click', () => evaluate(true));
document.getElementById('missed-btn').addEventListener('click', () => evaluate(false));

async function evaluate(correct) {
  document.getElementById('gotit-btn').disabled = true;
  document.getElementById('missed-btn').disabled = true;
  await window.api.recordResult({ romaji: currentChar.romaji, correct });
  clearTimeout(closeTimer);
  await advanceSession();
}

document.getElementById('next-btn').addEventListener('click', async () => {
  clearTimeout(closeTimer);
  if (currentChar) await window.api.skipCharacter({ romaji: currentChar.romaji });
  await advanceSession();
});

// ── Session state machine ─────────────────────────────────────────
function updateProgress() {
  document.getElementById('session-progress').textContent =
    `${sessionIndex + 1} / ${SESSION_SIZE}`;
}

async function advanceSession() {
  if (sessionIndex < SESSION_SIZE - 1) {
    sessionIndex++;
    updateProgress();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentChar = await window.api.getCharacter();
    document.getElementById('romaji-prompt').textContent = currentChar.romaji;
    document.getElementById('draw-screen').classList.remove('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('gotit-btn').disabled = false;
    document.getElementById('missed-btn').disabled = false;
    document.getElementById('next-btn').disabled = false;
  } else {
    document.getElementById('gotit-btn').disabled = true;
    document.getElementById('missed-btn').disabled = true;
    document.getElementById('next-btn').disabled = true;
    startCountdown(6);
  }
}

// ── Countdown ────────────────────────────────────────────────────
function startCountdown(seconds) {
  const fill = document.getElementById('countdown-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  void fill.offsetWidth;
  fill.style.transition = `width ${seconds}s linear`;
  fill.style.width = '0%';
  closeTimer = setTimeout(() => window.api.closePopup(), seconds * 1000);
}

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  sessionIndex = 0;
  updateProgress();
  currentChar = await window.api.getCharacter();
  document.getElementById('romaji-prompt').textContent = currentChar.romaji;
  requestAnimationFrame(() => resizeCanvas());
}

init();
```

- [ ] **Step 3: Replace `.drag-handle` rule in `renderer/popup.css` with `.app-header`**

Find this exact block in `popup.css` and delete it:

```css
.drag-handle {
  height: 6px;
  margin: -18px -20px 6px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  cursor: grab;
  flex-shrink: 0;
}
```

Add in its place:

```css
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  margin: -18px -20px 10px;
  padding: 0 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-brand img { display: block; border-radius: 3px; }

.header-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.session-progress {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.05em;
}
```

- [ ] **Step 4: Verify session mode**

```bash
npm start
```

Right-click tray → Practice Now. Expected:
- Header bar shows icon, "RISAGANA TRAINER", and "1 / 5"
- Draw a character → Reveal → result screen shows (no countdown bar running)
- Click Got it → draw screen resets with next romaji, badge shows "2 / 5"
- Continue through all 5: after the 5th evaluation the 6-second countdown bar runs, window closes
- Skip button on result screen advances the session without affecting miss rate

- [ ] **Step 5: Commit**

```bash
git add renderer/popup.html renderer/popup.js renderer/popup.css
git commit -m "feat: add session mode (5-in-a-row) with progress indicator"
```

---

### Task 6: Theme — white and orange token swap

**Files:**
- Modify: `renderer/popup.css`
- Modify: `renderer/settings.css`
- Modify: `main.js`

- [ ] **Step 1: Replace `:root` block in `renderer/popup.css`**

Replace the existing `:root { ... }` block:

```css
:root {
  --bg:        #faf8f5;
  --surface:   #f0ebe3;
  --border:    #ddd5c8;
  --text:      #1c1208;
  --muted:     #6b5a4a;
  --accent:    #e8621a;
  --success:   #2a7a44;
  --danger:    #b83232;
  --canvas-bg: #f5f5f0;
}
```

- [ ] **Step 2: Update `btn-primary` text color in `renderer/popup.css`**

Replace:

```css
.btn-primary   { background: var(--accent); color: #fff; }
```

With:

```css
.btn-primary   { background: var(--accent); color: var(--text); }
```

- [ ] **Step 3: Update `hiragana-char` text-shadow in `renderer/popup.css`**

Replace:

```css
  text-shadow: 0 0 60px rgba(99, 89, 220, 0.45);
```

With:

```css
  text-shadow: 0 0 60px rgba(232, 98, 26, 0.35);
```

- [ ] **Step 4: Update button transition timing in `renderer/popup.css`**

Replace:

```css
  transition: filter 0.12s, transform 0.12s;
```

With:

```css
  transition: filter 0.15s, transform 0.15s;
```

(This line appears in the `.btn` rule block.)

- [ ] **Step 5: Replace `:root` block in `renderer/settings.css`**

Replace the existing `:root { ... }` block:

```css
:root {
  --bg:      #faf8f5;
  --surface: #f0ebe3;
  --border:  #ddd5c8;
  --text:    #1c1208;
  --muted:   #6b5a4a;
  --accent:  #e8621a;
  --success: #2a7a44;
  --danger:  #b83232;
}
```

- [ ] **Step 6: Update `btn-primary` text color in `renderer/settings.css`**

Replace:

```css
.btn-primary { background: var(--accent); color: #fff; }
```

With:

```css
.btn-primary { background: var(--accent); color: var(--text); }
```

- [ ] **Step 7: Update `main.js` popup `backgroundColor`**

In the `showPopup()` function, replace:

```js
    backgroundColor: '#0f0e17',
```

With:

```js
    backgroundColor: '#faf8f5',
```

Also update the settings window `backgroundColor` in `openSettings()`:

```js
    backgroundColor: '#faf8f5',
```

- [ ] **Step 8: Verify full visual appearance**

```bash
npm start
```

Expected:
- Popup: white/warm background, orange accent buttons with dark text, branded header with icon visible, session progress in orange
- Settings: same warm white, scrollable, group checkboxes visible and styled
- Drawing canvas remains off-white, ink strokes still legible (#1a1a2e on #f5f5f0)
- Hiragana reveal character has orange glow
- Got it button: green with white text. Missed it: red with white text. Reveal: orange with dark text.

- [ ] **Step 9: Commit**

```bash
git add renderer/popup.css renderer/settings.css main.js
git commit -m "feat: apply white and orange light theme with branded popup header"
```
