const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, BrowserWindow, dialog, ipcMain, Menu, Tray, nativeImage, powerMonitor, screen } = require("electron");

const APP_ID = "com.workflow.minimalworktimetracker";

app.setAppUserModelId(APP_ID);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
const loginItemState = require("./login-item-state.js");
const trackerCore = require("./renderer/tracker-core.js");

const TRAY_TEXT = {
  ru: {
    openWindow: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
    hideWindow: "\u0421\u043a\u0440\u044b\u0442\u044c",
    startTimer: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c",
    stopTimer: "\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c",
    exit: "\u0412\u044b\u0445\u043e\u0434",
    tooltipRunning: "\u0418\u0434\u0451\u0442 \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u0432\u0440\u0435\u043c\u044f",
    tooltipIdle: "\u0422\u0440\u0435\u043a\u0435\u0440 \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
  },
  en: {
    openWindow: "Show",
    hideWindow: "Hide",
    startTimer: "Start",
    stopTimer: "Stop",
    exit: "Exit",
    tooltipRunning: "Work time is running",
    tooltipIdle: "Work time tracker",
  },
};

if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

function pickWritableBasePath() {
  const candidates = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "MinimalWorktimeTracker") : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, "MinimalWorktimeTracker") : null,
    os.tmpdir() ? path.join(os.tmpdir(), "MinimalWorktimeTracker") : null,
    path.join(process.cwd(), ".runtime", "MinimalWorktimeTracker"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch {
      // try next writable location
    }
  }

  throw new Error("Unable to find a writable data directory.");
}

const dataRoot = pickWritableBasePath();
const userDataPath = path.join(dataRoot, "user-data");
const sessionDataPath = path.join(dataRoot, "session-data");
const cachePath = path.join(dataRoot, "cache");

const autoBackupPath = path.join(userDataPath, "backups");
for (const dir of [userDataPath, sessionDataPath, cachePath, autoBackupPath]) {
  fs.mkdirSync(dir, { recursive: true });
}

app.setPath("userData", userDataPath);
app.setPath("sessionData", sessionDataPath);
app.commandLine.appendSwitch("disk-cache-dir", cachePath);

const appIconPath = path.join(__dirname, "..", "Logo.png");
const appIcon = nativeImage.createFromPath(appIconPath);

if (appIcon.isEmpty()) {
  throw new Error(`Unable to load app icon: ${appIconPath}`);
}

let mainWindow;
let tray;
let isQuitting = false;
const shouldStartHidden = getBootstrapState().launchedAtLogin === true;

const trayState = {
  isRunning: false,
  language: "ru",
};

const WINDOW_SCREEN_MARGIN = 12;
const STORAGE_CLEAR_TYPES = ["localstorage", "indexdb", "serviceworkers", "cachestorage", "filesystem", "websql"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function getTrayText() {
  return TRAY_TEXT[trayState.language] ?? TRAY_TEXT.ru;
}

function applyAutostartSetting(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    openAsHidden: Boolean(enabled),
  });
}
function getBootstrapState() {
  return loginItemState.createBootstrapState(app.getLoginItemSettings());
}

function getApplicationSession() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.webContents.session;
  }

  const fallbackWindow = BrowserWindow.getAllWindows()[0];
  return fallbackWindow ? fallbackWindow.webContents.session : null;
}

function createTrayIcon() {
  return appIcon.resize({
    width: 18,
    height: 18,
  });
}

function sendTrayCommand(command) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("tray-command", command);
}

function sendSystemState(state) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("system-state", state);
}

function positionMainWindowBottomRight(trayBounds = tray?.getBounds()) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const windowBounds = mainWindow.getBounds();
  const display = trayBounds ? screen.getDisplayMatching(trayBounds) : screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const minX = workArea.x + WINDOW_SCREEN_MARGIN;
  const maxX = workArea.x + workArea.width - windowBounds.width - WINDOW_SCREEN_MARGIN;
  const minY = workArea.y + WINDOW_SCREEN_MARGIN;
  const maxY = workArea.y + workArea.height - windowBounds.height - WINDOW_SCREEN_MARGIN;
  const x = clamp(workArea.x + workArea.width - windowBounds.width - WINDOW_SCREEN_MARGIN, minX, maxX);
  const y = clamp(workArea.y + workArea.height - windowBounds.height - WINDOW_SCREEN_MARGIN, minY, maxY);

  mainWindow.setPosition(x, y, false);
}

