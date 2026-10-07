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

const DAYS = [
    "Esmaspäev",
    "Teisipäev",
    "Kolmapäev",
    "Neljapäev",
    "Reede",
    "Laupäev",
    "Pühapäev",
];

const FIELD =
    "h-[46px] w-full rounded-[10px] border border-[#dce1e9] bg-white px-[14px] text-[14px] text-[#172033] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20";

const LABEL = "mb-[8px] block text-[13px] font-medium text-[#536176]";

function Toggle({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-[16px] rounded-[12px] bg-[#f7f8fb] px-[16px] py-[14px] transition hover:bg-[#f1f4f9]">
            <div>
                <div className="text-[14px] font-medium text-[#172033]">
                    {title}
                </div>

                <div className="mt-[3px] text-[12px] text-[#8792a5]">
                    {description}
                </div>
            </div>

            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="peer sr-only"
            />

            <span className="relative h-[24px] w-[42px] shrink-0 rounded-full bg-[#d3d9e4] transition after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#5798f5] peer-checked:after:translate-x-[18px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#5798f5]/40" />
        </label>
    );
}

export default function ScheduleForm({
    schedule,
    sounds,
    onSave,
    onCancel,
}: ScheduleFormProps) {
    const [dayOfWeek, setDayOfWeek] = useState<number>(
        schedule?.dayOfWeek ?? 1
    );

    const [time, setTime] = useState(schedule?.time ?? "08:00");

    const [type, setType] = useState<"LESSON_START" | "LESSON_END">(
        schedule?.type === "LESSON_END" ? "LESSON_END" : "LESSON_START"
    );

    const [enabled, setEnabled] = useState(schedule?.enabled ?? true);

    const [preBellEnabled, setPreBellEnabled] = useState(
        schedule?.preBellEnabled ?? true
    );

    const [soundId, setSoundId] = useState<number | null>(
        schedule?.soundId ?? null
    );

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");

    /*
     * Предзвон существует только
     * для начала урока.
     *
     * Если переключили на конец —
     * автоматически выключаем его.
     */

    useEffect(() => {
        if (type === "LESSON_END") {
            setPreBellEnabled(false);
        }
    }, [type]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        setError("");

        if (!time) {
            setError("Vali kellaaeg");

            return;
        }

        try {
            setSaving(true);

            await onSave(
                dayOfWeek,
                time,
                type,
                enabled,
                type === "LESSON_START" ? preBellEnabled : false,
                soundId
            );
        } catch (error) {
            console.error(error);

            setError("Kella salvestamine ebaõnnestus");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="max-h-[calc(100vh_-_48px)] w-[520px] max-w-full overflow-y-auto rounded-[16px] bg-white p-[28px] font-['Inter'] shadow-[0_15px_50px_rgba(27,33,45,0.18)]"
        >
            {/* HEADER */}

            <div className="mb-[24px] flex items-center justify-between">
                <h2 className="m-0 text-[22px] font-semibold text-[#172033]">
                    {schedule ? "Muuda kella" : "Lisa kell"}
                </h2>

                <button
                    type="button"
                    onClick={onCancel}
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-[22px] leading-none text-[#7c8799] transition hover:bg-[#f1f3f7] hover:text-[#172033]"
                    aria-label="Sulge"
                >
                    ×
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
                {/* DAY + TIME */}

                <div className="grid grid-cols-[1fr_160px] gap-[14px]">
                    <div>
                        <label htmlFor="schedule-day" className={LABEL}>
                            Nädalapäev
                        </label>

                        <select
                            id="schedule-day"
                            value={dayOfWeek}
                            onChange={(event) =>
                                setDayOfWeek(Number(event.target.value))
                            }
                            className={FIELD}
                        >
                            {DAYS.map((name, index) => (
                                <option key={name} value={index + 1}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="schedule-time" className={LABEL}>
                            Kellaaeg
                        </label>

                        <input
                            id="schedule-time"
                            type="time"
                            value={time}
                            onChange={(event) => setTime(event.target.value)}
                            className={FIELD}
                        />
                    </div>
                </div>

                {/* TYPE */}

                <div>
                    <span className={LABEL}>Tüüp</span>

                    <div className="grid grid-cols-2 gap-[4px] rounded-[12px] bg-[#f1f4f9] p-[4px]">
                        {(
                            [
                                ["LESSON_START", "Algus"],
                                ["LESSON_END", "Lõpp"],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setType(value)}
                                aria-pressed={type === value}
                                className={`h-[38px] rounded-[9px] text-[14px] font-medium transition ${
                                    type === value
                                        ? "bg-white text-[#3f82df] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                        : "text-[#647085] hover:text-[#172033]"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SOUND */}

                <div>
                    <label htmlFor="schedule-sound" className={LABEL}>
                        Heli
                    </label>

                    <select
                        id="schedule-sound"
                        value={soundId ?? ""}
                        onChange={(event) => {
                            const value = event.target.value;

                            setSoundId(value === "" ? null : Number(value));
                        }}
                        className={FIELD}
                    >
                        <option value="">Heli pole valitud</option>

                        {sounds.map((sound) => (
                            <option key={sound.id} value={sound.id}>
                                {sound.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* TOGGLES */}

                <div className="flex flex-col gap-[10px]">
                    <Toggle
                        title="Kell on aktiivne"
                        description="Kui välja lülitatud, kella ei mängita"
                        checked={enabled}
                        onChange={setEnabled}
                    />

                    {type === "LESSON_START" && (
                        <Toggle
                            title="Eelkell"
                            description="Mängi kella 2 minutit enne"
                            checked={preBellEnabled}
                            onChange={setPreBellEnabled}
                        />
                    )}
                </div>

                {/* ERROR */}

                {error && (
                    <div
                        role="alert"
                        className="rounded-[10px] bg-[#fff0f0] px-[14px] py-[10px] text-[13px] text-[#d64545]"
                    >
                        {error}
                    </div>
                )}

                {/* BUTTONS */}

                <div className="mt-[4px] flex justify-end gap-[10px]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="h-[44px] rounded-[10px] px-[20px] text-[14px] font-medium text-[#536176] transition hover:bg-[#f1f3f7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Tühista
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="h-[44px] min-w-[120px] rounded-[10px] bg-[#5798f5] px-[22px] text-[14px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Salvestan..." : "Salvesta"}
                    </button>
                </div>
            </form>
        </div>
    );
}