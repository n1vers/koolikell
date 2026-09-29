import type { Profile, Schedule } from "../types";

const API_URL = "http://localhost:3000";

export async function getProfiles(): Promise<Profile[]> {
    const response = await fetch(`${API_URL}/api/profiles`);

    if (!response.ok) {
        throw new Error("Failed to load profiles");
    }

    return response.json();
}

export async function getSchedules(
    profileId: number
): Promise<Schedule[]> {
    const response = await fetch(
        `${API_URL}/api/profiles/${profileId}/schedules`
    );

    if (!response.ok) {
        throw new Error("Failed to load schedules");
    }

    return response.json();
}