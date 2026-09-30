import {
    app,
    BrowserWindow,
} from "electron";

import path from "path";
import { spawn } from "child_process";


let mainWindow: BrowserWindow | null = null;

let serverProcess:
    ReturnType<typeof spawn> | null = null;


// ========================================
// PATHS
// ========================================

const projectRoot = path.resolve(
    __dirname,
    ".."
);

const serverPath = path.join(
    projectRoot,
    "server",
    "dist",
    "server.js"
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


                    if (
                        code !== 0
                    ) {

                        console.error(
                            "SchoolBell server exited unexpectedly."
                        );

                    }

                }
            );


            waitForServer(
                "http://localhost:3000/"
            )
                .then(() => {
                    resolve();
                })
                .catch(
                    (error) => {

                        console.error(
                            "Server startup timeout:",
                            error
                        );

                        reject(error);

                    }
                );

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


// ========================================
// CREATE WINDOW
// ========================================

function createWindow() {

    mainWindow =
        new BrowserWindow({

            width: 1440,

            height: 900,

            minWidth: 1200,

            minHeight: 700,


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


    mainWindow.loadURL(
        "http://localhost:5173"
    );


    mainWindow.on(
        "closed",
        () => {

            mainWindow = null;

        }
    );
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

        stopServer();

    }
);