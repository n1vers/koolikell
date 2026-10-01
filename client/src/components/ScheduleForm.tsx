import { useEffect, useState } from "react";
import type { Schedule, Sound } from "../types";

interface ScheduleFormProps {
    schedule?: Schedule | null;
    sounds: Sound[];

    onSave: (
        dayOfWeek: number,
        time: string,
        type: "LESSON_START" | "LESSON_END",
        enabled: boolean,
        preBellEnabled: boolean,
        soundId: number | null
    ) => Promise<void>;

    onCancel: () => void;
}

export default function ScheduleForm({
    schedule,
    sounds,
    onSave,
    onCancel,
}: ScheduleFormProps) {

    const [dayOfWeek, setDayOfWeek] =
        useState<number>(
            schedule?.dayOfWeek ?? 1
        );

    const [time, setTime] =
        useState(
            schedule?.time ?? "08:00"
        );

    const [type, setType] =
        useState<
            "LESSON_START" |
            "LESSON_END"
        >(
            schedule?.type ===
                "LESSON_END"
                ? "LESSON_END"
                : "LESSON_START"
        );

    const [enabled, setEnabled] =
        useState(
            schedule?.enabled ?? true
        );

    const [preBellEnabled, setPreBellEnabled] =
        useState(
            schedule?.preBellEnabled ?? true
        );

    const [soundId, setSoundId] =
        useState<number | null>(
            schedule?.soundId ?? null
        );

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    /*
     * Предзвон существует только
     * для начала урока.
     *
     * Если переключили на конец —
     * автоматически выключаем его.
     */

    useEffect(() => {

        if (
            type === "LESSON_END"
        ) {

            setPreBellEnabled(
                false
            );

        }

    }, [type]);


    async function handleSubmit(
        event: React.FormEvent
    ) {

        event.preventDefault();

        setError("");


        if (!time) {

            setError(
                "Vali kellaaeg"
            );

            return;

        }


        try {

            setSaving(true);


            await onSave(
                dayOfWeek,
                time,
                type,
                enabled,
                type === "LESSON_START"
                    ? preBellEnabled
                    : false,
                soundId
            );


        } catch (error) {

            console.error(error);

            setError(
                "Kella salvestamine ebaõnnestus"
            );


        } finally {

            setSaving(false);

        }

    }


    return (
        <div
            className="
                w-[520px]
                rounded-[20px]
                bg-white
                p-[28px]
                shadow-[0_10px_40px_rgba(0,0,0,0.08)]
            "
        >

            <div
                className="
                    mb-[24px]
                    flex
                    items-center
                    justify-between
                "
            >

                <h2
                    className="
                        text-[22px]
                        font-semibold
                        text-[#172033]
                    "
                >
                    {schedule
                        ? "Muuda kella"
                        : "Lisa kell"}
                </h2>


                <button
                    type="button"
                    onClick={onCancel}
                    className="
                        flex
                        h-[36px]
                        w-[36px]
                        items-center
                        justify-center
                        rounded-full
                        text-[20px]
                        text-[#7c8799]
                        hover:bg-[#f1f3f7]
                    "
                >
                    ×
                </button>

            </div>


            <form
                onSubmit={
                    handleSubmit
                }
                className="
                    flex
                    flex-col
                    gap-[20px]
                "
            >

                {/* DAY */}

                <div>

                    <label
                        className="
                            mb-[8px]
                            block
                            text-[14px]
                            font-medium
                            text-[#536176]
                        "
                    >
                        Nädalapäev
                    </label>


                    <select
                        value={dayOfWeek}
                        onChange={(event) =>
                            setDayOfWeek(
                                Number(
                                    event.target.value
                                )
                            )
                        }
                        className="
                            h-[46px]
                            w-full
                            rounded-[10px]
                            border
                            border-[#dce1e9]
                            bg-white
                            px-[14px]
                            text-[#172033]
                            outline-none
                            focus:border-[#5b67f1]
                        "
                    >

                        <option value={1}>
                            Esmaspäev
                        </option>

                        <option value={2}>
                            Teisipäev
                        </option>

                        <option value={3}>
                            Kolmapäev
                        </option>

                        <option value={4}>
                            Neljapäev
                        </option>

                        <option value={5}>
                            Reede
                        </option>

                        <option value={6}>
                            Laupäev
                        </option>

                        <option value={7}>
                            Pühapäev
                        </option>

                    </select>

                </div>


                {/* TIME */}

                <div>

                    <label
                        className="
                            mb-[8px]
                            block
                            text-[14px]
                            font-medium
                            text-[#536176]
                        "
                    >
                        Kellaaeg
                    </label>


                    <input
                        type="time"
                        value={time}
                        onChange={(event) =>
                            setTime(
                                event.target.value
                            )
                        }
                        className="
                            h-[46px]
                            w-full
                            rounded-[10px]
                            border
                            border-[#dce1e9]
                            bg-white
                            px-[14px]
                            text-[#172033]
                            outline-none
                            focus:border-[#5b67f1]
                        "
                    />

                </div>


                {/* TYPE */}

                <div>

                    <label
                        className="
                            mb-[8px]
                            block
                            text-[14px]
                            font-medium
                            text-[#536176]
                        "
                    >
                        Tüübi
                    </label>


                    <div
                        className="
                            grid
                            grid-cols-2
                            gap-[10px]
                        "
                    >

                        <button
                            type="button"
                            onClick={() =>
                                setType(
                                    "LESSON_START"
                                )
                            }
                            className={`
                                h-[46px]
                                rounded-[10px]
                                border
                                text-[14px]
                                font-medium
                                transition
                                ${
                                    type ===
                                    "LESSON_START"
                                        ? `
                                            border-[#5b67f1]
                                            bg-[#eef0ff]
                                            text-[#4e5be8]
                                        `
                                        : `
                                            border-[#dce1e9]
                                            bg-white
                                            text-[#536176]
                                        `
                                }
                            `}
                        >
                            Algus
                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                setType(
                                    "LESSON_END"
                                )
                            }
                            className={`
                                h-[46px]
                                rounded-[10px]
                                border
                                text-[14px]
                                font-medium
                                transition
                                ${
                                    type ===
                                    "LESSON_END"
                                        ? `
                                            border-[#5b67f1]
                                            bg-[#eef0ff]
                                            text-[#4e5be8]
                                        `
                                        : `
                                            border-[#dce1e9]
                                            bg-white
                                            text-[#536176]
                                        `
                                }
                            `}
                        >
                            Lõpp
                        </button>

                    </div>

                </div>


                {/* SOUND */}

                <div>

                    <label
                        className="
                            mb-[8px]
                            block
                            text-[14px]
                            font-medium
                            text-[#536176]
                        "
                    >
                        Heli
                    </label>


                    <select
                        value={
                            soundId ?? ""
                        }
                        onChange={(event) => {

                            const value =
                                event.target.value;


                            setSoundId(
                                value === ""
                                    ? null
                                    : Number(value)
                            );

                        }}
                        className="
                            h-[46px]
                            w-full
                            rounded-[10px]
                            border
                            border-[#dce1e9]
                            bg-white
                            px-[14px]
                            text-[#172033]
                            outline-none
                            focus:border-[#5b67f1]
                        "
                    >

                        <option value="">
                            Heli pole valitud
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

                </div>


                {/* ENABLED */}

                <label
                    className="
                        flex
                        cursor-pointer
                        items-center
                        justify-between
                        rounded-[12px]
                        bg-[#f7f8fb]
                        p-[14px]
                    "
                >

                    <div>

                        <div
                            className="
                                text-[14px]
                                font-medium
                                text-[#172033]
                            "
                        >
                            Kell on aktiivne
                        </div>

                        <div
                            className="
                                mt-[3px]
                                text-[12px]
                                text-[#8792a5]
                            "
                        >
                            Kui välja lülitatud,
                            kella ei mängita
                        </div>

                    </div>


                    <input
                        type="checkbox"
                        checked={
                            enabled
                        }
                        onChange={(event) =>
                            setEnabled(
                                event.target.checked
                            )
                        }
                        className="
                            h-[18px]
                            w-[18px]
                        "
                    />

                </label>


                {/* PRE BELL */}

                {type ===
                    "LESSON_START" && (

                    <label
                        className="
                            flex
                            cursor-pointer
                            items-center
                            justify-between
                            rounded-[12px]
                            bg-[#f7f8fb]
                            p-[14px]
                        "
                    >

                        <div>

                            <div
                                className="
                                    text-[14px]
                                    font-medium
                                    text-[#172033]
                                "
                            >
                                Eelkell
                            </div>

                            <div
                                className="
                                    mt-[3px]
                                    text-[12px]
                                    text-[#8792a5]
                                "
                            >
                                Mängi kella
                                2 minutit enne
                            </div>

                        </div>


                        <input
                            type="checkbox"
                            checked={
                                preBellEnabled
                            }
                            onChange={(event) =>
                                setPreBellEnabled(
                                    event.target.checked
                                )
                            }
                            className="
                                h-[18px]
                                w-[18px]
                            "
                        />

                    </label>

                )}


                {/* ERROR */}

                {error && (

                    <div
                        className="
                            rounded-[10px]
                            bg-[#fff0f0]
                            px-[14px]
                            py-[10px]
                            text-[13px]
                            text-[#d64545]
                        "
                    >
                        {error}
                    </div>

                )}


                {/* BUTTONS */}

                <div
                    className="
                        mt-[4px]
                        flex
                        justify-end
                        gap-[10px]
                    "
                >

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="
                            h-[44px]
                            rounded-[10px]
                            px-[20px]
                            text-[14px]
                            font-medium
                            text-[#536176]
                            hover:bg-[#f1f3f7]
                        "
                    >
                        Tühista
                    </button>


                    <button
                        type="submit"
                        disabled={saving}
                        className="
                            h-[44px]
                            rounded-[10px]
                            bg-[#5b67f1]
                            px-[22px]
                            text-[14px]
                            font-medium
                            text-white
                            hover:bg-[#4f5be0]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {saving
                            ? "Salvestan..."
                            : "Salvesta"}
                    </button>

                </div>

            </form>

        </div>
    );
}