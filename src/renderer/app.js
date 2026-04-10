const DEFAULT_WEEK_START = "monday";
const DEFAULT_LANGUAGE = "ru";
const DEFAULT_DATE_FORMAT = "localized";
const DATE_FORMAT_LABELS = {
  ru: {
    label: "\u0424\u043e\u0440\u043c\u0430\u0442 \u0434\u0430\u0442\u044b",
    localized: "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u043e",
    dmy: "\u0414\u0414.\u041c\u041c.\u0413\u0413\u0413\u0413",
    mdy: "\u041c\u041c/\u0414\u0414/\u0413\u0413\u0413\u0413",
  },
  en: {
    label: "Date format",
    localized: "Localized",
    dmy: "DD.MM.YYYY",
    mdy: "MM/DD/YYYY",
  },
};
const LANGUAGE_PACKS = {
  ru: {
    locale: "ru-RU",
    dayLabels: {
      0: "\u0412\u0441",
      1: "\u041f\u043d",
      2: "\u0412\u0442",
      3: "\u0421\u0440",
      4: "\u0427\u0442",
      5: "\u041f\u0442",
      6: "\u0421\u0431",
    },
    statusRunning: "\u0412\u0435\u0434\u0451\u0442\u0441\u044f \u0443\u0447\u0451\u0442",
    statusStopped: "\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
    streakSuffix: "\u043f\u043e\u0434\u0440\u044f\u0434",
    targetLabel: "\u0426\u0435\u043b\u044c",
    targetUnit: "\u0447",
    dailyTargetAria: "\u0414\u043d\u0435\u0432\u043d\u0430\u044f \u043d\u043e\u0440\u043c\u0430 \u0432 \u0447\u0430\u0441\u0430\u0445",
    timerPanelLabel: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0438\u043b\u0438 \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0442\u0430\u0439\u043c\u0435\u0440",
    prevMonthLabel: "\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u043c\u0435\u0441\u044f\u0446",
    nextMonthLabel: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043c\u0435\u0441\u044f\u0446",
    weekendLabel: "\u0420\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u0432\u044b\u0445\u043e\u0434\u043d\u044b\u0435",
    selectedDayOff: "\u0412\u044b\u0445\u043e\u0434\u043d\u043e\u0439",
    importBackup: "\u0418\u043c\u043f\u043e\u0440\u0442",
    exportBackup: "\u042d\u043a\u0441\u043f\u043e\u0440\u0442",
    exportFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0431\u044d\u043a\u0430\u043f.",
    importConfirm: "\u0418\u043c\u043f\u043e\u0440\u0442 \u0437\u0430\u043c\u0435\u043d\u0438\u0442 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c?",
    importSuccess: "\u0411\u044d\u043a\u0430\u043f \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d.",
    importFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0431\u044d\u043a\u0430\u043f.",
    settingsTitle: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
    settingsOpenLabel: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
    settingsCloseLabel: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
    languageLabel: "\u042f\u0437\u044b\u043a",
    languageRu: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
    languageEn: "English",
    minimizeLabel: "\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c",
    closeLabel: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    dayOffLabel: "\u0432\u044b\u0445\u043e\u0434\u043d\u043e\u0439",
    formatDayWord(value) {
      if (value === 1) {
        return "\u0434\u0435\u043d\u044c";
      }

      if (value >= 2 && value <= 4) {
        return "\u0434\u043d\u044f";
      }

      return "\u0434\u043d\u0435\u0439";
    },
    formatCompactWork(totalMs) {
      if (totalMs <= 0) {
        return "";
      }

      const totalMinutes = Math.floor(totalMs / 60_000);
      if (totalMinutes <= 0) {
        return "<1\u043c";
      }

      if (totalMinutes < 60) {
        return `${totalMinutes}\u043c`;
      }

      const hours = totalMs / 3_600_000;
      return `${formatDecimalHours(hours)}\u0447`;
    },
    formatDetailedWork(totalMs) {
      if (totalMs <= 0) {
        return "0 \u043c\u0438\u043d";
      }

      const totalMinutes = Math.floor(totalMs / 60_000);
      if (totalMinutes <= 0) {
        return "<1 \u043c\u0438\u043d";
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours <= 0) {
        return `${totalMinutes} \u043c\u0438\u043d`;
      }

      if (minutes === 0) {
        return `${hours} \u0447`;
      }

      return `${hours} \u0447 ${minutes} \u043c\u0438\u043d`;
    },
    formatMonthTitle(date) {
      const title = date.toLocaleString("ru-RU", {
        month: "long",
        year: "numeric",
      });

      return title.charAt(0).toUpperCase() + title.slice(1);
    },
    formatSelectedDate(date) {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
    },
    formatStreak(value) {
      return `${value} ${this.formatDayWord(value)} ${this.streakSuffix}`;
    },
  },
  en: {
    locale: "en-US",
    dayLabels: {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
    },
    statusRunning: "Tracking",
    statusStopped: "Stopped",
    streakSuffix: "streak",
    targetLabel: "Target",
    targetUnit: "h",
    dailyTargetAria: "Daily target hours",
    timerPanelLabel: "Start or stop the timer",
    prevMonthLabel: "Previous month",
    nextMonthLabel: "Next month",
    weekendLabel: "Regular weekends",
    selectedDayOff: "Day off",
    importBackup: "Import",
    exportBackup: "Export",
    exportFailed: "Unable to export backup.",
    importConfirm: "Import will replace the current data. Continue?",
    importSuccess: "Backup restored.",
    importFailed: "Unable to restore backup.",
    settingsTitle: "Settings",
    settingsOpenLabel: "Settings",
    settingsCloseLabel: "Close settings",
    languageLabel: "Language",
    languageRu: "Russian",
    languageEn: "English",
    minimizeLabel: "Minimize",
    closeLabel: "Close",
    dayOffLabel: "day off",
    formatDayWord(value) {
      return value === 1 ? "day" : "days";
    },
    formatCompactWork(totalMs) {
      if (totalMs <= 0) {
        return "";
      }

      const totalMinutes = Math.floor(totalMs / 60_000);
      if (totalMinutes <= 0) {
        return "<1m";
      }

      if (totalMinutes < 60) {
        return `${totalMinutes}m`;
      }

      const hours = totalMs / 3_600_000;
      return `${formatDecimalHours(hours)}h`;
    },
    formatDetailedWork(totalMs) {
      if (totalMs <= 0) {
        return "0 min";
      }

      const totalMinutes = Math.floor(totalMs / 60_000);
      if (totalMinutes <= 0) {
        return "<1 min";
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours <= 0) {
        return `${totalMinutes} min`;
      }

      if (minutes === 0) {
        return `${hours} h`;
      }

      return `${hours} h ${minutes} min`;
    },
    formatMonthTitle(date) {
      return date.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });
    },
    formatSelectedDate(date) {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
      });
    },
    formatStreak(value) {
      return `${value} ${this.formatDayWord(value)} ${this.streakSuffix}`;
    },
  },
};

