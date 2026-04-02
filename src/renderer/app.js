const STORAGE_KEY = "minimal-worktime-tracker.v4";
const LEGACY_STORAGE_KEYS = [
  STORAGE_KEY,
  "minimal-worktime-tracker.v3",
  "minimal-worktime-tracker.v2",
  "minimal-worktime-tracker.v1",
];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = {
  0: "Вс",
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
};

const DEFAULT_DAILY_TARGET_HOURS = 6;
const MIN_DAILY_TARGET_HOURS = 1;
const MAX_DAILY_TARGET_HOURS = 24;
const DEFAULT_WEEKEND_DAYS = [0, 6];

const el = {
  timerDisplay: document.getElementById("timer-display"),
  timerPanel: document.getElementById("timer-panel"),
  statusBadge: document.getElementById("status-badge"),
  streakValue: document.getElementById("streak-value"),
  dailyTargetHours: document.getElementById("daily-target-hours"),
  weekendToggle: document.getElementById("weekend-toggle"),
  calendarTitle: document.getElementById("calendar-title"),
  calendarGrid: document.getElementById("calendar-grid"),
  prevMonth: document.getElementById("prev-month"),
  nextMonth: document.getElementById("next-month"),
  selectedDayLabel: document.getElementById("selected-day-label"),
  selectedDayMeta: document.getElementById("selected-day-meta"),
  toggleDayOff: document.getElementById("toggle-day-off"),
  clearDayOverride: document.getElementById("clear-day-override"),
  minimizeWindow: document.getElementById("window-minimize"),
  closeWindow: document.getElementById("window-close"),
  exportBackup: document.getElementById("export-backup"),
  importBackup: document.getElementById("import-backup"),
};

const trackerCore = window.trackerCore;

if (!trackerCore) {
  throw new Error("trackerCore helpers are not available.");
}

const loadedState = loadState();
let logs = loadedState.logs;
let settings = loadedState.settings;

const timerState = {
  isRunning: Boolean(loadedState.timerState?.isRunning),
  lastTickMs: null,
};

if (timerState.isRunning) {
  timerState.lastTickMs = Date.now();
}

const systemState = {
  isSuspended: false,
};

let calendarCursor = startOfMonth(new Date());
let selectedDate = startOfDay(new Date());
let saveTimeout = null;
const calendarCellRefs = new Map();

function createDefaultPersistedState() {
  return {
    logs: {},
    settings: {
      dailyTargetHours: DEFAULT_DAILY_TARGET_HOURS,
      weekendDays: DEFAULT_WEEKEND_DAYS.slice(),
      dayOverrides: {},
    },
    timerState: {
      isRunning: false,
    },
  };
}

function loadState() {
  const fallback = createDefaultPersistedState();

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);
      return trackerCore.normalizePersistedState(parsed, fallback);
    } catch {
      continue;
    }
  }

  return trackerCore.createPersistedState(fallback);
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(trackerCore.createPersistedState({
        logs,
        settings,
        timerState,
      })),
    );
    return true;
  } catch (error) {
    console.error("Unable to persist tracker state.", error);
    return false;
  }
}

function buildBackupPayload() {
  return trackerCore.createBackupPayload({
    logs,
    settings,
    timerState,
  });
}

function applyPersistedState(nextState) {
  logs = nextState.logs;
  settings = nextState.settings;
  timerState.isRunning = Boolean(nextState.timerState?.isRunning);
  timerState.lastTickMs = timerState.isRunning ? Date.now() : null;
  systemState.isSuspended = false;

  flushSave();
  syncTrayState();
  renderAll();
}


function scheduleSave() {
  if (saveTimeout) {
    return;
  }

  saveTimeout = setTimeout(() => {
    persistState();
    saveTimeout = null;
  }, 250);
}

function flushSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  return persistState();
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

function addElapsedTime(startMs, endMs) {
  if (trackerCore.addElapsedTimeToLogs(logs, startMs, endMs)) {
    scheduleSave();
  }
}

