import type {
    Profile,
    Schedule,
    Sound,
    ScheduleType,
} from "../types";

const API_URL = "http://localhost:3000";


// ============================================
// PROFILES
// ============================================

export async function getProfiles(): Promise<Profile[]> {

    const response = await fetch(
        `${API_URL}/api/profiles`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to load profiles"
        );
    }

    return response.json();
}


export async function createProfile(
    name: string
): Promise<Profile> {

    const response = await fetch(
        `${API_URL}/api/profiles`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                name,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to create profile"
        );
    }

    return response.json();
}

export async function updateProfile(
    id: number,
    name: string
): Promise<Profile> {
    const response = await fetch(
        `${API_URL}/api/profiles/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to rename profile");
    }

    return response.json();
}


export async function deleteProfile(
    id: number
): Promise<void> {

    const response = await fetch(
        `${API_URL}/api/profiles/${id}`,
        {
            method: "DELETE",
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to delete profile"
        );
    }
}


// ============================================
// SCHEDULES
// ============================================

export async function getSchedules(
    profileId: number
): Promise<Schedule[]> {

    const response = await fetch(
        `${API_URL}/api/profiles/${profileId}/schedules`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to load schedules"
        );
    }

    return response.json();
}


export async function createSchedule(
    profileId: number,
    dayOfWeek: number,
    time: string,
    type: ScheduleType,
    preBellEnabled: boolean,
    soundId: number | null,
    preBellSoundId: number | null
): Promise<Schedule> {

    const response = await fetch(
        `${API_URL}/api/profiles/${profileId}/schedules`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                dayOfWeek,
                time,
                type,
                preBellEnabled,
                soundId,
                preBellSoundId,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to create schedule"
        );
    }

    return response.json();
}


export async function updateSchedule(
    id: number,
    dayOfWeek: number,
    time: string,
    type: ScheduleType,
    enabled: boolean,
    preBellEnabled: boolean,
    soundId: number | null,
    preBellSoundId: number | null
): Promise<Schedule> {

    const response = await fetch(
        `${API_URL}/api/schedules/${id}`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                dayOfWeek,
                time,
                type,
                enabled,
                preBellEnabled,
                soundId,
                preBellSoundId,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to update schedule"
        );
    }

    return response.json();
}


export async function deleteSchedule(
    id: number
): Promise<void> {

    const response = await fetch(
        `${API_URL}/api/schedules/${id}`,
        {
            method: "DELETE",
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to delete schedule"
        );
    }
}


// ============================================
// SOUNDS
// ============================================

export async function getSounds(): Promise<Sound[]> {

    const response = await fetch(
        `${API_URL}/api/sounds`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to load sounds"
        );
    }

    return response.json();
}


export async function uploadSound(
    file: File,
    name: string
): Promise<Sound> {

    const formData = new FormData();

    formData.append(
        "sound",
        file
    );

    formData.append(
        "name",
        name
    );

    const response = await fetch(
        `${API_URL}/api/sounds/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to upload sound"
        );
    }

    return response.json();
}