import {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    Tray,
    nativeImage,
} from "electron";

import path from "path";
import fs from "fs";
import { spawn } from "child_process";


let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

let serverProcess:
    ReturnType<typeof spawn> | null = null;

interface WindowsSettings {
    openAtLogin: boolean;
    openAsHidden: boolean;
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
                    "SchoolBell server is ready."
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
                "Starting SchoolBell server..."
            );

            console.log(
                "Server:",
                serverPath
            );


            const nodePath =
                "C:\\Program Files\\nodejs\\node.exe";


            serverProcess = spawn(
                nodePath,
                [
                    serverPath,
                ],
                {
                    cwd: path.join(
                        projectRoot,
                        "server"
                    ),

                    env: {
                        ...process.env,
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
                                "SchoolBell server exited before becoming ready."
                            )
                        );
                    }


                    if (
                        code !== 0
                    ) {

                        console.error(
                            "SchoolBell server exited unexpectedly."
                        );

                    }

                }
            );


            setTimeout(() => {
                waitForServer(
                    "http://localhost:3000/"
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
        "Stopping SchoolBell server..."
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
            openAtLogin: settings.openAtLogin,
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


// ========================================
// CREATE WINDOW
// ========================================

function createWindow() {

    const startHidden =
        process.argv.includes("--hidden");

    mainWindow =
        new BrowserWindow({

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

    const icon = nativeImage.createFromPath(
        path.join(
            projectRoot,
            "client",
            "public",
            "favicon.svg"
        )
    );

    tray = new Tray(icon);
    tray.setToolTip("SchoolBell");
    tray.setContextMenu(
        Menu.buildFromTemplate([
            {
                label: "Ava SchoolBell",
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


// ========================================
// APP READY
// ========================================

app.whenReady().then(
    async () => {

        try {

            await startServer();


            console.log(
                "Backend is ready."
            );


            createWindow();
            createTray();

        } catch (error) {

            console.error(
                "Failed to initialize SchoolBell:",
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