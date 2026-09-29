import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./schoolbell.db";
const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

export async function getSounds() {
    return prisma.sound.findMany({
        orderBy: {
            id: "asc",
        },
    });
}

export async function createSound(
    name: string,
    fileName: string
) {
    return prisma.sound.create({
        data: {
            name,
            fileName,
        },
    });
}

export async function updateSound(
    id: number,
    name: string,
    fileName: string
) {
    return prisma.sound.update({
        where: {
            id,
        },
        data: {
            name,
            fileName,
        },
    });
}

export async function deleteSound(id: number) {
    return prisma.sound.delete({
        where: {
            id,
        },
    });
}