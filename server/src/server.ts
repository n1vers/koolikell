import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import os from "os";
import crypto from "crypto";
import Database from "better-sqlite3";
import { createProxyMiddleware } from "http-proxy-middleware";

import {
    getNextSchedule,
    getNextBellEvent,
} from "./services/schedulerService";

import {
    getProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
} from "./services/profileService";

import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from "./services/scheduleService";

import {
    getSounds,
    createSound,
    updateSound,
    deleteSound,
} from "./services/soundService";

import { uploadSound } from "./middleware/uploadMiddleware";
import { uploadPlayNow } from "./middleware/playNowUploadMiddleware";


const app = express();

const PORT = 3000;
const HOST = process.env.HOST ?? "127.0.0.1";
const FRONTEND_PORT = 5173;
const FRONTEND_HOST = process.env.FRONTEND_HOST;
const clientDistPath = process.env.CLIENT_DIST_PATH;
const serverLogPath = path.join(process.cwd(), "koolikell-server.log");
const recentLogEntries = new Map<string, number>();
const DUPLICATE_LOG_WINDOW_MS = 30_000;

async function writeServerLog(
    level: "info" | "warn" | "error",
    message: string,
    details?: unknown
) {
    const signature = `${level}:${message}`;
    const previousTimestamp = recentLogEntries.get(signature);
    if (previousTimestamp !== undefined && Date.now() - previousTimestamp < DUPLICATE_LOG_WINDOW_MS) {
        return;
    }
    recentLogEntries.set(signature, Date.now());

    const safeDetails =
        details instanceof Error
            ? details.stack ?? details.message
            : details === undefined
                ? undefined
                : typeof details === "string"
                    ? details
                    : JSON.stringify(details);
    const suffix = safeDetails === undefined ? "" : ` ${safeDetails}`;
    try {
        await fs.appendFile(
            serverLogPath,
            `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${suffix}${os.EOL}`,
            "utf8"
        );
    } catch (logError) {
        console.error("Failed to write server log:", logError);
    }
}

process.on("uncaughtException", (error) => {
    void writeServerLog("error", "Uncaught server exception", error);
});
process.on("unhandledRejection", (reason) => {
    void writeServerLog("error", "Unhandled server rejection", reason);
});

function hashPin(pin: string): string {
    return crypto.createHash("sha256").update(pin).digest("hex");
}

function getPin(key: string, fallback: string): string {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const row = database
        .prepare('SELECT "value" FROM "AppSetting" WHERE "key" = ?')
        .get(key) as { value?: string } | undefined;
    database.close();
    return row?.value ?? hashPin(fallback);
}

function setPin(key: string, pin: string): void {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    database
        .prepare(
            'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ' +
            'ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
        )
        .run(key, hashPin(pin));
    database.close();
}

function getServerConnectionInfo() {
    const candidates: Array<{
        address: string;
        interfaceName: string;
        connectionType: "ethernet" | "wifi" | "other";
        priority: number;
    }> = [];

    for (const [interfaceName, entries] of Object.entries(os.networkInterfaces())) {
        for (const entry of entries ?? []) {
            if (
                entry.family !== "IPv4" ||
                entry.internal
            ) {
                continue;
            }

            const normalizedName = interfaceName.toLowerCase();
            const isEthernet =
                /ethernet|lan|以太网|локальн/.test(normalizedName);
            const isWifi =
                /wi-?fi|wireless|wlan|беспровод/.test(normalizedName);

            candidates.push({
                address: entry.address,
                interfaceName,
                connectionType: isEthernet ? "ethernet" : isWifi ? "wifi" : "other",
                priority: isEthernet ? 0 : isWifi ? 1 : 2,
            });

        }
    }

    const sortedCandidates = candidates.sort(
        (first, second) => first.priority - second.priority
    );
    const selected = sortedCandidates[0];

    return {
        address: selected?.address ?? null,
        port: FRONTEND_PORT,
        interfaceName: selected?.interfaceName ?? null,
        connectionType: selected?.connectionType ?? "none",
        addresses: sortedCandidates.map(({ address, interfaceName, connectionType }) => ({
            address,
            interfaceName,
            connectionType,
        })),
    };
}

