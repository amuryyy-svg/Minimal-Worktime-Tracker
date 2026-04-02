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
  assert.equal(persisted.timerState.isRunning, true);
}

{
  const fallbackState = {
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
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
      },
    },
    fallbackState,
  );

  assert.equal(normalized.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(normalized.timerState.isRunning, false);
  assert.equal(normalized.logs[trackerCore.dateKey(new Date(2026, 0, 4))].workMs, 120_000);
  assert.equal(normalized.settings.dailyTargetHours, 7);
}

{
  const backup = trackerCore.createBackupPayload({
    logs: {},
    settings: {
      dailyTargetHours: 6,
      weekendDays: [0, 6],
      dayOverrides: {},
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
    },
    timerState: {
      isRunning: false,
    },
  });

  assert.equal(restored.version, trackerCore.PERSISTED_STATE_VERSION);
  assert.equal(restored.timerState.isRunning, true);
}
