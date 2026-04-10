(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.trackerCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const ENTRY_TYPE_INTERVAL = "interval";
  const ENTRY_TYPE_LEGACY_TOTAL = "legacy-total";
  const DEFAULT_INTERVAL_SOURCE = "timer";
  const DEFAULT_LEGACY_SOURCE = "import";
  const MIGRATED_V7_SOURCE = "migrated-v7";
  const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const DEFAULT_DAILY_TARGET_HOURS = 6;
  const DEFAULT_WEEKEND_DAYS = [0, 6];
  const DEFAULT_LANGUAGE = "ru";
  const DEFAULT_DATE_FORMAT = "localized";
  const DEFAULT_WEEK_START = "monday";
  const PERSISTED_STATE_VERSION = 8;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

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

  function sanitizeDailyTargetHours(value, fallback = DEFAULT_DAILY_TARGET_HOURS, min = 1, max = 24) {
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
    if (!isPlainObject(value)) {
      return {};
    }

    const dayOverrides = {};

    for (const [key, mode] of Object.entries(value)) {
      if (DAY_KEY_PATTERN.test(key) && (mode === "off" || mode === "work")) {
        dayOverrides[key] = mode;
      }
    }

    return dayOverrides;
  }

  function sanitizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
    if (value === "ru" || value === "en") {
      return value;
    }

    return fallback;
  }

  function sanitizeWeekStart(value, fallback = DEFAULT_WEEK_START) {
    if (value === "monday" || value === "sunday") {
      return value;
    }

    return fallback;
  }

  function sanitizeDateFormat(value, fallback = DEFAULT_DATE_FORMAT) {
    if (value === "localized" || value === "dmy" || value === "mdy") {
      return value;
    }

    return fallback;
  }

  function sanitizeBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === 0 || value === 1) {
      return Boolean(value);
    }

    if (typeof value === "string") {
      if (value === "true" || value === "1") {
        return true;
      }

      if (value === "false" || value === "0") {
        return false;
      }
    }

    return fallback;
  }

  function sanitizeLogs(value) {
    if (!isPlainObject(value)) {
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
    const source = isPlainObject(settings) ? settings : {};
    const normalizedFallback = isPlainObject(fallbackSettings) ? fallbackSettings : {};
    const fallbackDailyTargetHours = sanitizeDailyTargetHours(
      normalizedFallback.dailyTargetHours,
      DEFAULT_DAILY_TARGET_HOURS,
      1,
      24,
    );
    const fallbackWeekendDays = sanitizeWeekendDays(normalizedFallback.weekendDays, DEFAULT_WEEKEND_DAYS);
    const fallbackDayOverrides = sanitizeDayOverrides(normalizedFallback.dayOverrides);
    const fallbackLanguage = sanitizeLanguage(normalizedFallback.language, DEFAULT_LANGUAGE);
    const fallbackDateFormat = sanitizeDateFormat(normalizedFallback.dateFormat, DEFAULT_DATE_FORMAT);
    const fallbackWeekStart = sanitizeWeekStart(normalizedFallback.weekStart, DEFAULT_WEEK_START);
    const fallbackAutostart = sanitizeBoolean(normalizedFallback.autostart, false);
    const fallbackAutoBackup = sanitizeBoolean(normalizedFallback.autoBackup, false);

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
      language: source.language === undefined
        ? fallbackLanguage
        : sanitizeLanguage(source.language, fallbackLanguage),
      dateFormat: source.dateFormat === undefined
        ? fallbackDateFormat
        : sanitizeDateFormat(source.dateFormat, fallbackDateFormat),
      weekStart: source.weekStart === undefined
        ? fallbackWeekStart
        : sanitizeWeekStart(source.weekStart, fallbackWeekStart),
      autostart: source.autostart === undefined
        ? fallbackAutostart
        : sanitizeBoolean(source.autostart, fallbackAutostart),
      autoBackup: source.autoBackup === undefined
        ? fallbackAutoBackup
        : sanitizeBoolean(source.autoBackup, fallbackAutoBackup),
    };
  }

  function sanitizeTimerState(timerState) {
    return {
      isRunning: Boolean(timerState?.isRunning),
    };
  }

  function sanitizeBootstrapState(bootstrapState, fallbackState = {}) {
    return {
      autostart: sanitizeBoolean(bootstrapState?.autostart, sanitizeBoolean(fallbackState.autostart, false)),
      launchedAtLogin: sanitizeBoolean(
        bootstrapState?.launchedAtLogin,
        sanitizeBoolean(fallbackState.launchedAtLogin, false),
      ),
    };
  }

  function sanitizeEntrySource(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  function createDefaultSettings() {
    return {
      dailyTargetHours: DEFAULT_DAILY_TARGET_HOURS,
      weekendDays: DEFAULT_WEEKEND_DAYS.slice(),
      dayOverrides: {},
      language: DEFAULT_LANGUAGE,
      dateFormat: DEFAULT_DATE_FORMAT,
      weekStart: DEFAULT_WEEK_START,
      autostart: false,
      autoBackup: false,
    };
  }

  function createDefaultPersistedShape() {
    return {
      version: PERSISTED_STATE_VERSION,
      days: {},
      settings: createDefaultSettings(),
      timerState: { isRunning: false },
    };
  }

  function ensureDayRecord(days, key) {
    if (!DAY_KEY_PATTERN.test(key)) {
      return null;
    }

    if (!isPlainObject(days[key])) {
      days[key] = { entries: [] };
    }

    if (!Array.isArray(days[key].entries)) {
      days[key].entries = [];
    }

    return days[key];
  }

  function removeEmptyDayRecord(days, key) {
    if (!Array.isArray(days[key]?.entries) || days[key].entries.length > 0) {
      return;
    }

    delete days[key];
  }

  function addLegacyTotalToDays(days, key, durationMs, source = DEFAULT_LEGACY_SOURCE) {
    if (!isPlainObject(days)) {
      throw new TypeError("addLegacyTotalToDays expects a days object.");
    }

    if (!DAY_KEY_PATTERN.test(key)) {
      return false;
    }

    const normalizedDurationMs = Math.trunc(Number(durationMs));
    if (!Number.isFinite(normalizedDurationMs) || normalizedDurationMs <= 0) {
      return false;
    }

    const dayRecord = ensureDayRecord(days, key);
    if (!dayRecord) {
      return false;
    }

    dayRecord.entries.push({
      type: ENTRY_TYPE_LEGACY_TOTAL,
      durationMs: normalizedDurationMs,
      source: sanitizeEntrySource(source, DEFAULT_LEGACY_SOURCE),
    });

    return true;
  }

  function addIntervalToDays(days, startMs, endMs, source = DEFAULT_INTERVAL_SOURCE) {
    if (!isPlainObject(days)) {
      throw new TypeError("addIntervalToDays expects a days object.");
    }

    const normalizedStartMs = Math.trunc(Number(startMs));
    const normalizedEndMs = Math.trunc(Number(endMs));
    if (
      !Number.isFinite(normalizedStartMs) ||
      !Number.isFinite(normalizedEndMs) ||
      normalizedEndMs <= normalizedStartMs
    ) {
      return false;
    }

    const normalizedSource = sanitizeEntrySource(source, DEFAULT_INTERVAL_SOURCE);
    let cursorMs = normalizedStartMs;

    while (cursorMs < normalizedEndMs) {
      const current = new Date(cursorMs);
      const nextMidnightMs = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      ).getTime();
      const segmentEndMs = Math.min(normalizedEndMs, nextMidnightMs);
      const dayRecord = ensureDayRecord(days, dateKey(current));

      if (dayRecord && segmentEndMs > cursorMs) {
        dayRecord.entries.push({
          type: ENTRY_TYPE_INTERVAL,
          startMs: cursorMs,
          endMs: segmentEndMs,
          source: normalizedSource,
        });
      }

      cursorMs = segmentEndMs;
    }

    return true;
  }

  function sumDayEntries(entries) {
    if (!Array.isArray(entries)) {
      return 0;
    }

    let totalMs = 0;

    for (const entry of entries) {
      if (!isPlainObject(entry)) {
        continue;
      }

      if (entry.type === ENTRY_TYPE_INTERVAL) {
        const startMs = Math.trunc(Number(entry.startMs));
        const endMs = Math.trunc(Number(entry.endMs));
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
          totalMs += endMs - startMs;
        }
        continue;
      }

      if (entry.type === ENTRY_TYPE_LEGACY_TOTAL) {
        const durationMs = Math.trunc(Number(entry.durationMs));
        if (Number.isFinite(durationMs) && durationMs > 0) {
          totalMs += durationMs;
        }
      }
    }

    return totalMs;
  }

  function getDayEntries(days, dayOrKey) {
    if (!isPlainObject(days)) {
      return [];
    }

    const key = typeof dayOrKey === "string" ? dayOrKey : dateKey(dayOrKey);
    return Array.isArray(days[key]?.entries) ? days[key].entries : [];
  }

  function getDayWorkMs(days, dayOrKey) {
    return sumDayEntries(getDayEntries(days, dayOrKey));
  }

  function getWorkMsForDate(days, date) {
    return getDayWorkMs(days, date);
  }

  function clearDayEntries(days, key) {
    if (!isPlainObject(days)) {
      throw new TypeError("clearDayEntries expects a days object.");
    }

    if (!DAY_KEY_PATTERN.test(key)) {
      return false;
    }

    if (!Array.isArray(days[key]?.entries) || days[key].entries.length === 0) {
      return false;
    }

    delete days[key];
    return true;
  }

  function normalizeDays(value) {
    if (!isPlainObject(value)) {
      return {};
    }

    const days = {};

    for (const [key, dayRecord] of Object.entries(value)) {
      const entries = Array.isArray(dayRecord?.entries) ? dayRecord.entries : [];

      for (const entry of entries) {
        if (!isPlainObject(entry)) {
          continue;
        }

        if (entry.type === ENTRY_TYPE_INTERVAL) {
          addIntervalToDays(days, entry.startMs, entry.endMs, entry.source);
          continue;
        }

        if (entry.type === ENTRY_TYPE_LEGACY_TOTAL) {
          addLegacyTotalToDays(days, key, entry.durationMs, entry.source);
        }
      }
    }

    for (const key of Object.keys(days)) {
      removeEmptyDayRecord(days, key);
    }

    return days;
  }

  function migrateLogsToDays(logs) {
    const days = {};

    for (const [key, record] of Object.entries(sanitizeLogs(logs))) {
      if (!DAY_KEY_PATTERN.test(key)) {
        continue;
      }

      addLegacyTotalToDays(days, key, record.workMs, MIGRATED_V7_SOURCE);
    }

    return days;
  }

  function normalizePersistedState(raw, fallbackState = {}) {
    const source = isPlainObject(raw) ? raw : {};
    const fallback = isPlainObject(fallbackState) ? fallbackState : {};
    const fallbackShape = createDefaultPersistedShape();
    const fallbackSettings = sanitizeSettings(fallback.settings, fallbackShape.settings);
    const fallbackTimerState = sanitizeTimerState(fallback.timerState ?? fallbackShape.timerState);
    const days = source.days != null
      ? normalizeDays(source.days)
      : migrateLogsToDays(source.logs);

    return {
      version: PERSISTED_STATE_VERSION,
      days,
      settings: source.settings == null ? fallbackSettings : sanitizeSettings(source.settings, fallbackSettings),
      timerState: source.timerState == null ? fallbackTimerState : sanitizeTimerState(source.timerState),
    };
  }

  function createPersistedState(state = {}) {
    return normalizePersistedState(state, createDefaultPersistedShape());
  }

  function createBackupPayload(state = {}) {
    return {
      ...createPersistedState(state),
      exportedAt: new Date().toISOString(),
    };
  }

  function createRuntimeState(state = {}, bootstrapState = {}) {
    const persistedState = createPersistedState(state);
    const normalizedBootstrapState = sanitizeBootstrapState(bootstrapState, {
      autostart: persistedState.settings.autostart,
      launchedAtLogin: false,
    });

    return {
      version: persistedState.version,
      days: persistedState.days,
      settings: {
        ...persistedState.settings,
        autostart: normalizedBootstrapState.autostart,
      },
      timerState: {
        isRunning: false,
      },
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
    if (!isPlainObject(logs)) {
      throw new TypeError("addElapsedTimeToLogs expects a logs object.");
    }

    const normalizedStartMs = Math.trunc(Number(startMs));
    const normalizedEndMs = Math.trunc(Number(endMs));
    if (
      !Number.isFinite(normalizedStartMs) ||
      !Number.isFinite(normalizedEndMs) ||
      normalizedEndMs <= normalizedStartMs
    ) {
      return false;
    }

    let cursorMs = normalizedStartMs;

    while (cursorMs < normalizedEndMs) {
      const current = new Date(cursorMs);
      const nextMidnightMs = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      ).getTime();
      const segmentEndMs = Math.min(normalizedEndMs, nextMidnightMs);
      const record = ensureLogRecord(logs, dateKey(current));

      record.workMs += segmentEndMs - cursorMs;
      cursorMs = segmentEndMs;
    }

    return true;
  }

  function clearWorkLogForDate(logs, key) {
    if (!isPlainObject(logs)) {
      throw new TypeError("clearWorkLogForDate expects a logs object.");
    }

    if (typeof key !== "string" || key.length === 0) {
      return false;
    }

    if (Math.max(0, Number(logs[key]?.workMs) || 0) === 0) {
      return false;
    }

    delete logs[key];
    return true;
  }

  function getClearDayState({
    selectedDate,
    todayDate = new Date(),
    isTimerRunning = false,
    storedWorkMs = 0,
  }) {
    const selectedTime = selectedDate?.getTime?.();
    const todayTime = todayDate?.getTime?.();

    if (!Number.isFinite(selectedTime) || !Number.isFinite(todayTime)) {
      throw new TypeError("getClearDayState expects valid selectedDate and todayDate values.");
    }

    if (Boolean(isTimerRunning) && isSameDay(startOfDay(selectedDate), startOfDay(todayDate))) {
      return {
        canClear: false,
        reason: "running-today",
      };
    }

    if (Math.max(0, Number(storedWorkMs) || 0) === 0) {
      return {
        canClear: false,
        reason: "no-work",
      };
    }

    return {
      canClear: true,
      reason: null,
    };
  }

  function shouldForceWorkOverrideOnTimerStart({
    isTimerRunning = false,
    isDayOffToday = false,
  }) {
    return Boolean(isTimerRunning) !== true && Boolean(isDayOffToday) === true;
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
    addIntervalToDays,
    addLegacyTotalToDays,
    calculateCurrentStreak,
    clearDayEntries,
    clearWorkLogForDate,
    createBackupPayload,
    createPersistedState,
    createRuntimeState,
    dateKey,
    formatCompactWork,
    formatDayWord,
    formatDetailedWork,
    formatDuration,
    formatMonthTitle,
    formatSelectedDate,
    getClearDayState,
    getDayEntries,
    getDayWorkMs,
    getWorkMsForDate,
    isSameDay,
    isSameMonth,
    normalizePersistedState,
    sanitizeBoolean,
    sanitizeBootstrapState,
    sanitizeDailyTargetHours,
    sanitizeDateFormat,
    sanitizeDayOverrides,
    sanitizeLogs,
    sanitizeSettings,
    sanitizeTimerState,
    sanitizeWeekStart,
    sanitizeWeekendDays,
    shouldForceWorkOverrideOnTimerStart,
    startOfDay,
    startOfMonth,
    sumDayEntries,
    PERSISTED_STATE_VERSION,
  };
});
