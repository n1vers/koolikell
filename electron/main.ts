import {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    Tray,
    nativeImage,
    shell,
} from "electron";

import path from "path";
import fs from "fs";
import os from "os";
import dgram from "dgram";
import { execFile, spawn } from "child_process";
import { promisify } from "util";


let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

let serverProcess:
    ReturnType<typeof spawn> | null = null;
const FRONTEND_PORT = 5173;
const execFileAsync = promisify(execFile);

function writeMainLog(level: "info" | "warn" | "error", message: string, details?: unknown) {
    try {
        const logPath = path.join(app.getPath("userData"), "koolikell.log");
        const detail = details === undefined ? "" : ` ${JSON.stringify(details)}`;
        fs.appendFileSync(
            logPath,
            `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${detail}${os.EOL}`,
            "utf8"
        );
    } catch (error) {
        console.error("Failed to write main log:", error);
    }
}

process.on("uncaughtException", (error) => writeMainLog("error", "Uncaught main process exception", error));
process.on("unhandledRejection", (reason) => writeMainLog("error", "Unhandled main process rejection", reason));
process.on("warning", (warning) => writeMainLog("warn", "Node.js warning", warning));

interface WindowsSettings {
    openAtLogin: boolean;
    openAsHidden: boolean;
}

interface NtpResult {
    server: string;
    offsetMs: number;
    checkedAt: string;
    targetTimeMs: number;
}

interface ConnectionInfo {
    address: string | null;
    port: number;
    interfaceName: string | null;
    connectionType: "ethernet" | "wifi" | "other" | "none";
    addresses: Array<{
        address: string;
        interfaceName: string;
        connectionType: "ethernet" | "wifi" | "other";
    }>;
}

function getConnectionInfo(): ConnectionInfo {
    const interfaces = os.networkInterfaces();
    const candidates: Array<{
        address: string;
        name: string;
        priority: number;
    }> = [];

    for (const [name, entries] of Object.entries(interfaces)) {
        for (const entry of entries ?? []) {
            if (entry.family !== "IPv4" || entry.internal) {
                continue;
            }

            const normalizedName = name.toLowerCase();
            const isEthernet =
                /ethernet|lan|以太网|локальн/.test(normalizedName);
            const isWifi =
                /wi-?fi|wireless|wlan|беспровод/.test(normalizedName);

            candidates.push({
                address: entry.address,
                name,
                priority: isEthernet ? 0 : isWifi ? 1 : 2,
            });
        }
    }

    const sortedCandidates = candidates.sort((a, b) => a.priority - b.priority);
    const selected = sortedCandidates[0];
    const connectionType =
        selected === undefined
            ? "none"
            : selected.priority === 0
                ? "ethernet"
                : selected.priority === 1
                    ? "wifi"
                    : "other";

    return {
        address: selected?.address ?? null,
        port: FRONTEND_PORT,
        interfaceName: selected?.name ?? null,
        connectionType,
        addresses: sortedCandidates.map(({ address, name, priority }) => ({
            address,
            interfaceName: name,
            connectionType: priority === 0 ? "ethernet" : priority === 1 ? "wifi" : "other",
        })),
    };
}

function queryNtpServer(
    server: string
): Promise<NtpResult> {
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket("udp4");
        const startedAt = Date.now();
        const packet = Buffer.alloc(48);
        packet[0] = 0x1b;

        const finish = () => {
            socket.close();
        };

        const timeout = setTimeout(() => {
            finish();
            reject(new Error("NTP timeout"));
        }, 4000);

        socket.once("error", (error) => {
            clearTimeout(timeout);
            finish();
            reject(error);
        });

        socket.once("message", (message) => {
            clearTimeout(timeout);

            if (message.length < 48) {
                finish();
                reject(new Error("Invalid NTP response"));
                return;
            }

            const seconds = message.readUInt32BE(40);
            const fraction = message.readUInt32BE(44);
            const serverTime =
                (seconds - 2208988800) * 1000 +
                (fraction / 0x100000000) * 1000;
            const receivedAt = Date.now();
            const offsetMs =
                serverTime - (startedAt + receivedAt) / 2;

            finish();
            resolve({
                server,
                offsetMs,
                checkedAt: new Date().toISOString(),
                targetTimeMs: Date.now() + offsetMs,
            });
        });

        socket.send(packet, 123, server, (error) => {
            if (error) {
                clearTimeout(timeout);
                finish();
                reject(error);
            }
        });
    });
}

