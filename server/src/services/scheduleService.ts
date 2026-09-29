import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./schoolbell.db";
const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

export async function getSchedules(profileId: number) {
    return prisma.schedule.findMany({
        where: {
            profileId,
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
}
export async function createSchedule(
    profileId: number,
    dayOfWeek: number,
    time: string,
    soundId: number | null = null
) {
    return prisma.schedule.create({
        data: {
            profileId,
            dayOfWeek,
            time,
            soundId,
        },
        include: {
            sound: true,
        },
    });
}

export async function updateSchedule(
    id: number,
    dayOfWeek: number,
    time: string,
    enabled: boolean,
    soundId: number | null
) {
    return prisma.schedule.update({
        where: {
            id,
        },
        data: {
            dayOfWeek,
            time,
            enabled,
            soundId,
        },
        include: {
            sound: true,
        },
    });
}

export async function deleteSchedule(id: number) {
    return prisma.schedule.delete({
        where: {
            id,
        },
    });
}