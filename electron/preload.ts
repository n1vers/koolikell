import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    openPlayNowFolder: () =>
        ipcRenderer.invoke("playnow-folder:open"),

    getNtpTime: (server?: string) =>
        ipcRenderer.invoke("time:ntp", server),

    syncSystemTime: (server?: string) =>
        ipcRenderer.invoke("time:sync-system", server),

    openExternal: (url: string) =>
        ipcRenderer.invoke("browser:open", url),

    getConnectionInfo: () =>
        ipcRenderer.invoke("connection-info:get"),

    openSoundsFolder: () =>
        ipcRenderer.invoke(
            "sounds-folder:open"
        ),

    getWindowsSettings: () =>
        ipcRenderer.invoke(
            "windows-settings:get"
        ),

    setWindowsSettings: (
        settings: {
            openAtLogin: boolean;
            openAsHidden: boolean;
        }
    ) =>
        ipcRenderer.invoke(
            "windows-settings:set",
            settings
        ),

    setAutomaticEnabled: (enabled: boolean) =>
        ipcRenderer.invoke("automatic-enabled:set", enabled),

    writeLogFile: (entry: {
        timestamp: string;
        level: "info" | "warn" | "error";
        message: string;
        details?: string;
    }) => ipcRenderer.invoke("logs:write", entry),

    onBell: (
        callback: (event: {
            type:
                | "PRE_BELL"
                | "LESSON_START"
                | "LESSON_END";
            soundUrl: string | null;
        }) => void
    ) => {
        const listener = (
            _event: Electron.IpcRendererEvent,
            data: {
                type:
                    | "PRE_BELL"
                    | "LESSON_START"
                    | "LESSON_END";
                soundUrl: string | null;
            }
        ) => {
            callback(data);
        };

        ipcRenderer.on("bell", listener);

        return () => {
            ipcRenderer.removeListener(
                "bell",
                listener
            );
        };
    },
});