type PlayNowLoopMode = "off" | "track" | "playlist";
interface PlayNowState {
    revision: number;
    action: "play" | "pause" | "stop" | "loop" | "volume" | "select" | "position";
    selectedFile: string | null;
    playing: boolean;
    loopMode: PlayNowLoopMode;
    volume: number;
    position: number;
    startedAt: number | null;
    playlist: string[];
    updatedAt: number;
}

let playNowState: PlayNowState = {
    revision: 0,
    action: "stop",
    selectedFile: null,
    playing: false,
    loopMode: "off",
    volume: 80,
    position: 0,
    startedAt: null,
    playlist: [],
    updatedAt: Date.now(),
};

function initializeDatabase() {
    const database = new Database(
        path.join(process.cwd(), "schoolbell.db")
    );

    database.exec(`
        CREATE TABLE IF NOT EXISTS "Profile" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "Sound" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name" TEXT NOT NULL,
            "fileName" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Schedule" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "profileId" INTEGER NOT NULL,
            "dayOfWeek" INTEGER NOT NULL,
            "time" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "preBellEnabled" BOOLEAN NOT NULL DEFAULT true,
            "soundId" INTEGER,
            "preBellSoundId" INTEGER,
            CONSTRAINT "Schedule_profileId_fkey"
                FOREIGN KEY ("profileId") REFERENCES "Profile" ("id")
                ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "Schedule_soundId_fkey"
                FOREIGN KEY ("soundId") REFERENCES "Sound" ("id")
                ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "Schedule_preBellSoundId_fkey"
                FOREIGN KEY ("preBellSoundId") REFERENCES "Sound" ("id")
                ON DELETE SET NULL ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "AppSetting" (
            "key" TEXT NOT NULL PRIMARY KEY,
            "value" TEXT NOT NULL
        );

        INSERT OR IGNORE INTO "AppSetting" ("key", "value")
        VALUES ('automaticEnabled', 'true');
        INSERT OR IGNORE INTO "AppSetting" ("key", "value")
        VALUES ('preBellMinutes', '2');
        INSERT OR IGNORE INTO "AppSetting" ("key", "value")
        VALUES ('volume', '80');
        INSERT OR IGNORE INTO "AppSetting" ("key", "value")
        VALUES ('windowsSettings', '{"openAtLogin":false,"openAsHidden":false}');
        INSERT OR IGNORE INTO "AppSetting" ("key", "value")
        VALUES ('ntpServer', 'ntp1.eenet.ee');

    `);

    // Older versions created insecure default PINs. Remove those defaults
    // once so existing installations also start in the unconfigured state.
    const migration = database
        .prepare('SELECT "value" FROM "AppSetting" WHERE "key" = ?')
        .get("pinDefaultsRemoved") as { value?: string } | undefined;
    if (!migration) {
        database
            .prepare('DELETE FROM "AppSetting" WHERE "key" = ? AND "value" = ?')
            .run("masterPin", hashPin("1234"));
        database
            .prepare('DELETE FROM "AppSetting" WHERE "key" = ? AND "value" = ?')
            .run("playNowPin", hashPin("5678"));
        database
            .prepare(
                'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?)'
            )
            .run("pinDefaultsRemoved", "true");
    }

    database.close();
}

initializeDatabase();

function getAutomaticEnabled(): boolean {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const row = database
        .prepare('SELECT "value" FROM "AppSetting" WHERE "key" = ?')
        .get("automaticEnabled") as { value?: string } | undefined;
    database.close();
    return row?.value !== "false";
}

function setAutomaticEnabled(enabled: boolean): void {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    database
        .prepare(
            'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ' +
            'ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
        )
        .run("automaticEnabled", String(enabled));
    database.close();
}


