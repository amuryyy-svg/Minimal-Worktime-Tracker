# Architecture

## Overview

The renderer is split into three layers:

- `src/renderer/tracker-core.js`: pure domain logic for persisted-state normalization, `v8 -> v9` migration, interval splitting, `manual-adjustment` handling, day selectors, and streak calculations.
- `src/renderer/tracker-storage.js`: persistence boundary for `localStorage` keys and backup snapshot normalization.
- `src/renderer/tracker-timer.js`: runtime timer behavior for start/stop/flush, suspend/resume, and live overlap calculations.
- `src/renderer/app.js`: UI wiring, DOM access, event handlers, rendering, and Electron-facing coordination.
- `src/assets/tray/*.png`: runtime tray icon assets for packaged and dev runs; `build/icon.ico` remains the installer/exe icon.

`src/main.js` and `src/preload.js` remain transport-only for import/export, bootstrap state, tray commands, and system events.

## Persisted State

The persisted format is `v9` and uses day records instead of `logs[dateKey].workMs`.

```json
{
  "version": 8,
  "days": {
    "2026-04-09": {
      "entries": [
        {
          "type": "interval",
          "startMs": 1775680800000,
          "endMs": 1775684400000,
          "source": "timer"
        },
        {
          "type": "legacy-total",
          "durationMs": 5400000,
          "source": "migrated-v7"
        },
        {
          "type": "manual-adjustment",
          "deltaMs": 1800000,
          "source": "manual-edit"
        }
      ]
    }
  },
  "settings": {
    "dailyTargetHours": 6,
    "weekendDays": [0, 6],
    "dayOverrides": {},
    "language": "ru",
    "dateFormat": "localized",
    "timeFormat": "24h",
    "weekStart": "monday",
    "dayRolloverTime": "06:00",
    "theme": "auto",
    "autostart": false,
    "autoBackup": false
  },
  "timerState": {
    "isRunning": false
  }
}
```

## Data Invariants

- Day keys use `YYYY-MM-DD` in local calendar time and are interpreted with the configured rollover boundary.
- `interval` entries never cross midnight inside one stored entry.
- Day totals are derived from entries; there is no separate persisted `workMs` source of truth.
- `legacy-total` is only for migrated or imported aggregate data from older formats.
- `manual-adjustment` is the only Phase 4 write path for manual day edits.
- At most one non-zero `manual-adjustment` is kept per day after normalization/upsert.
- Effective day totals are clamped to `>= 0`.
- `settings.theme` accepts `light | dark | auto`; `auto` follows the OS color-scheme preference live.
- `settings.timeFormat` accepts `24h | ampm` and is independent from language.
- Empty days are not stored.

## Migration And Rollback

- The app reads `minimal-worktime-tracker.v9` first, then `v8`, then legacy keys `v7 ... v1` as migration sources.
- Legacy `logs[dateKey].workMs` values migrate to one `legacy-total` entry per day.
- Legacy keys are not deleted during read-only migration.
- `clear data` removes all supported storage keys.
- Rollback to older builds after new interval data has been written is only best-effort.

## Timer Flow

- Live runtime timer state is not restored as a running session on cold start.
- While a timer is running, the active segment stays in renderer memory and is rendered directly in the UI as the live session.
- The active segment is committed to `days` only when the segment ends or a structural snapshot is needed, such as stop, system pause, rollover change, export, or clearing a past day.
- If a committed segment crosses the configured day rollover boundary, `tracker-core` splits it into separate per-day interval entries before persistence.
- The main timer face always renders the currently selected day, so a historical selection shows that day’s stored total in read-only mode.
- Starting the timer from a historical selection first snaps the view back to the current business day and then starts the live session.
- The timer face uses a wheel-style digit transition for visual updates; the underlying totals still come from the same day/time model.

## Effective Totals

- `base total` = sum of persisted `interval` and `legacy-total` entries for the day.
- `effective total` = `base total + manual-adjustment`, clamped to `>= 0`.
- Calendar cells, selected-day totals, streak logic, import/export, and backup snapshots operate on the effective total.
- Real timer intervals remain read-only in Phase 4; the UI never rewrites stored `startMs` / `endMs`.

## Day Menu UI Flow

- `src/renderer/app.js` renders selected-day actions inline and opens a compact `day menu` popup for per-day detail inspection.
- The day menu combines stored entries from `trackerCore.getDisplayEntriesForDay(...)` with the current live timer segment from `trackerTimer.getLiveSessionEntry(...)` before rendering.
- Manual editing opens a dedicated in-window overlay from the day menu and saves through `trackerCore.setDayManualTotal(...)`.
- The overlay edits the desired day total in minute precision and lets the domain layer derive the resulting `manual-adjustment`.

## Backup Contract

- Renderer exports full snapshots. Import applies only day progress and keeps local settings intact, including theme.
- Global import/export entry points live in `Settings > Data`; selected-day actions no longer host backup controls.
- `tracker-storage` accepts two import shapes: full `v9` persisted snapshots (`version`, `days`, `settings`, `timerState`) and legacy `logs` snapshots.
- When `minimal-worktime-tracker.v9` is malformed, storage loading ignores it and continues fallback lookup through `v8` and `v7 ... v1`.
- Electron main/preload do not interpret tracker business data.
