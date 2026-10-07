export type AppLogLevel = "info" | "warn" | "error";

export interface AppLogEntry {
    id: string;
    timestamp: string;
    level: AppLogLevel;
    message: string;
    details?: string;
}

const STORAGE_KEY = "schoolbell-app-logs";
const MAX_LOGS = 250;
let runtimeLoggingInstalled = false;

function readLogs(): AppLogEntry[] {
    try {
        return JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? "[]"
        ) as AppLogEntry[];
    } catch {
        return [];
    }
}

export function getAppLogs(): AppLogEntry[] {
    return readLogs();
}

export function clearAppLogs() {
    localStorage.removeItem(STORAGE_KEY);
}

export function installRuntimeLogging() {
    if (runtimeLoggingInstalled) {
        return;
    }
    runtimeLoggingInstalled = true;
    window.addEventListener("online", () => writeAppLog("info", "Network connection restored"));
    window.addEventListener("offline", () => writeAppLog("warn", "Network connection lost"));
}

export function writeAppLog(
    level: AppLogLevel,
    message: string,
    details?: unknown
) {
    const entry: AppLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        details:
            details === undefined
                ? undefined
                : details instanceof Error
                    ? details.message
                    : String(details),
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
            entry,
            ...readLogs(),
        ].slice(0, MAX_LOGS))
    );

    if (window.electronAPI?.writeLogFile) {
        void window.electronAPI.writeLogFile({
            timestamp: entry.timestamp,
            level: entry.level,
            message: entry.message,
            details: entry.details,
        }).catch((fileError) => {
            console.error("Failed to write application log file:", fileError);
        });
    }

    void fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            timestamp: entry.timestamp,
            level: entry.level,
            message: entry.message,
            details: entry.details,
        }),
    }).catch(() => undefined);

    if (level === "error") {
        console.error(message, details);
    } else if (level === "warn") {
        console.warn(message, details);
    } else {
        console.info(message, details);
    }
}
