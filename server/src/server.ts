import express from "express";
import cors from "cors";
import path from "path";

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


const app = express();

const PORT = 3000;


// =========================================
// MIDDLEWARE
// =========================================

app.use(cors());

app.use(
    express.json()
);


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


// =========================================
// ROOT
// =========================================

app.get(
    "/",
    (req, res) => {
        res.json({
            message:
                "SchoolBell API is running",
        });
    }
);


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
                soundId,
            } = req.body;


            if (
                dayOfWeek ===
                    undefined ||
                !time
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Day and time are required",
                    });
            }


            const schedule =
                await createSchedule(
                    profileId,
                    Number(
                        dayOfWeek
                    ),
                    time,
                    soundId ??
                        null
                );


            res
                .status(201)
                .json(
                    schedule
                );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
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
                enabled,
                soundId,
            } = req.body;


            const schedule =
                await updateSchedule(
                    id,

                    Number(
                        dayOfWeek
                    ),

                    time,

                    Boolean(
                        enabled
                    ),

                    soundId ??
                        null
                );


            res.json(
                schedule
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
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
    uploadSound.single(
        "sound"
    ),
    async (req, res) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Sound file is required",
                    });
            }


            const {
                name,
            } = req.body;


            if (!name) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Sound name is required",
                    });
            }


            const sound =
                await createSound(
                    name,
                    req.file.filename
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
                    "Failed to upload sound",
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


            const nextSchedule =
                await getNextSchedule(
                    profileId
                );


            res.json(
                nextSchedule
            );
        } catch (error) {
            console.error(
                error
            );

            res.status(500).json({
                error:
                    "Failed to get next schedule",
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


            const nextEvent =
                await getNextBellEvent(
                    profileId
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

const server = app.listen(PORT, () => {
    console.log(
        `Server started on http://localhost:${PORT}`
    );
});

server.on("error", (error) => {
    console.error(
        "HTTP server error:",
        error
    );
});

server.on("close", () => {
    console.log(
        "HTTP server closed"
    );
});