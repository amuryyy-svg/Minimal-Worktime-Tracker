# Architecture

## Overview

The renderer is split into three layers:

- `src/renderer/tracker-core.js`: pure domain logic for persisted-state normalization, `v7 -> v8` migration, interval splitting, day selectors, and streak calculations.
- `src/renderer/tracker-storage.js`: persistence boundary for `localStorage` keys and backup snapshot normalization.
- `src/renderer/tracker-timer.js`: runtime timer behavior for start/stop/flush, suspend/resume, and live overlap calculations.
- `src/renderer/app.js`: UI wiring, DOM access, event handlers, rendering, and Electron-facing coordination.

`src/main.js` and `src/preload.js` remain transport-only for import/export, bootstrap state, tray commands, and system events.

## Persisted State

The persisted format is `v8` and uses day records instead of `logs[dateKey].workMs`.

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
    "weekStart": "monday",
    "autostart": false,
    "autoBackup": false
  },
  "timerState": {
    "isRunning": false
  }
}
```

## Data Invariants

- Day keys use `YYYY-MM-DD` in local calendar time.
- `interval` entries never cross midnight inside one stored entry.
- Day totals are derived from entries; there is no separate persisted `workMs` source of truth.
- `legacy-total` is only for migrated or imported aggregate data from older formats.
- Empty days are not stored.

## Migration And Rollback

- The app reads `minimal-worktime-tracker.v8` first, then legacy keys `v7 ... v1` as migration sources.
- Legacy `logs[dateKey].workMs` values migrate to one `legacy-total` entry per day.
- Legacy keys are not deleted during read-only migration.
- `clear data` removes all supported storage keys.
- Rollback to older builds after new interval data has been written is only best-effort.

## Timer Flow

- Live runtime timer state is not restored as a running session on cold start.
- On flush, timer time is written as `interval` entries via `tracker-timer` and `tracker-core`.
- If a session crosses midnight, it is split into separate per-day interval entries before persistence.

## Backup Contract

- Renderer exports and imports full snapshots.
- `tracker-storage` accepts two import shapes: full `v8` persisted snapshots (`version`, `days`, `settings`, `timerState`) and legacy `logs` snapshots.
- When `minimal-worktime-tracker.v8` is malformed, storage loading ignores it and continues fallback lookup through `v7 ... v1`.
- Electron main/preload do not interpret tracker business data.

