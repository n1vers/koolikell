export interface Sound {
    id: number;
    name: string;
    fileName: string;
    createdAt: string;
}

export interface Schedule {
    id: number;
    profileId: number;
    dayOfWeek: number;
    time: string;
    enabled: boolean;
    soundId: number | null;
    sound: Sound | null;
}

export interface Profile {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    schedules?: Schedule[];
}