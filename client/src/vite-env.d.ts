/// <reference types="vite/client" />

interface Window {
    electronAPI?: {
        openPlayNowFolder: () => Promise<string>;

        getNtpTime: () => Promise<{
            server: string;
            offsetMs: number;
            checkedAt: string;
        }>;

        openSoundsFolder: () => Promise<string>;

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