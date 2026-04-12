# Worktime Tracker 1.2.0

This release rebuilds the app’s foundation so the tracker is more stable, more predictable, and ready to grow without brittle workarounds.

## Stability
- Fixed the mismatch between app autostart settings and the actual Windows state.
- Stopped the timer from starting automatically after a cold app launch.
- Made the full data reset flow atomic and predictable.
- Added safe clearing for a selected day with explicit confirmation.
- Starting the timer on a day off now switches that day to working mode by the agreed rule.

## Core tracking
- Reworked the tracker around work intervals, not just daily totals.
- Added visibility for work intervals in the selected day view.
- Added manual adjustment of daily work time without starting the timer.
- Added a configurable day rollover time so late-night work can keep counting toward the intended workday.
- Kept older backups and existing user data compatible.

## Desktop UX
- Improved tray behavior so minimize and close both follow a clear hide-to-tray flow.
- Added a dark theme.
- Added a subtle animation for the active timer.
- Updated the tray menu so window and timer control are simpler.

## Compatibility
- Existing user data still opens without manual intervention.
- Import and export continue to work with previously saved history.
- The main workflows remain intact: start/stop, calendar, streak, tray, and backups.

## Under the hood
- Split the renderer logic into clearer layers.
- Prepared the app architecture for future features without keeping everything inside a single growing `app.js`.
