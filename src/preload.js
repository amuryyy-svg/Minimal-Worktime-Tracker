const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  sendTimerState: (payload) => ipcRenderer.send("timer-state", payload),
  onTrayCommand: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on("tray-command", handler);
    return () => ipcRenderer.off("tray-command", handler);
  },
  onSystemState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("system-state", handler);
    return () => ipcRenderer.off("system-state", handler);
  },
  exportBackup: (payload) => ipcRenderer.invoke("backup:export", payload),
  importBackup: () => ipcRenderer.invoke("backup:import"),
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  closeWindow: () => ipcRenderer.send("window:close"),
});
