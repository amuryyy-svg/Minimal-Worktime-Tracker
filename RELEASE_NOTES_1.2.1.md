This release focuses on small but important fixes that make the daily workflow feel cleaner and more consistent.

## What changed

### Day details
- Restored scrolling in the day details panel.
- Removed technical helper labels from the day details view.
- Prevented accidental text selection when clicking or dragging inside the UI.

### Import and settings
- Import now brings in only progress data and keeps the current theme and local settings intact.

### Live timer history
- The live timer session is now stored as one continuous block from start to pause.
- Live entries are no longer recorded as per-second fragments in the day history.
- Fixed the timer tick behavior that was disrupted during this work.

### Behavior
- The release keeps the same day model and progress flow, but the UI and history output are now cleaner to read.
