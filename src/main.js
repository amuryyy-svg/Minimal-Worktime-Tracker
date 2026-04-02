const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, BrowserWindow, dialog, ipcMain, Menu, Tray, nativeImage, powerMonitor, screen } = require("electron");

const APP_ID = "com.workflow.minimalworktimetracker";

app.setAppUserModelId(APP_ID);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
const trackerCore = require("./renderer/tracker-core.js");

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

for (const dir of [userDataPath, sessionDataPath, cachePath]) {
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

const trayState = {
  isRunning: false,
};

const TRAY_WINDOW_GAP = 8;
const WINDOW_SCREEN_MARGIN = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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

function positionMainWindowNearTray(trayBounds = tray?.getBounds()) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (!trayBounds || trayBounds.width <= 0 || trayBounds.height <= 0) {
    return;
  }

  const windowBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(trayBounds);
  const workArea = display.workArea;
  const minX = workArea.x + WINDOW_SCREEN_MARGIN;
  const maxX = workArea.x + workArea.width - windowBounds.width - WINDOW_SCREEN_MARGIN;
  const minY = workArea.y + WINDOW_SCREEN_MARGIN;
  const maxY = workArea.y + workArea.height - windowBounds.height - WINDOW_SCREEN_MARGIN;
  const x = clamp(Math.round(trayBounds.x + trayBounds.width - windowBounds.width), minX, maxX);
  const aboveTrayY = trayBounds.y - windowBounds.height - TRAY_WINDOW_GAP;
  const belowTrayY = trayBounds.y + trayBounds.height + TRAY_WINDOW_GAP;
  const y = clamp(aboveTrayY >= minY ? aboveTrayY : belowTrayY, minY, maxY);

  mainWindow.setPosition(x, y, false);
}

function showMainWindow(trayBounds) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  positionMainWindowNearTray(trayBounds);
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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? "Скрыть" : "Открыть",
      click: () => toggleWindow(),
    },
    {
      label: trayState.isRunning ? "Остановить" : "Запустить",
      click: () => sendTrayCommand("toggle-run"),
    },
    { type: "separator" },
    {
      label: "Выход",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(trayState.isRunning ? "Идёт рабочее время" : "Трекер рабочего времени");
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


