const assert = require("node:assert/strict");
const loginItemState = require("../src/login-item-state.js");
const trackerCore = require("../src/renderer/tracker-core.js");
const trackerStorage = require("../src/renderer/tracker-storage.js");
const trackerTimer = require("../src/renderer/tracker-timer.js");

function createIsDayOffResolver({ weekendDays = [0, 6], dayOverrides = {} } = {}) {
  return (date) => {
    const override = dayOverrides[trackerCore.dateKey(date)] || null;

    if (override === "off") {
      return true;
    }

    if (override === "work") {
      return false;
    }

    return weekendDays.includes(date.getDay());
  };
}

function getDayWorkMs(days, date) {
  return trackerCore.getDayWorkMs(days, trackerCore.dateKey(date));
}

{
  const logs = {};
  const start = new Date(2026, 0, 15, 23, 30).getTime();
  const end = new Date(2026, 0, 16, 0, 30).getTime();

  const changed = trackerCore.addElapsedTimeToLogs(logs, start, end);

  assert.equal(changed, true);
  assert.equal(logs[trackerCore.dateKey(new Date(2026, 0, 15))].workMs, 30 * 60 * 1000);
  assert.equal(logs[trackerCore.dateKey(new Date(2026, 0, 16))].workMs, 30 * 60 * 1000);
}

{
  const logs = {};
  const start = new Date(2026, 0, 15, 10, 0).getTime();
  const end = new Date(2026, 0, 15, 9, 0).getTime();

  assert.equal(trackerCore.addElapsedTimeToLogs(logs, start, end), false);
  assert.deepEqual(logs, {});
}

{
  const persisted = trackerCore.createPersistedState({
    version: 7,
    logs: {
      "2026-01-01": { workMs: "1800000" },
      "2026-01-02": { workMs: 0 },
      invalid: { workMs: 5 },
    },
    settings: {
      dailyTargetHours: "9.2",
      weekendDays: [],
      dayOverrides: {
        "2026-01-03": "off",
        bad: "work",
      },
      language: "en",
      dateFormat: "mdy",
      weekStart: "sunday",
      autostart: 1,
      autoBackup: "false",
    },
    timerState: {
      isRunning: 1,
    },
  });

  assert.equal(persisted.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.deepEqual(Object.keys(persisted.days), ["2026-01-01"]);
  assert.deepEqual(persisted.days["2026-01-01"].entries, [{
    type: "legacy-total",
    durationMs: 1_800_000,
    source: "migrated-v7",
  }]);
  assert.equal(trackerCore.getDayWorkMs(persisted.days, "2026-01-01"), 1_800_000);
  assert.deepEqual(persisted.settings.weekendDays, []);
  assert.deepEqual(persisted.settings.dayOverrides, {
    "2026-01-03": "off",
  });
  assert.equal(persisted.settings.language, "en");
  assert.equal(persisted.settings.dateFormat, "mdy");
  assert.equal(persisted.settings.weekStart, "sunday");
  assert.equal(persisted.settings.autostart, true);
  assert.equal(persisted.settings.autoBackup, false);
  assert.equal(persisted.timerState.isRunning, true);
}

{
  const imported = trackerStorage.normalizeImportedSnapshot({
    logs: {
      "2026-01-07": { workMs: 45 * 60 * 1000 },
    },
  });

  assert.equal(imported.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(trackerCore.getDayWorkMs(imported.days, "2026-01-07"), 45 * 60 * 1000);
}

{
  const fakeStorage = {
    values: new Map([
      [trackerStorage.STORAGE_KEY, JSON.stringify({
        version: 8,
        days: {
          "2026-01-08": {
            entries: [{
              type: "legacy-total",
              durationMs: 30 * 60 * 1000,
              source: "import",
            }],
          },
        },
        settings: {
          language: "ru",
        },
        timerState: {
          isRunning: false,
        },
      })],
      ["minimal-worktime-tracker.v7", JSON.stringify({
        logs: {
          "2026-01-08": { workMs: 10 * 60 * 1000 },
        },
      })],
    ]),
    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    },
    removeItem(key) {
      this.values.delete(key);
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };

  const loaded = trackerStorage.loadPersistedState(fakeStorage);

  assert.equal(trackerCore.getDayWorkMs(loaded.days, "2026-01-08"), 30 * 60 * 1000);
}

{
  const fakeStorage = {
    values: new Map([
      [trackerStorage.STORAGE_KEY, JSON.stringify({
        version: 8,
        days: {},
      })],
      ["minimal-worktime-tracker.v7", JSON.stringify({
        logs: {
          "2026-01-09": { workMs: 25 * 60 * 1000 },
        },
      })],
    ]),
    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    },
    removeItem(key) {
      this.values.delete(key);
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };

  const loaded = trackerStorage.loadPersistedState(fakeStorage);

  assert.equal(trackerCore.getDayWorkMs(loaded.days, "2026-01-09"), 25 * 60 * 1000);
}

{
  assert.equal(trackerStorage.isRecognizedSnapshotShape({}), false);
  assert.equal(trackerStorage.isRecognizedSnapshotShape({ foo: 1 }), false);
  assert.equal(trackerStorage.isRecognizedSnapshotShape({ days: {} }), false);
  assert.equal(trackerStorage.isRecognizedSnapshotShape({
    version: trackerCore.PERSISTED_STATE_VERSION,
    days: {},
    settings: {},
    timerState: {},
  }), true);
  assert.equal(trackerStorage.isRecognizedSnapshotShape({ logs: {} }), true);

  assert.throws(() => {
    trackerStorage.normalizeImportedSnapshot({});
  }, /Unsupported backup snapshot format/);

  assert.throws(() => {
    trackerStorage.normalizeImportedSnapshot({
      version: trackerCore.PERSISTED_STATE_VERSION,
      days: {},
    });
  }, /Unsupported backup snapshot format/);
}

{
  const days = {};
  const start = new Date(2026, 0, 15, 23, 30).getTime();
  const end = new Date(2026, 0, 16, 0, 30).getTime();

  const changed = trackerCore.addIntervalToDays(days, start, end, "timer");

  assert.equal(changed, true);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-15"), 30 * 60 * 1000);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-16"), 30 * 60 * 1000);
  assert.equal(
    trackerCore.getDayEntries(days, "2026-01-15")[0].endMs - trackerCore.getDayEntries(days, "2026-01-15")[0].startMs,
    30 * 60 * 1000,
  );
  assert.equal(
    trackerCore.getDayEntries(days, "2026-01-16")[0].endMs - trackerCore.getDayEntries(days, "2026-01-16")[0].startMs,
    30 * 60 * 1000,
  );
}

