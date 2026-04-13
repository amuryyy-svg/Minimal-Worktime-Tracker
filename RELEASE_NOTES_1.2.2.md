This release focuses on timer flow, settings polish, and a few small data-handling fixes that make the app feel more predictable during day-to-day use.

## What changed

### Timer flow
- Picking a historical day now switches the main timer back to the current business day and starts the live session.
- Minimizing the window now behaves like a normal minimize.
- Closing the window still sends the app to tray.

### Time and settings
- Time format is now a separate setting, with `24h` and `AM/PM` options.
- The selected setting button now fills with orange instead of only showing an underline.

### Import and history
- Import now brings in progress only and keeps the current theme and local settings intact.
- Day details no longer show technical helper labels.
- The day details panel keeps scrolling available.

### Under the hood
- The stored data format moved to `v9` so the new time format and timer behavior stay consistent.
- The timer display now uses a smoother digit-wheel animation for live updates.