// =========================================
// MIDDLEWARE
// =========================================

app.use(cors());

app.use(
    express.json()
);

app.get("/api/settings/pins", (_req, res) => {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const rows = database
        .prepare('SELECT "key" FROM "AppSetting" WHERE "key" IN (?, ?)')
        .all("masterPin", "playNowPin") as Array<{ key: string }>;
    database.close();
    res.json({
        configured: rows.some((row) => row.key === "masterPin") &&
            rows.some((row) => row.key === "playNowPin"),
    });
});

app.post("/api/logs", (req, res) => {
    const { timestamp, level, message, details } = req.body ?? {};
    if (
        typeof timestamp !== "string" ||
        !["info", "warn", "error"].includes(level) ||
        typeof message !== "string"
    ) {
        return res.status(400).json({ error: "Invalid log entry" });
    }
    void writeServerLog(level, `Client: ${message}`, {
        timestamp,
        details: typeof details === "string" ? details : undefined,
    });
    res.status(204).end();
});

app.post("/api/settings/pins/verify", (req, res) => {
    const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
    if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must contain four digits" });
    }

    const master = hashPin(pin) === getPin("masterPin", "");
    const playNow = hashPin(pin) === getPin("playNowPin", "");
    void writeServerLog(
        master || playNow ? "info" : "warn",
        "PIN verification attempt",
        { role: master ? "master" : playNow ? "playnow" : null }
    );
    res.json({ role: master ? "master" : playNow ? "playnow" : null });
});

app.put("/api/settings/pins", (req, res) => {
    const masterPin = typeof req.body?.masterPin === "string" ? req.body.masterPin : "";
    const nextMasterPin = typeof req.body?.nextMasterPin === "string" ? req.body.nextMasterPin : "";
    const nextPlayNowPin = typeof req.body?.nextPlayNowPin === "string" ? req.body.nextPlayNowPin : "";

    const currentMasterPin = getPin("masterPin", "");
    if (
        (currentMasterPin !== "" && hashPin(masterPin) !== currentMasterPin) ||
        !/^\d{4}$/.test(nextMasterPin) ||
        !/^\d{4}$/.test(nextPlayNowPin)
    ) {
        return res.status(400).json({ error: "Invalid PIN settings" });
    }

    setPin("masterPin", nextMasterPin);
    setPin("playNowPin", nextPlayNowPin);
    void writeServerLog("info", "PIN settings updated", {
        masterChanged: true,
        playNowChanged: true,
    });
    res.json({ saved: true });
});

app.delete("/api/settings/pins", (_req, res) => {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    database
        .prepare('DELETE FROM "AppSetting" WHERE "key" IN (?, ?)')
        .run("masterPin", "playNowPin");
    database.close();
    void writeServerLog("info", "PIN settings disabled");
    res.json({ configured: false });
});


// =========================================
// SOUNDS STATIC FILES
// =========================================

app.use(
    "/sounds",
    express.static(
        path.join(
            process.cwd(),
            "sounds"
        )
    )
);

app.use(
    "/playnow",
    express.static(
        path.join(process.cwd(), "playnow")
    )
);

// =========================================
// ROOT
// =========================================

app.get(
    "/",
    (_req, res) => {
        res.json({
            message:
                "koolikell API is running",
        });
    }
);

app.get("/api/connection-info", (_req, res) => {
    res.json(getServerConnectionInfo());
});

app.get("/api/settings/automatic", (_req, res) => {
    res.json({ enabled: getAutomaticEnabled() });
});

app.get("/api/settings/ntp", (_req, res) => {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const row = database
        .prepare('SELECT "value" FROM "AppSetting" WHERE "key" = ?')
        .get("ntpServer") as { value?: string } | undefined;
    database.close();
    res.json({ server: row?.value?.trim() || "ntp1.eenet.ee" });
});