LANGUAGE_PACKS.ru.selectedDayWork = "\u0420\u0430\u0431\u043e\u0447\u0438\u0439";
LANGUAGE_PACKS.ru.weekStartLabel = "\u041d\u0430\u0447\u0430\u043b\u043e \u043d\u0435\u0434\u0435\u043b\u0438";
LANGUAGE_PACKS.ru.weekStartMonday = "\u041f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a";
LANGUAGE_PACKS.ru.weekStartSunday = "\u0412\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435";
LANGUAGE_PACKS.ru.autostartLabel = "\u0410\u0432\u0442\u043e\u0437\u0430\u043f\u0443\u0441\u043a";
LANGUAGE_PACKS.ru.autoBackupLabel = "\u0410\u0432\u0442\u043e\u0431\u044d\u043a\u0430\u043f";
LANGUAGE_PACKS.ru.enabledLabel = "\u0412\u043a\u043b.";
LANGUAGE_PACKS.ru.disabledLabel = "\u0412\u044b\u043a\u043b.";
LANGUAGE_PACKS.ru.dataLabel = "\u0414\u0430\u043d\u043d\u044b\u0435";
LANGUAGE_PACKS.ru.clearDataLabel = "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435";
LANGUAGE_PACKS.ru.clearDataConfirm = "\u042d\u0442\u043e \u0443\u0434\u0430\u043b\u0438\u0442 \u0432\u0441\u0451 \u0437\u0430\u043f\u0438\u0441\u0430\u043d\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f, \u0441\u0435\u0440\u0438\u044e, \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438 \u0430\u0432\u0442\u043e\u0431\u044d\u043a\u0430\u043f\u044b.";
LANGUAGE_PACKS.ru.clearDataConfirmLabel = "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0435\u0449\u0451 \u0440\u0430\u0437";
LANGUAGE_PACKS.ru.clearDataSuccess = "\u0414\u0430\u043d\u043d\u044b\u0435 \u043e\u0447\u0438\u0449\u0435\u043d\u044b.";
LANGUAGE_PACKS.ru.clearDataFailed = "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435.";
LANGUAGE_PACKS.ru.autostartFailed = "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0430\u0432\u0442\u043e\u0437\u0430\u043f\u0443\u0441\u043a.";
LANGUAGE_PACKS.ru.cancelLabel = "\u041e\u0442\u043c\u0435\u043d\u0430";
LANGUAGE_PACKS.en.selectedDayWork = "Workday";
LANGUAGE_PACKS.en.weekStartLabel = "Week start";
LANGUAGE_PACKS.en.weekStartMonday = "Monday";
LANGUAGE_PACKS.en.weekStartSunday = "Sunday";
LANGUAGE_PACKS.en.autostartLabel = "Autostart";
LANGUAGE_PACKS.en.autoBackupLabel = "Auto backup";
LANGUAGE_PACKS.en.enabledLabel = "On";
LANGUAGE_PACKS.en.disabledLabel = "Off";
LANGUAGE_PACKS.en.dataLabel = "Data";
LANGUAGE_PACKS.en.clearDataLabel = "Clear data";
LANGUAGE_PACKS.en.clearDataConfirm = "This will remove all tracked time, streaks, settings, and automatic backups.";
LANGUAGE_PACKS.en.clearDataConfirmLabel = "Clear again";
LANGUAGE_PACKS.en.clearDataSuccess = "Data cleared.";
LANGUAGE_PACKS.en.clearDataFailed = "Unable to clear saved data.";
LANGUAGE_PACKS.en.autostartFailed = "Unable to change autostart.";
LANGUAGE_PACKS.en.cancelLabel = "Cancel";
LANGUAGE_PACKS.ru.clearDayLabel = "Очистить день";
LANGUAGE_PACKS.ru.clearDayConfirmTitle = "Очистить день";
LANGUAGE_PACKS.ru.clearDayConfirmMessage = "Будет очищено только учтённое время выбранного дня. Статус дня не изменится.";
LANGUAGE_PACKS.ru.clearDayConfirmAction = "Очистить";
LANGUAGE_PACKS.ru.clearDayBlockedRunning = "Остановите таймер перед очисткой сегодняшнего дня.";
LANGUAGE_PACKS.ru.clearDaySuccess = "Время выбранного дня очищено.";
LANGUAGE_PACKS.en.clearDayLabel = "Clear day";
LANGUAGE_PACKS.en.clearDayConfirmTitle = "Clear day";
LANGUAGE_PACKS.en.clearDayConfirmMessage = "Only the tracked time for the selected day will be cleared. The day status will stay the same.";
LANGUAGE_PACKS.en.clearDayConfirmAction = "Clear";
LANGUAGE_PACKS.en.clearDayBlockedRunning = "Stop the timer before clearing today.";
LANGUAGE_PACKS.en.clearDaySuccess = "Selected day time cleared.";

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
  targetLabel: document.querySelector(".target-label"),
  targetUnit: document.querySelector(".target-unit"),
  weekendToggle: document.getElementById("weekend-toggle"),
  calendarTitle: document.getElementById("calendar-title"),
  calendarGrid: document.getElementById("calendar-grid"),
  prevMonth: document.getElementById("prev-month"),
  nextMonth: document.getElementById("next-month"),
  selectedDayLabel: document.getElementById("selected-day-label"),
  selectedDayMeta: document.getElementById("selected-day-meta"),
  toggleDayOff: document.getElementById("toggle-day-off"),
  clearDay: document.getElementById("clear-day"),
  minimizeWindow: document.getElementById("window-minimize"),
  closeWindow: document.getElementById("window-close"),
  settingsButton: document.getElementById("window-settings"),
  settingsOverlay: document.getElementById("settings-overlay"),
  settingsBackdrop: document.getElementById("settings-backdrop"),
  settingsClose: document.getElementById("settings-close"),
  settingsTitle: document.getElementById("settings-title"),
  settingsLanguageLabel: document.getElementById("settings-language-label"),
  settingsLanguageRu: document.getElementById("settings-language-ru"),
  settingsLanguageEn: document.getElementById("settings-language-en"),
  settingsDateFormatLabel: document.getElementById("settings-date-format-label"),
  settingsDateFormatLocalized: document.getElementById("settings-date-format-localized"),
  settingsDateFormatDmy: document.getElementById("settings-date-format-dmy"),
  settingsDateFormatMdy: document.getElementById("settings-date-format-mdy"),
  settingsWeekStartLabel: document.getElementById("settings-week-start-label"),
  settingsWeekStartMonday: document.getElementById("settings-week-start-monday"),
  settingsWeekStartSunday: document.getElementById("settings-week-start-sunday"),
  settingsAutostartLabel: document.getElementById("settings-autostart-label"),
  settingsAutostartOff: document.getElementById("settings-autostart-off"),
  settingsAutostartOn: document.getElementById("settings-autostart-on"),
  settingsAutoBackupLabel: document.getElementById("settings-auto-backup-label"),
  settingsAutoBackupOff: document.getElementById("settings-auto-backup-off"),
  settingsAutoBackupOn: document.getElementById("settings-auto-backup-on"),
  settingsDataLabel: document.getElementById("settings-data-label"),
  settingsClearData: document.getElementById("settings-clear-data"),
  exportBackup: document.getElementById("export-backup"),
  appToast: document.getElementById("app-toast"),
  importBackup: document.getElementById("import-backup"),
  confirmOverlay: document.getElementById("confirm-overlay"),
  confirmBackdrop: document.getElementById("confirm-backdrop"),
  confirmClose: document.getElementById("confirm-close"),
  confirmTitle: document.getElementById("confirm-title"),
  confirmMessage: document.getElementById("confirm-message"),
  confirmCancel: document.getElementById("confirm-cancel"),
  confirmAccept: document.getElementById("confirm-accept"),
};

