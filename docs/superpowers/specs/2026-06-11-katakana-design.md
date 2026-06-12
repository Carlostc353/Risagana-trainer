# Katakana Support — Design Spec

**Date:** 2026-06-11
**Status:** Approved

## Overview

Add all 17 katakana character groups to Risagana Trainer, mirroring the existing 17 hiragana groups. Katakana and hiragana can be mixed in the same practice session. The popup draw screen shows a script label ("hiragana" / "katakana") so the user always knows which script to write.

---

## 1. Data layer

### `src/hiragana.js`

Add 17 katakana groups. Group keys are prefixed with `kata_`; romaji keys within each group are plain (same as hiragana):

| Key | Label | Count | Sample |
|---|---|---|---|
| `kata_basic` | Basic | 46 | ア イ ウ エ オ… |
| `kata_dakuten_k` | Dakuten — K (ga–go) | 5 | ガ ギ グ ゲ ゴ |
| `kata_dakuten_s` | Dakuten — S (za–zo) | 5 | ザ ジ ズ ゼ ゾ |
| `kata_dakuten_t` | Dakuten — T (da–do) | 5 | ダ ヂ ヅ デ ド |
| `kata_dakuten_h` | Dakuten — H (ba–bo) | 5 | バ ビ ブ ベ ボ |
| `kata_handakuten` | Handakuten (pa–po) | 5 | パ ピ プ ペ ポ |
| `kata_compound_k` | Compounds — K | 3 | キャ キュ キョ |
| `kata_compound_s` | Compounds — S | 3 | シャ シュ ショ |
| `kata_compound_t` | Compounds — T | 3 | チャ チュ チョ |
| `kata_compound_n` | Compounds — N | 3 | ニャ ニュ ニョ |
| `kata_compound_h` | Compounds — H | 3 | ヒャ ヒュ ヒョ |
| `kata_compound_m` | Compounds — M | 3 | ミャ ミュ ミョ |
| `kata_compound_r` | Compounds — R | 3 | リャ リュ リョ |
| `kata_compound_g` | Compounds — G voiced | 3 | ギャ ギュ ギョ |
| `kata_compound_j` | Compounds — J | 3 | ジャ ジュ ジョ |
| `kata_compound_b` | Compounds — B | 3 | ビャ ビュ ビョ |
| `kata_compound_p` | Compounds — P | 3 | ピャ ピュ ピョ |

### `src/store.js`

**Problem:** hiragana and katakana share the same romaji (`ka → か` and `ka → カ`). Using plain romaji as stats keys would cause collisions and incorrect weighted picks when both scripts are enabled.

**Solution:** extract a `buildPool(enabledGroups)` helper that prefixes romaji keys with `kata_` for any group whose key starts with `kata_`:

```js
function buildPool(enabledGroups) {
  const pool = {};
  for (const k of enabledGroups) {
    const group = GROUPS[k] || {};
    const isKata = k.startsWith('kata_');
    for (const [romaji, char] of Object.entries(group)) {
      pool[isKata ? `kata_${romaji}` : romaji] = char;
    }
  }
  return pool;
}
```

`pickCharacter()` uses `buildPool()` instead of the current `Object.assign` one-liner. The return shape changes:

```js
// before
{ romaji: 'ka', hiragana: 'か' }

// after
{ romaji: 'ka',      character: 'か', script: 'hiragana' }
{ romaji: 'kata_ka', character: 'カ', script: 'katakana' }
```

- `romaji` — the stats key, passed back to `record-result` and `skip-character` IPC
- `character` — the glyph shown on the result screen
- `script` — `'hiragana'` or `'katakana'`, used by the popup for the script label

**No migration needed.** Existing saves use plain romaji keys for hiragana; `kata_*` keys are new and additive.

### `main.js`

`VALID_ROMAJI` and `VALID_GROUP_KEYS` are derived from `GROUPS` at startup — they update automatically with no manual changes.

`ALL_CHARS` is currently built with a plain `Object.assign` which would collapse `ka → か` and `ka → カ`. Fix: `buildPool` is exported as a named export from `store.js` and imported in `main.js` to build the prefixed flat map:

```js
// store.js — named exports
module.exports = { Store, buildPool };

// main.js
const { Store, buildPool } = require('./src/store');
// prefixed flat map: { ka: 'か', kata_ka: 'カ', ... }
const ALL_CHARS = buildPool(Object.keys(GROUPS));
```

This is used by the `get-stats` IPC handler to look up characters for the worst-chars list.

---

## 2. Popup draw screen (`renderer/popup.js`)

Two small changes:

**Display romaji** — strip the `kata_` prefix before rendering the romaji prompt:
```js
const displayRomaji = char.romaji.replace(/^kata_/, '');
```

**Script label** — add a small label below the romaji on the draw screen. Always shown (hiragana or katakana). Styled with `--muted` color at ~13px. Sits between the romaji heading and the canvas.

```
        ka
     katakana        ← .script-label, --muted, 13px
  ┌─────────────┐
  │   canvas    │
  └─────────────┘
```

**Result screen** — `char.hiragana` → `char.character` everywhere popup.js references the glyph. No other changes.

---

## 3. Settings page (`renderer/settings.html`)

Add a "Katakana" block below the existing hiragana groups. Same visual structure: subheader → group rows with checkbox, label, count, sample.

Sub-sections within the katakana block:
- **Katakana** — `kata_basic` (46)
- **Katakana — Dakuten** — `kata_dakuten_k/s/t/h`, `kata_handakuten`
- **Katakana — Compounds** — `kata_compound_k` through `kata_compound_p` (11 rows)

Checkbox `value` attributes use the `kata_`-prefixed group keys.

`renderer/settings.js` needs no logic changes — it already reads all checked `input[name="group"]` values generically.

The window is 400×480px with `overflow-y: auto` — the extra 17 rows scroll naturally.

---

## 4. Stats ("Needs work" list)

The `get-stats` handler enriches each worst-char entry to avoid showing raw `kata_ka` in the UI:

```js
.map(([romaji, s]) => ({
  romaji,
  displayRomaji: romaji.replace(/^kata_/, ''),
  character: ALL_CHARS[romaji] ?? '?',
  missRate: s.incorrect / s.shown
}))
```

`renderer/settings.js` updates the worst-list DOM builder to show `displayRomaji` + `character`:

```
ka  か  23% miss
ka  カ  18% miss
```

The character glyph disambiguates between the two scripts when both appear.

---

## Files changed

| File | Change |
|---|---|
| `src/hiragana.js` | Add 17 katakana groups |
| `src/store.js` | `buildPool()` helper, prefixed pool assembly, return shape `{ romaji, character, script }` |
| `main.js` | `ALL_CHARS` uses prefixed flat map; `get-stats` adds `displayRomaji` + `character` to worst-chars |
| `renderer/popup.js` | Strip `kata_` prefix for display; add `.script-label`; `char.hiragana` → `char.character` |
| `renderer/popup.css` | Style for `.script-label` |
| `renderer/settings.html` | 17 katakana group rows |
| `renderer/settings.js` | Worst-list DOM builder uses `displayRomaji` + `character` |

---

## Out of scope

- No new window sizes or layout changes
- No font changes (Noto Sans JP already covers katakana)
- `wi`/`we` kana remain omitted (archaic, consistent with hiragana decision)
