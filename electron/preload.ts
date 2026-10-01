import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
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