{
  const persisted = trackerCore.createPersistedState({
    days: {
      "2026-02-01": {
        entries: [
          {
            type: "interval",
            startMs: new Date(2026, 1, 1, 9, 0).getTime(),
            endMs: new Date(2026, 1, 1, 10, 0).getTime(),
            source: "timer",
          },
          {
            type: "legacy-total",
            durationMs: 30 * 60 * 1000,
            source: "migrated-v7",
          },
        ],
      },
    },
    settings: {
      language: "ru",
    },
  });

  assert.equal(trackerCore.getDayWorkMs(persisted.days, "2026-02-01"), 90 * 60 * 1000);
}

{
  const normalized = trackerCore.normalizePersistedState({
    days: {
      "2026-03-01": {
        entries: [
          {
            type: "interval",
            startMs: new Date(2026, 2, 1, 8, 0).getTime(),
            endMs: new Date(2026, 2, 1, 9, 0).getTime(),
            source: "timer",
          },
          {
            type: "interval",
            startMs: new Date(2026, 2, 1, 11, 0).getTime(),
            endMs: new Date(2026, 2, 1, 10, 0).getTime(),
            source: "timer",
          },
        ],
      },
      "2026-03-02": {
        entries: [
          {
            type: "legacy-total",
            durationMs: 0,
            source: "import",
          },
        ],
      },
    },
  });

  assert.equal(trackerCore.getDayWorkMs(normalized.days, "2026-03-01"), 60 * 60 * 1000);
  assert.equal(normalized.days["2026-03-02"], undefined);
}

{
  const persisted = trackerCore.createPersistedState({
    logs: {
      "2026-04-10": { workMs: 90_000 },
      "2026-04-11": { workMs: 120_000 },
    },
  });

  assert.equal(trackerCore.clearDayEntries(persisted.days, "2026-04-10"), true);
  assert.equal(persisted.days["2026-04-10"], undefined);
  assert.equal(trackerCore.getDayWorkMs(persisted.days, "2026-04-11"), 120_000);
}

