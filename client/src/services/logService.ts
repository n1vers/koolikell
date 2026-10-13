export type AppLogLevel = "info" | "warn" | "error";
export type AppLogSource = "backend" | "frontend";
export type AppLogCategory =
    | "playnow"
    | "bells"
    | "audio"
    | "settings"
    | "network"
    | "other";

export interface AppLogEntry {
    id: string;
    timestamp: string;
    level: AppLogLevel;
    source?: AppLogSource;
    category?: AppLogCategory;
    message: string;
    details?: string;
}

const STORAGE_KEY = "schoolbell-app-logs";
const DASHBOARD_LOGS_SEEN_KEY = "schoolbell-dashboard-logs-seen-at";
const DASHBOARD_LOG_IDS_SEEN_KEY = "schoolbell-dashboard-log-ids-seen";
const LOGS_MIGRATED_KEY = "schoolbell-app-logs-migrated";
const MAX_LOGS = 250;
const DUPLICATE_WINDOW_MS = 30_000;
let runtimeLoggingInstalled = false;

export function getLogCategory(message: string): AppLogCategory {
    const normalized = message.toLowerCase();
    if (normalized.includes("playnow") || normalized.includes("play now")) {
        return "playnow";
    }
    if (
        normalized.includes("bell") ||
        normalized.includes("kell") ||
        normalized.includes("scheduler") ||
        normalized.includes("profiil")
    ) {
        return "bells";
    }
    if (
        normalized.includes("audio") ||
        normalized.includes("heli") ||
        normalized.includes("sound") ||
        normalized.includes("device")
    ) {
        return "audio";
    }
    if (
        normalized.includes("setting") ||
        normalized.includes("sead") ||
        normalized.includes("windows") ||
        normalized.includes("pre-bell")
    ) {
        return "settings";
    }
    if (
        normalized.includes("http") ||
        normalized.includes("fetch") ||
        normalized.includes("network") ||
        normalized.includes("connection") ||
        normalized.includes("sync")
    ) {
        return "network";
    }
    return "other";
}

function sendLogToServer(entry: AppLogEntry) {
    return fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...entry,
            source: window.electronAPI ? "local" : "remote",
        }),
    });
}

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

export async function getServerLogs(): Promise<AppLogEntry[]> {
    const response = await fetch("/api/logs");
    if (!response.ok) {
        throw new Error(`Serveri logide lugemine ebaõnnestus (HTTP ${response.status})`);
    }
    return response.json() as Promise<AppLogEntry[]>;
}

export async function clearServerLogs(): Promise<void> {
    const response = await fetch("/api/logs", { method: "DELETE" });
    if (!response.ok) {
        throw new Error(`Serveri logide kustutamine ebaõnnestus (HTTP ${response.status})`);
    }
}

export function clearAppLogs() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DASHBOARD_LOGS_SEEN_KEY);
    localStorage.removeItem(DASHBOARD_LOG_IDS_SEEN_KEY);
}

export function installRuntimeLogging() {
    if (runtimeLoggingInstalled) {
        return;
    }
    runtimeLoggingInstalled = true;
    if (localStorage.getItem(LOGS_MIGRATED_KEY) !== "true") {
        const storedLogs = readLogs();
        if (storedLogs.length > 0) {
            void Promise.all(storedLogs.map((entry) => sendLogToServer(entry)))
                .then(() => {
                    localStorage.setItem(LOGS_MIGRATED_KEY, "true");
                })
                .catch((error: unknown) => {
                    console.error("Failed to migrate application logs to server:", error);
                });
        } else {
            localStorage.setItem(LOGS_MIGRATED_KEY, "true");
        }
    }
    window.addEventListener("online", () => writeAppLog("info", "Network connection restored"));
    window.addEventListener("offline", () => writeAppLog("warn", "Network connection lost"));
}

export function writeAppLog(
    level: AppLogLevel,
    message: string,
    details?: unknown
) {
    const existingLogs = readLogs();
    const duplicate = existingLogs.find(
        (item) =>
            item.level === level &&
            item.message === message &&
            Date.now() - new Date(item.timestamp).getTime() < DUPLICATE_WINDOW_MS
    );
    if (duplicate) {
        return;
    }

    const entry: AppLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        level,
        category: getLogCategory(message),
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
            ...existingLogs,
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

    void sendLogToServer(entry).catch((error: unknown) => {
        console.error("Failed to send application log to server:", error);
    });

    if (level === "error") {
        console.error(message, details);
    } else if (level === "warn") {
        console.warn(message, details);
    } else {
        console.info(message, details);
    }
}