app.put("/api/settings/ntp", (req, res) => {
    const server = typeof req.body?.server === "string" ? req.body.server.trim() : "";
    if (!/^[a-zA-Z0-9.-]+$/.test(server) || server.length > 253) {
        return res.status(400).json({ error: "Invalid NTP server" });
    }
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    database
        .prepare(
            'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
        )
        .run("ntpServer", server);
    database.close();
    void writeServerLog("info", "NTP server updated", { server });
    res.json({ server });
});

app.put("/api/settings/automatic", (req, res) => {
    if (typeof req.body?.enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be boolean" });
    }

    setAutomaticEnabled(req.body.enabled);
    res.json({ enabled: req.body.enabled });
});

function getSyncedSettings() {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const rows = database
        .prepare('SELECT "key", "value" FROM "AppSetting" WHERE "key" IN (?, ?, ?)')
        .all("preBellMinutes", "volume", "windowsSettings") as Array<{ key: string; value: string }>;
    database.close();
    const values = new Map(rows.map((row) => [row.key, row.value]));
    let windows = { openAtLogin: false, openAsHidden: false };
    try {
        windows = JSON.parse(values.get("windowsSettings") ?? JSON.stringify(windows)) as typeof windows;
    } catch {
        void writeServerLog("warn", "Invalid stored Windows settings");
    }
    return {
        preBellMinutes: Math.max(0, Math.min(60, Number(values.get("preBellMinutes") ?? 2) || 2)),
        volume: Math.max(0, Math.min(100, Number(values.get("volume") ?? 80) || 0)),
        windows,
    };
}

app.get("/api/settings/synced", (_req, res) => {
    res.json(getSyncedSettings());
});

app.put("/api/settings/synced", (req, res) => {
    const changes = req.body ?? {};
    const current = getSyncedSettings();
    const next = {
        preBellMinutes: changes.preBellMinutes === undefined
            ? current.preBellMinutes
            : Number(changes.preBellMinutes),
        volume: changes.volume === undefined ? current.volume : Number(changes.volume),
        windows: changes.windows === undefined ? current.windows : changes.windows,
    };
    if (
        !Number.isInteger(next.preBellMinutes) ||
        next.preBellMinutes < 0 ||
        next.preBellMinutes > 60 ||
        !Number.isFinite(next.volume) ||
        next.volume < 0 ||
        next.volume > 100 ||
        typeof next.windows?.openAtLogin !== "boolean" ||
        typeof next.windows?.openAsHidden !== "boolean"
    ) {
        return res.status(400).json({ error: "Invalid synced settings" });
    }
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const save = database.prepare(
        'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
    );
    save.run("preBellMinutes", String(next.preBellMinutes));
    save.run("volume", String(next.volume));
    save.run("windowsSettings", JSON.stringify(next.windows));
    database.close();
    void writeServerLog("info", "Synced settings updated", {
        preBellMinutes: next.preBellMinutes,
        volume: next.volume,
        windows: next.windows,
    });
    res.json(next);
});

app.get("/api/settings/pre-bell-minutes", (_req, res) => {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const row = database
        .prepare('SELECT "value" FROM "AppSetting" WHERE "key" = ?')
        .get("preBellMinutes") as { value?: string } | undefined;
    database.close();
    const minutes = Math.max(0, Math.min(60, Number(row?.value ?? 2) || 2));
    res.json({ minutes });
});

app.put("/api/settings/pre-bell-minutes", (req, res) => {
    const minutes = Number(req.body?.minutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60) {
        return res.status(400).json({ error: "minutes must be between 0 and 60" });
    }
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    database.prepare(
        'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
    ).run("preBellMinutes", String(Math.round(minutes)));
    database.close();
    res.json({ minutes: Math.round(minutes) });
});

