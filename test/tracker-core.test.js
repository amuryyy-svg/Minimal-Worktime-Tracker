const assert = require("node:assert/strict");
const trackerCore = require("../src/renderer/tracker-core.js");

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
  const nowDate = new Date(2026, 3, 15);
  const offDayA = new Date(2026, 3, 14);
  const offDayB = new Date(2026, 3, 13);
  const workDayA = new Date(2026, 3, 12);
  const workDayB = new Date(2026, 3, 11);
  const offDayValues = [offDayA.getDay(), offDayB.getDay()];
  const logs = {
    [trackerCore.dateKey(workDayA)]: { workMs: 2 * 60 * 60 * 1000 },
    [trackerCore.dateKey(workDayB)]: { workMs: 3 * 60 * 60 * 1000 },
  };

  const streak = trackerCore.calculateCurrentStreak({
    nowDate,
    isDayOff: (date) => offDayValues.includes(date.getDay()),
    getWorkMsForDate: (date) => Number(logs[trackerCore.dateKey(date)]?.workMs) || 0,
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
  const persisted = trackerCore.createPersistedState({
    logs: {
      [trackerCore.dateKey(new Date(2026, 0, 1))]: { workMs: "1800000" },
      invalid: { workMs: -15 },
    },
    settings: {
      dailyTargetHours: "9.2",
      weekendDays: [],
      dayOverrides: {
        [trackerCore.dateKey(new Date(2026, 0, 2))]: "off",
        [trackerCore.dateKey(new Date(2026, 0, 3))]: "invalid",
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
  assert.equal(persisted.logs[trackerCore.dateKey(new Date(2026, 0, 1))].workMs, 1_800_000);
  assert.equal(persisted.logs.invalid.workMs, 0);
  assert.deepEqual(persisted.settings.weekendDays, []);
  assert.deepEqual(persisted.settings.dayOverrides, {
    [trackerCore.dateKey(new Date(2026, 0, 2))]: "off",
  });
  assert.equal(persisted.settings.language, "en");
  assert.equal(persisted.settings.dateFormat, "mdy");
  assert.equal(persisted.settings.weekStart, "sunday");
  assert.equal(persisted.settings.autostart, true);
  assert.equal(persisted.settings.autoBackup, false);
  assert.equal(persisted.timerState.isRunning, true);
}

{
  const fallbackState = {
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
      language: "ru",
      dateFormat: "localized",
      weekStart: "sunday",
      autostart: true,
      autoBackup: false,
    },
    timerState: {
      isRunning: false,
    },
  };

  const normalized = trackerCore.normalizePersistedState(
    {
      logs: {
        [trackerCore.dateKey(new Date(2026, 0, 4))]: { workMs: 120_000 },
      },
      settings: {
        dailyTargetHours: 7,
        language: "en",
      },
    },
    fallbackState,
  );

  assert.equal(normalized.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(normalized.timerState.isRunning, false);
  assert.equal(normalized.logs[trackerCore.dateKey(new Date(2026, 0, 4))].workMs, 120_000);
  assert.equal(normalized.settings.dailyTargetHours, 7);
  assert.equal(normalized.settings.language, "en");
  assert.equal(normalized.settings.weekStart, "sunday");
  assert.equal(normalized.settings.autostart, true);
  assert.equal(normalized.settings.autoBackup, false);
}

{
  const normalized = trackerCore.normalizePersistedState(
    {
      settings: {
        dateFormat: "bad",
      },
    },
    {
      logs: {},
      settings: {
        dailyTargetHours: 6,
        weekendDays: [0, 6],
        dayOverrides: {},
        language: "ru",
        dateFormat: "localized",
        weekStart: "sunday",
        autostart: true,
        autoBackup: false,
      },
      timerState: {
        isRunning: false,
      },
    },
  );

  assert.equal(normalized.settings.dateFormat, "localized");
  assert.equal(normalized.settings.weekStart, "sunday");
  assert.equal(normalized.settings.autostart, true);
  assert.equal(normalized.settings.autoBackup, false);
}

{
  const normalized = trackerCore.normalizePersistedState(
    {
      settings: {
        language: "de",
      },
    },
    {
      logs: {},
      settings: {
        dailyTargetHours: 6,
        weekendDays: [0, 6],
        dayOverrides: {},
        language: "ru",
        weekStart: "monday",
        autostart: false,
        autoBackup: false,
      },
      timerState: {
        isRunning: false,
      },
    },
  );

  assert.equal(normalized.settings.language, "ru");
  assert.equal(normalized.settings.weekStart, "monday");
  assert.equal(normalized.settings.autostart, false);
  assert.equal(normalized.settings.autoBackup, false);
}

{
  const backup = trackerCore.createBackupPayload({
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
      language: "ru",
      weekStart: "monday",
      autostart: false,
      autoBackup: false,
    },
    timerState: {
      isRunning: false,
    },
  });

  assert.equal(backup.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(typeof backup.exportedAt, "string");
  assert.match(backup.exportedAt, new RegExp("^\\d{4}-\\d{2}-\\d{2}T"));
}

{
  const backup = trackerCore.createBackupPayload({
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
      language: "en",
      weekStart: "monday",
      autostart: false,
      autoBackup: false,
    },
    timerState: {
      isRunning: true,
    },
  });
  const restored = trackerCore.normalizePersistedState(backup, {
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
      language: "ru",
      weekStart: "monday",
      autostart: false,
      autoBackup: false,
    },
    timerState: {
      isRunning: false,
    },
  });

  assert.equal(restored.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(restored.timerState.isRunning, true);
  assert.equal(restored.settings.language, "en");
  assert.equal(restored.settings.weekStart, "monday");
  assert.equal(restored.settings.autostart, false);
  assert.equal(restored.settings.autoBackup, false);
}
