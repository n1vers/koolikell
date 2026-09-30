import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
    process.env.DATABASE_URL ??
    "file:./schoolbell.db";

const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.replace(/^file:/, ""),
});

const prisma = new PrismaClient({
    adapter,
});


// =========================================
// TYPES
// =========================================

export type BellEventType =
    | "warning"
    | "bell";

export interface BellEvent {
    type: BellEventType;

    time: string;

    schedule: {
        id: number;
        profileId: number;
        dayOfWeek: number;
        time: string;
        enabled: boolean;
        soundId: number | null;
        sound: unknown;
    };
}


// =========================================
// HELPERS
// =========================================

function timeToMinutes(
    time: string
): number {
    const [hours, minutes] =
        time.split(":").map(Number);

    return (
        hours * 60 +
        minutes
    );
}


function minutesToTime(
    totalMinutes: number
): string {
    const normalized =
        ((totalMinutes % 1440) +
            1440) %
        1440;

    const hours =
        Math.floor(
            normalized / 60
        );

    const minutes =
        normalized % 60;

    return `${String(hours).padStart(
        2,
        "0"
    )}:${String(minutes).padStart(
        2,
        "0"
    )}`;
}


function subtractMinutes(
    time: string,
    minutes: number
): string {
    return minutesToTime(
        timeToMinutes(time) -
            minutes
    );
}


// =========================================
// GET NEXT MAIN SCHEDULE
// =========================================

export async function getNextSchedule(
    profileId: number
) {
    const now = new Date();

    const jsDay = now.getDay();

    /*
     * JavaScript:
     *
     * 0 = Sunday
     * 1 = Monday
     * 2 = Tuesday
     * ...
     * 6 = Saturday
     *
     * Our database:
     *
     * 1 = Monday
     * ...
     * 7 = Sunday
     */

    const currentDay =
        jsDay === 0
            ? 7
            : jsDay;

    const currentTime =
        `${String(
            now.getHours()
        ).padStart(2, "0")}:${String(
            now.getMinutes()
        ).padStart(2, "0")}`;


    // =====================================
    // TODAY
    // =====================================

    const todaySchedules =
        await prisma.schedule.findMany({
            where: {
                profileId,

                dayOfWeek:
                    currentDay,

                enabled: true,
            },

            include: {
                sound: true,
            },

            orderBy: {
                time: "asc",
            },
        });


    const nextToday =
        todaySchedules.find(
            (schedule) =>
                schedule.time >
                currentTime
        );


    if (nextToday) {
        return nextToday;
    }


    // =====================================
    // NEXT DAYS
    // =====================================

    for (
        let offset = 1;
        offset <= 7;
        offset++
    ) {
        const nextDay =
            (
                (
                    currentDay -
                    1 +
                    offset
                ) % 7
            ) + 1;


        const nextSchedules =
            await prisma.schedule.findMany({
                where: {
                    profileId,

                    dayOfWeek:
                        nextDay,

                    enabled: true,
                },

                include: {
                    sound: true,
                },

                orderBy: {
                    time: "asc",
                },
            });


        if (
            nextSchedules.length >
            0
        ) {
            return nextSchedules[0];
        }
    }


    return null;
}


// =========================================
// GET NEXT BELL EVENT
// =========================================

export async function getNextBellEvent(
    profileId: number
): Promise<BellEvent | null> {
    const now = new Date();

    const jsDay =
        now.getDay();

    const currentDay =
        jsDay === 0
            ? 7
            : jsDay;

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    // =====================================
    // GET ALL ACTIVE SCHEDULES
    // =====================================

    const schedules =
        await prisma.schedule.findMany({
            where: {
                profileId,
                enabled: true,
            },

            include: {
                sound: true,
            },

            orderBy: [
                {
                    dayOfWeek: "asc",
                },

                {
                    time: "asc",
                },
            ],
        });


    if (
        schedules.length === 0
    ) {
        return null;
    }


    // =====================================
    // CHECK EVENTS
    // =====================================

    let closestEvent:
        BellEvent | null = null;

    let closestDifference =
        Infinity;


    for (
        let dayOffset = 0;
        dayOffset <= 7;
        dayOffset++
    ) {
        const targetDay =
            (
                (
                    currentDay -
                    1 +
                    dayOffset
                ) % 7
            ) + 1;


        const daySchedules =
            schedules.filter(
                (schedule) =>
                    schedule.dayOfWeek ===
                    targetDay
            );


        for (
            const schedule
            of daySchedules
        ) {
            const bellMinutes =
                timeToMinutes(
                    schedule.time
                );


            // =================================
            // MAIN BELL
            // =================================

            let eventMinutes =
                bellMinutes;

            let eventType:
                BellEventType =
                "bell";


            /*
             * For today:
             *
             * 08:00 is valid only if
             * it hasn't happened yet.
             *
             * For future days everything
             * is valid.
             */

            if (
                dayOffset === 0 &&
                eventMinutes <=
                    currentMinutes
            ) {
                continue;
            }


            let difference =
                dayOffset *
                    1440 +
                eventMinutes -
                currentMinutes;


            if (
                difference >= 0 &&
                difference <
                    closestDifference
            ) {
                closestDifference =
                    difference;

                closestEvent = {
                    type:
                        eventType,

                    time:
                        minutesToTime(
                            eventMinutes
                        ),

                    schedule,
                };
            }


            // =================================
            // WARNING BELL
            // =================================

            const warningMinutes =
                bellMinutes - 2;


            /*
             * Предзвон может попасть
             * на предыдущий день.
             *
             * Например:
             *
             * 00:01 основной
             * 23:59 предзвон
             *
             * Поэтому нормализуем время.
             */

            let warningDayOffset =
                dayOffset;

            let normalizedWarningMinutes =
                warningMinutes;


            if (
                warningMinutes < 0
            ) {
                normalizedWarningMinutes +=
                    1440;

                warningDayOffset -=
                    1;
            }


            /*
             * Если предзвон
             * относится к вчерашнему
             * дню — пропускаем.
             */

            if (
                warningDayOffset <
                0
            ) {
                continue;
            }


            if (
                warningDayOffset ===
                    0 &&
                normalizedWarningMinutes <=
                    currentMinutes
            ) {
                continue;
            }


            difference =
                warningDayOffset *
                    1440 +
                normalizedWarningMinutes -
                currentMinutes;


            if (
                difference >= 0 &&
                difference <
                    closestDifference
            ) {
                closestDifference =
                    difference;

                closestEvent = {
                    type:
                        "warning",

                    time:
                        minutesToTime(
                            normalizedWarningMinutes
                        ),

                    schedule,
                };
            }
        }
    }


    return closestEvent;
}