{
  const selectedDate = new Date(2026, 3, 10);

  assert.deepEqual(trackerCore.getClearDayState({
    selectedDate,
    todayDate: selectedDate,
    isTimerRunning: true,
    storedWorkMs: 90_000,
  }), {
    canClear: false,
    reason: "running-today",
  });

  assert.deepEqual(trackerCore.getClearDayState({
    selectedDate,
    todayDate: new Date(2026, 3, 11),
    isTimerRunning: false,
    storedWorkMs: 0,
  }), {
    canClear: false,
    reason: "no-work",
  });

  assert.deepEqual(trackerCore.getClearDayState({
    selectedDate,
    todayDate: new Date(2026, 3, 11),
    isTimerRunning: false,
    storedWorkMs: 90_000,
  }), {
    canClear: true,
    reason: null,
  });
}

{
  assert.equal(trackerCore.shouldForceWorkOverrideOnTimerStart({
    isTimerRunning: false,
    isDayOffToday: true,
  }), true);
  assert.equal(trackerCore.shouldForceWorkOverrideOnTimerStart({
    isTimerRunning: true,
    isDayOffToday: true,
  }), false);
  assert.equal(trackerCore.shouldForceWorkOverrideOnTimerStart({
    isTimerRunning: false,
    isDayOffToday: false,
  }), false);
}

{
  const migrated = trackerCore.createPersistedState({
    logs: {
      "2026-04-16": { workMs: 2 * 60 * 60 * 1000 },
      "2026-04-15": { workMs: 60 * 60 * 1000 },
      "2026-04-14": { workMs: 3 * 60 * 60 * 1000 },
    },
    settings: {
      weekendDays: [],
      dayOverrides: {
        "2026-04-15": "off",
      },
    },
  });

  const streak = trackerCore.calculateCurrentStreak({
    nowDate: new Date(2026, 3, 16),
    isDayOff: createIsDayOffResolver(migrated.settings),
    getWorkMsForDate: (date) => getDayWorkMs(migrated.days, date),
  });

  assert.equal(streak, 2);
}

{
  const migrated = trackerCore.createPersistedState({
    logs: {
      "2026-04-13": { workMs: 2 * 60 * 60 * 1000 },
      "2026-04-11": { workMs: 90 * 60 * 1000 },
    },
    settings: {
      weekendDays: [0, 6],
      dayOverrides: {
        "2026-04-11": "work",
      },
    },
  });

  const streak = trackerCore.calculateCurrentStreak({
    nowDate: new Date(2026, 3, 13),
    isDayOff: createIsDayOffResolver(migrated.settings),
    getWorkMsForDate: (date) => getDayWorkMs(migrated.days, date),
  });

  assert.equal(streak, 2);
}

{
  assert.equal(trackerCore.formatCompactWork(30_000), "<1м");
  assert.equal(trackerCore.formatDetailedWork(30_000), "<1 мин");
  assert.equal(trackerCore.formatDuration(3_661_000), "01:01:01");
}

{
  assert.equal(trackerCore.sanitizeDailyTargetHours("9.2"), 9);
  assert.equal(trackerCore.sanitizeDailyTargetHours(0), 1);
  assert.equal(trackerCore.sanitizeDailyTargetHours("bad"), 6);
}

{
  assert.equal(trackerCore.sanitizeDateFormat("mdy"), "mdy");
  assert.equal(trackerCore.sanitizeDateFormat("bad"), "localized");
  assert.equal(trackerCore.sanitizeWeekStart("sunday"), "sunday");
  assert.equal(trackerCore.sanitizeWeekStart("bad"), "monday");
  assert.equal(trackerCore.sanitizeBoolean(true), true);
  assert.equal(trackerCore.sanitizeBoolean(undefined, true), true);
  assert.equal(trackerCore.sanitizeBoolean("bad"), false);
}

