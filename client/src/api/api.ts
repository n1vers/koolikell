import type {
    Profile,
    Schedule,
    Sound,
    ScheduleType,
} from "../types";
import { API_URL } from "./apiBase";

export type PinRole = "master" | "playnow" | null;

export async function getPinStatus(): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/settings/pins`);
    if (!response.ok) {
        throw new Error("PIN-ide oleku laadimine ebaõnnestus");
    }
    const data = (await response.json()) as { configured: boolean };
    return data.configured;
}

export interface ProfileAssignments {
    profileByDay: Record<string, number | null>;
    profileByDate: Record<string, number | null>;
}

export async function getAutomaticEnabled(): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/settings/automatic`);
    if (!response.ok) {
        throw new Error("Failed to load automatic calling setting");
    }
    const data = (await response.json()) as { enabled: boolean };
    return data.enabled;
}

export async function getNtpServer(): Promise<string> {
    const response = await fetch(`${API_URL}/api/settings/ntp`);
    if (!response.ok) {
        throw new Error("Failed to load NTP server");
    }
    const data = (await response.json()) as { server: string };
    return data.server;
}

export async function setNtpServer(server: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/settings/ntp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server }),
    });
    if (!response.ok) {
        throw new Error("Failed to save NTP server");
    }
    const data = (await response.json()) as { server: string };
    return data.server;
}

export async function setAutomaticEnabled(enabled: boolean): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/settings/automatic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
    });
    if (!response.ok) {
        throw new Error("Failed to update automatic calling setting");
    }
    const data = (await response.json()) as { enabled: boolean };
    return data.enabled;
}

export async function getProfileAssignments(): Promise<ProfileAssignments> {
    const response = await fetch(`${API_URL}/api/settings/profile-assignments`);
    if (!response.ok) {
        throw new Error("Failed to load profile assignments");
    }
    return response.json() as Promise<ProfileAssignments>;
}

export async function setProfileAssignments(
    assignments: ProfileAssignments
): Promise<ProfileAssignments> {
    const response = await fetch(`${API_URL}/api/settings/profile-assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignments),
    });
    if (!response.ok) {
        throw new Error("Failed to save profile assignments");
    }
    return response.json() as Promise<ProfileAssignments>;
}

export async function getPreBellMinutes(): Promise<number> {
    const response = await fetch(`${API_URL}/api/settings/pre-bell-minutes`);
    if (!response.ok) {
        throw new Error("Failed to load pre-bell setting");
    }
    const data = (await response.json()) as { minutes: number };
    return data.minutes;
}

export async function setPreBellMinutes(minutes: number): Promise<number> {
    const response = await fetch(`${API_URL}/api/settings/pre-bell-minutes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
    });
    if (!response.ok) {
        throw new Error("Failed to save pre-bell setting");
    }

    const data = (await response.json()) as { minutes: number };
    return data.minutes;
}

export interface SyncedSettings {
    preBellMinutes: number;
    volume: number;
    windows: {
        openAtLogin: boolean;
        openAsHidden: boolean;
    };
}

export async function getSyncedSettings(): Promise<SyncedSettings> {
    const response = await fetch(`${API_URL}/api/settings/synced`);
    if (!response.ok) {
        throw new Error("Failed to load synced settings");
    }
    return response.json() as Promise<SyncedSettings>;
}

export async function updateSyncedSettings(
    changes: Partial<SyncedSettings>
): Promise<SyncedSettings> {
    const response = await fetch(`${API_URL}/api/settings/synced`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
    });
    if (!response.ok) {
        throw new Error("Failed to save synced settings");
    }
    return response.json() as Promise<SyncedSettings>;
}

export async function verifyPin(pin: string): Promise<PinRole> {
    const response = await fetch(`${API_URL}/api/settings/pins/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
        throw new Error("PIN kontroll ebaõnnestus");
    }
    const data = (await response.json()) as { role: PinRole };
    return data.role;
}

export async function updatePins(
    masterPin: string,
    nextMasterPin: string,
    nextPlayNowPin: string
): Promise<void> {
    const response = await fetch(`${API_URL}/api/settings/pins`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPin, nextMasterPin, nextPlayNowPin }),
    });
    if (!response.ok) {
        throw new Error("PIN-ide salvestamine ebaõnnestus");
    }
}

export async function disablePins(): Promise<void> {
    const response = await fetch(`${API_URL}/api/settings/pins`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error("PIN-ide väljalülitamine ebaõnnestus");
    }
}


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