app.get("/api/settings/profile-assignments", (_req, res) => {
    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const rows = database
        .prepare('SELECT "key", "value" FROM "AppSetting" WHERE "key" IN (?, ?)')
        .all("profileByDay", "profileByDate") as Array<{ key: string; value: string }>;
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    let profileByDay: Record<string, number | null> = {};
    let profileByDate: Record<string, number | null> = {};

    try {
        if (values.profileByDay) {
            profileByDay = JSON.parse(values.profileByDay) as Record<string, number | null>;
        }
        if (values.profileByDate) {
            profileByDate = JSON.parse(values.profileByDate) as Record<string, number | null>;
        }
    } catch (error) {
        console.error("Failed to parse profile assignments:", error);
        return res.status(500).json({ error: "Invalid profile assignments" });
    }

    const existingProfileIds = new Set(
        database
            .prepare('SELECT "id" FROM "Profile"')
            .all()
            .map((row) => (row as { id: number }).id)
    );
    const cleanAssignments = (
        source: Record<string, number | null>,
        removeKeys: boolean
    ) => Object.fromEntries(
        Object.entries(source)
            .filter(([, profileId]) =>
                !removeKeys || profileId === null || existingProfileIds.has(profileId)
            )
            .map(([key, profileId]) => [
                key,
                profileId !== null && existingProfileIds.has(profileId)
                    ? profileId
                    : null,
            ])
    );
    profileByDay = cleanAssignments(profileByDay, false);
    profileByDate = cleanAssignments(profileByDate, true);
    database.close();

    res.json({ profileByDay, profileByDate });
});

app.put("/api/settings/profile-assignments", (req, res) => {
    if (
        typeof req.body?.profileByDay !== "object" ||
        typeof req.body?.profileByDate !== "object"
    ) {
        return res.status(400).json({ error: "Invalid profile assignments" });
    }

    const database = new Database(path.join(process.cwd(), "schoolbell.db"));
    const save = database.prepare(
        'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ' +
        'ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
    );
    const transaction = database.transaction(() => {
        save.run("profileByDay", JSON.stringify(req.body.profileByDay));
        save.run("profileByDate", JSON.stringify(req.body.profileByDate));
    });
    transaction();
    database.close();

    res.json({
        profileByDay: req.body.profileByDay,
        profileByDate: req.body.profileByDate,
    });
});

app.get("/api/playnow", async (_req, res) => {
    try {
        const directory = path.join(process.cwd(), "playnow");
        const files = await fs.readdir(directory, {
            withFileTypes: true,
        });

        const allowed = /\.(mp3|wav|ogg)$/i;

        res.json(
            files
                .filter((file) => file.isFile() && allowed.test(file.name))
                .map((file) => ({
                    fileName: file.name,
                    name: path
                        .parse(file.name)
                        .name
                        .replace(/_\d{10,}$/, "")
                        .replace(/_/g, " "),
                }))
        );
    } catch (error) {
        console.error("Failed to load PlayNow tracks:", error);
        res.status(500).json({ error: "PlayNow lugemine ebaõnnestus" });
    }
});

app.get("/api/playnow/state", (_req, res) => {
    res.json(playNowState);
});

app.put("/api/playnow/state", (req, res) => {
    const {
        action,
        selectedFile,
        playing,
        loopMode,
        volume,
        position,
        startedAt,
        playlist,
        baseRevision,
    } = req.body ?? {};
    const validAction = ["play", "pause", "stop", "loop", "volume", "select", "position"].includes(action);
    const validLoop = ["off", "track", "playlist"].includes(loopMode);
    if (
        !validAction ||
        (loopMode !== undefined && !validLoop) ||
        (volume !== undefined &&
            (!Number.isFinite(volume) || volume < 0 || volume > 100))
    ) {
        return res.status(400).json({ error: "Invalid PlayNow state" });
    }
    if (
        action === "position" &&
        Number.isFinite(baseRevision) &&
        baseRevision < playNowState.revision
    ) {
        return res.json(playNowState);
    }
    if (action === "position" && !playNowState.playing) {
        return res.json(playNowState);
    }

    const nextPlaying =
        action === "position" && !playNowState.playing
            ? false
            : typeof playing === "boolean"
                ? playing
                : playNowState.playing;

    playNowState = {
        ...playNowState,
        revision: playNowState.revision + 1,
        action,
        selectedFile:
            typeof selectedFile === "string"
                ? selectedFile
                : playNowState.selectedFile,
        playing: nextPlaying,
        loopMode: loopMode ?? playNowState.loopMode,
        volume: volume ?? playNowState.volume,
        position:
            typeof position === "number" && Number.isFinite(position) && position >= 0
                ? position
                : playNowState.position,
        startedAt:
            nextPlaying && typeof startedAt === "number" && Number.isFinite(startedAt)
                ? startedAt
                : !nextPlaying || startedAt === null
                    ? null
                    : playNowState.startedAt,
        playlist: Array.isArray(playlist)
            ? playlist.filter((fileName): fileName is string => typeof fileName === "string")
            : playNowState.playlist,
        updatedAt: Date.now(),
    };
    res.json(playNowState);
});