function getWindowsSettingsPath() {
    return path.join(
        app.getPath("userData"),
        "windows-settings.json"
    );
}

function readHiddenSetting() {
    try {
        const contents = fs.readFileSync(
            getWindowsSettingsPath(),
            "utf8"
        );

        return (
            JSON.parse(contents) as Partial<WindowsSettings>
        ).openAsHidden ?? false;
    } catch {
        return false;
    }
}


// ========================================
// PATHS
// ========================================

const projectRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, "..");

const serverPath = path.join(
    projectRoot,
    "server",
    "dist",
    "server.js"
);

const clientDistPath = path.join(
    projectRoot,
    "client",
    "dist"
);

const dataRoot = path.join(
    app.getPath("userData"),
    "data"
);

const dataSoundsPath = path.join(
    dataRoot,
    "sounds"
);

const dataPlayNowPath = path.join(
    dataRoot,
    "playnow"
);

function prepareDataDirectory() {
    fs.mkdirSync(dataRoot, { recursive: true });
    fs.mkdirSync(dataSoundsPath, { recursive: true });
    fs.mkdirSync(dataPlayNowPath, { recursive: true });
}


// ========================================
// WAIT FOR SERVER
// ========================================

async function waitForServer(
    url: string,
    timeout = 15000
): Promise<void> {

    const start = Date.now();

    while (
        Date.now() - start <
        timeout
    ) {

        try {

            const response =
                await fetch(url);

            if (response.ok) {

                console.log(
                    "koolikell server is ready."
                );

                return;
            }

        } catch {
            // Server is not ready yet
        }

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    300
                )
        );
    }

    throw new Error(
        `Server did not start within ${timeout}ms`
    );
}


// ========================================
// START SERVER
// ========================================

function startServer(): Promise<void> {

    return new Promise(
        (resolve, reject) => {

            let serverReady = false;

            console.log(
                "Starting koolikell server..."
            );

            console.log(
                "Server:",
                serverPath
            );

            prepareDataDirectory();

            serverProcess = spawn(
                process.execPath,
                [
                    serverPath,
                ],
                {
                    cwd: dataRoot,

                    env: {
                        ...process.env,
                        ELECTRON_RUN_AS_NODE: "1",
                        DATABASE_URL: "file:./schoolbell.db",
                        HOST: "127.0.0.1",
                        FRONTEND_HOST: app.isPackaged
                            ? "0.0.0.0"
                            : undefined,
                        CLIENT_DIST_PATH: clientDistPath,
                    },

                    stdio: [
                        "ignore",
                        "pipe",
                        "pipe",
                    ],
                }
            );


            serverProcess.stdout?.on(
                "data",
                (data) => {

                    console.log(
                        `[SERVER] ${data.toString().trim()}`
                    );

                }
            );


            serverProcess.stderr?.on(
                "data",
                (data) => {

                    console.error(
                        `[SERVER] ${data.toString().trim()}`
                    );

                }
            );


            serverProcess.on(
                "error",
                (error) => {

                    console.error(
                        "Failed to start server:",
                        error
                    );

                    reject(error);

                }
            );


            serverProcess.on(
                "exit",
                (
                    code,
                    signal
                ) => {

                    console.log(
                        `Server stopped. Code: ${code}, Signal: ${signal}`
                    );


                    serverProcess = null;

                    if (!serverReady) {
                        reject(
                            new Error(
                                "koolikell server exited before becoming ready."
                            )
                        );
                    }


                    if (
                        code !== 0
                    ) {

                        console.error(
                            "koolikell server exited unexpectedly."
                        );

                    }

                }
            );


            setTimeout(() => {
                waitForServer("http://localhost:3000/")
                .then(() =>
                    app.isPackaged
                        ? waitForServer("http://127.0.0.1:5173/")
                        : undefined
                )
                .then(() => {
                    serverReady = true;
                    resolve();
                    })
                    .catch((error: unknown) => {
                        console.error(
                            "Server startup timeout:",
                            error
                        );

                        reject(error);
                    });
            }, 500);

        }
    );
}


