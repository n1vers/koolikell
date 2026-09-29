import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./schoolbell.db";
const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

export async function getNextSchedule(profileId: number) {
    const now = new Date();

    const jsDay = now.getDay();

    // JavaScript:
    // 0 = Sunday
    // 1 = Monday
    // ...
    // 6 = Saturday

    const currentDay = jsDay === 0 ? 7 : jsDay;

    const currentTime =
        `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
        ).padStart(2, "0")}`;

    // Сначала ищем звонок сегодня
    const todaySchedules = await prisma.schedule.findMany({
        where: {
            profileId,
            dayOfWeek: currentDay,
            enabled: true,
        },
        include: {
            sound: true,
        },
        orderBy: {
            time: "asc",
        },
    });

    const nextToday = todaySchedules.find(
        (schedule) => schedule.time > currentTime
    );

    if (nextToday) {
        return nextToday;
    }

    // Если сегодня больше звонков нет,
    // ищем ближайший звонок в следующие дни

    for (let offset = 1; offset <= 7; offset++) {
        const nextDay = ((currentDay - 1 + offset) % 7) + 1;

        const nextSchedules = await prisma.schedule.findMany({
            where: {
                profileId,
                dayOfWeek: nextDay,
                enabled: true,
            },
            include: {
                sound: true,
            },
            orderBy: {
                time: "asc",
            },
        });

        if (nextSchedules.length > 0) {
            return nextSchedules[0];
        }
    }

    return null;
}