function flushTick(options = {}) {
  if (!timerState.isRunning || timerState.lastTickMs === null) {
    return;
  }

  if (systemState.isSuspended && options.allowWhileSuspended !== true) {
    return;
  }

  const now = Date.now();
  addElapsedTime(timerState.lastTickMs, now);
  timerState.lastTickMs = now;
}

function handleSystemPause() {
  if (systemState.isSuspended) {
    return;
  }

  flushTick({ allowWhileSuspended: true });
  flushSave();
  systemState.isSuspended = true;
  renderCore();
}

function handleSystemResume() {
  if (!systemState.isSuspended) {
    return;
  }

  systemState.isSuspended = false;

  if (timerState.isRunning) {
    timerState.lastTickMs = Date.now();
  }

  renderCore();
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

function getLiveWorkMs(date) {
  if (!timerState.isRunning || timerState.lastTickMs === null || systemState.isSuspended) {
    return 0;
  }

  const now = Date.now();
  const dayStart = startOfDay(date).getTime();
  const nextDayStart = dayStart + 24 * 60 * 60 * 1000;
  const overlapStart = Math.max(timerState.lastTickMs, dayStart);
  const overlapEnd = Math.min(now, nextDayStart);

  return Math.max(0, overlapEnd - overlapStart);
}

function getWorkMsForDate(date) {
  const key = dateKey(date);
  const stored = Number(logs[key]?.workMs) || 0;
  return stored + getLiveWorkMs(date);
}

function isRecurringWeekend(date) {
  return settings.weekendDays.includes(date.getDay());
}

function getDayOverride(date) {
  return settings.dayOverrides[dateKey(date)] || null;
}

function hasDayOverride(date) {
  return Object.prototype.hasOwnProperty.call(settings.dayOverrides, dateKey(date));
}

function isDayOff(date) {
  const override = getDayOverride(date);
  if (override === "off") {
    return true;
  }

  if (override === "work") {
    return false;
  }

  return isRecurringWeekend(date);
}

function setDateOverride(date, mode) {
  const key = dateKey(date);

  if (mode === null) {
    delete settings.dayOverrides[key];
    scheduleSave();
    return;
  }

  settings.dayOverrides[key] = mode;
  scheduleSave();
}

function toggleSelectedDateOff() {
  setDateOverride(selectedDate, isDayOff(selectedDate) ? "work" : "off");
  renderCore();
}

function clearSelectedDateOverride() {
  if (!hasDayOverride(selectedDate)) {
    return;
  }

  setDateOverride(selectedDate, null);
  renderCore();
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

function calculateCurrentStreak() {
  return trackerCore.calculateCurrentStreak({
    nowDate: new Date(),
    isDayOff,
    getWorkMsForDate,
  });
}

function buildSelectedMeta(date) {
  return formatDetailedWork(getWorkMsForDate(date));
}

function buildDayTooltip(date, workMs) {
  const parts = [formatSelectedDate(date), formatDetailedWork(workMs)];
  if (isDayOff(date)) {
    parts.push("выходной");
  }
  return parts.join(" · ");
}

function renderStatus() {
  el.statusBadge.textContent = timerState.isRunning ? "Ведётся учёт" : "Остановлено";
  el.statusBadge.className = timerState.isRunning ? "info-cell status-cell active" : "info-cell status-cell";
}

function renderStats() {
  const streak = calculateCurrentStreak();
  el.streakValue.textContent = `${streak} ${formatDayWord(streak)} подряд`;
}

function renderDailyTarget() {
  el.dailyTargetHours.value = String(settings.dailyTargetHours);
}

function updateDailyTargetHours(rawValue) {
  const next = trackerCore.sanitizeDailyTargetHours(
    rawValue,
    settings.dailyTargetHours,
    MIN_DAILY_TARGET_HOURS,
    MAX_DAILY_TARGET_HOURS,
  );

  settings.dailyTargetHours = next;
  scheduleSave();
  renderDailyTarget();
  refreshVisibleCalendar();
}
function renderTimer() {
  const todayMs = getWorkMsForDate(new Date());
  el.timerDisplay.textContent = formatDuration(todayMs);
  el.timerPanel.setAttribute("aria-pressed", String(timerState.isRunning));
}

function renderWeekendSettings() {
  el.weekendToggle.innerHTML = "";

  for (const day of DAY_ORDER) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "weekend-chip";
    button.textContent = DAY_LABELS[day];

    if (settings.weekendDays.includes(day)) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      const next = new Set(settings.weekendDays);
      if (next.has(day)) {
        next.delete(day);
      } else {
        if (next.size >= 6) {
          return;
        }
        next.add(day);
      }

      settings.weekendDays = Array.from(next).sort((first, second) => first - second);
      scheduleSave();
      renderWeekendSettings();
      refreshVisibleCalendar();
      renderSelectedDayPanel();
      renderStats();
    });

    el.weekendToggle.appendChild(button);
  }
}

