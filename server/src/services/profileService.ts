import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./schoolbell.db";
const adapter = new PrismaBetterSqlite3({
    url: databaseUrl.replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

export async function getProfiles() {
    return prisma.profile.findMany({
        orderBy: {
            id: "asc",
        },
    });
}

export async function createProfile(name: string) {
    return prisma.profile.create({
        data: {
            name,
        },
    });
}

export async function updateProfile(id: number, name: string) {
    return prisma.profile.update({
        where: {
            id,
        },
        data: {
            name,
        },
    });
}

export async function deleteProfile(id: number) {
    return prisma.profile.delete({
        where: {
            id,
        },
    });
}