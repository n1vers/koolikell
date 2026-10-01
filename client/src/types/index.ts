export interface Sound {
    id: number;
    name: string;
    fileName: string;
    createdAt: string;
}

export type ScheduleType =
    | "LESSON_START"
    | "LESSON_END";

export interface Schedule {
    id: number;

    profileId: number;

    dayOfWeek: number;

    time: string;

    type: ScheduleType;

    enabled: boolean;

    preBellEnabled: boolean;

    soundId: number | null;

    preBellSoundId: number | null;

    sound: Sound | null;
}

export interface Profile {
    id: number;

    name: string;

    createdAt: string;

    updatedAt: string;

    schedules?: Schedule[];
}