const trackerCore = window.trackerCore;
const trackerStorage = window.trackerStorage;
const trackerTimer = window.trackerTimer;

if (!trackerCore) {
  throw new Error("trackerCore helpers are not available.");
}

if (!trackerStorage) {
  throw new Error("trackerStorage helpers are not available.");
}

if (!trackerTimer) {
  throw new Error("trackerTimer helpers are not available.");
}

const initialPersistedState = loadState();
const loadedState = trackerCore.createRuntimeState(initialPersistedState, {
  autostart: initialPersistedState.settings?.autostart,
  launchedAtLogin: false,
});
let days = loadedState.days;
let settings = loadedState.settings;
const timerState = trackerTimer.createTimerRuntime(loadedState.timerState);

let calendarCursor = startOfMonth(new Date());
let selectedDate = startOfDay(new Date());
let saveTimeout = null;
let lastAutoBackupDateKey = null;
let pendingAutoBackupPromise = null;
let clearDataArmed = false;
let clearDataArmTimeout = null;
let toastTimeout = null;
let isAutostartSyncPending = false;
let confirmDialogState = null;
let pendingConfirmResolve = null;
let confirmDialogReturnFocus = null;
const calendarCellRefs = new Map();

function createDefaultPersistedState() {
  return trackerStorage.createDefaultPersistedState();
}