{
  const backup = trackerCore.createBackupPayload({
    logs: {
      "2026-01-09": { workMs: 60_000 },
    },
    settings: {
      language: "en",
      weekStart: "monday",
      autostart: false,
      autoBackup: false,
    },
    timerState: {
      isRunning: true,
    },
  });

  assert.equal(backup.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(typeof backup.exportedAt, "string");
  assert.match(backup.exportedAt, new RegExp("^\\d{4}-\\d{2}-\\d{2}T"));
  assert.equal(trackerCore.getDayWorkMs(backup.days, "2026-01-09"), 60_000);
}

{
  const runtimeState = trackerCore.createRuntimeState(
    {
      logs: {
        "2026-01-05": { workMs: 240_000 },
      },
      settings: {
        language: "ru",
        weekStart: "monday",
        autostart: false,
        autoBackup: true,
      },
      timerState: {
        isRunning: true,
      },
    },
    {
      autostart: true,
      launchedAtLogin: true,
    },
  );

  assert.equal(trackerCore.getDayWorkMs(runtimeState.days, "2026-01-05"), 240_000);
  assert.equal(runtimeState.settings.autostart, true);
  assert.equal(runtimeState.settings.autoBackup, true);
  assert.equal(runtimeState.timerState.isRunning, false);
}

{
  const bootstrapState = trackerCore.sanitizeBootstrapState(
    {
      autostart: "1",
    },
    {
      autostart: false,
      launchedAtLogin: true,
    },
  );

  assert.equal(bootstrapState.autostart, true);
  assert.equal(bootstrapState.launchedAtLogin, true);
}

{
  const bootstrapState = loginItemState.createBootstrapState({
    openAtLogin: true,
    executableWillLaunchAtLogin: false,
    wasOpenedAtLogin: false,
  });

  assert.equal(bootstrapState.autostart, false);
  assert.equal(bootstrapState.launchedAtLogin, false);
}

{
  const bootstrapState = loginItemState.createBootstrapState({
    openAtLogin: true,
    wasOpenedAtLogin: true,
  });

  assert.equal(bootstrapState.autostart, true);
  assert.equal(bootstrapState.launchedAtLogin, true);
}

{
  const bootstrapState = loginItemState.ensureBootstrapAutostart(
    {
      openAtLogin: true,
      executableWillLaunchAtLogin: false,
      wasOpenedAtLogin: false,
    },
    false,
    "autostart mismatch",
  );

  assert.equal(bootstrapState.autostart, false);
}

{
  assert.throws(() => {
    loginItemState.ensureBootstrapAutostart(
      {
        openAtLogin: true,
        executableWillLaunchAtLogin: false,
      },
      true,
      "autostart mismatch",
    );
  }, /autostart mismatch/);
}

{
  const runtime = trackerTimer.createTimerRuntime();
  const days = {};
  const startMs = new Date(2026, 0, 20, 23, 30).getTime();
  const endMs = new Date(2026, 0, 21, 0, 30).getTime();

  trackerTimer.startTimer(runtime, { nowMs: startMs });
  const changed = trackerTimer.flushTimer(runtime, days, { nowMs: endMs, source: "timer" });

  assert.equal(changed, true);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-20"), 30 * 60 * 1000);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-21"), 30 * 60 * 1000);
}

{
  const fakeStorage = {
    values: new Map(),
    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    },
    removeItem(key) {
      this.values.delete(key);
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };

  trackerStorage.savePersistedState({
    days: {
      "2026-01-22": {
        entries: [{
          type: "legacy-total",
          durationMs: 15 * 60 * 1000,
          source: "import",
        }],
      },
    },
  }, fakeStorage);

  const saved = JSON.parse(fakeStorage.values.get(trackerStorage.STORAGE_KEY));
  assert.equal(saved.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(trackerCore.getDayWorkMs(saved.days, "2026-01-22"), 15 * 60 * 1000);

  fakeStorage.setItem("minimal-worktime-tracker.v7", "legacy");
  trackerStorage.removePersistedStateKeys(fakeStorage);
  assert.equal(fakeStorage.values.size, 0);
}

{
  const runtime = trackerTimer.createTimerRuntime();
  const days = {};
  const startMs = new Date(2026, 0, 22, 9, 0).getTime();
  const pauseMs = new Date(2026, 0, 22, 9, 20).getTime();
  const resumeMs = new Date(2026, 0, 22, 9, 30).getTime();
  const endMs = new Date(2026, 0, 22, 9, 45).getTime();

  trackerTimer.startTimer(runtime, { nowMs: startMs });
  const paused = trackerTimer.handleSystemPause(runtime, days, { nowMs: pauseMs, source: "timer" });
  assert.equal(paused, true);
  assert.equal(runtime.isSuspended, true);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-22"), 20 * 60 * 1000);

  const resumed = trackerTimer.handleSystemResume(runtime, { nowMs: resumeMs });
  assert.equal(resumed, true);
  assert.equal(runtime.isSuspended, false);
  assert.equal(runtime.lastTickMs, resumeMs);

  const stopped = trackerTimer.stopTimer(runtime, days, { nowMs: endMs, source: "timer" });
  assert.equal(stopped, true);
  assert.equal(trackerCore.getDayWorkMs(days, "2026-01-22"), 35 * 60 * 1000);
}

