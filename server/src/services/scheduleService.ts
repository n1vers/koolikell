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
// GET SCHEDULES
// ============================================

export async function getSchedules(
    profileId: number
) {
    return prisma.schedule.findMany({
        where: {
            profileId,
        },

        include: {
            sound: true,
            preBellSound: true,
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
}


// ============================================
// CREATE SCHEDULE
// ============================================

export async function createSchedule(
    profileId: number,
    dayOfWeek: number,
    time: string,
    type: string,
    preBellEnabled: boolean,
    soundId: number | null = null,
    preBellSoundId: number | null = null
) {
    return prisma.schedule.create({
        data: {
            profileId,

            dayOfWeek,

            time,

            type,

            // Предзвон разрешён
            // только для начала урока
            preBellEnabled:
                type === "LESSON_START"
                    ? preBellEnabled
                    : false,

            // Новый звонок включён
            enabled: true,

            soundId,
            preBellSoundId:
                type === "LESSON_START"
                    ? preBellSoundId
                    : null,
        },

        include: {
            sound: true,
            preBellSound: true,
        },
    });
}


// ============================================
// UPDATE SCHEDULE
// ============================================

export async function updateSchedule(
    id: number,
    dayOfWeek: number,
    time: string,
    type: string,
    enabled: boolean,
    preBellEnabled: boolean,
    soundId: number | null,
    preBellSoundId: number | null
) {
    return prisma.schedule.update({
        where: {
            id,
        },

        data: {
            dayOfWeek,

            time,

            type,

            enabled,

            // Если это конец урока —
            // предзвона быть не может.
            preBellEnabled:
                type === "LESSON_START"
                    ? preBellEnabled
                    : false,

            soundId,
            preBellSoundId:
                type === "LESSON_START"
                    ? preBellSoundId
                    : null,
        },

        include: {
            sound: true,
        },
    });
}


// ============================================
// DELETE SCHEDULE
// ============================================

export async function deleteSchedule(
    id: number
) {
    return prisma.schedule.delete({
        where: {
            id,
        },
    });
}