function loadState() {
  return trackerStorage.loadPersistedState();
}

function persistState() {
  try {
    trackerStorage.savePersistedState({
      days,
      settings,
      timerState: {
        isRunning: timerState.isRunning,
      },
    });
    maybeCreateAutoBackup();
    return true;
  } catch (error) {
    console.error("Unable to persist tracker state.", error);
    return false;
  }
}

function cancelScheduledSave() {
  if (!saveTimeout) {
    return;
  }

  clearTimeout(saveTimeout);
  saveTimeout = null;
}

function clearAppToast() {
  if (!el.appToast) {
    return;
  }

  el.appToast.hidden = true;
  el.appToast.textContent = "";
  el.appToast.dataset.kind = "info";
}

function showAppToast(message, kind = "info", timeoutMs = 3500) {
  if (!el.appToast) {
    return;
  }

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  el.appToast.dataset.kind = kind;
  el.appToast.textContent = message;
  el.appToast.hidden = false;

  if (timeoutMs > 0) {
    toastTimeout = setTimeout(() => {
      clearAppToast();
      toastTimeout = null;
    }, timeoutMs);
  }
}

function removePersistedStateKeys() {
  trackerStorage.removePersistedStateKeys();
}

function renderConfirmDialog() {
  if (!confirmDialogState) {
    el.confirmTitle.textContent = "";
    el.confirmMessage.textContent = "";
    el.confirmCancel.textContent = "";
    el.confirmAccept.textContent = "";
    return;
  }

  el.confirmTitle.textContent = confirmDialogState.title;
  el.confirmMessage.textContent = confirmDialogState.message;
  el.confirmCancel.textContent = confirmDialogState.cancelLabel;
  el.confirmAccept.textContent = confirmDialogState.confirmLabel;
  el.confirmClose.setAttribute("aria-label", confirmDialogState.cancelLabel);
  el.confirmBackdrop.setAttribute("aria-label", confirmDialogState.cancelLabel);
}

function closeConfirmDialog(confirmed = false) {
  if (el.confirmOverlay.hidden && !confirmDialogState && !pendingConfirmResolve) {
    return;
  }

  const resolve = pendingConfirmResolve;
  const returnFocusTarget = confirmDialogReturnFocus;

  pendingConfirmResolve = null;
  confirmDialogReturnFocus = null;
  confirmDialogState = null;
  el.confirmOverlay.hidden = true;
  renderConfirmDialog();

  if (resolve) {
    resolve(confirmed);
  }

  if (returnFocusTarget && typeof returnFocusTarget.focus === "function" && !returnFocusTarget.disabled) {
    returnFocusTarget.focus();
  }
}

function requestConfirmDialog(options) {
  if (pendingConfirmResolve) {
    closeConfirmDialog(false);
  }

  confirmDialogState = {
    title: String(options?.title ?? ""),
    message: String(options?.message ?? ""),
    cancelLabel: String(options?.cancelLabel ?? getUiText().cancelLabel),
    confirmLabel: String(options?.confirmLabel ?? ""),
  };
  confirmDialogReturnFocus = options?.returnFocusTarget ?? null;
  el.confirmOverlay.hidden = false;
  renderConfirmDialog();

  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
    el.confirmCancel.focus();
  });
}

function maybeCreateAutoBackup() {
  if (!settings.autoBackup) {
    return;
  }

  const todayKey = dateKey(new Date());
  if (lastAutoBackupDateKey === todayKey) {
    return;
  }

  const autoBackup = window.desktopAPI?.autoBackup;
  if (typeof autoBackup !== "function") {
    return;
  }

  lastAutoBackupDateKey = todayKey;
  const backupPromise = autoBackup(buildBackupPayload());
  pendingAutoBackupPromise = backupPromise;

  void backupPromise
    .catch((error) => {
      lastAutoBackupDateKey = null;
      console.error("Unable to create automatic backup.", error);
    })
    .finally(() => {
      if (pendingAutoBackupPromise === backupPromise) {
        pendingAutoBackupPromise = null;
      }
    });
}


function buildBackupPayload() {
  return trackerStorage.createBackupSnapshot({
    days,
    settings,
    timerState: {
      isRunning: timerState.isRunning,
    },
  });
}

function syncTrayState() {
  window.desktopAPI?.sendTimerState?.({
    isRunning: timerState.isRunning,
  });
}

async function getBootstrapState() {
  const fallbackBootstrapState = {
    autostart: settings.autostart,
    launchedAtLogin: false,
  };
  const desktopBootstrapState = window.desktopAPI?.getBootstrapState;

  if (typeof desktopBootstrapState !== "function") {
    return fallbackBootstrapState;
  }

  const bootstrapState = await desktopBootstrapState();
  return trackerCore.sanitizeBootstrapState(bootstrapState, fallbackBootstrapState);
}

async function reconcileAutostartWithSystem(persist = false) {
  const bootstrapState = await getBootstrapState();
  settings.autostart = bootstrapState.autostart;

  if (persist) {
    scheduleSave();
  }
}

