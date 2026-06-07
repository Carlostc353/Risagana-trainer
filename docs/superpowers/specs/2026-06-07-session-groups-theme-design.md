# Risagana Trainer — Session Mode, Character Groups & Theme Redesign

**Date:** 2026-06-07  
**Status:** Approved  

---

## Overview

Three features implemented together:

1. **Session mode** — Each popup is a 5-character sequence. Window stays open between characters; auto-close timer only fires after the 5th evaluation.
2. **Character groups** — Expand beyond Basic hiragana with 17 named groups. Settings checkboxes let the user enable/disable groups; weighted pick only draws from enabled groups.
3. **UI refresh** — Replace dark theme with a warm white-and-orange light theme. Add a branded header (logo + session progress) to the popup.

---

## Feature 1: Session Mode (5-in-a-row)

### Flow

```
init()
  ↓
sessionIndex = 0, fetch char 1 → draw screen "1 / 5"
  ↓ user draws → Reveal
  ↓ result screen (no countdown, no auto-close)
  ↓ Got it / Missed it / Skip
  ↓ record result → sessionIndex++
  ↓ clear canvas → fetch char 2 → draw screen "2 / 5"
  ...
  ↓ char 5 result screen
  ↓ Got it / Missed it / Skip
  ↓ record result → start 6s countdown → close
```

### Character fetching

Characters are fetched one at a time as the session progresses (not all 5 upfront). This keeps the weighted-pick history accurate: each character is added to the exclusion window before the next is selected, preventing repeats within a session.

### Progress indicator

A persistent `"1 / 5"` badge lives in the popup header bar (right-aligned). It is always visible — on both the draw screen and the result screen — because the header is outside the screen containers.

### Skip behaviour

Skip records the character as shown (`shown++`) but adds nothing to `correct` or `incorrect`. This is a no-penalty action. The stats system treats it as "you saw this character" for weighting purposes, but miss rate is unaffected.

- New `store.recordSkip(romaji)` method: increments `shown` only.
- New IPC handler `skip-character` in `main.js`.
- New `window.api.skipCharacter(romaji)` in `preload.js`.
- The result screen's Skip button calls `skipCharacter` instead of `closePopup` directly.

### Countdown

The 6-second CSS countdown bar and auto-close timer only start after the 5th character is evaluated (after the evaluation button is clicked, not after Reveal). Characters 1–4 have no countdown on their result screens.

### State in `popup.js`

```js
let sessionIndex = 0;       // 0–4
const SESSION_SIZE = 5;
let currentChar = null;
```

`advanceSession()` is called after each evaluation:
- If `sessionIndex < SESSION_SIZE - 1`: clear canvas, fetch next char, show draw screen, update progress badge.
- If `sessionIndex === SESSION_SIZE - 1`: start countdown, then close.

---

## Feature 2: Character Groups

### Data — `src/hiragana.js`

The file now exports a `GROUPS` object (17 keys). The old flat-map shape is replaced. Any consumer that needs a flat map calls `Object.assign({}, ...Object.values(GROUPS))`.

**Group keys and character counts:**

| Key | Label | Count |
|---|---|---|
| `basic` | Basic | 46 |
| `dakuten_k` | Dakuten — K (ga–go) | 5 |
| `dakuten_s` | Dakuten — S (za–zo) | 5 |
| `dakuten_t` | Dakuten — T (da–do) | 5 |
| `dakuten_h` | Dakuten — H (ba–bo) | 5 |
| `handakuten` | Handakuten (pa–po) | 5 |
| `compound_k` | Compounds — K (kya/kyu/kyo) | 3 |
| `compound_s` | Compounds — S (sha/shu/sho) | 3 |
| `compound_t` | Compounds — T (cha/chu/cho) | 3 |
| `compound_n` | Compounds — N (nya/nyu/nyo) | 3 |
| `compound_h` | Compounds — H (hya/hyu/hyo) | 3 |
| `compound_m` | Compounds — M (mya/myu/myo) | 3 |
| `compound_r` | Compounds — R (rya/ryu/ryo) | 3 |
| `compound_g` | Compounds — G voiced (gya/gyu/gyo) | 3 |
| `compound_j` | Compounds — J (ja/ju/jo) | 3 |
| `compound_b` | Compounds — B (bya/byu/byo) | 3 |
| `compound_p` | Compounds — P (pya/pyu/pyo) | 3 |

Total with all groups enabled: 46 + 5×5 + 11×3 = 46 + 25 + 33 = **104 characters**.

### Settings persistence

`settings.enabledGroups` is an array of group key strings. Default: `['basic']`.

Migration: if an existing save file lacks `enabledGroups`, it is added as `['basic']` on load.

### Weighted pick — `src/store.js`

`pickCharacter()` builds its candidate pool by merging only the enabled groups:

```js
const enabledGroups = this.data.settings.enabledGroups || ['basic'];
const pool = Object.assign({}, ...enabledGroups.map(k => GROUPS[k] || {}));
const chars = Object.keys(pool);
```

The rest of the weighted algorithm (history exclusion, miss-rate weighting) runs unchanged on `chars`.

### IPC validation — `main.js`

`VALID_ROMAJI` is rebuilt from all 17 groups (not just basic). This is the validation set for incoming `record-result` and `skip-character` calls.

