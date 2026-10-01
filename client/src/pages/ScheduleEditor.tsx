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
        type: "LESSON_START" | "LESSON_END",
        preBellEnabled: boolean,
        soundId: number | null,
        preBellSoundId: number | null
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

    const [newType, setNewType] =
        useState<
            "LESSON_START" |
            "LESSON_END"
        >("LESSON_START");

    const [newPreBellEnabled, setNewPreBellEnabled] =
        useState(true);

    const [newSoundId, setNewSoundId] =
        useState<number | null>(null);

    const [newPreBellSoundId, setNewPreBellSoundId] =
        useState<number | null>(null);


    // =========================================
    // ADD
    // =========================================

    async function handleAdd() {

        try {

            await onAddSchedule(
                newTime,
                newType,
                newType === "LESSON_START"
                    ? newPreBellEnabled
                    : false,
                newSoundId,
                newPreBellSoundId
            );

            setNewTime("08:00");
            setNewType("LESSON_START");
            setNewPreBellEnabled(true);
            setNewSoundId(null);
            setNewPreBellSoundId(null);

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
    // UPDATE
    // =========================================

    async function updateSchedule(
        schedule: Schedule,
        changes: Partial<Schedule>
    ) {

        const updatedSchedule: Schedule = {
            ...schedule,
            ...changes,
        };

        await onUpdateSchedule(
            updatedSchedule
        );

    }


    // =========================================
    // TIME
    // =========================================

    async function handleTimeChange(
        schedule: Schedule,
        time: string
    ) {

        await updateSchedule(
            schedule,
            { time }
        );

    }


    // =========================================
    // TYPE
    // =========================================

    async function handleTypeChange(
        schedule: Schedule,
        type:
            | "LESSON_START"
            | "LESSON_END"
    ) {

        await updateSchedule(
            schedule,
            {
                type,

                /*
                 * Предзвон возможен
                 * только перед началом.
                 */

                preBellEnabled:
                    type === "LESSON_START"
                        ? schedule.preBellEnabled
                        : false,
            }
        );

    }


    // =========================================
    // PRE BELL
    // =========================================

    async function handlePreBellChange(
        schedule: Schedule,
        enabled: boolean
    ) {

        /*
         * На всякий случай дополнительно
         * проверяем тип.
         */

        if (
            schedule.type !==
            "LESSON_START"
        ) {
            return;
        }

        await updateSchedule(
            schedule,
            {
                preBellEnabled:
                    enabled,
            }
        );

    }


    // =========================================
    // ENABLED
    // =========================================

    async function handleEnabledChange(
        schedule: Schedule,
        enabled: boolean
    ) {

        await updateSchedule(
            schedule,
            {
                enabled,
            }
        );

    }


    // =========================================
    // SOUND
    // =========================================

    async function handleSoundChange(
        schedule: Schedule,
        value: string
    ) {

        const soundId =
            value === ""
                ? null
                : Number(value);

        await updateSchedule(
            schedule,
            {
                soundId,
            }
        );

    }

    async function handlePreBellSoundChange(
        schedule: Schedule,
        value: string
    ) {
        await updateSchedule(
            schedule,
            {
                preBellSoundId:
                    value === ""
                        ? null
                        : Number(value),
            }
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

            {/* HEADER */}

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
                        Muutke kellade aega,
                        tüüpi ja helisid
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


            {/* TABLE HEADER */}

            <div
                className="
                    grid
                    grid-cols-[45px_90px_130px_100px_100px_1fr_40px]
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

                <span>Aeg</span>

                <span>Tüüp</span>

                <span>Predbell</span>

                <span>Seisund</span>

                <span>Heli</span>

                <span />

            </div>


            {/* SCHEDULE LIST */}

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
                                grid-cols-[45px_90px_130px_100px_100px_1fr_40px]
                                min-h-[60px]
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
                                    w-[80px]
                                    border-none
                                    bg-transparent
                                    p-0
                                    text-[13px]
                                    font-medium
                                    text-[#28303d]
                                    outline-none
                                "
                            />


                            {/* TYPE */}

                            <select
                                value={
                                    schedule.type
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleTypeChange(
                                        schedule,
                                        event
                                            .target
                                            .value as
                                            | "LESSON_START"
                                            | "LESSON_END"
                                    )
                                }
                                className="
                                    h-[34px]
                                    w-[115px]
                                    rounded-[7px]
                                    border
                                    border-[#e2e7ef]
                                    bg-white
                                    px-[8px]
                                    text-[12px]
                                    text-[#394352]
                                    outline-none
                                    focus:border-[#5798f5]
                                "
                            >

                                <option value="LESSON_START">
                                    Algus
                                </option>

                                <option value="LESSON_END">
                                    Lõpp
                                </option>

                            </select>


                            {/* PRE BELL */}

                            <div>

                                {schedule.type ===
                                    "LESSON_START" ? (
                                    <>
                                        <label
                                            className="
                                                flex
                                                cursor-pointer
                                                items-center
                                                gap-[7px]
                                            "
                                        >

                                        <input
                                            type="checkbox"
                                            checked={
                                                schedule.preBellEnabled
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handlePreBellChange(
                                                    schedule,
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                            className="
                                                h-[16px]
                                                w-[16px]
                                            "
                                        />

                                        <span
                                            className="
                                                text-[11px]
                                                text-[#697589]
                                            "
                                        >
                                            -2 min
                                        </span>

                                        </label>

                                        <select
                                            value={schedule.preBellSoundId ?? ""}
                                            onChange={(event) =>
                                                void handlePreBellSoundChange(
                                                    schedule,
                                                    event.target.value
                                                )
                                            }
                                            className="mt-[6px] max-w-[115px] rounded-[6px] border border-[#e2e7ef] bg-white text-[10px] text-[#697589]"
                                        >
                                            <option value="">Predzvoni heli</option>
                                            {sounds.map((sound) => (
                                                <option key={sound.id} value={sound.id}>
                                                    {sound.name}
                                                </option>
                                            ))}
                                        </select>
                                    </>

                                ) : (

                                    <span
                                        className="
                                            text-[11px]
                                            text-[#b1b8c4]
                                        "
                                    >
                                        —
                                    </span>

                                )}

                            </div>


                            {/* ENABLED */}

                            <label
                                className="
                                    flex
                                    cursor-pointer
                                    items-center
                                "
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        schedule.enabled
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleEnabledChange(
                                            schedule,
                                            event
                                                .target
                                                .checked
                                        )
                                    }
                                    className="
                                        h-[16px]
                                        w-[16px]
                                    "
                                />

                                <span
                                    className="
                                        ml-[7px]
                                        text-[11px]
                                        text-[#697589]
                                    "
                                >
                                    {schedule.enabled
                                        ? "Sees"
                                        : "Väljas"}
                                </span>

                            </label>


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
                                ×
                            </button>

                        </div>

                    )
                )}

            </div>


            {/* ADD */}

            <div
                className="
                    mt-[24px]
                    rounded-[12px]
                    bg-white
                    p-[18px]
                    shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                "
            >

                <div
                    className="
                        mb-[14px]
                        text-[13px]
                        font-medium
                        text-[#303846]
                    "
                >
                    Lisa kell
                </div>


                <div
                    className="
                        flex
                        items-center
                        gap-[10px]
                    "
                >

                    {/* TIME */}

                    <input
                        type="time"
                        value={
                            newTime
                        }
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


                    {/* TYPE */}

                    <select
                        value={
                            newType
                        }
                        onChange={(event) => {

                            const value =
                                event.target.value as
                                    | "LESSON_START"
                                    | "LESSON_END";

                            setNewType(
                                value
                            );

                            if (
                                value ===
                                "LESSON_END"
                            ) {
                                setNewPreBellEnabled(
                                    false
                                );
                            } else {
                                setNewPreBellEnabled(
                                    true
                                );
                            }

                        }}
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
                    >

                        <option value="LESSON_START">
                            Algus
                        </option>

                        <option value="LESSON_END">
                            Lõpp
                        </option>

                    </select>


                    {/* PRE BELL */}

                    {newType ===
                        "LESSON_START" && (

                        <label
                            className="
                                flex
                                h-[40px]
                                items-center
                                gap-[7px]
                                rounded-[8px]
                                border
                                border-[#e2e7ef]
                                px-[12px]
                            "
                        >

                            <input
                                type="checkbox"
                                checked={
                                    newPreBellEnabled
                                }
                                onChange={(event) =>
                                    setNewPreBellEnabled(
                                        event
                                            .target
                                            .checked
                                    )
                                }
                                className="
                                    h-[16px]
                                    w-[16px]
                                "
                            />

                            <span
                                className="
                                    text-[12px]
                                    text-[#596577]
                                "
                            >
                                -2 min
                            </span>

                        </label>

                    )}


                    {/* SOUND */}

                    <select
                        value={
                            newSoundId ??
                            ""
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

                    {newType === "LESSON_START" && (
                        <select
                            value={newPreBellSoundId ?? ""}
                            onChange={(event) =>
                                setNewPreBellSoundId(
                                    event.target.value === ""
                                        ? null
                                        : Number(event.target.value)
                                )
                            }
                            className="h-[40px] min-w-[200px] rounded-[8px] border border-[#e2e7ef] bg-white px-[12px] text-[13px] text-[#303846] outline-none focus:border-[#5798f5]"
                        >
                            <option value="">Predzvoni heli</option>
                            {sounds.map((sound) => (
                                <option key={sound.id} value={sound.id}>
                                    {sound.name}
                                </option>
                            ))}
                        </select>
                    )}


                    {/* ADD BUTTON */}

                    <button
                        type="button"
                        onClick={
                            handleAdd
                        }
                        className="
                            flex
                            h-[40px]
                            items-center
                            gap-[6px]
                            rounded-[8px]
                            bg-[#5798f5]
                            px-[16px]
                            text-[12px]
                            font-medium
                            text-white
                            shadow-[0_1px_3px_rgba(0,0,0,0.05)]
                            hover:bg-[#4688e7]
                        "
                    >

                        <span
                            className="
                                text-[17px]
                            "
                        >
                            +
                        </span>

                        Lisa kell

                    </button>

                </div>

            </div>

        </main>
    );
}