function showMainWindow(trayBounds) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  positionMainWindowBottomRight(trayBounds);
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow(trayBounds) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }

  showMainWindow(trayBounds);
}

function hideWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.hide();
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const text = getTrayText();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? text.hideWindow : text.openWindow,
      click: () => toggleWindow(),
    },
    {
      label: trayState.isRunning ? text.stopTimer : text.startTimer,
      click: () => sendTrayCommand("toggle-run"),
    },
    { type: "separator" },
    {
      label: text.exit,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(trayState.isRunning ? text.tooltipRunning : text.tooltipIdle);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 920,
    minWidth: 500,
    minHeight: 780,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    icon: appIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));

  mainWindow.once("ready-to-show", () => {
    if (shouldStartHidden) {
      mainWindow.setSkipTaskbar(true);
      return;
    }

    showMainWindow();
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideWindow();
  });

  mainWindow.on("show", () => {
    mainWindow.setSkipTaskbar(false);
    updateTrayMenu();
  });

  mainWindow.on("hide", () => {
    mainWindow.setSkipTaskbar(true);
    updateTrayMenu();
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.on("click", (_event, bounds) => toggleWindow(bounds));
  updateTrayMenu();
}

ipcMain.on("timer-state", (_event, payload) => {
  trayState.isRunning = Boolean(payload?.isRunning);
  updateTrayMenu();
});

ipcMain.on("settings-state", (_event, payload) => {
  trayState.language = payload?.language === "en" ? "en" : "ru";
  updateTrayMenu();
});

ipcMain.handle("bootstrap:state", () => {
  return getBootstrapState();
});

ipcMain.handle("autostart:set", (_event, enabled) => {
  if (typeof enabled !== "boolean") {
    throw new TypeError("autostart:set expects a boolean.");
  }

  applyAutostartSetting(enabled);

  return loginItemState.ensureBootstrapAutostart(
    app.getLoginItemSettings(),
    enabled,
    "Unable to confirm autostart state.",
  );
});
ipcMain.on("window:minimize", () => {
  hideWindow();
});

ipcMain.on("window:close", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.close();
});

ipcMain.handle("backup:export", async (_event, snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    throw new TypeError("backup:export expects a snapshot object.");
  }

  const filename = `work-tracker-backup-${trackerCore.dateKey(new Date())}.json`;
  const ownerWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const { canceled, filePath } = await dialog.showSaveDialog(ownerWindow, {
    defaultPath: path.join(app.getPath("documents"), filename),
    filters: [
      { name: "JSON", extensions: ["json"] },
    ],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.promises.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  return { canceled: false, filePath };
});

ipcMain.handle("backup:auto", async (_event, snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    throw new TypeError("backup:auto expects a snapshot object.");
  }

  const filePath = path.join(autoBackupPath, "work-tracker-auto-backup-" + trackerCore.dateKey(new Date()) + ".json");
  await fs.promises.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  return { saved: true, filePath };
});

ipcMain.handle("backup:import", async () => {
  const ownerWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow, {
    defaultPath: path.join(app.getPath("documents"), "work-tracker-backup.json"),
    filters: [
      { name: "JSON", extensions: ["json"] },
    ],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const raw = await fs.promises.readFile(filePath, "utf8");

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Unable to parse backup file: ${filePath}`);
  }

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("backup:import expects a JSON object.");
  }

  return { canceled: false, filePath, snapshot };
});

ipcMain.handle("data:clear", async () => {
  const applicationSession = getApplicationSession();
  if (!applicationSession) {
    throw new Error("Application session is not available.");
  }

  await fs.promises.rm(autoBackupPath, { recursive: true, force: true });
  await fs.promises.mkdir(autoBackupPath, { recursive: true });
  await applicationSession.clearStorageData({
    storages: STORAGE_CLEAR_TYPES,
  });

  applyAutostartSetting(false);
  const confirmedState = loginItemState.ensureBootstrapAutostart(
    app.getLoginItemSettings(),
    false,
    "Unable to disable autostart during clear data.",
  );

  return { cleared: true, bootstrap: confirmedState };
});

powerMonitor.on("suspend", () => {
  sendSystemState("pause");
});

powerMonitor.on("lock-screen", () => {
  sendSystemState("pause");
});

powerMonitor.on("resume", () => {
  sendSystemState("resume");
});

powerMonitor.on("unlock-screen", () => {
  sendSystemState("resume");
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("second-instance", () => {
  showMainWindow();
});

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }

    showMainWindow();
  });
});