`VALID_GROUP_KEYS` is a new `Set` of the 17 group key strings. The `save-settings` handler validates `enabledGroups` against this set and rejects the call if the resulting array is empty.

### Settings UI

A new "Character sets" section is added above the Stats section. `#app` is made scrollable (`overflow-y: auto; height: 100vh`) to accommodate the additional content without resizing the window.

Each group is one row: `[checkbox] Label (N)   sample-chars`. Groups are visually separated by sub-headers:

```
CHARACTER SETS
  [✓] Basic (46)       あいうえお…
  
  Dakuten
  [ ] K — ga–go (5)   が ぎ ぐ げ ご
  [ ] S — za–zo (5)   ざ じ ず ぜ ぞ
  …

  Handakuten
  [ ] Handakuten (5)  ぱ ぴ ぷ ぺ ぽ

  Compounds
  [ ] K (3)  きゃ きゅ きょ
  …
```

All 17 groups have checkboxes — Basic is not locked. The default state is Basic checked, all others unchecked.

**Save validation:** If the user clicks Save with zero groups checked, an inline error message appears below the section: `"Select at least one group."` — no dialog, no window close. The message clears when the user checks a group.

### Stats total — `main.js` `get-stats` handler

`total` is calculated dynamically: sum of character counts across enabled groups. The Settings screen label "/ N" reflects the active pool size.

`settings.html` stat-label changes from `"Chars practiced / 46"` → `"Chars practiced"` — the stat-value already renders as `"X / N"` so the `/46` in the label was redundant and would go stale with dynamic totals.

---

## Feature 3: UI Refresh — White & Orange Theme + Logo

### Design tokens

Both `popup.css` and `settings.css` get the same updated `:root` block:

```css
:root {
  --bg:        #faf8f5;
  --surface:   #f0ebe3;
  --border:    #ddd5c8;
  --text:      #1c1208;
  --muted:     #6b5a4a;   /* darkened from #8a7565 — passes WCAG AA 4.5:1 */
  --accent:    #e8621a;
  --success:   #2a7a44;
  --danger:    #b83232;
  --canvas-bg: #f5f5f0;   /* unchanged */
}
```

Accent buttons (`btn-primary`) use `color: var(--text)` (dark `#1c1208`) instead of `#fff` — white on `#e8621a` is ~3.4:1 at 14px (fails WCAG AA); dark text gives ~5.3:1.

The `hiragana-char` text-shadow changes from indigo to orange: `rgba(232, 98, 26, 0.35)`.

Button transitions update from `0.12s` to `0.15s` to align with the 150–300ms micro-interaction guideline.

### Popup window background

`main.js` `showPopup()`: `backgroundColor: '#faf8f5'` (was `'#0f0e17'`).

### Popup header

The bare `.drag-handle` bar is replaced with a branded header:

```
┌────────────────────────────────────────┐
│ [icon 18×18]  RISAGANA TRAINER   1 / 5 │  ← 32px tall, full-width drag region
└────────────────────────────────────────┘
```

HTML:

```html
<div class="app-header">
  <div class="header-brand">
    <img src="../src/icon.png" alt="Risagana Trainer logo" width="18" height="18">
    <span class="header-title">Risagana Trainer</span>
  </div>
  <span id="session-progress" class="session-progress">1 / 5</span>
</div>
```

- Full bar is `-webkit-app-region: drag`
- Icon is decorative/informational; `alt` text provided for accessibility
- `session-progress` is updated by `popup.js` on every character advance

### Settings window

Same token swap. No structural changes besides adding the character-sets section and making `#app` scrollable.

---

## Files Changed

| File | Change |
|---|---|
| `src/hiragana.js` | Restructured as `GROUPS` object with 17 named groups |
| `src/store.js` | `pickCharacter()` filters by enabled groups; `recordSkip()` added; migration for `enabledGroups` |
| `main.js` | `VALID_ROMAJI` from all groups; `VALID_GROUP_KEYS` set; `skip-character` IPC handler; `save-settings` validates groups; `get-stats` returns dynamic total; `backgroundColor` updated |
| `preload.js` | `skipCharacter` added to API bridge |
| `renderer/popup.html` | Header markup replaced; progress badge added; draw/result screens unchanged structurally |
| `renderer/popup.js` | Session state machine; `advanceSession()`; Skip calls `skipCharacter`; countdown only on char 5 |
| `renderer/popup.css` | Token swap; `.app-header` styles; accent button text color; transition timing |
| `renderer/settings.html` | Character-sets section added; scrollable layout |
| `renderer/settings.js` | Reads/writes `enabledGroups`; validates before save; updates stats total display |
| `renderer/settings.css` | Token swap; scrollable `#app`; checkbox group styles |

---

## Invariants & Edge Cases

- If all groups are unchecked and user clicks Save → show error, do not save, do not close.
- If `pickCharacter()` pool is empty (should not happen after validation, but) → fall back to `basic` silently.
- Session always runs exactly 5 characters. Skip counts as completing a slot (session advances).
- The countdown does not start until after the 5th evaluation button is clicked — not after Reveal.
- `VALID_ROMAJI` in `main.js` covers all 17 groups so no valid romaji is rejected by the IPC guard.
- Existing user save files without `enabledGroups` are migrated to `['basic']` on first load — no data loss.