// ========================================
// STOP SERVER
// ========================================

function stopServer() {

    if (
        !serverProcess
    ) {
        return;
    }


    console.log(
        "Stopping koolikell server..."
    );


    serverProcess.kill();


    serverProcess = null;
}

ipcMain.handle(
    "windows-settings:get",
    (): WindowsSettings => {
        const settings = app.getLoginItemSettings();

        return {
            openAtLogin: settings.openAtLogin,
            openAsHidden: readHiddenSetting(),
        };
    }
);

ipcMain.handle(
    "windows-settings:set",
    (
        _event,
        settings: WindowsSettings
    ): WindowsSettings => {
        app.setLoginItemSettings({
            path: process.execPath,
            openAtLogin: settings.openAtLogin,
            name: app.getName(),
            args: settings.openAsHidden
                ? ["--hidden"]
                : [],
        });

            fs.writeFileSync(
                getWindowsSettingsPath(),
                JSON.stringify(settings),
                "utf8"
            );

        return settings;
    }
);

ipcMain.handle(
    "connection-info:get",
    (): ConnectionInfo => getConnectionInfo()
);

ipcMain.handle(
    "logs:write",
    (
        _event,
        entry: {
            timestamp: string;
            level: "info" | "warn" | "error";
            message: string;
            details?: string;
        }
    ) => {
        const logPath = path.join(app.getPath("userData"), "koolikell.log");
        fs.appendFileSync(
            logPath,
            `${JSON.stringify(entry)}${os.EOL}`,
            "utf8"
        );
    }
);


// ========================================
// CREATE WINDOW
// ========================================

function createWindow() {

    const startHidden =
        process.argv.includes("--hidden");

    mainWindow =
        new BrowserWindow({
            title: "koolikell",

            width: 1440,

            height: 900,

            minWidth: 1200,

            minHeight: 700,

            show: !startHidden,


            webPreferences: {

                preload:
                    path.join(
                        __dirname,
                        "preload.js"
                    ),

                contextIsolation:
                    true,

                nodeIntegration:
                    false,
            },
        });


    if (app.isPackaged) {
        void mainWindow.loadFile(
            path.join(
                clientDistPath,
                "index.html"
            )
        );
    } else {
        void mainWindow.loadURL(
            "http://localhost:5173"
        );
    }

    mainWindow.once("ready-to-show", () => {
        if (!startHidden) {
            mainWindow?.show();
        }
    });


    mainWindow.on(
        "closed",
        () => {

            mainWindow = null;

        }
    );

    mainWindow.on("close", (event) => {
        if (isQuitting) {
            return;
        }

        event.preventDefault();
        mainWindow?.hide();
    });
}

function createTray() {
    if (tray) {
        return;
    }

    const iconPath = app.isPackaged
        ? path.join(projectRoot, "build", "icon.ico")
        : path.resolve(__dirname, "..", "build", "icon.ico");
    const icon = createTrayIcon(iconPath, true);

    if (icon.isEmpty()) {
        throw new Error(`Failed to load tray icon from ${iconPath}`);
    }

    tray = new Tray(icon);
    tray.setToolTip("koolikell");
    tray.setContextMenu(
        Menu.buildFromTemplate([
            {
                label: "Ava koolikell",
                click: () => mainWindow?.show(),
            },
            {
                label: "Välju",
                click: () => {
                    isQuitting = true;
                    app.quit();
                },
            },
        ])
    );

    tray.on("double-click", () => mainWindow?.show());
}

