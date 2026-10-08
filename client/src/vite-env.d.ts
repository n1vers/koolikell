/// <reference types="vite/client" />

interface Window {
    electronAPI?: {
        openPlayNowFolder: () => Promise<string>;

        getNtpTime: (server?: string) => Promise<{
            server: string;
            offsetMs: number;
            checkedAt: string;
            targetTimeMs: number;
        }>;
        syncSystemTime: (server?: string) => Promise<{
            server: string;
            offsetMs: number;
            checkedAt: string;
            targetTimeMs: number;
            synced: boolean;
        }>;
        openExternal: (url: string) => Promise<void>;

        getConnectionInfo: () => Promise<{
            address: string | null;
            port: number;
            interfaceName: string | null;
            connectionType: "ethernet" | "wifi" | "other" | "none";
            addresses: Array<{
                address: string;
                interfaceName: string;
                connectionType: "ethernet" | "wifi" | "other";
            }>;
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
        setAutomaticEnabled: (enabled: boolean) => Promise<void>;
        writeLogFile: (entry: {
            timestamp: string;
            level: "info" | "warn" | "error";
            message: string;
            details?: string;
        }) => Promise<void>;

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