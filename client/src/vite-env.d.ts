/// <reference types="vite/client" />

interface Window {
    electronAPI?: {
        getWindowsSettings: () => Promise<{
            openAtLogin: boolean;
            openAsHidden: boolean;
        }>;

        setWindowsSettings: (settings: {
            openAtLogin: boolean;
            openAsHidden: boolean;
        }) => Promise<{
            openAtLogin: boolean;
            openAsHidden: boolean;
        }>;

        onBell: (
            callback: (event: {
                type:
                    | "PRE_BELL"
                    | "LESSON_START"
                    | "LESSON_END";

                soundUrl: string | null;
            }) => void
        ) => () => void;
    };
}