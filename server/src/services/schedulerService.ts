import "dotenv/config";

import {
    PrismaBetterSqlite3,
} from "@prisma/adapter-better-sqlite3";

import {
    PrismaClient,
} from "@prisma/client";


const databaseUrl =
    process.env.DATABASE_URL ??
    "file:./schoolbell.db";


const adapter =
    new PrismaBetterSqlite3({
        url: databaseUrl.replace(
            /^file:/,
            ""
        ),
    });


const prisma =
    new PrismaClient({
        adapter,
    });


// ============================================
// TYPES
// ============================================

export type BellEventType =
    | "PRE_BELL"
    | "BELL";


export interface BellEvent {

    scheduleId: number;

    profileId: number;

    dayOfWeek: number;

    time: string;

    eventTime: string;

    eventType: BellEventType;

    scheduleType:
        | "LESSON_START"
        | "LESSON_END";

    soundId: number | null;

    preBellSoundId: number | null;

    sound: unknown;

    preBellSound: unknown;

    preBellEnabled: boolean;

    enabled: boolean;
}


// ============================================
// TIME HELPERS
// ============================================

function timeToMinutes(
    time: string
): number {

    const [
        hours,
        minutes,
    ] =
        time
            .split(":")
            .map(Number);


    return (
        hours * 60 +
        minutes
    );
}


function minutesToTime(
    minutes: number
): string {

    const normalized =
        (
            minutes +
            24 * 60
        ) % (24 * 60);


    const hours =
        Math.floor(
            normalized / 60
        );


    const mins =
        normalized % 60;


    return (
        `${String(hours).padStart(2, "0")}:` +
        `${String(mins).padStart(2, "0")}`
    );
}


// ============================================
// GET NEXT BELL EVENT
// ============================================

export async function getNextBellEvent(
    profileId: number,
    preBellOffsetMinutes = 2
): Promise<BellEvent | null> {

    const now =
        new Date();


    /*
     * JS:
     *
     * Sunday = 0
     * Monday = 1
     * ...
     * Saturday = 6
     *
     * БД:
     *
     * Monday = 1
     * ...
     * Sunday = 7
     */

    const jsDay =
        now.getDay();


    const currentDay =
        jsDay === 0
            ? 7
            : jsDay;


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    /*
     * Загружаем всё расписание
     * текущего профиля.
     */

    const schedules =
        await prisma.schedule.findMany({

            where: {

                profileId,

                enabled: true,
            },

            include: {
                sound: true,
                preBellSound: true,
            },

            orderBy: [

                {
                    dayOfWeek:
                        "asc",
                },

                {
                    time:
                        "asc",
                },

            ],
        });


    if (
        schedules.length === 0
    ) {

        return null;

    }


    /*
     * Создаём события.
     *
     * LESSON_START:
     *
     * 08:00
     * +
     * preBellEnabled
     *
     * =>
     *
     * 07:58 PRE_BELL
     * 08:00 BELL
     *
     *
     * LESSON_END:
     *
     * 08:45
     *
     * =>
     *
     * 08:45 BELL
     */

    const events:
        BellEvent[] = [];


    for (
        const schedule of schedules
    ) {

        /*
         * Основной звонок.
         */

        events.push({

            scheduleId:
                schedule.id,

            profileId:
                schedule.profileId,

            dayOfWeek:
                currentDay,

            time:
                schedule.time,

            eventTime:
                schedule.time,

            eventType:
                "BELL",

            scheduleType:
                schedule.type as
                    | "LESSON_START"
                    | "LESSON_END",

            soundId:
                schedule.soundId,

            preBellSoundId:
                schedule.preBellSoundId,

            sound:
                schedule.sound,

            preBellSound:
                schedule.preBellSound,

            preBellEnabled:
                schedule.preBellEnabled,

            enabled:
                schedule.enabled,
        });


        /*
         * Предзвон существует
         * ТОЛЬКО перед началом урока.
         */

        if (
            schedule.type ===
                "LESSON_START" &&
            schedule.preBellEnabled
        ) {

            const mainMinutes =
                timeToMinutes(
                    schedule.time
                );


            const preBellMinutes =
                mainMinutes - preBellOffsetMinutes;


            events.push({

                scheduleId:
                    schedule.id,

                profileId:
                    schedule.profileId,

                dayOfWeek:
                    currentDay,

                time:
                    schedule.time,

                eventTime:
                    minutesToTime(
                        preBellMinutes
                    ),

                eventType:
                    "PRE_BELL",

                scheduleType:
                    "LESSON_START",

                soundId:
                    schedule.preBellSoundId,

                preBellSoundId:
                    schedule.preBellSoundId,

                sound:
                    schedule.preBellSound,

                preBellSound:
                    schedule.preBellSound,

                preBellEnabled:
                    true,

                enabled:
                    schedule.enabled,
            });
        }
    }


    /*
     * Ищем ближайшее событие.
     */

    for (
        let offset = 0;
        offset <= 7;
        offset++
    ) {

        const targetDay =
            (
                currentDay -
                1 +
                offset
            ) % 7 + 1;


        const dayEvents =
            events
                .filter(
                    (event) =>
                        event.dayOfWeek ===
                        targetDay
                )
                .sort(
                    (a, b) =>
                        timeToMinutes(
                            a.eventTime
                        ) -
                        timeToMinutes(
                            b.eventTime
                        )
                );


        for (
            const event of dayEvents
        ) {

            const eventMinutes =
                timeToMinutes(
                    event.eventTime
                );


            /*
             * Сегодня:
             *
             * событие в текущую минуту
             * НЕ пропускаем.
             *
             * Событие считается прошедшим
             * только если его время меньше
             * текущего времени.
             */

            if (
                offset === 0 &&
                eventMinutes <
                    currentMinutes
            ) {

                continue;

            }


            return event;
        }
    }


    return null;
}


// ============================================
// GET NEXT NORMAL SCHEDULE
// ============================================

export async function getNextSchedule(
    profileId: number
) {

    const now =
        new Date();


    const jsDay =
        now.getDay();


    const currentDay =
        jsDay === 0
            ? 7
            : jsDay;


    const currentTime =
        `${String(
            now.getHours()
        ).padStart(2, "0")}:` +
        `${String(
            now.getMinutes()
        ).padStart(2, "0")}`;


    /*
     * Сначала ищем следующий
     * обычный звонок сегодня.
     */

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


    /*
     * Сегодня больше звонков нет.
     *
     * Ищем следующий день.
     */

    for (
        let offset = 1;
        offset <= 7;
        offset++
    ) {

        const nextDay =
            (
                currentDay -
                1 +
                offset
            ) % 7 + 1;


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