function buildCalendarCell(date) {
  const key = dateKey(date);
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "calendar-cell";

  const fill = document.createElement("span");
  fill.className = "calendar-fill";

  const dateLabel = document.createElement("span");
  dateLabel.className = "calendar-date";
  dateLabel.textContent = String(date.getDate());

  const hours = document.createElement("span");
  hours.className = "calendar-hours";

  cell.append(fill, dateLabel, hours);
  cell.addEventListener("click", () => {
    selectedDate = startOfDay(date);
    refreshVisibleCalendar();
    renderSelectedDayPanel();
  });

  calendarCellRefs.set(key, { cell, fill, hours, date });
  el.calendarGrid.appendChild(cell);
}

function rebuildCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const dayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  el.calendarTitle.textContent = formatMonthTitle(calendarCursor);
  el.calendarGrid.innerHTML = "";
  calendarCellRefs.clear();

  for (let index = 0; index < dayOffset; index += 1) {
    const gap = document.createElement("div");
    gap.className = "calendar-gap";
    el.calendarGrid.appendChild(gap);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    buildCalendarCell(new Date(year, month, day));
  }

  const totalCells = dayOffset + daysInMonth;
  for (let index = totalCells; index < 42; index += 1) {
    const gap = document.createElement("div");
    gap.className = "calendar-gap";
    el.calendarGrid.appendChild(gap);
  }

  requestAnimationFrame(() => {
    refreshVisibleCalendar();
  });
}

function updateCalendarCell(refs) {
  const today = startOfDay(new Date());
  const workMs = getWorkMsForDate(refs.date);
  const workHours = workMs / 3_600_000;
  const progress = Math.min(100, (workHours / settings.dailyTargetHours) * 100);

  refs.cell.className = "calendar-cell";
  refs.cell.title = buildDayTooltip(refs.date, workMs);
  refs.fill.style.height = `${progress}%`;
  refs.hours.textContent = formatCompactWork(workMs);

  if (refs.date > today && workMs === 0) {
    refs.cell.classList.add("future");
  } else if (workMs > 0) {
    refs.cell.classList.add("worked");
  } else {
    refs.cell.classList.add("empty");
  }

  if (isDayOff(refs.date)) {
    refs.cell.classList.add("day-off");
  }

  if (isSameDay(refs.date, today)) {
    refs.cell.classList.add("today");
  }

  if (isSameDay(refs.date, selectedDate)) {
    refs.cell.classList.add("selected");
  }
}

function refreshVisibleCalendar() {
  for (const refs of calendarCellRefs.values()) {
    updateCalendarCell(refs);
  }
}

function renderSelectedDayPanel() {
  const dayOff = isDayOff(selectedDate);

  el.selectedDayLabel.textContent = formatSelectedDate(selectedDate);
  el.selectedDayMeta.textContent = buildSelectedMeta(selectedDate);
  el.toggleDayOff.textContent = "Выходной";
  el.toggleDayOff.classList.toggle("active", dayOff);
  el.toggleDayOff.setAttribute("aria-pressed", String(dayOff));
  el.clearDayOverride.hidden = !hasDayOverride(selectedDate);
}