app.post(
    "/api/playnow/upload",
    uploadPlayNow.single("track"),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                error: "Helifail on kohustuslik",
            });
        }

        res.status(201).json({
            fileName: req.file.filename,
            name: path
                .parse(req.file.filename)
                .name
                .replace(/_\d{10,}$/, "")
                .replace(/_/g, " "),
        });
    }
);

app.delete("/api/playnow/:fileName", async (req, res) => {
    try {
        const fileName = path.basename(req.params.fileName);
        await fs.unlink(
            path.join(process.cwd(), "playnow", fileName)
        );
        res.json({ message: "Track deleted" });
    } catch (error) {
        console.error("Failed to delete PlayNow track:", error);
        res.status(404).json({ error: "Loo kustutamine ebaõnnestus" });
    }
});


// =========================================
// PROFILES
// =========================================

app.get(
    "/api/profiles",
    async (req, res) => {
        try {
            const profiles =
                await getProfiles();

            res.json(
                profiles
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to get profiles",
            });
        }
    }
);


app.post(
    "/api/profiles",
    async (req, res) => {
        try {
            const {
                name,
            } = req.body;

            if (!name) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Profile name is required",
                    });
            }

            const profile =
                await createProfile(
                    name
                );

            res
                .status(201)
                .json(
                    profile
                );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to create profile",
            });
        }
    }
);


app.put(
    "/api/profiles/:id",
    async (req, res) => {
        try {
            const id =
                Number(
                    req.params.id
                );

            const {
                name,
            } = req.body;

            if (!name) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Profile name is required",
                    });
            }

            const profile =
                await updateProfile(
                    id,
                    name
                );

            res.json(
                profile
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to update profile",
            });
        }
    }
);


app.delete(
    "/api/profiles/:id",
    async (req, res) => {
        try {
            const id =
                Number(
                    req.params.id
                );

            await deleteProfile(
                id
            );

            const database = new Database(path.join(process.cwd(), "schoolbell.db"));
            const assignmentRows = database
                .prepare('SELECT "key", "value" FROM "AppSetting" WHERE "key" IN (?, ?)')
                .all("profileByDay", "profileByDate") as Array<{ key: string; value: string }>;
            const assignments = Object.fromEntries(
                assignmentRows.map((row) => [row.key, row.value])
            );
            const removeDeletedProfile = (value: string | undefined) => {
                if (!value) {
                    return {};
                }
                try {
                    const parsed = JSON.parse(value) as Record<string, number | null>;
                    return Object.fromEntries(
                        Object.entries(parsed).map(([key, profileId]) => [
                            key,
                            profileId === id ? null : profileId,
                        ])
                    );
                } catch (assignmentError) {
                    console.error("Failed to clean profile assignments:", assignmentError);
                    return {};
                }
            };
            const saveAssignment = database.prepare(
                'INSERT INTO "AppSetting" ("key", "value") VALUES (?, ?) ' +
                'ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"'
            );
            saveAssignment.run(
                "profileByDay",
                JSON.stringify(removeDeletedProfile(assignments.profileByDay))
            );
            saveAssignment.run(
                "profileByDate",
                JSON.stringify(removeDeletedProfile(assignments.profileByDate))
            );
            database.close();

            res.json({
                message:
                    "Profile deleted",
            });
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to delete profile",
            });
        }
    }
);