function applyPersistedState(nextState, bootstrapState = null) {
  const runtimeState = trackerCore.createRuntimeState(
    nextState,
    bootstrapState ?? {
      autostart: nextState?.settings?.autostart,
      launchedAtLogin: false,
    },
  );

  days = runtimeState.days;
  settings = runtimeState.settings;
  trackerTimer.applyPersistedTimerState(timerState, runtimeState.timerState);

  flushSave();
  syncTrayState();
  renderAll();
  syncSettingsState();
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

function getWeekStartIndex() {
  return settings.weekStart === "sunday" ? 0 : 1;
}

function getWeekdayOrder() {
  const start = getWeekStartIndex();
  return Array.from({ length: 7 }, (_, index) => (start + index) % 7);
}

function flushTick(options = {}) {
  if (trackerTimer.flushTimer(timerState, days, {
    allowWhileSuspended: options.allowWhileSuspended,
    nowMs: options.nowMs,
    source: "timer",
  })) {
    scheduleSave();
  }
}

function handleSystemPause() {
  if (timerState.isSuspended) {
    return;
  }

  trackerTimer.handleSystemPause(timerState, days, {
    source: "timer",
  });
  flushSave();
  renderCore();
}

function handleSystemResume() {
  if (!trackerTimer.handleSystemResume(timerState)) {
    return;
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
  return getUiText().formatCompactWork(totalMs);
}

function formatDetailedWork(totalMs) {
  return getUiText().formatDetailedWork(totalMs);
}

function formatDateNumber(date, separator) {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}${separator}${month}${separator}${year}`;
}

function formatMonthNumber(date, separator) {
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${month}${separator}${year}`;
}

function getUiText() {
  return LANGUAGE_PACKS[settings.language] ?? LANGUAGE_PACKS[DEFAULT_LANGUAGE];
}

function getLiveWorkMs(date) {
  return trackerTimer.getLiveWorkMs(timerState, date);
}

function getStoredWorkMsForDate(date) {
  return trackerCore.getWorkMsForDate(days, date);
}

function getWorkMsForDate(date) {
  return getStoredWorkMsForDate(date) + getLiveWorkMs(date);
}

function isRecurringWeekend(date) {
  return settings.weekendDays.includes(date.getDay());
}

function getDayOverride(date) {
  return settings.dayOverrides[dateKey(date)] || null;
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

function getClearDayState(date = selectedDate) {
  return trackerCore.getClearDayState({
    selectedDate: date,
    todayDate: new Date(),
    isTimerRunning: timerState.isRunning,
    storedWorkMs: getWorkMsForDate(date),
  });
}

async function clearSelectedDayWork() {
  const ui = getUiText();
  const targetDate = startOfDay(selectedDate);
  const initialState = getClearDayState(targetDate);

  if (!initialState.canClear) {
    if (initialState.reason === "running-today") {
      showAppToast(ui.clearDayBlockedRunning, "warning");
    }
    return;
  }

  const confirmed = await requestConfirmDialog({
    title: ui.clearDayConfirmTitle,
    message: ui.clearDayConfirmMessage,
    confirmLabel: ui.clearDayConfirmAction,
    returnFocusTarget: el.clearDay,
  });

  if (!confirmed) {
    return;
  }

  const finalState = getClearDayState(targetDate);
  if (!finalState.canClear) {
    if (finalState.reason === "running-today") {
      showAppToast(ui.clearDayBlockedRunning, "warning");
    }
    renderCore();
    return;
  }

  if (timerState.isRunning && getLiveWorkMs(targetDate) > 0 && !isSameDay(targetDate, startOfDay(new Date()))) {
    flushTick();
  }

  if (!trackerCore.clearDayEntries(days, dateKey(targetDate))) {
    renderCore();
    return;
  }

  flushSave();
  renderCore();
  showAppToast(ui.clearDaySuccess, "success");
}

function formatDayWord(value) {
  return getUiText().formatDayWord(value);
}

function formatMonthTitle(date) {
  const ui = getUiText();

  if (settings.dateFormat === "dmy") {
    return formatMonthNumber(date, ".");
  }

  if (settings.dateFormat === "mdy") {
    return formatMonthNumber(date, "/");
  }

  return ui.formatMonthTitle(date);
}

function formatSelectedDate(date) {
  const ui = getUiText();

  if (settings.dateFormat === "dmy") {
    return formatDateNumber(date, ".");
  }

  if (settings.dateFormat === "mdy") {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  }

  return ui.formatSelectedDate(date);
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
  const ui = getUiText();
  const parts = [formatSelectedDate(date), formatDetailedWork(workMs)];
  if (isDayOff(date)) {
    parts.push(ui.dayOffLabel);
  }
  return parts.join(" · ");
}

function renderStaticText() {
  const ui = getUiText();
  const dateLabels = DATE_FORMAT_LABELS[settings.language] ?? DATE_FORMAT_LABELS.ru;
  document.documentElement.lang = settings.language === "en" ? "en" : "ru";
  el.targetLabel.textContent = ui.targetLabel;
  el.targetUnit.textContent = ui.targetUnit;
  el.dailyTargetHours.setAttribute("aria-label", ui.dailyTargetAria);
  el.timerPanel.setAttribute("aria-label", ui.timerPanelLabel);
  el.prevMonth.setAttribute("aria-label", ui.prevMonthLabel);
  el.nextMonth.setAttribute("aria-label", ui.nextMonthLabel);
  el.weekendToggle.setAttribute("aria-label", ui.weekendLabel);
  el.settingsButton.setAttribute("aria-label", ui.settingsOpenLabel);
  el.minimizeWindow.setAttribute("aria-label", ui.minimizeLabel);
  el.closeWindow.setAttribute("aria-label", ui.closeLabel);
  el.settingsClose.setAttribute("aria-label", ui.settingsCloseLabel);
  el.settingsBackdrop.setAttribute("aria-label", ui.settingsCloseLabel);
  el.settingsTitle.textContent = ui.settingsTitle;
  el.settingsLanguageLabel.textContent = ui.languageLabel;
  el.settingsLanguageRu.textContent = ui.languageRu;
  el.settingsLanguageEn.textContent = ui.languageEn;
  el.settingsDateFormatLabel.textContent = dateLabels.label;
  el.settingsDateFormatLocalized.textContent = dateLabels.localized;
  el.settingsDateFormatDmy.textContent = dateLabels.dmy;
  el.settingsDateFormatMdy.textContent = dateLabels.mdy;
  el.settingsWeekStartLabel.textContent = ui.weekStartLabel;
  el.settingsWeekStartMonday.textContent = ui.weekStartMonday;
  el.settingsWeekStartSunday.textContent = ui.weekStartSunday;
  el.settingsAutostartLabel.textContent = ui.autostartLabel;
  el.settingsAutostartOff.textContent = ui.disabledLabel;
  el.settingsAutostartOn.textContent = ui.enabledLabel;
  el.settingsAutoBackupLabel.textContent = ui.autoBackupLabel;
  el.settingsAutoBackupOff.textContent = ui.disabledLabel;
  el.settingsAutoBackupOn.textContent = ui.enabledLabel;
  el.settingsDataLabel.textContent = ui.dataLabel;
  el.settingsClearData.textContent = ui.clearDataLabel;
  el.importBackup.textContent = ui.importBackup;
  el.exportBackup.textContent = ui.exportBackup;
}

function renderStatus() {

  const ui = getUiText();
  el.statusBadge.textContent = timerState.isRunning ? ui.statusRunning : ui.statusStopped;
  el.statusBadge.className = timerState.isRunning ? "info-cell status-cell active" : "info-cell status-cell";
}

function renderStats() {
  const ui = getUiText();
  const streak = calculateCurrentStreak();
  el.streakValue.textContent = ui.formatStreak(streak);
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
  const ui = getUiText();
  el.weekendToggle.innerHTML = "";

  for (const day of getWeekdayOrder()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "weekend-chip";
    button.textContent = ui.dayLabels[day];

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

function renderSettingsPanel() {
  const ui = getUiText();
  const isEnglish = settings.language === "en";
  el.settingsLanguageRu.classList.toggle("active", !isEnglish);
  el.settingsLanguageEn.classList.toggle("active", isEnglish);
  el.settingsLanguageRu.setAttribute("aria-pressed", String(!isEnglish));
  el.settingsLanguageEn.setAttribute("aria-pressed", String(isEnglish));

  const dateFormat = settings.dateFormat === "dmy" || settings.dateFormat === "mdy"
    ? settings.dateFormat
    : "localized";
  el.settingsDateFormatLocalized.classList.toggle("active", dateFormat === "localized");
  el.settingsDateFormatDmy.classList.toggle("active", dateFormat === "dmy");
  el.settingsDateFormatMdy.classList.toggle("active", dateFormat === "mdy");
  el.settingsDateFormatLocalized.setAttribute("aria-pressed", String(dateFormat === "localized"));
  el.settingsDateFormatDmy.setAttribute("aria-pressed", String(dateFormat === "dmy"));
  el.settingsDateFormatMdy.setAttribute("aria-pressed", String(dateFormat === "mdy"));

  const weekStart = settings.weekStart === "sunday" ? "sunday" : "monday";
  el.settingsWeekStartMonday.classList.toggle("active", weekStart === "monday");
  el.settingsWeekStartSunday.classList.toggle("active", weekStart === "sunday");
  el.settingsWeekStartMonday.setAttribute("aria-pressed", String(weekStart === "monday"));
  el.settingsWeekStartSunday.setAttribute("aria-pressed", String(weekStart === "sunday"));

  const autostart = settings.autostart === true;
  el.settingsAutostartOff.classList.toggle("active", !autostart);
  el.settingsAutostartOn.classList.toggle("active", autostart);
  el.settingsAutostartOff.setAttribute("aria-pressed", String(!autostart));
  el.settingsAutostartOn.setAttribute("aria-pressed", String(autostart));
  el.settingsAutostartOff.disabled = isAutostartSyncPending;
  el.settingsAutostartOn.disabled = isAutostartSyncPending;

  const autoBackup = settings.autoBackup === true;
  el.settingsAutoBackupOff.classList.toggle("active", !autoBackup);
  el.settingsAutoBackupOn.classList.toggle("active", autoBackup);
  el.settingsAutoBackupOff.setAttribute("aria-pressed", String(!autoBackup));
  el.settingsAutoBackupOn.setAttribute("aria-pressed", String(autoBackup));

  el.settingsClearData.textContent = clearDataArmed ? ui.clearDataConfirmLabel : ui.clearDataLabel;
  el.settingsClearData.classList.toggle("active", clearDataArmed);
  el.settingsClearData.setAttribute("aria-pressed", String(clearDataArmed));
}

function resetClearDataArming() {
  if (clearDataArmTimeout) {
    clearTimeout(clearDataArmTimeout);
    clearDataArmTimeout = null;
  }

  if (!clearDataArmed) {
    return;
  }

  clearDataArmed = false;
  renderSettingsPanel();
}

function armClearData() {
  const ui = getUiText();

  clearDataArmed = true;
  renderSettingsPanel();
  showAppToast(ui.clearDataConfirm, "warning", 4500);

  if (clearDataArmTimeout) {
    clearTimeout(clearDataArmTimeout);
  }

  clearDataArmTimeout = setTimeout(() => {
    clearDataArmTimeout = null;
    if (!clearDataArmed) {
      return;
    }

    clearDataArmed = false;
    renderSettingsPanel();
  }, 4500);
}

function openSettingsPanel() {

  if (!el.settingsOverlay.hidden) {
    return;
  }

  el.settingsOverlay.hidden = false;
  renderSettingsPanel();
  el.settingsLanguageRu.focus();
}

function closeSettingsPanel() {
  if (el.settingsOverlay.hidden) {
    return;
  }

  resetClearDataArming();
  el.settingsOverlay.hidden = true;
  el.settingsButton.focus();
}

function toggleSettingsPanel() {
  if (el.settingsOverlay.hidden) {
    openSettingsPanel();
    return;
  }

  closeSettingsPanel();
}

function setLanguage(language) {
  const nextLanguage = language === "en" ? "en" : "ru";

  if (settings.language === nextLanguage) {
    renderSettingsPanel();
    return;
  }

  settings.language = nextLanguage;
  scheduleSave();
  renderAll();
  syncSettingsState();
}

function setDateFormat(dateFormat) {
  const nextDateFormat = trackerCore.sanitizeDateFormat(dateFormat, DEFAULT_DATE_FORMAT);

  if (settings.dateFormat === nextDateFormat) {
    renderSettingsPanel();
    return;
  }

  settings.dateFormat = nextDateFormat;
  scheduleSave();
  renderAll();
  syncSettingsState();
}

function setWeekStart(weekStart) {
  const nextWeekStart = trackerCore.sanitizeWeekStart(weekStart, DEFAULT_WEEK_START);

  if (settings.weekStart === nextWeekStart) {
    renderSettingsPanel();
    return;
  }

  settings.weekStart = nextWeekStart;
  scheduleSave();
  renderAll();
  syncSettingsState();
}

async function setAutostart(enabled) {
  const nextAutostart = enabled === true;

  if (isAutostartSyncPending) {
    return;
  }

  const desktopSetAutostart = window.desktopAPI?.setAutostart;
  if (typeof desktopSetAutostart !== "function") {
    showAppToast(getUiText().autostartFailed, "error");
    return;
  }

  isAutostartSyncPending = true;
  renderSettingsPanel();

  try {
    const currentBootstrapState = trackerCore.sanitizeBootstrapState(await getBootstrapState(), {
      autostart: settings.autostart,
      launchedAtLogin: false,
    });
    const autostartWasStale = settings.autostart !== currentBootstrapState.autostart;

    settings.autostart = currentBootstrapState.autostart;
    if (autostartWasStale) {
      scheduleSave();
    }

    if (currentBootstrapState.autostart === nextAutostart) {
      return;
    }

    const bootstrapState = await desktopSetAutostart(nextAutostart);
    const normalizedBootstrapState = trackerCore.sanitizeBootstrapState(bootstrapState, {
      autostart: settings.autostart,
      launchedAtLogin: false,
    });

    settings.autostart = normalizedBootstrapState.autostart;
    scheduleSave();
  } catch (error) {
    console.error("Unable to update autostart.", error);

    try {
      await reconcileAutostartWithSystem(true);
    } catch (syncError) {
      console.error("Unable to reconcile autostart state.", syncError);
    }

    showAppToast(getUiText().autostartFailed, "error");
  } finally {
    isAutostartSyncPending = false;
    renderSettingsPanel();
  }
}

function setAutoBackup(enabled) {
  const nextAutoBackup = enabled === true;

  if (settings.autoBackup === nextAutoBackup) {
    renderSettingsPanel();
    return;
  }

  settings.autoBackup = nextAutoBackup;
  scheduleSave();
  renderSettingsPanel();
  syncSettingsState();
}

async function clearStoredData() {
  const ui = getUiText();

  const clearData = window.desktopAPI?.clearData;
  if (typeof clearData !== "function") {
    throw new Error("clearData API is not available.");
  }

  el.settingsClearData.disabled = true;

  try {
    cancelScheduledSave();
    if (pendingAutoBackupPromise) {
      await pendingAutoBackupPromise.catch((error) => {
        console.error("Pending auto backup failed before clearing data.", error);
      });
    }
    const clearResult = await clearData();
    if (!clearResult || clearResult.cleared !== true) {
      throw new Error("Clear data did not complete successfully.");
    }
    removePersistedStateKeys();
    calendarCursor = startOfMonth(new Date());
    selectedDate = startOfDay(new Date());
    lastAutoBackupDateKey = null;
    resetClearDataArming();
    applyPersistedState(createDefaultPersistedState(), clearResult.bootstrap ?? {
      autostart: false,
      launchedAtLogin: false,
    });
    closeSettingsPanel();
    showAppToast(ui.clearDataSuccess, "success");
  } catch (error) {
    console.error("Unable to clear tracker data.", error);

    try {
      await reconcileAutostartWithSystem(true);
    } catch (syncError) {
      console.error("Unable to reconcile autostart state.", syncError);
      scheduleSave();
    }

    showAppToast(ui.clearDataFailed, "error");
  } finally {
    el.settingsClearData.disabled = false;
    renderSettingsPanel();
  }
}

function syncSettingsState() {
  window.desktopAPI?.sendSettingsState?.({
    language: settings.language,
    weekStart: settings.weekStart,
    autoBackup: settings.autoBackup,
  });
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
  const dayOffset = (firstDay.getDay() - getWeekStartIndex() + 7) % 7;
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
  const ui = getUiText();
  const dayOff = isDayOff(selectedDate);
  const clearState = getClearDayState(selectedDate);
  const actionLabel = dayOff ? ui.selectedDayWork : ui.selectedDayOff;

  el.selectedDayLabel.textContent = formatSelectedDate(selectedDate);
  el.selectedDayMeta.textContent = buildSelectedMeta(selectedDate);
  el.toggleDayOff.textContent = actionLabel;
  el.toggleDayOff.classList.toggle("active", dayOff);
  el.toggleDayOff.setAttribute("aria-pressed", String(dayOff));
  el.toggleDayOff.setAttribute("aria-label", actionLabel);
  el.clearDay.textContent = ui.clearDayLabel;
  el.clearDay.disabled = clearState.reason === "no-work";
  el.clearDay.setAttribute("aria-label", ui.clearDayLabel);
  el.clearDay.title = clearState.reason === "running-today" ? ui.clearDayBlockedRunning : "";
}

function renderCore() {

  renderStatus();
  renderStats();
  renderTimer();
  refreshVisibleCalendar();
  renderSelectedDayPanel();
}

function renderAll() {
  renderStaticText();
  renderSettingsPanel();
  renderWeekendSettings();
  renderDailyTarget();
  rebuildCalendar();
  renderCore();
}

function toggleRun() {
  if (timerState.isRunning) {
    trackerTimer.stopTimer(timerState, days, {
      source: "timer",
    });
  } else {
    const today = startOfDay(new Date());

    if (trackerCore.shouldForceWorkOverrideOnTimerStart({
      isTimerRunning: timerState.isRunning,
      isDayOffToday: isDayOff(today),
    })) {
      setDateOverride(today, "work");
    }

    trackerTimer.startTimer(timerState);
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
el.clearDay.addEventListener("click", () => {
  void clearSelectedDayWork();
});
el.dailyTargetHours.addEventListener("change", () => {
  updateDailyTargetHours(el.dailyTargetHours.value);
});

el.settingsButton.addEventListener("click", toggleSettingsPanel);
el.settingsClose.addEventListener("click", closeSettingsPanel);
el.settingsBackdrop.addEventListener("click", closeSettingsPanel);
el.settingsLanguageRu.addEventListener("click", () => setLanguage("ru"));
el.settingsLanguageEn.addEventListener("click", () => setLanguage("en"));
el.settingsDateFormatLocalized.addEventListener("click", () => setDateFormat("localized"));
el.settingsDateFormatDmy.addEventListener("click", () => setDateFormat("dmy"));
el.settingsDateFormatMdy.addEventListener("click", () => setDateFormat("mdy"));
el.settingsWeekStartMonday.addEventListener("click", () => setWeekStart("monday"));
el.settingsWeekStartSunday.addEventListener("click", () => setWeekStart("sunday"));
el.settingsAutostartOff.addEventListener("click", () => {
  void setAutostart(false);
});
el.settingsAutostartOn.addEventListener("click", () => {
  void setAutostart(true);
});
el.settingsAutoBackupOff.addEventListener("click", () => setAutoBackup(false));
el.settingsAutoBackupOn.addEventListener("click", () => setAutoBackup(true));
el.settingsClearData.addEventListener("click", async () => {
  if (!clearDataArmed) {
    armClearData();
    return;
  }

  await clearStoredData();
});
el.confirmBackdrop.addEventListener("click", () => closeConfirmDialog(false));
el.confirmClose.addEventListener("click", () => closeConfirmDialog(false));
el.confirmCancel.addEventListener("click", () => closeConfirmDialog(false));
el.confirmAccept.addEventListener("click", () => closeConfirmDialog(true));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!el.confirmOverlay.hidden) {
    closeConfirmDialog(false);
    return;
  }

  if (!el.settingsOverlay.hidden) {
    closeSettingsPanel();
  }
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
    showAppToast(getUiText().exportFailed, "error");
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

    const ui = getUiText();
    const confirmed = await requestConfirmDialog({
      title: ui.importBackup,
      message: ui.importConfirm,
      cancelLabel: ui.cancelLabel,
      confirmLabel: ui.importBackup,
      returnFocusTarget: el.importBackup,
    });
    if (!confirmed) {
      return;
    }

    const bootstrapState = await getBootstrapState();
    applyPersistedState(trackerStorage.normalizeImportedSnapshot(result.snapshot), bootstrapState);
    showAppToast(getUiText().importSuccess, "success");
  } catch (error) {
    console.error("Unable to import backup.", error);
    showAppToast(getUiText().importFailed, "error");
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
  if (!timerState.isRunning || timerState.isSuspended) {
    return;
  }

  flushTick();
  renderCore();
  syncTrayState();
}, 1000);

async function initializeApp() {
  try {
    const bootstrapState = await getBootstrapState();
    const autostartChanged = settings.autostart !== bootstrapState.autostart;

    settings.autostart = bootstrapState.autostart;

    if (autostartChanged) {
      scheduleSave();
    }
  } catch (error) {
    console.error("Unable to load bootstrap state.", error);
  }

  renderAll();
  syncTrayState();
  syncSettingsState();
}

void initializeApp();
