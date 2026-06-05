const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const HIRAGANA = require('./hiragana');

const HISTORY_SIZE = 5;

const DEFAULT_DATA = {
  stats: {},
  settings: { interval: 10 },
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
        // Migrate old single-value lastShown to history array
        if (!data.history) {
          data.history = data.lastShown ? [data.lastShown] : [];
          delete data.lastShown;
        }
        return data;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  _save() {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  getStats() {
    return this.data.stats;
  }

  getSettings() {
    return this.data.settings;
  }

  recordResult(romaji, correct) {
    if (!this.data.stats[romaji]) {
      this.data.stats[romaji] = { shown: 0, correct: 0, incorrect: 0 };
    }
    const s = this.data.stats[romaji];
    s.shown++;
    if (correct) s.correct++; else s.incorrect++;
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
    const chars = Object.keys(HIRAGANA);
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
      // All eligible chars are in history (only possible if history >= total chars).
      // Pick the oldest entry from history as fallback.
      picked = this.data.history[0] || chars[0];
    } else {
      let rand = Math.random() * total;
      picked = chars[chars.length - 1]; // fallback for float precision edge
      for (let i = 0; i < chars.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { picked = chars[i]; break; }
      }
    }

    // Update history: append new pick, keep last HISTORY_SIZE entries
    this.data.history = [...(this.data.history || []), picked].slice(-HISTORY_SIZE);
    this._save();
    return { romaji: picked, hiragana: HIRAGANA[picked] };
  }
}

module.exports = Store;
