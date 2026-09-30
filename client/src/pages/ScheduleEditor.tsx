import { useState } from "react";

import type {
    Schedule,
    Sound,
} from "../types";

interface ScheduleEditorProps {
    profileName: string;

    schedules: Schedule[];

    sounds: Sound[];

    onBack: () => void;

    onSave: () => Promise<void>;

    onAddSchedule: (
        time: string,
        soundId: number | null
    ) => Promise<void>;

    onUpdateSchedule: (
        schedule: Schedule
    ) => Promise<void>;

    onDeleteSchedule: (
        schedule: Schedule
    ) => Promise<void>;
}

export default function ScheduleEditor({
    profileName,
    schedules,
    sounds,
    onBack,
    onSave,
    onAddSchedule,
    onUpdateSchedule,
    onDeleteSchedule,
}: ScheduleEditorProps) {
    const [saving, setSaving] =
        useState(false);

    const [newTime, setNewTime] =
        useState("08:00");

    const [newSoundId, setNewSoundId] =
        useState<number | null>(null);

    // =========================================
    // ADD LESSON
    // =========================================

    async function handleAdd() {
        try {
            await onAddSchedule(
                newTime,
                newSoundId
            );

            setNewTime("08:00");
            setNewSoundId(null);
        } catch (error) {
            console.error(
                "Failed to add schedule:",
                error
            );
        }
    }

    // =========================================
    // SAVE
    // =========================================

    async function handleSave() {
        try {
            setSaving(true);

            await onSave();
        } catch (error) {
            console.error(
                "Failed to save:",
                error
            );
        } finally {
            setSaving(false);
        }
    }

    // =========================================
    // UPDATE TIME
    // =========================================

    async function handleTimeChange(
        schedule: Schedule,
        time: string
    ) {
        const updatedSchedule: Schedule = {
            ...schedule,
            time,
        };

        await onUpdateSchedule(
            updatedSchedule
        );
    }

    // =========================================
    // UPDATE SOUND
    // =========================================

    async function handleSoundChange(
        schedule: Schedule,
        value: string
    ) {
        const soundId =
            value === ""
                ? null
                : Number(value);

        const updatedSchedule: Schedule = {
            ...schedule,
            soundId,
        };

        await onUpdateSchedule(
            updatedSchedule
        );
    }

    // =========================================
    // PAGE
    // =========================================

    return (
        <main
            className="
                ml-[240px]
                min-h-screen
                bg-[#f5f7fb]
                px-[40px]
                py-[32px]
                font-['Inter']
            "
        >
            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div
                className="
                    mb-[32px]
                    flex
                    items-start
                    justify-between
                "
            >
                <div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="
                            mb-[12px]
                            text-[12px]
                            font-medium
                            uppercase
                            tracking-wide
                            text-[#5798f5]
                            hover:text-[#3f82df]
                        "
                    >
                        ← PROFIL
                    </button>

                    <h1
                        className="
                            text-[28px]
                            font-semibold
                            text-[#202633]
                        "
                    >
                        {profileName}
                    </h1>

                    <p
                        className="
                            mt-[6px]
                            text-[14px]
                            text-[#7d899d]
                        "
                    >
                        Muudke tundide aega ja
                        määratud helisid
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="
                        mt-[22px]
                        h-[48px]
                        w-[138px]
                        rounded-[8px]
                        bg-[#5798f5]
                        text-[13px]
                        font-medium
                        text-white
                        transition
                        hover:bg-[#4688e7]
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                    "
                >
                    {saving
                        ? "Salvestamine..."
                        : "Salvesta"}
                </button>
            </div>


            {/* ================================= */}
            {/* TABLE HEADER */}
            {/* ================================= */}

            <div
                className="
                    grid
                    grid-cols-[45px_85px_85px_110px_1fr_40px]
                    items-center
                    px-[18px]
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-wide
                    text-[#8490a3]
                "
            >
                <span>№</span>

                <span>Algus</span>

                <span>Lõpp</span>

                <span>Tüüp</span>

                <span>Heli</span>

                <span />
            </div>


            {/* ================================= */}
            {/* SCHEDULE LIST */}
            {/* ================================= */}

            <div
                className="
                    mt-[10px]
                    space-y-[9px]
                "
            >
                {schedules.map(
                    (
                        schedule,
                        index
                    ) => (
                        <div
                            key={
                                schedule.id
                            }
                            className="
                                grid
                                grid-cols-[45px_85px_85px_110px_1fr_40px]
                                min-h-[52px]
                                items-center
                                rounded-[10px]
                                bg-white
                                px-[18px]
                                shadow-[0_1px_2px_rgba(0,0,0,0.02)]
                            "
                        >
                            {/* NUMBER */}

                            <span
                                className="
                                    text-[12px]
                                    text-[#6d788b]
                                "
                            >
                                {String(
                                    index + 1
                                ).padStart(
                                    2,
                                    "0"
                                )}
                            </span>


                            {/* TIME */}

                            <input
                                type="time"
                                value={
                                    schedule.time
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleTimeChange(
                                        schedule,
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="
                                    w-[70px]
                                    border-none
                                    bg-transparent
                                    p-0
                                    text-[13px]
                                    text-[#28303d]
                                    outline-none
                                "
                            />


                            {/* END */}

                            <span
                                className="
                                    text-[13px]
                                    text-[#28303d]
                                "
                            >
                                —
                            </span>


                            {/* TYPE */}

                            <span
                                className="
                                    text-[13px]
                                    text-[#3d4655]
                                "
                            >
                                Tund
                            </span>


                            {/* SOUND */}

                            <select
                                value={
                                    schedule.soundId ??
                                    ""
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleSoundChange(
                                        schedule,
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="
                                    max-w-[300px]
                                    border-none
                                    bg-transparent
                                    text-[12px]
                                    text-[#718096]
                                    outline-none
                                "
                            >
                                <option value="">
                                    ♫ Heli pole määratud
                                </option>

                                {sounds.map(
                                    (
                                        sound
                                    ) => (
                                        <option
                                            key={
                                                sound.id
                                            }
                                            value={
                                                sound.id
                                            }
                                        >
                                            ♫{" "}
                                            {
                                                sound.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>


                            {/* DELETE */}

                            <button
                                type="button"
                                onClick={() =>
                                    onDeleteSchedule(
                                        schedule
                                    )
                                }
                                className="
                                    flex
                                    h-[30px]
                                    w-[30px]
                                    items-center
                                    justify-center
                                    rounded-[6px]
                                    text-[18px]
                                    text-[#8994a6]
                                    hover:bg-[#f1f4f8]
                                    hover:text-[#4e596b]
                                "
                                title="Kustuta"
                            >
                                ⋮
                            </button>
                        </div>
                    )
                )}
            </div>


            {/* ================================= */}
            {/* ADD LESSON */}
            {/* ================================= */}

            <div
                className="
                    mt-[24px]
                    flex
                    items-center
                    gap-[10px]
                "
            >
                <input
                    type="time"
                    value={newTime}
                    onChange={(event) =>
                        setNewTime(
                            event.target.value
                        )
                    }
                    className="
                        h-[40px]
                        rounded-[8px]
                        border
                        border-[#e2e7ef]
                        bg-white
                        px-[12px]
                        text-[13px]
                        text-[#303846]
                        outline-none
                        focus:border-[#5798f5]
                    "
                />

                <select
                    value={
                        newSoundId ?? ""
                    }
                    onChange={(event) =>
                        setNewSoundId(
                            event.target.value ===
                                ""
                                ? null
                                : Number(
                                      event
                                          .target
                                          .value
                                  )
                        )
                    }
                    className="
                        h-[40px]
                        min-w-[200px]
                        rounded-[8px]
                        border
                        border-[#e2e7ef]
                        bg-white
                        px-[12px]
                        text-[13px]
                        text-[#303846]
                        outline-none
                        focus:border-[#5798f5]
                    "
                >
                    <option value="">
                        Heli pole määratud
                    </option>

                    {sounds.map(
                        (sound) => (
                            <option
                                key={
                                    sound.id
                                }
                                value={
                                    sound.id
                                }
                            >
                                {sound.name}
                            </option>
                        )
                    )}
                </select>

                <button
                    type="button"
                    onClick={handleAdd}
                    className="
                        flex
                        h-[40px]
                        items-center
                        gap-[6px]
                        rounded-[8px]
                        bg-white
                        px-[14px]
                        text-[12px]
                        font-medium
                        text-[#394352]
                        shadow-[0_1px_3px_rgba(0,0,0,0.05)]
                        hover:bg-[#f8fafc]
                    "
                >
                    <span
                        className="
                            text-[17px]
                        "
                    >
                        +
                    </span>

                    Lisa tund
                </button>
            </div>
        </main>
    );
}