// =========================================
// SCHEDULES
// =========================================

app.get(
    "/api/profiles/:profileId/schedules",
    async (req, res) => {
        try {
            const profileId =
                Number(
                    req.params.profileId
                );

            const schedules =
                await getSchedules(
                    profileId
                );

            res.json(
                schedules
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to get schedules",
            });
        }
    }
);


app.post(
    "/api/profiles/:profileId/schedules",
    async (req, res) => {

        try {

            const profileId =
                Number(
                    req.params.profileId
                );


            const {
                dayOfWeek,
                time,
                type,
                enabled,
                preBellEnabled,
                soundId,
                preBellSoundId,
            } = req.body;


            if (
                !dayOfWeek ||
                !time ||
                !type
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Day, time and type are required",

                });

            }


            if (
                type !==
                    "LESSON_START" &&
                type !==
                    "LESSON_END"
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Invalid schedule type",

                });

            }


            const schedule = await createSchedule(
                profileId,
                dayOfWeek,
                time,
                type,
                preBellEnabled,
                soundId ?? null
                ,
                preBellSoundId ?? null
            );


            res.status(
                201
            ).json(
                schedule
            );


        } catch (error) {

            console.error(
                error
            );


            res.status(
                500
            ).json({

                error:
                    "Failed to create schedule",

            });

        }

    }
);
app.put(
    "/api/schedules/:id",
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            const {
                dayOfWeek,
                time,
                type,
                enabled,
                preBellEnabled,
                soundId,
                preBellSoundId,
            } = req.body;


            if (
                !dayOfWeek ||
                !time ||
                !type
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Day, time and type are required",

                });

            }


            if (
                type !==
                    "LESSON_START" &&
                type !==
                    "LESSON_END"
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Invalid schedule type",

                });

            }


            const schedule =
                await updateSchedule(

                    id,

                    Number(
                        dayOfWeek
                    ),

                    time,

                    type,

                    enabled ??
                        true,

                    type ===
                        "LESSON_START"
                        ? (
                            preBellEnabled ??
                            true
                        )
                        : false,

                    soundId ??
                        null,

                    preBellSoundId ??
                        null
                );


            res.json(
                schedule
            );


        } catch (error) {

            console.error(
                error
            );


            res.status(
                500
            ).json({

                error:
                    "Failed to update schedule",

            });

        }

    }
);

app.delete(
    "/api/schedules/:id",
    async (req, res) => {
        try {
            const id =
                Number(
                    req.params.id
                );

            await deleteSchedule(
                id
            );

            res.json({
                message:
                    "Schedule deleted",
            });
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to delete schedule",
            });
        }
    }
);


// =========================================
// SOUNDS
// =========================================

app.get(
    "/api/sounds",
    async (req, res) => {
        try {
            const sounds =
                await getSounds();

            res.json(
                sounds
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to get sounds",
            });
        }
    }
);


app.post(
    "/api/sounds",
    async (req, res) => {
        try {
            const {
                name,
                fileName,
            } = req.body;


            if (
                !name ||
                !fileName
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Name and file name are required",
                    });
            }


            const sound =
                await createSound(
                    name,
                    fileName
                );


            res
                .status(201)
                .json(
                    sound
                );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to create sound",
            });
        }
    }
);


app.put(
    "/api/sounds/:id",
    async (req, res) => {
        try {
            const id =
                Number(
                    req.params.id
                );

            const {
                name,
                fileName,
            } = req.body;


            if (
                !name ||
                !fileName
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Name and file name are required",
                    });
            }


            const sound =
                await updateSound(
                    id,
                    name,
                    fileName
                );


            res.json(
                sound
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to update sound",
            });
        }
    }
);


