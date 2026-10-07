"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    openPlayNowFolder: () => electron_1.ipcRenderer.invoke("playnow-folder:open"),
    getNtpTime: () => electron_1.ipcRenderer.invoke("time:ntp"),
    getConnectionInfo: () => electron_1.ipcRenderer.invoke("connection-info:get"),
    openSoundsFolder: () => electron_1.ipcRenderer.invoke("sounds-folder:open"),
    getWindowsSettings: () => electron_1.ipcRenderer.invoke("windows-settings:get"),
    setWindowsSettings: (settings) => electron_1.ipcRenderer.invoke("windows-settings:set", settings),
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
