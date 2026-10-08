"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    openPlayNowFolder: () => electron_1.ipcRenderer.invoke("playnow-folder:open"),
    getNtpTime: (server) => electron_1.ipcRenderer.invoke("time:ntp", server),
    syncSystemTime: (server) => electron_1.ipcRenderer.invoke("time:sync-system", server),
    openExternal: (url) => electron_1.ipcRenderer.invoke("browser:open", url),
    getConnectionInfo: () => electron_1.ipcRenderer.invoke("connection-info:get"),
    openSoundsFolder: () => electron_1.ipcRenderer.invoke("sounds-folder:open"),
    getWindowsSettings: () => electron_1.ipcRenderer.invoke("windows-settings:get"),
    setWindowsSettings: (settings) => electron_1.ipcRenderer.invoke("windows-settings:set", settings),
    setAutomaticEnabled: (enabled) => electron_1.ipcRenderer.invoke("automatic-enabled:set", enabled),
    writeLogFile: (entry) => electron_1.ipcRenderer.invoke("logs:write", entry),
    onBell: (callback) => {
        const listener = (_event, data) => {
            callback(data);
        };
        electron_1.ipcRenderer.on("bell", listener);
        return () => {
            electron_1.ipcRenderer.removeListener("bell", listener);
        };
    },
});
