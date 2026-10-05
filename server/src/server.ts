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
                            Number(
                                req.query.preBellMinutes ?? 2
                            ) || 2
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


            const nextEvent =
                await getNextBellEvent(
                    profileId,
                    Math.max(
                        0,
                        Math.min(
                            60,
                            Number(
                                req.query.preBellMinutes ?? 2
                            ) || 2
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

    process.exitCode = 1;
    process.exit(1);
});

server.on("close", () => {
    console.log(
        "HTTP server closed"
    );
});