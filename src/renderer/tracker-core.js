(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.trackerCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isSameDay(first, second) {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  function isSameMonth(first, second) {
    return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
  }

  function formatDuration(totalMs) {
    const safeMs = Math.max(0, totalMs);
    const seconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }

  function formatDecimalHours(hours) {
    return (Math.round(hours * 10) / 10).toFixed(1);
  }

  function formatCompactWork(totalMs) {
    if (totalMs <= 0) {
      return "";
    }

    const totalMinutes = Math.floor(totalMs / 60_000);
    if (totalMinutes <= 0) {
      return "<1м";
    }

    if (totalMinutes < 60) {
      return `${totalMinutes}м`;
    }

    const hours = totalMs / 3_600_000;
    return `${formatDecimalHours(hours)}ч`;
  }

  function formatDetailedWork(totalMs) {
    if (totalMs <= 0) {
      return "0 мин";
    }

    const totalMinutes = Math.floor(totalMs / 60_000);
    if (totalMinutes <= 0) {
      return "<1 мин";
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
      return `${totalMinutes} мин`;
    }

    if (minutes === 0) {
      return `${hours} ч`;
    }

    return `${hours} ч ${minutes} мин`;
  }

  function formatDayWord(value) {
    if (value === 1) {
      return "день";
    }

    if (value >= 2 && value <= 4) {
      return "дня";
    }

    return "дней";
  }

  function formatMonthTitle(date) {
    const title = date.toLocaleString("ru-RU", {
      month: "long",
      year: "numeric",
    });

    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  function formatSelectedDate(date) {
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  }

  const DEFAULT_WEEKEND_DAYS = [0, 6];
  const PERSISTED_STATE_VERSION = 4;

  function sanitizeDailyTargetHours(value, fallback = 6, min = 1, max = 24) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    const rounded = Math.round(parsed);
    return Math.min(max, Math.max(min, rounded));
  }

  function sanitizeWeekendDays(value, fallback = DEFAULT_WEEKEND_DAYS) {
    if (!Array.isArray(value)) {
      return fallback.slice();
    }

    const uniqueDays = [];

    for (const day of value) {
      if (Number.isInteger(day) && day >= 0 && day <= 6 && !uniqueDays.includes(day)) {
        uniqueDays.push(day);
      }
    }

    uniqueDays.sort((first, second) => first - second);
    if (uniqueDays.length > 0 || value.length === 0) {
      return uniqueDays;
    }

    return fallback.slice();
  }

  function sanitizeDayOverrides(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const dayOverrides = {};

    for (const [key, mode] of Object.entries(value)) {
      if (typeof key === "string" && (mode === "off" || mode === "work")) {
        dayOverrides[key] = mode;
      }
    }

    return dayOverrides;
  }

  function sanitizeLogs(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const logs = {};

    for (const [key, record] of Object.entries(value)) {
      if (typeof key !== "string") {
        continue;
      }

      logs[key] = {
        workMs: Math.max(0, Number(record?.workMs) || 0),
      };
    }

    return logs;
  }

  function sanitizeSettings(settings, fallbackSettings = {}) {
    const source = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
    const normalizedFallback = fallbackSettings && typeof fallbackSettings === "object" && !Array.isArray(fallbackSettings)
      ? fallbackSettings
      : {};
    const fallbackDailyTargetHours = sanitizeDailyTargetHours(
      normalizedFallback.dailyTargetHours,
      6,
      1,
      24,
    );
    const fallbackWeekendDays = sanitizeWeekendDays(normalizedFallback.weekendDays, DEFAULT_WEEKEND_DAYS);
    const fallbackDayOverrides = sanitizeDayOverrides(normalizedFallback.dayOverrides);

    return {
      dailyTargetHours: sanitizeDailyTargetHours(
        source.dailyTargetHours,
        fallbackDailyTargetHours,
        1,
        24,
      ),
      weekendDays: source.weekendDays === undefined
        ? fallbackWeekendDays
        : sanitizeWeekendDays(source.weekendDays, fallbackWeekendDays),
      dayOverrides: source.dayOverrides === undefined
        ? fallbackDayOverrides
        : sanitizeDayOverrides(source.dayOverrides),
    };
  }

  function sanitizeTimerState(timerState) {
    return {
      isRunning: Boolean(timerState?.isRunning),
    };
  }

  function normalizePersistedState(raw, fallbackState = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const fallbackLogs = sanitizeLogs(fallbackState.logs);
    const fallbackSettings = sanitizeSettings(fallbackState.settings);
    const fallbackTimerState = sanitizeTimerState(fallbackState.timerState);

    return {
      version: PERSISTED_STATE_VERSION,
      logs: source.logs == null ? fallbackLogs : sanitizeLogs(source.logs),
      settings: source.settings == null ? fallbackSettings : sanitizeSettings(source.settings, fallbackSettings),
      timerState: source.timerState == null ? fallbackTimerState : sanitizeTimerState(source.timerState),
    };
  }

  function createPersistedState(state = {}) {
    return normalizePersistedState(state, {
      logs: {},
      settings: {
        dailyTargetHours: 6,
        weekendDays: DEFAULT_WEEKEND_DAYS,
        dayOverrides: {},
      },
      timerState: { isRunning: false },
    });
  }

  function createBackupPayload(state = {}) {
    return {
      ...createPersistedState(state),
      exportedAt: new Date().toISOString(),
    };
  }

  function ensureLogRecord(logs, key) {
    if (!logs[key] || typeof logs[key] !== "object") {
      logs[key] = { workMs: 0 };
    }

    logs[key].workMs = Number(logs[key].workMs) || 0;
    return logs[key];
  }

  function addElapsedTimeToLogs(logs, startMs, endMs) {
    if (!logs || typeof logs !== "object") {
      throw new TypeError("addElapsedTimeToLogs expects a logs object.");
    }

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return false;
    }

    let cursor = startMs;

    while (cursor < endMs) {
      const current = new Date(cursor);
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      ).getTime();
      const segmentEnd = Math.min(endMs, nextMidnight);
      const deltaMs = segmentEnd - cursor;
      const key = dateKey(current);
      const record = ensureLogRecord(logs, key);

      record.workMs += deltaMs;
      cursor = segmentEnd;
    }

    return true;
  }

  function calculateCurrentStreak({
    nowDate = new Date(),
    isDayOff,
    getWorkMsForDate,
    maxLookbackDays = 4000,
  }) {
    if (typeof isDayOff !== "function" || typeof getWorkMsForDate !== "function") {
      throw new TypeError("calculateCurrentStreak expects isDayOff and getWorkMsForDate callbacks.");
    }

    const cursor = startOfDay(nowDate);
    let safety = 0;

    while (safety < maxLookbackDays && isDayOff(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      safety += 1;
    }

    if (Number(getWorkMsForDate(cursor)) === 0) {
      cursor.setDate(cursor.getDate() - 1);
      safety += 1;
    }

    while (safety < maxLookbackDays && isDayOff(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      safety += 1;
    }

    if (safety >= maxLookbackDays || isDayOff(cursor) || Number(getWorkMsForDate(cursor)) === 0) {
      return 0;
    }

    let streak = 0;

    while (safety < maxLookbackDays) {
      if (isDayOff(cursor)) {
        cursor.setDate(cursor.getDate() - 1);
        safety += 1;
        continue;
      }

      if (Number(getWorkMsForDate(cursor)) > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        safety += 1;
        continue;
      }

      break;
    }

    return streak;
  }

  return {
    addElapsedTimeToLogs,
    calculateCurrentStreak,
    dateKey,
    formatCompactWork,
    formatDayWord,
    formatDetailedWork,
    formatDuration,
    formatMonthTitle,
    formatSelectedDate,
    isSameDay,
    isSameMonth,
    sanitizeDailyTargetHours,
    createBackupPayload,
    createPersistedState,
    normalizePersistedState,
    sanitizeDayOverrides,
    sanitizeLogs,
    sanitizeSettings,
    sanitizeTimerState,
    sanitizeWeekendDays,
    PERSISTED_STATE_VERSION,
    startOfDay,
    startOfMonth,
  };
});