function createTrayIcon(iconPath: string, enabled: boolean) {
    const source = nativeImage.createFromPath(iconPath);
    if (source.isEmpty()) {
        throw new Error(`Failed to load tray icon from ${iconPath}`);
    }

    const size = source.getSize();
    const bitmap = source.toBitmap();
    if (!enabled) {
        for (let index = 0; index < bitmap.length; index += 4) {
            const blue = bitmap[index];
            const green = bitmap[index + 1];
            const red = bitmap[index + 2];
            const luminance = Math.round(
                red * 0.299 + green * 0.587 + blue * 0.114
            );
            bitmap[index] = luminance;
            bitmap[index + 1] = luminance;
            bitmap[index + 2] = luminance;
        }
    }

    return nativeImage
        .createFromBitmap(bitmap, size)
        .resize({ width: 16, height: 16 });
}

function updateTrayIcon(enabled: boolean) {
    if (!tray) {
        return;
    }

    const iconPath = app.isPackaged
        ? path.join(projectRoot, "build", "icon.ico")
        : path.resolve(__dirname, "..", "build", "icon.ico");
    tray.setImage(createTrayIcon(iconPath, enabled));
    tray.setToolTip(enabled ? "koolikell – automaatne helistamine sees" : "koolikell – automaatne helistamine väljas");
}


// ========================================
// APP READY
// ========================================

app.whenReady().then(
    async () => {

        try {

            app.setName("koolikell");

            await startServer();


            console.log(
                "Backend is ready."
            );


            createWindow();
            createTray();

        } catch (error) {

            console.error(
                "Failed to initialize koolikell:",
                error
            );


            app.quit();

        }


        app.on(
            "activate",
            () => {

                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {

                    createWindow();

                }

            }
        );

    }
);


// ========================================
// WINDOWS CLOSED
// ========================================

app.on(
    "window-all-closed",
    () => {

        stopServer();


        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();

        }

    }
);


// ========================================
// BEFORE QUIT
// ========================================

app.on(
    "before-quit",
    () => {

        isQuitting = true;

        stopServer();

    }
);

ipcMain.handle(
    "automatic-enabled:set",
    (_event, enabled: boolean) => {
        if (typeof enabled !== "boolean") {
            throw new Error("Invalid automatic calling state");
        }
        updateTrayIcon(enabled);
    }
);

ipcMain.handle(
    "sounds-folder:open",
    async () => {
        const soundsPath = path.join(
            dataSoundsPath
        );

        fs.mkdirSync(soundsPath, {
            recursive: true,
        });

        const error = await shell.openPath(
            soundsPath
        );

        if (error) {
            throw new Error(error);
        }

        return soundsPath;
    }
);

ipcMain.handle(
    "time:ntp",
    (_event, server?: string) => queryNtpServer(
        typeof server === "string" && /^[a-zA-Z0-9.-]+$/.test(server)
            ? server
            : "ntp1.eenet.ee"
    )
);

ipcMain.handle(
    "time:sync-system",
    async (_event, server?: string) => {
        const ntpServer =
            typeof server === "string" && /^[a-zA-Z0-9.-]+$/.test(server)
                ? server
                : "ntp1.eenet.ee";
        const result = await queryNtpServer(ntpServer);
        const script = `$date = [DateTimeOffset]::FromUnixTimeMilliseconds(${Math.round(result.targetTimeMs)}).LocalDateTime; Set-Date -Date $date`;
        const encodedScript = Buffer.from(script, "utf16le").toString("base64");

        try {
            await execFileAsync("powershell.exe", [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                `Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand','${encodedScript}'`,
            ]);
        } catch (error) {
            throw new Error(
                "Windows ei lubanud aega muuta. Kinnita administraatori õigused.",
                { cause: error }
            );
        }

        return {
            ...result,
            offsetMs: 0,
            synced: true,
        };
    }
);

ipcMain.handle(
    "browser:open",
    async (_event, url: string) => {
        if (!/^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/.*)?$/.test(url)) {
            throw new Error("Invalid external URL");
        }
        await shell.openExternal(url);
    }
);

ipcMain.handle(
    "playnow-folder:open",
    async () => {
        const playNowPath = path.join(
            dataPlayNowPath
        );

        fs.mkdirSync(playNowPath, { recursive: true });
        const error = await shell.openPath(playNowPath);

        if (error) {
            throw new Error(error);
        }

        return playNowPath;
    }
);