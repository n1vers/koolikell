"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getWindowsSettings: () => electron_1.ipcRenderer.invoke("windows-settings:get"),
    setWindowsSettings: (settings) => electron_1.ipcRenderer.invoke("windows-settings:set", settings),
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