app.delete(
    "/api/sounds/:id",
    async (req, res) => {
        try {
            const id =
                Number(
                    req.params.id
                );

            await deleteSound(
                id
            );

            res.json({
                message:
                    "Sound deleted",
            });
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to delete sound",
            });
        }
    }
);


// =========================================
// UPLOAD SOUND
// =========================================

app.post(
    "/api/sounds/upload",
    uploadSound.single("sound"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Helifail on kohustuslik",
                    });

            }


            const {
                name,
            } = req.body;


            if (
                !name ||
                !name.trim()
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Helifaili nimi on kohustuslik",
                    });

            }


            console.log(
                "Sound uploaded:",
                req.file
            );


            const sound =
                await createSound(
                    name.trim(),
                    req.file.filename
                );


            return res
                .status(201)
                .json(sound);

        } catch (error) {

            console.error(
                "Sound upload error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Helifaili üleslaadimine ebaõnnestus",
                });

        }

    }
);


// =========================================
// NEXT MAIN SCHEDULE
// =========================================

app.get(
    "/api/profiles/:profileId/next",
    async (req, res) => {

        try {

            const profileId =
                Number(
                    req.params.profileId
                );


            if (
                !Number.isInteger(
                    profileId
                )
            ) {

                return res.status(
                    400
                ).json({

                    error:
                        "Invalid profile ID",

                });

            }


            const nextEvent =
                await getNextBellEvent(
                    profileId,
                    Math.max(
                        0,
                        Math.min(
                            60,
                            Number.isFinite(Number(req.query.preBellMinutes))
                                ? Number(req.query.preBellMinutes)
                                : getSyncedSettings().preBellMinutes
                        )
                    )
                );


            res.json(
                nextEvent
            );


        } catch (error) {

            console.error(
                "Failed to get next bell event:",
                error
            );


            res.status(
                500
            ).json({

                error:
                    "Failed to get next bell event",

            });

        }

    }
);


// =========================================
// NEXT BELL EVENT
// =========================================

app.get(
    "/api/profiles/:profileId/next-event",
    async (req, res) => {
        try {
            const profileId =
                Number(
                    req.params.profileId
                );


            if (!getAutomaticEnabled()) {
                res.json(null);
                return;
            }

            const nextEvent =
                await getNextBellEvent(
                    profileId,
                    Math.max(
                        0,
                        Math.min(
                            60,
                            Number.isFinite(Number(req.query.preBellMinutes))
                                ? Number(req.query.preBellMinutes)
                                : getSyncedSettings().preBellMinutes
                        )
                    )
                );


            res.json(
                nextEvent
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to get next bell event",
            });
        }
    }
);


// =========================================
// START SERVER
// =========================================

const server = app.listen(PORT, HOST, () => {
    console.log(
        `Server started on http://${HOST}:${PORT}`
    );
});

if (FRONTEND_HOST && clientDistPath) {
    const frontendApp = express();

    for (const route of ["/api", "/sounds", "/playnow"]) {
        frontendApp.use(
            route,
            createProxyMiddleware({
                target: `http://${HOST}:${PORT}`,
                changeOrigin: false,
                pathRewrite: {
                    "^/": `${route}/`,
                },
            })
        );
    }
    frontendApp.use(express.static(clientDistPath));
    frontendApp.use((_req, res) => {
        res.sendFile(path.join(clientDistPath, "index.html"));
    });

    frontendApp.listen(FRONTEND_PORT, FRONTEND_HOST, () => {
        console.log(
            `Frontend started on http://${FRONTEND_HOST}:${FRONTEND_PORT}`
        );
    });
}

server.on("error", (error) => {
    console.error(
        "HTTP server error:",
        error
    );

    process.exitCode = 1;
    process.exit(1);
});

server.on("close", () => {
    console.log(
        "HTTP server closed"
    );
});