function syncTrayState() {
  window.desktopAPI?.sendTimerState?.({
    isRunning: timerState.isRunning,
  });
}

function renderCore() {
  renderStatus();
  renderStats();
  renderTimer();
  refreshVisibleCalendar();
  renderSelectedDayPanel();
}

function renderAll() {
  renderWeekendSettings();
  renderDailyTarget();
  rebuildCalendar();
  renderCore();
}

function toggleRun() {
  if (timerState.isRunning) {
    flushTick();
    timerState.isRunning = false;
    timerState.lastTickMs = null;
  } else {
    timerState.isRunning = true;
    timerState.lastTickMs = Date.now();
  }

  flushSave();
  syncTrayState();
  renderCore();
}

el.timerPanel.addEventListener("click", toggleRun);
el.timerPanel.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  toggleRun();
});

el.toggleDayOff.addEventListener("click", toggleSelectedDateOff);
el.clearDayOverride.addEventListener("click", clearSelectedDateOverride);
el.dailyTargetHours.addEventListener("change", () => {
  updateDailyTargetHours(el.dailyTargetHours.value);
});

el.prevMonth.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  if (!isSameMonth(selectedDate, calendarCursor)) {
    selectedDate = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  }
  rebuildCalendar();
  renderSelectedDayPanel();
});

el.nextMonth.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  if (!isSameMonth(selectedDate, calendarCursor)) {
    selectedDate = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  }
  rebuildCalendar();
  renderSelectedDayPanel();
});

el.minimizeWindow.addEventListener("click", () => {
  window.desktopAPI?.minimizeWindow?.();
});

el.closeWindow.addEventListener("click", () => {
  window.desktopAPI?.closeWindow?.();
});

el.exportBackup.addEventListener("click", async () => {
  el.exportBackup.disabled = true;

  try {
    flushTick();
    flushSave();

    const exportBackup = window.desktopAPI?.exportBackup;
    if (typeof exportBackup !== "function") {
      throw new Error("exportBackup API is not available.");
    }

    await exportBackup(buildBackupPayload());
  } catch (error) {
    console.error("Unable to export backup.", error);
    window.alert("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0431\u044d\u043a\u0430\u043f.");
  } finally {
    el.exportBackup.disabled = false;
  }
});

el.importBackup.addEventListener("click", async () => {
  el.importBackup.disabled = true;

  try {
    const importBackup = window.desktopAPI?.importBackup;
    if (typeof importBackup !== "function") {
      throw new Error("importBackup API is not available.");
    }

    const result = await importBackup();
    if (!result || result.canceled) {
      return;
    }

    if (!window.confirm("\u0418\u043c\u043f\u043e\u0440\u0442 \u0437\u0430\u043c\u0435\u043d\u0438\u0442 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c?")) {
      return;
    }

    const nextState = trackerCore.normalizePersistedState(result.snapshot, createDefaultPersistedState());
    applyPersistedState(nextState);
    window.alert("\u0411\u044d\u043a\u0430\u043f \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d.");
  } catch (error) {
    console.error("Unable to import backup.", error);
    window.alert("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0431\u044d\u043a\u0430\u043f.");
  } finally {
    el.importBackup.disabled = false;
  }
});

window.desktopAPI?.onTrayCommand?.((command) => {
  if (command === "toggle-run") {
    toggleRun();
  }
});

window.desktopAPI?.onSystemState?.((state) => {
  if (state === "pause") {
    handleSystemPause();
    return;
  }

  if (state === "resume") {
    handleSystemResume();
  }
});

window.addEventListener("beforeunload", () => {
  flushTick();
  flushSave();
});

setInterval(() => {
  if (!timerState.isRunning || systemState.isSuspended) {
    return;
  }

  flushTick();
  renderCore();
  syncTrayState();
}, 1000);

renderAll();
syncTrayState();




