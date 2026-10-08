"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const dgram_1 = __importDefault(require("dgram"));
const child_process_1 = require("child_process");
const util_1 = require("util");
let mainWindow = null;
let tray = null;
let isQuitting = false;
let serverProcess = null;
const FRONTEND_PORT = 5173;
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
function writeMainLog(level, message, details) {
    try {
        const logPath = path_1.default.join(electron_1.app.getPath("userData"), "koolikell.log");
        const detail = details === undefined ? "" : ` ${JSON.stringify(details)}`;
        fs_1.default.appendFileSync(logPath, `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${detail}${os_1.default.EOL}`, "utf8");
    }
    catch (error) {
        console.error("Failed to write main log:", error);
    }
}
process.on("uncaughtException", (error) => writeMainLog("error", "Uncaught main process exception", error));
process.on("unhandledRejection", (reason) => writeMainLog("error", "Unhandled main process rejection", reason));
process.on("warning", (warning) => writeMainLog("warn", "Node.js warning", warning));
function getConnectionInfo() {
    const interfaces = os_1.default.networkInterfaces();
    const candidates = [];
    for (const [name, entries] of Object.entries(interfaces)) {
        for (const entry of entries ?? []) {
            if (entry.family !== "IPv4" || entry.internal) {
                continue;
            }
            const normalizedName = name.toLowerCase();
            const isEthernet = /ethernet|lan|以太网|локальн/.test(normalizedName);
            const isWifi = /wi-?fi|wireless|wlan|беспровод/.test(normalizedName);
            candidates.push({
                address: entry.address,
                name,
                priority: isEthernet ? 0 : isWifi ? 1 : 2,
            });
        }
    }
    const sortedCandidates = candidates.sort((a, b) => a.priority - b.priority);
    const selected = sortedCandidates[0];
    const connectionType = selected === undefined
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
function queryNtpServer(server) {
    return new Promise((resolve, reject) => {
        const socket = dgram_1.default.createSocket("udp4");
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
            const serverTime = (seconds - 2208988800) * 1000 +
                (fraction / 0x100000000) * 1000;
            const receivedAt = Date.now();
            const offsetMs = serverTime - (startedAt + receivedAt) / 2;
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
    return path_1.default.join(electron_1.app.getPath("userData"), "windows-settings.json");
}
function readHiddenSetting() {
    try {
        const contents = fs_1.default.readFileSync(getWindowsSettingsPath(), "utf8");
        return JSON.parse(contents).openAsHidden ?? false;
    }
    catch {
        return false;
    }
}
// ========================================
// PATHS
// ========================================
const projectRoot = electron_1.app.isPackaged
    ? process.resourcesPath
    : path_1.default.resolve(__dirname, "..");
const serverPath = path_1.default.join(projectRoot, "server", "dist", "server.js");
const clientDistPath = path_1.default.join(projectRoot, "client", "dist");
const dataRoot = path_1.default.join(electron_1.app.getPath("userData"), "data");
const dataSoundsPath = path_1.default.join(dataRoot, "sounds");
const dataPlayNowPath = path_1.default.join(dataRoot, "playnow");
function prepareDataDirectory() {
    fs_1.default.mkdirSync(dataRoot, { recursive: true });
    fs_1.default.mkdirSync(dataSoundsPath, { recursive: true });
    fs_1.default.mkdirSync(dataPlayNowPath, { recursive: true });
}
// ========================================
// WAIT FOR SERVER
// ========================================
async function waitForServer(url, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start <
        timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log("koolikell server is ready.");
                return;
            }
        }
        catch {
            // Server is not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Server did not start within ${timeout}ms`);
}
// ========================================
// START SERVER
// ========================================
function startServer() {
    return new Promise((resolve, reject) => {
        let serverReady = false;
        console.log("Starting koolikell server...");
        console.log("Server:", serverPath);
        prepareDataDirectory();
        serverProcess = (0, child_process_1.spawn)(process.execPath, [
            serverPath,
        ], {
            cwd: dataRoot,
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: "1",
                DATABASE_URL: "file:./schoolbell.db",
                HOST: "127.0.0.1",
                FRONTEND_HOST: electron_1.app.isPackaged
                    ? "0.0.0.0"
                    : undefined,
                CLIENT_DIST_PATH: clientDistPath,
            },
            stdio: [
                "ignore",
                "pipe",
                "pipe",
            ],
        });
        serverProcess.stdout?.on("data", (data) => {
            console.log(`[SERVER] ${data.toString().trim()}`);
        });
        serverProcess.stderr?.on("data", (data) => {
            console.error(`[SERVER] ${data.toString().trim()}`);
        });
        serverProcess.on("error", (error) => {
            console.error("Failed to start server:", error);
            reject(error);
        });
        serverProcess.on("exit", (code, signal) => {
            console.log(`Server stopped. Code: ${code}, Signal: ${signal}`);
            serverProcess = null;
            if (!serverReady) {
                reject(new Error("koolikell server exited before becoming ready."));
            }
            if (code !== 0) {
                console.error("koolikell server exited unexpectedly.");
            }
        });
        setTimeout(() => {
            waitForServer("http://localhost:3000/")
                .then(() => electron_1.app.isPackaged
                ? waitForServer("http://127.0.0.1:5173/")
                : undefined)
                .then(() => {
                serverReady = true;
                resolve();
            })
                .catch((error) => {
                console.error("Server startup timeout:", error);
                reject(error);
            });
        }, 500);
    });
}
// ========================================
// STOP SERVER
// ========================================
function stopServer() {
    if (!serverProcess) {
        return;
    }
    console.log("Stopping koolikell server...");
    serverProcess.kill();
    serverProcess = null;
}
electron_1.ipcMain.handle("windows-settings:get", () => {
    const settings = electron_1.app.getLoginItemSettings();
    return {
        openAtLogin: settings.openAtLogin,
        openAsHidden: readHiddenSetting(),
    };
});
electron_1.ipcMain.handle("windows-settings:set", (_event, settings) => {
    electron_1.app.setLoginItemSettings({
        path: process.execPath,
        openAtLogin: settings.openAtLogin,
        name: electron_1.app.getName(),
        args: settings.openAsHidden
            ? ["--hidden"]
            : [],
    });
    fs_1.default.writeFileSync(getWindowsSettingsPath(), JSON.stringify(settings), "utf8");
    return settings;
});
electron_1.ipcMain.handle("connection-info:get", () => getConnectionInfo());
electron_1.ipcMain.handle("logs:write", (_event, entry) => {
    const logPath = path_1.default.join(electron_1.app.getPath("userData"), "koolikell.log");
    fs_1.default.appendFileSync(logPath, `${JSON.stringify(entry)}${os_1.default.EOL}`, "utf8");
});
// ========================================
// CREATE WINDOW
// ========================================
function createWindow() {
    const startHidden = process.argv.includes("--hidden");
    mainWindow =
        new electron_1.BrowserWindow({
            title: "koolikell",
            width: 1440,
            height: 900,
            minWidth: 1200,
            minHeight: 700,
            show: !startHidden,
            webPreferences: {
                preload: path_1.default.join(__dirname, "preload.js"),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });
    if (electron_1.app.isPackaged) {
        void mainWindow.loadFile(path_1.default.join(clientDistPath, "index.html"));
    }
    else {
        void mainWindow.loadURL("http://localhost:5173");
    }
    mainWindow.once("ready-to-show", () => {
        if (!startHidden) {
            mainWindow?.show();
        }
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
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
    const iconPath = electron_1.app.isPackaged
        ? path_1.default.join(projectRoot, "build", "icon.ico")
        : path_1.default.resolve(__dirname, "..", "build", "icon.ico");
    const icon = createTrayIcon(iconPath, true);
    if (icon.isEmpty()) {
        throw new Error(`Failed to load tray icon from ${iconPath}`);
    }
    tray = new electron_1.Tray(icon);
    tray.setToolTip("koolikell");
    tray.setContextMenu(electron_1.Menu.buildFromTemplate([
        {
            label: "Ava koolikell",
            click: () => mainWindow?.show(),
        },
        {
            label: "Välju",
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            },
        },
    ]));
    tray.on("double-click", () => mainWindow?.show());
}
function createTrayIcon(iconPath, enabled) {
    const source = electron_1.nativeImage.createFromPath(iconPath);
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
            const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
            bitmap[index] = luminance;
            bitmap[index + 1] = luminance;
            bitmap[index + 2] = luminance;
        }
    }
    return electron_1.nativeImage
        .createFromBitmap(bitmap, size)
        .resize({ width: 16, height: 16 });
}
function updateTrayIcon(enabled) {
    if (!tray) {
        return;
    }
    const iconPath = electron_1.app.isPackaged
        ? path_1.default.join(projectRoot, "build", "icon.ico")
        : path_1.default.resolve(__dirname, "..", "build", "icon.ico");
    tray.setImage(createTrayIcon(iconPath, enabled));
    tray.setToolTip(enabled ? "koolikell – automaatne helistamine sees" : "koolikell – automaatne helistamine väljas");
}
// ========================================
// APP READY
// ========================================
electron_1.app.whenReady().then(async () => {
    try {
        electron_1.app.setName("koolikell");
        await startServer();
        console.log("Backend is ready.");
        createWindow();
        createTray();
    }
    catch (error) {
        console.error("Failed to initialize koolikell:", error);
        electron_1.app.quit();
    }
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow
            .getAllWindows()
            .length === 0) {
            createWindow();
        }
    });
});
// ========================================
// WINDOWS CLOSED
// ========================================
electron_1.app.on("window-all-closed", () => {
    stopServer();
    if (process.platform !==
        "darwin") {
        electron_1.app.quit();
    }
});
// ========================================
// BEFORE QUIT
// ========================================
electron_1.app.on("before-quit", () => {
    isQuitting = true;
    stopServer();
});
electron_1.ipcMain.handle("automatic-enabled:set", (_event, enabled) => {
    if (typeof enabled !== "boolean") {
        throw new Error("Invalid automatic calling state");
    }
    updateTrayIcon(enabled);
});
electron_1.ipcMain.handle("sounds-folder:open", async () => {
    const soundsPath = path_1.default.join(dataSoundsPath);
    fs_1.default.mkdirSync(soundsPath, {
        recursive: true,
    });
    const error = await electron_1.shell.openPath(soundsPath);
    if (error) {
        throw new Error(error);
    }
    return soundsPath;
});
electron_1.ipcMain.handle("time:ntp", (_event, server) => queryNtpServer(typeof server === "string" && /^[a-zA-Z0-9.-]+$/.test(server)
    ? server
    : "ntp1.eenet.ee"));
electron_1.ipcMain.handle("time:sync-system", async (_event, server) => {
    const ntpServer = typeof server === "string" && /^[a-zA-Z0-9.-]+$/.test(server)
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
    }
    catch (error) {
        throw new Error("Windows ei lubanud aega muuta. Kinnita administraatori õigused.", { cause: error });
    }
    return {
        ...result,
        offsetMs: 0,
        synced: true,
    };
});
electron_1.ipcMain.handle("browser:open", async (_event, url) => {
    if (!/^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/.*)?$/.test(url)) {
        throw new Error("Invalid external URL");
    }
    await electron_1.shell.openExternal(url);
});
electron_1.ipcMain.handle("playnow-folder:open", async () => {
    const playNowPath = path_1.default.join(dataPlayNowPath);
    fs_1.default.mkdirSync(playNowPath, { recursive: true });
    const error = await electron_1.shell.openPath(playNowPath);
    if (error) {
        throw new Error(error);
    }
    return playNowPath;
});
