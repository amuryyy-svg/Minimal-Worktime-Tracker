(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.trackerCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const ENTRY_TYPE_INTERVAL = "interval";
  const ENTRY_TYPE_LEGACY_TOTAL = "legacy-total";
  const ENTRY_TYPE_MANUAL_ADJUSTMENT = "manual-adjustment";
  const DEFAULT_INTERVAL_SOURCE = "timer";
  const DEFAULT_LEGACY_SOURCE = "import";
  const DEFAULT_MANUAL_ADJUSTMENT_SOURCE = "manual-edit";
  const MIGRATED_V7_SOURCE = "migrated-v7";
  const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const DEFAULT_DAILY_TARGET_HOURS = 6;
  const DEFAULT_WEEKEND_DAYS = [0, 6];
  const DEFAULT_LANGUAGE = "ru";
  const DEFAULT_DATE_FORMAT = "localized";
  const DEFAULT_WEEK_START = "monday";
  const DEFAULT_THEME = "light";
  const DEFAULT_DAY_ROLLOVER_TIME = "06:00";
  const DEFAULT_TIME_FORMAT = "24h";
  const DAY_ROLLOVER_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const PERSISTED_STATE_VERSION = 9;

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

  function getDefaultTimeFormatForLanguage(language) {
    return language === "en" ? "ampm" : "24h";
  }

  function sanitizeTimeFormat(value, fallback = DEFAULT_TIME_FORMAT) {
    if (value === "24h" || value === "ampm") {
      return value;
    }

    return fallback;
  }


  function sanitizeDayRolloverTime(value, fallback = DEFAULT_DAY_ROLLOVER_TIME) {
    const normalizedFallback = DAY_ROLLOVER_TIME_PATTERN.test(fallback)
      ? fallback
      : DEFAULT_DAY_ROLLOVER_TIME;

    if (typeof value !== "string") {
      return normalizedFallback;
    }

    const normalizedValue = value.trim();
    if (!DAY_ROLLOVER_TIME_PATTERN.test(normalizedValue)) {
      return normalizedFallback;
    }

    return normalizedValue;
  }

  function getDayRolloverTimeParts(dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME) {
    const normalized = sanitizeDayRolloverTime(dayRolloverTime, DEFAULT_DAY_ROLLOVER_TIME);
    const [hoursText, minutesText] = normalized.split(":");

    return {
      hours: Number(hoursText),
      minutes: Number(minutesText),
    };
  }

  function getBusinessDayBoundsForLabelDate(dayDate, dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME) {
    const { hours, minutes } = getDayRolloverTimeParts(dayRolloverTime);
    const startMs = new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      hours,
      minutes,
      0,
      0,
    ).getTime();
    const endDate = new Date(startMs);
    endDate.setDate(endDate.getDate() + 1);

    return {
      startMs,
      endMs: endDate.getTime(),
    };
  }

  function getBusinessDayDateFromInstant(date, dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME) {
    const { hours, minutes } = getDayRolloverTimeParts(dayRolloverTime);
    const boundaryStartDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0,
    );

    if (date.getTime() < boundaryStartDate.getTime()) {
      boundaryStartDate.setDate(boundaryStartDate.getDate() - 1);
    }

    return startOfDay(boundaryStartDate);
  }

  function getBusinessDayKeyFromInstant(date, dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME) {
    return dateKey(getBusinessDayDateFromInstant(date, dayRolloverTime));
  }

  function sanitizeDateFormat(value, fallback = DEFAULT_DATE_FORMAT) {
    if (value === "localized" || value === "dmy" || value === "mdy") {
      return value;
    }

    return fallback;
  }

  function sanitizeTheme(value, fallback = DEFAULT_THEME) {
    if (value === "light" || value === "dark" || value === "auto") {
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
    const fallbackDayRolloverTime = sanitizeDayRolloverTime(
      normalizedFallback.dayRolloverTime,
      DEFAULT_DAY_ROLLOVER_TIME,
    );
    const fallbackTheme = sanitizeTheme(normalizedFallback.theme, DEFAULT_THEME);
    const fallbackAutostart = sanitizeBoolean(normalizedFallback.autostart, false);
    const fallbackAutoBackup = sanitizeBoolean(normalizedFallback.autoBackup, false);
    const sourceLanguage = source.language === undefined
      ? fallbackLanguage
      : sanitizeLanguage(source.language, fallbackLanguage);

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
      language: sourceLanguage,
      dateFormat: source.dateFormat === undefined
        ? fallbackDateFormat
        : sanitizeDateFormat(source.dateFormat, fallbackDateFormat),
      timeFormat: source.timeFormat === undefined
        ? getDefaultTimeFormatForLanguage(sourceLanguage)
        : sanitizeTimeFormat(source.timeFormat, getDefaultTimeFormatForLanguage(sourceLanguage)),
      weekStart: source.weekStart === undefined
        ? fallbackWeekStart
        : sanitizeWeekStart(source.weekStart, fallbackWeekStart),
      dayRolloverTime: source.dayRolloverTime === undefined
        ? fallbackDayRolloverTime
        : sanitizeDayRolloverTime(source.dayRolloverTime, fallbackDayRolloverTime),
      theme: source.theme === undefined
        ? fallbackTheme
        : sanitizeTheme(source.theme, fallbackTheme),
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


  function getIntervalDurationMs(entry) {
    const startMs = Math.trunc(Number(entry?.startMs));
    const endMs = Math.trunc(Number(entry?.endMs));

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return 0;
    }

    return endMs - startMs;
  }

  function getLegacyTotalDurationMs(entry) {
    const durationMs = Math.trunc(Number(entry?.durationMs));
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return 0;
    }

    return durationMs;
  }

  function getManualAdjustmentDeltaMs(entry) {
    const deltaMs = Math.trunc(Number(entry?.deltaMs));
    if (!Number.isFinite(deltaMs) || deltaMs === 0) {
      return 0;
    }

    return deltaMs;
  }

  function clampManualAdjustmentDelta(baseTotalMs, deltaMs) {
    const normalizedBaseTotalMs = Math.max(0, Math.trunc(Number(baseTotalMs)) || 0);
    const normalizedDeltaMs = Math.trunc(Number(deltaMs));

    if (!Number.isFinite(normalizedDeltaMs) || normalizedDeltaMs === 0) {
      return 0;
    }

    return Math.max(-normalizedBaseTotalMs, normalizedDeltaMs);
  }

  function createDefaultSettings() {
    return {
      dailyTargetHours: DEFAULT_DAILY_TARGET_HOURS,
      weekendDays: DEFAULT_WEEKEND_DAYS.slice(),
      dayOverrides: {},
      language: DEFAULT_LANGUAGE,
      dateFormat: DEFAULT_DATE_FORMAT,
      timeFormat: getDefaultTimeFormatForLanguage(DEFAULT_LANGUAGE),
      weekStart: DEFAULT_WEEK_START,
      dayRolloverTime: DEFAULT_DAY_ROLLOVER_TIME,
      theme: DEFAULT_THEME,
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

  function addManualAdjustmentToDays(days, key, deltaMs, source = DEFAULT_MANUAL_ADJUSTMENT_SOURCE) {
    if (!isPlainObject(days)) {
      throw new TypeError("addManualAdjustmentToDays expects a days object.");
    }

    if (!DAY_KEY_PATTERN.test(key)) {
      return false;
    }

    const normalizedDeltaMs = Math.trunc(Number(deltaMs));
    if (!Number.isFinite(normalizedDeltaMs) || normalizedDeltaMs === 0) {
      return false;
    }

    const dayRecord = ensureDayRecord(days, key);
    if (!dayRecord) {
      return false;
    }

    dayRecord.entries.push({
      type: ENTRY_TYPE_MANUAL_ADJUSTMENT,
      deltaMs: normalizedDeltaMs,
      source: sanitizeEntrySource(source, DEFAULT_MANUAL_ADJUSTMENT_SOURCE),
    });

    return true;
  }

  function appendOrExtendIntervalToDayRecord(dayRecord, startMs, endMs, source) {
    const lastEntry = dayRecord.entries[dayRecord.entries.length - 1];
    if (
      isPlainObject(lastEntry) &&
      lastEntry.type === ENTRY_TYPE_INTERVAL &&
      sanitizeEntrySource(lastEntry.source, DEFAULT_INTERVAL_SOURCE) === source
    ) {
      const lastEndMs = Math.trunc(Number(lastEntry.endMs));
      if (Number.isFinite(lastEndMs) && lastEndMs >= startMs) {
        lastEntry.endMs = Math.max(lastEndMs, endMs);
        lastEntry.source = source;
        return;
      }
    }

    dayRecord.entries.push({
      type: ENTRY_TYPE_INTERVAL,
      startMs,
      endMs,
      source,
    });
  }

  function getBusinessDayBoundsForInstant(date, dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME) {
    const dayDate = getBusinessDayDateFromInstant(date, dayRolloverTime);
    const bounds = getBusinessDayBoundsForLabelDate(dayDate, dayRolloverTime);

    return {
      dayDate,
      dayKey: dateKey(dayDate),
      startMs: bounds.startMs,
      endMs: bounds.endMs,
    };
  }

  function addIntervalToDays(days, startMs, endMs, source = DEFAULT_INTERVAL_SOURCE, options = {}) {
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
    const dayRolloverTime = sanitizeDayRolloverTime(options.dayRolloverTime, DEFAULT_DAY_ROLLOVER_TIME);
    let cursorMs = normalizedStartMs;

    while (cursorMs < normalizedEndMs) {
      const currentDay = getBusinessDayBoundsForInstant(new Date(cursorMs), dayRolloverTime);
      const segmentEndMs = Math.min(normalizedEndMs, currentDay.endMs);
      const dayRecord = ensureDayRecord(days, currentDay.dayKey);

      if (dayRecord && segmentEndMs > cursorMs) {
        appendOrExtendIntervalToDayRecord(dayRecord, cursorMs, segmentEndMs, normalizedSource);
      }

      cursorMs = segmentEndMs;
    }

    return true;
  }

  function sumDayEntries(entries, options = {}) {
    const includeIntervals = options.includeIntervals !== false;
    const includeLegacyTotals = options.includeLegacyTotals !== false;
    const includeManualAdjustments = options.includeManualAdjustments !== false;

    if (!Array.isArray(entries)) {
      return 0;
    }

    let totalMs = 0;

    for (const entry of entries) {
      if (!isPlainObject(entry)) {
        continue;
      }

      if (entry.type === ENTRY_TYPE_INTERVAL) {
        if (includeIntervals) {
          totalMs += getIntervalDurationMs(entry);
        }
        continue;
      }

      if (entry.type === ENTRY_TYPE_LEGACY_TOTAL) {
        if (includeLegacyTotals) {
          totalMs += getLegacyTotalDurationMs(entry);
        }
        continue;
      }

      if (entry.type === ENTRY_TYPE_MANUAL_ADJUSTMENT && includeManualAdjustments) {
        totalMs += getManualAdjustmentDeltaMs(entry);
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

  function getDayBaseWorkMs(days, dayOrKey) {
    return sumDayEntries(getDayEntries(days, dayOrKey), {
      includeManualAdjustments: false,
    });
  }

  function getDayManualAdjustmentMs(days, dayOrKey) {
    return sumDayEntries(getDayEntries(days, dayOrKey), {
      includeIntervals: false,
      includeLegacyTotals: false,
    });
  }

  function getDayEffectiveWorkMs(days, dayOrKey) {
    const totalMs = getDayBaseWorkMs(days, dayOrKey) + getDayManualAdjustmentMs(days, dayOrKey);
    return Math.max(0, totalMs);
  }

  function getDayIntervalWorkMs(days, dayOrKey) {
    return sumDayEntries(getDayEntries(days, dayOrKey), {
      includeLegacyTotals: false,
      includeManualAdjustments: false,
    });
  }

  function getDayLegacyTotalMs(days, dayOrKey) {
    return sumDayEntries(getDayEntries(days, dayOrKey), {
      includeIntervals: false,
      includeManualAdjustments: false,
    });
  }

  function getDayIntervalCount(days, dayOrKey) {
    let count = 0;

    for (const entry of getDayEntries(days, dayOrKey)) {
      if (entry?.type === ENTRY_TYPE_INTERVAL && getIntervalDurationMs(entry) > 0) {
        count += 1;
      }
    }

    return count;
  }

  function getDayIntervalDurations(days, dayOrKey) {
    return getDayEntries(days, dayOrKey)
      .filter((entry) => entry?.type === ENTRY_TYPE_INTERVAL && getIntervalDurationMs(entry) > 0)
      .sort((first, second) => {
        const startDiff = Math.trunc(Number(first.startMs)) - Math.trunc(Number(second.startMs));
        if (startDiff !== 0) {
          return startDiff;
        }

        return Math.trunc(Number(first.endMs)) - Math.trunc(Number(second.endMs));
      })
      .map((entry) => getIntervalDurationMs(entry));
  }

  function getDisplayEntrySortRank(type) {
    if (type === ENTRY_TYPE_INTERVAL) {
      return 0;
    }

    if (type === ENTRY_TYPE_LEGACY_TOTAL) {
      return 1;
    }

    if (type === ENTRY_TYPE_MANUAL_ADJUSTMENT) {
      return 2;
    }

    return 99;
  }

  function getDisplayEntriesForDay(days, dayOrKey) {
    const displayEntries = [];

    for (const entry of getDayEntries(days, dayOrKey)) {
      if (!isPlainObject(entry)) {
        continue;
      }

      if (entry.type === ENTRY_TYPE_INTERVAL) {
        const durationMs = getIntervalDurationMs(entry);
        if (durationMs > 0) {
          displayEntries.push({
            type: ENTRY_TYPE_INTERVAL,
            source: sanitizeEntrySource(entry.source, DEFAULT_INTERVAL_SOURCE),
            startMs: Math.trunc(Number(entry.startMs)),
            endMs: Math.trunc(Number(entry.endMs)),
            durationMs,
          });
        }
        continue;
      }

      if (entry.type === ENTRY_TYPE_LEGACY_TOTAL) {
        const durationMs = getLegacyTotalDurationMs(entry);
        if (durationMs > 0) {
          displayEntries.push({
            type: ENTRY_TYPE_LEGACY_TOTAL,
            source: sanitizeEntrySource(entry.source, DEFAULT_LEGACY_SOURCE),
            durationMs,
          });
        }
        continue;
      }

      if (entry.type === ENTRY_TYPE_MANUAL_ADJUSTMENT) {
        const deltaMs = getManualAdjustmentDeltaMs(entry);
        if (deltaMs !== 0) {
          displayEntries.push({
            type: ENTRY_TYPE_MANUAL_ADJUSTMENT,
            source: sanitizeEntrySource(entry.source, DEFAULT_MANUAL_ADJUSTMENT_SOURCE),
            deltaMs,
            durationMs: Math.abs(deltaMs),
          });
        }
      }
    }

    displayEntries.sort((first, second) => {
      const rankDiff = getDisplayEntrySortRank(first.type) - getDisplayEntrySortRank(second.type);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      if (first.type === ENTRY_TYPE_INTERVAL && second.type === ENTRY_TYPE_INTERVAL) {
        const startDiff = first.startMs - second.startMs;
        if (startDiff !== 0) {
          return startDiff;
        }

        return first.endMs - second.endMs;
      }

      return 0;
    });

    return displayEntries;
  }

  function getDayWorkMs(days, dayOrKey) {
    return getDayEffectiveWorkMs(days, dayOrKey);
  }

  function getWorkMsForDate(days, date) {
    return getDayEffectiveWorkMs(days, date);
  }

  function setDayManualTotal(days, dayOrKey, desiredTotalMs, source = DEFAULT_MANUAL_ADJUSTMENT_SOURCE) {
    if (!isPlainObject(days)) {
      throw new TypeError("setDayManualTotal expects a days object.");
    }

    const key = typeof dayOrKey === "string" ? dayOrKey : dateKey(dayOrKey);
    if (!DAY_KEY_PATTERN.test(key)) {
      throw new TypeError("setDayManualTotal expects a valid day key.");
    }

    const normalizedDesiredTotalMs = Math.trunc(Number(desiredTotalMs));
    if (!Number.isFinite(normalizedDesiredTotalMs)) {
      throw new RangeError("setDayManualTotal expects a finite desired total.");
    }

    if (normalizedDesiredTotalMs < 0) {
      throw new RangeError("setDayManualTotal does not allow negative totals.");
    }

    const baseTotalMs = getDayBaseWorkMs(days, key);
    const manualAdjustmentMs = clampManualAdjustmentDelta(baseTotalMs, normalizedDesiredTotalMs - baseTotalMs);
    const currentEntries = getDayEntries(days, key);
    const previousManualEntries = currentEntries.filter(
      (entry) => entry?.type === ENTRY_TYPE_MANUAL_ADJUSTMENT && getManualAdjustmentDeltaMs(entry) !== 0,
    );
    const previousManualAdjustmentMs = getDayManualAdjustmentMs(days, key);
    const normalizedSource = sanitizeEntrySource(source, DEFAULT_MANUAL_ADJUSTMENT_SOURCE);
    const previousSource = previousManualEntries.length === 1
      ? sanitizeEntrySource(previousManualEntries[0].source, DEFAULT_MANUAL_ADJUSTMENT_SOURCE)
      : null;
    const changed = previousManualEntries.length !== (manualAdjustmentMs === 0 ? 0 : 1) ||
      previousManualAdjustmentMs !== manualAdjustmentMs ||
      (manualAdjustmentMs !== 0 && previousSource !== normalizedSource);

    const nextEntries = currentEntries.filter((entry) => entry?.type !== ENTRY_TYPE_MANUAL_ADJUSTMENT);

    if (nextEntries.length > 0 || manualAdjustmentMs !== 0) {
      const dayRecord = ensureDayRecord(days, key);
      dayRecord.entries = nextEntries;

      if (manualAdjustmentMs !== 0) {
        dayRecord.entries.push({
          type: ENTRY_TYPE_MANUAL_ADJUSTMENT,
          deltaMs: manualAdjustmentMs,
          source: normalizedSource,
        });
      }

      removeEmptyDayRecord(days, key);
    } else {
      delete days[key];
    }

    return {
      changed,
      baseTotalMs,
      effectiveTotalMs: getDayEffectiveWorkMs(days, key),
      manualAdjustmentMs,
    };
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

  function normalizeDayEntries(days, key, entries) {
    if (!DAY_KEY_PATTERN.test(key) || !Array.isArray(entries)) {
      return;
    }

    let manualAdjustmentMs = 0;
    let manualSource = DEFAULT_MANUAL_ADJUSTMENT_SOURCE;

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
        continue;
      }

      if (entry.type === ENTRY_TYPE_MANUAL_ADJUSTMENT) {
        const deltaMs = getManualAdjustmentDeltaMs(entry);
        if (deltaMs !== 0) {
          manualAdjustmentMs += deltaMs;
          manualSource = sanitizeEntrySource(entry.source, DEFAULT_MANUAL_ADJUSTMENT_SOURCE);
        }
      }
    }

    const normalizedManualAdjustmentMs = clampManualAdjustmentDelta(
      getDayBaseWorkMs(days, key),
      manualAdjustmentMs,
    );
    if (normalizedManualAdjustmentMs !== 0) {
      addManualAdjustmentToDays(days, key, normalizedManualAdjustmentMs, manualSource);
    }

    removeEmptyDayRecord(days, key);
  }

  function normalizeDays(value) {
    if (!isPlainObject(value)) {
      return {};
    }

    const days = {};

    for (const [key, dayRecord] of Object.entries(value)) {
      normalizeDayEntries(days, key, Array.isArray(dayRecord?.entries) ? dayRecord.entries : []);
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

  function addElapsedTimeToLogs(logs, startMs, endMs, options = {}) {
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

    const dayRolloverTime = sanitizeDayRolloverTime(options.dayRolloverTime, DEFAULT_DAY_ROLLOVER_TIME);
    let cursorMs = normalizedStartMs;

    while (cursorMs < normalizedEndMs) {
      const currentDay = getBusinessDayBoundsForInstant(new Date(cursorMs), dayRolloverTime);
      const segmentEndMs = Math.min(normalizedEndMs, currentDay.endMs);
      const record = ensureLogRecord(logs, currentDay.dayKey);

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
    dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME,
    isTimerRunning = false,
    storedWorkMs = 0,
  }) {
    const selectedTime = selectedDate?.getTime?.();
    const todayTime = todayDate?.getTime?.();

    if (!Number.isFinite(selectedTime) || !Number.isFinite(todayTime)) {
      throw new TypeError("getClearDayState expects valid selectedDate and todayDate values.");
    }

    const currentDay = startOfDay(getBusinessDayDateFromInstant(todayDate, dayRolloverTime));

    if (Boolean(isTimerRunning) && isSameDay(startOfDay(selectedDate), currentDay)) {
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
    dayRolloverTime = DEFAULT_DAY_ROLLOVER_TIME,
    isDayOff,
    getWorkMsForDate,
    maxLookbackDays = 4000,
  }) {
    if (typeof isDayOff !== "function" || typeof getWorkMsForDate !== "function") {
      throw new TypeError("calculateCurrentStreak expects isDayOff and getWorkMsForDate callbacks.");
    }

    const cursor = startOfDay(getBusinessDayDateFromInstant(nowDate, dayRolloverTime));
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
    DEFAULT_DAY_ROLLOVER_TIME,
    formatCompactWork,
    formatDayWord,
    formatDetailedWork,
    formatDuration,
    formatMonthTitle,
    formatSelectedDate,
    getBusinessDayBoundsForLabelDate,
    getBusinessDayDateFromInstant,
    getBusinessDayKeyFromInstant,
    getClearDayState,
    getDayBaseWorkMs,
    getDayEffectiveWorkMs,
    getDayEntries,
    getDayIntervalCount,
    getDayIntervalDurations,
    getDayIntervalWorkMs,
    getDayLegacyTotalMs,
    getDayManualAdjustmentMs,
    getDayWorkMs,
    getDisplayEntriesForDay,
    getWorkMsForDate,
    isSameDay,
    isSameMonth,
    normalizePersistedState,
    sanitizeBoolean,
    sanitizeBootstrapState,
    sanitizeDailyTargetHours,
    sanitizeDateFormat,
    sanitizeDayOverrides,
    sanitizeDayRolloverTime,
    sanitizeLogs,
    sanitizeSettings,
    sanitizeTheme,
    sanitizeTimerState,
    sanitizeTimeFormat,
    sanitizeWeekStart,
    sanitizeWeekendDays,
    setDayManualTotal,
    shouldForceWorkOverrideOnTimerStart,
    startOfDay,
    startOfMonth,
    sumDayEntries,
    getDefaultTimeFormatForLanguage,
    PERSISTED_STATE_VERSION,
  };
});
