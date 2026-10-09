import { useState } from "react";

import type { Profile, Schedule, Sound } from "../types";

interface ScheduleEditorProps {
    profileName: string;
    profile: Profile;
    schedules: Schedule[];
    sounds: Sound[];
    onBack: () => void;
    onSave: () => Promise<void>;
    onAddSchedule: (
        time: string,
        preBellEnabled: boolean,
        soundId: number | null,
        preBellSoundId: number | null,
        changeBellEnabled: boolean,
        changeBellSoundId: number | null
    ) => Promise<void>;
    onUpdateSchedule: (schedule: Schedule) => Promise<void>;
    onDeleteSchedule: (schedule: Schedule) => Promise<void>;
    onRenameProfile: (name: string) => Promise<void>;
    onUpdateProfile: (changes: Partial<Pick<Profile, "preBellMinutes" | "lessonDurationMinutes" | "changeBellEnabled" | "changeBellSoundId">>) => Promise<void>;
}

// Одна сетка для заголовка и всех строк: каждая запись — ровно одна строка
const ROW_GRID =
    "grid grid-cols-[28px_28px_92px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_56px_32px] items-center gap-[10px]";

// Одна сетка для формы добавления: все поля в одну строку
const ADD_GRID =
    "grid grid-cols-[112px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_auto] items-end gap-[10px]";

const SELECT_BASE =
    "h-[40px] min-w-0 w-full truncate rounded-[8px] border border-[#cfd6e2] bg-white px-[10px] text-[14px] text-[#1f2937] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]";

const INPUT_BASE =
    "h-[44px] w-full rounded-[8px] border border-[#cfd6e2] bg-white px-[12px] text-[15px] text-[#1f2937] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20";

const CHECKBOX = "h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#5798f5]";

function getLessonEndTime(
    schedule: Schedule,
    lessonDurationMinutes: number
) {
    if (schedule.type !== "LESSON_START") {
        return null;
    }

    const [hours, minutes] = schedule.time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    const endMinutes = (hours * 60 + minutes + lessonDurationMinutes) % (24 * 60);
    return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-[6px] text-[12px] font-medium uppercase tracking-wide text-[#647085]">
            {children}
        </div>
    );
}

// Галочка «включено» + выбор звука в одной компактной строке
function SoundControl({
    enabled,
    onToggle,
    soundId,
    onSoundChange,
    sounds,
    toggleLabel,
    invalid = false,
    placeholder = "Vali heli",
}: {
    enabled: boolean;
    onToggle: (checked: boolean) => void;
    soundId: number | null;
    onSoundChange: (value: string) => void;
    sounds: Sound[];
    toggleLabel: string;
    invalid?: boolean;
    placeholder?: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-[10px]">
            <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => onToggle(event.target.checked)}
                aria-label={toggleLabel}
                title={toggleLabel}
                className={CHECKBOX}
            />

            <select
                value={soundId ?? ""}
                disabled={!enabled}
                onChange={(event) => onSoundChange(event.target.value)}
                aria-invalid={invalid}
                className={`${SELECT_BASE} ${invalid ? "border-[#e05252]" : ""}`}
            >
                <option value="">{placeholder}</option>
                {sounds.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                        {sound.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function ScheduleEditor({
    profileName,
    profile,
    schedules,
    sounds,
    onBack,
    onSave,
    onAddSchedule,
    onUpdateSchedule,
    onDeleteSchedule,
    onRenameProfile,
    onUpdateProfile,
}: ScheduleEditorProps) {
    const [saving, setSaving] = useState(false);
    const [editingProfileName, setEditingProfileName] = useState(false);
    const [profileNameDraft, setProfileNameDraft] = useState(profileName);
    const [savingProfileName, setSavingProfileName] = useState(false);
    const [savingProfileSettings, setSavingProfileSettings] = useState(false);

    const [newTime, setNewTime] = useState("08:00");

    const [newPreBellEnabled, setNewPreBellEnabled] = useState(true);
    const [newChangeBellEnabled, setNewChangeBellEnabled] = useState(false);
    const [newChangeBellSoundId, setNewChangeBellSoundId] = useState<number | null>(null);

    const [newSoundId, setNewSoundId] = useState<number | null>(() => {
        const value = localStorage.getItem("schoolbell-default-sound-id");
        return value === null ? null : Number(value);
    });

    const [newPreBellSoundId, setNewPreBellSoundId] = useState<number | null>(
        () => {
            const value = localStorage.getItem(
                "schoolbell-default-pre-bell-sound-id"
            );
            return value === null ? null : Number(value);
        }
    );

    const [timeDrafts, setTimeDrafts] = useState<Record<number, string>>({});
    const [addError, setAddError] = useState("");

    async function updateProfileSetting(
        changes: Partial<Pick<Profile, "preBellMinutes" | "lessonDurationMinutes" | "changeBellEnabled" | "changeBellSoundId">>
    ) {
        try {
            setSavingProfileSettings(true);
            await onUpdateProfile(changes);
        } catch (error) {
            console.error("Failed to update profile settings:", error);
        } finally {
            setSavingProfileSettings(false);
        }
    }

    function rememberSound(
        key: string,
        value: number | null,
        setter: (value: number | null) => void
    ) {
        setter(value);

        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, String(value));
        }
    }

    // ADD

    async function handleAdd() {
        if (newSoundId === null) {
            setAddError(
                newPreBellEnabled
                    ? "Vali põhikella heli ja eelheli."
                    : "Vali põhikella heli."
            );
            return;
        }
        if (newPreBellEnabled && newPreBellSoundId === null) {
            setAddError("Vali eelheli või lülita eelhelin välja.");
            return;
        }

        setAddError("");
        try {
            await onAddSchedule(
                newTime,
                newPreBellEnabled,
                newSoundId,
                newPreBellSoundId,
                newChangeBellEnabled,
                newChangeBellSoundId
            );

            setNewTime("08:00");
            setNewPreBellEnabled(true);
            setNewChangeBellEnabled(false);
            setNewChangeBellSoundId(null);
        } catch (error) {
            console.error("Failed to add schedule:", error);
        }
    }

    // SAVE

    async function handleSave() {
        try {
            setSaving(true);
            await onSave();
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setSaving(false);
        }

    }

    async function saveProfileName() {
        const name = profileNameDraft.trim();
        if (!name || name === profileName) {
            setProfileNameDraft(profileName);
            setEditingProfileName(false);
            return;
        }

        try {
            setSavingProfileName(true);
            await onRenameProfile(name);
            setEditingProfileName(false);
        } catch (error) {
            console.error("Failed to rename profile:", error);
            setProfileNameDraft(profileName);
        } finally {
            setSavingProfileName(false);
        }
    }

    // UPDATE

    async function updateSchedule(
        schedule: Schedule,
        changes: Partial<Schedule>
    ) {
        await onUpdateSchedule({ ...schedule, ...changes });
    }

    function handleTimeDraftChange(scheduleId: number, time: string) {
        setTimeDrafts((current) => ({
            ...current,
            [scheduleId]: time,
        }));
    }

    async function commitTimeDraft(schedule: Schedule) {
        const time = timeDrafts[schedule.id];

        if (time === undefined || time === schedule.time) {
            return;
        }

        await updateSchedule(schedule, { time });

        setTimeDrafts((current) => {
            const next = { ...current };
            delete next[schedule.id];
            return next;
        });
    }

    const toId = (value: string) => (value === "" ? null : Number(value));

    // PAGE

    return (
        <main className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,3vw,48px)] py-[36px] font-['Inter']">
            <div className="mx-auto w-full max-w-[1120px]">
                {/* HEADER */}

                <div className="mb-[24px] flex items-start justify-between gap-[24px]">
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="mb-[12px] text-[13px] font-medium uppercase tracking-wide text-[#3f82df] transition hover:text-[#2f6fc7]"
                        >
                            ← Profil
                        </button>

                        {editingProfileName ? (
                            <input
                                autoFocus
                                value={profileNameDraft}
                                onChange={(event) => setProfileNameDraft(event.target.value)}
                                onBlur={() => void saveProfileName()}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void saveProfileName();
                                    }
                                    if (event.key === "Escape") {
                                        setProfileNameDraft(profileName);
                                        setEditingProfileName(false);
                                    }
                                }}
                                disabled={savingProfileName}
                                className="h-[48px] w-full max-w-[520px] rounded-[10px] border border-[#5798f5] bg-white px-[12px] text-[30px] font-semibold leading-tight text-[#1b212d] outline-none"
                                aria-label="Profiili nimi"
                            />
                        ) : (
                            <h1
                                className="m-0 cursor-text truncate text-[32px] font-semibold leading-tight text-[#1b212d]"
                                onClick={() => {
                                    setProfileNameDraft(profileName);
                                    setEditingProfileName(true);
                                }}
                                title="Klõpsa nime muutmiseks"
                            >
                                {profileName}
                            </h1>
                        )}

                        <p className="m-0 mt-[6px] text-[15px] text-[#5b6678]">
                            Muutke kellade aega, tüüpi ja helisid
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-[26px] h-[48px] min-w-[150px] shrink-0 rounded-[10px] bg-[#5798f5] px-[22px] text-[15px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? "Salvestamine..." : "Salvesta"}
                    </button>
                </div>

                {/* PROFILE SETTINGS */}

                <section className="mb-[28px] flex flex-wrap items-end gap-x-[28px] gap-y-[12px] rounded-[12px] bg-white px-[24px] py-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <div className="mr-auto">
                        <h2 className="m-0 text-[17px] font-semibold text-[#1b212d]">
                            Profiili seaded
                        </h2>
                        <p className="m-0 mt-[2px] text-[14px] text-[#5b6678]">
                            Kehtivad kõigile selle profiili kelladele.
                        </p>
                    </div>

                    <label className="block">
                        <FieldLabel>Eelhelinaeg (min)</FieldLabel>
                        <input
                            type="number"
                            min="0"
                            max="60"
                            value={profile.preBellMinutes}
                            disabled={savingProfileSettings}
                            onChange={(event) =>
                                void updateProfileSetting({
                                    preBellMinutes: Math.max(0, Math.min(60, Number(event.target.value))),
                                })
                            }
                            className={`${INPUT_BASE} w-[140px] tabular-nums`}
                        />
                    </label>

                    <label className="block">
                        <FieldLabel>Tunni kestus (min)</FieldLabel>
                        <input
                            type="number"
                            min="1"
                            max="240"
                            value={profile.lessonDurationMinutes}
                            disabled={savingProfileSettings}
                            onChange={(event) =>
                                void updateProfileSetting({
                                    lessonDurationMinutes: Math.max(1, Math.min(240, Number(event.target.value))),
                                })
                            }
                            className={`${INPUT_BASE} w-[140px] tabular-nums`}
                        />
                    </label>
                </section>

                {/* LIST TITLE */}

                <div className="mb-[12px]">
                    <h2 className="m-0 text-[20px] font-semibold text-[#1b212d]">
                        Olemasolevad kellad
                    </h2>
                    <p className="m-0 mt-[4px] text-[14px] text-[#5b6678]">
                        Muuda välju otse reas või kustuta kell.
                    </p>
                </div>

                {/* TABLE (одна строка на запись; колонки сжимаются, горизонтальной прокрутки нет) */}

                <div className="pb-[4px]">
                    <div className="min-w-0">
                        {/* TABLE HEADER */}

                        <div
                            className={`${ROW_GRID} px-[16px] text-[12px] font-medium uppercase tracking-wide text-[#647085]`}
                        >
                            <span />
                            <span>№</span>
                            <span>Aeg</span>
                            <span>Põhikell</span>
                            <span>Eelhelin</span>
                            <span>Vahetunni heli</span>
                            <span>Lõpp</span>
                            <span />
                        </div>

                        {/* SCHEDULE LIST */}

                        <div className="mt-[10px] space-y-[8px]">
                            {schedules.length === 0 && (
                                <div className="rounded-[12px] bg-white px-[24px] py-[28px] text-center text-[15px] text-[#5b6678] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                    Kelli veel pole. Lisa esimene kell allolevas vormis.
                                </div>
                            )}

                            {schedules.map((schedule, index) => (
                                <div
                                    key={schedule.id}
                                    className={`${ROW_GRID} min-h-[64px] rounded-[12px] bg-white px-[16px] py-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] ${
                                        schedule.enabled ? "" : "opacity-70"
                                    }`}
                                >
                                    {/* ENABLED */}

                                    <input
                                        type="checkbox"
                                        checked={schedule.enabled}
                                        onChange={(event) =>
                                            void updateSchedule(schedule, {
                                                enabled: event.target.checked,
                                            })
                                        }
                                        aria-label={schedule.enabled ? "Sees" : "Väljas"}
                                        title={schedule.enabled ? "Sees" : "Väljas"}
                                        className={CHECKBOX}
                                    />

                                    {/* NUMBER */}

                                    <span className="text-[14px] tabular-nums text-[#647085]">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    {/* TIME */}

                                    <input
                                        type="time"
                                        value={timeDrafts[schedule.id] ?? schedule.time}
                                        onChange={(event) =>
                                            handleTimeDraftChange(
                                                schedule.id,
                                                event.target.value
                                            )
                                        }
                                        onBlur={() => void commitTimeDraft(schedule)}
                                        className="h-[40px] w-full min-w-0 rounded-[8px] border border-transparent bg-transparent px-[2px] text-[16px] font-semibold tabular-nums text-[#1b212d] outline-none transition hover:border-[#cfd6e2] focus:border-[#5798f5]"
                                    />

                                    {/* SOUND */}

                                    <select
                                        value={schedule.soundId ?? ""}
                                        onChange={(event) =>
                                            void updateSchedule(schedule, {
                                                soundId: toId(event.target.value),
                                            })
                                        }
                                        className={SELECT_BASE}
                                    >
                                        <option value="">Vali heli</option>
                                        {sounds.map((sound) => (
                                            <option key={sound.id} value={sound.id}>
                                                {sound.name}
                                            </option>
                                        ))}
                                    </select>

                                    {/* PRE BELL */}

                                    <SoundControl
                                        enabled={schedule.preBellEnabled}
                                        onToggle={(checked) =>
                                            void updateSchedule(schedule, {
                                                preBellEnabled: checked,
                                            })
                                        }
                                        soundId={schedule.preBellSoundId ?? null}
                                        onSoundChange={(value) =>
                                            void updateSchedule(schedule, {
                                                preBellSoundId: toId(value),
                                            })
                                        }
                                        sounds={sounds}
                                        toggleLabel="Eelhelin sisse"
                                    />

                                    {/* CHANGE BELL */}

                                    {schedule.type === "LESSON_START" ? (
                                        <SoundControl
                                            enabled={schedule.changeBellEnabled}
                                            onToggle={(checked) =>
                                                void updateSchedule(schedule, {
                                                    changeBellEnabled: checked,
                                                })
                                            }
                                            soundId={schedule.changeBellSoundId ?? null}
                                            onSoundChange={(value) =>
                                                void updateSchedule(schedule, {
                                                    changeBellSoundId: toId(value),
                                                })
                                            }
                                            sounds={sounds}
                                            toggleLabel="Vahetunni heli sisse"
                                        />
                                    ) : (
                                        <span className="text-[14px] text-[#a3adbd]">—</span>
                                    )}

                                    {/* END TIME */}

                                    <span
                                        className="whitespace-nowrap text-[15px] font-medium tabular-nums text-[#374151]"
                                        title="Arvutatud tunni lõpp"
                                    >
                                        {getLessonEndTime(
                                            schedule,
                                            profile.lessonDurationMinutes
                                        ) ?? "—"}
                                    </span>

                                    {/* DELETE */}

                                    <button
                                        type="button"
                                        onClick={() => void onDeleteSchedule(schedule)}
                                        className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] text-[22px] leading-none text-[#7d899d] transition hover:bg-[#fdecec] hover:text-[#d64545]"
                                        title="Kustuta"
                                        aria-label="Kustuta"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ADD */}

                <div className="mt-[36px] rounded-[12px] border border-[#dfe8f5] bg-[#f8fbff] p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="min-w-0">
                        <h2 className="m-0 text-[20px] font-semibold text-[#1b212d]">
                            Lisa uus kell
                        </h2>
                        <p className="m-0 mb-[18px] mt-[4px] text-[14px] text-[#5b6678]">
                            Olemasolevate kellade muutmine toimub ülalolevas nimekirjas.
                        </p>

                        <div className={ADD_GRID}>
                            {/* TIME */}

                            <div>
                                <FieldLabel>Kellaaeg</FieldLabel>

                                <input
                                    type="time"
                                    value={newTime}
                                    onChange={(event) => setNewTime(event.target.value)}
                                    className={`${INPUT_BASE} tabular-nums`}
                                />
                            </div>

                            {/* SOUND */}

                            <div className="min-w-0">
                                <FieldLabel>Põhikella heli</FieldLabel>

                                <select
                                    value={newSoundId ?? ""}
                                    onChange={(event) => {
                                        setAddError("");
                                        rememberSound(
                                            "schoolbell-default-sound-id",
                                            toId(event.target.value),
                                            setNewSoundId
                                        );
                                    }}
                                    aria-invalid={newSoundId === null}
                                    className={`${INPUT_BASE} truncate ${
                                        newSoundId === null ? "border-[#e05252]" : ""
                                    }`}
                                >
                                    <option value="">Vali heli</option>
                                    {sounds.map((sound) => (
                                        <option key={sound.id} value={sound.id}>
                                            {sound.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* PRE BELL */}

                            <div className="min-w-0">
                                <FieldLabel>Eelhelin</FieldLabel>

                                <div className="flex items-center gap-[10px]">
                                    <input
                                        type="checkbox"
                                        checked={newPreBellEnabled}
                                        onChange={(event) => {
                                            setAddError("");
                                            setNewPreBellEnabled(event.target.checked);
                                        }}
                                        aria-label="Eelhelin sisse"
                                        title="Eelhelin sisse"
                                        className={CHECKBOX}
                                    />

                                    <select
                                        value={newPreBellSoundId ?? ""}
                                        disabled={!newPreBellEnabled}
                                        onChange={(event) => {
                                            setAddError("");
                                            rememberSound(
                                                "schoolbell-default-pre-bell-sound-id",
                                                toId(event.target.value),
                                                setNewPreBellSoundId
                                            );
                                        }}
                                        aria-invalid={
                                            newPreBellEnabled && newPreBellSoundId === null
                                        }
                                        className={`${INPUT_BASE} min-w-0 truncate ${
                                            newPreBellEnabled && newPreBellSoundId === null
                                                ? "border-[#e05252]"
                                                : ""
                                        } disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]`}
                                    >
                                        <option value="">Vali heli</option>
                                        {sounds.map((sound) => (
                                            <option key={sound.id} value={sound.id}>
                                                {sound.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* CHANGE BELL */}

                            <div className="min-w-0">
                                <FieldLabel>Vahetunni heli</FieldLabel>

                                <div className="flex items-center gap-[10px]">
                                    <input
                                        type="checkbox"
                                        checked={newChangeBellEnabled}
                                        onChange={(event) => {
                                            setAddError("");
                                            setNewChangeBellEnabled(event.target.checked);
                                        }}
                                        aria-label="Vahetunni heli sisse"
                                        title="Vahetunni heli sisse"
                                        className={CHECKBOX}
                                    />

                                    <select
                                        value={newChangeBellSoundId ?? ""}
                                        disabled={!newChangeBellEnabled}
                                        onChange={(event) => {
                                            setAddError("");
                                            setNewChangeBellSoundId(toId(event.target.value));
                                        }}
                                        className={`${INPUT_BASE} min-w-0 truncate disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]`}
                                    >
                                        <option value="">Vali heli</option>
                                        {sounds.map((sound) => (
                                            <option key={sound.id} value={sound.id}>
                                                {sound.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ADD BUTTON */}

                            <button
                                type="button"
                                onClick={handleAdd}
                                className="flex h-[44px] items-center gap-[8px] whitespace-nowrap rounded-[10px] bg-[#5798f5] px-[22px] text-[15px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7]"
                            >
                                <span className="text-[20px] leading-none">+</span>
                                Lisa kell
                            </button>
                        </div>

                        {addError && (
                            <p
                                role="alert"
                                className="m-0 mt-[12px] text-[14px] text-[#b42318]"
                            >
                                {addError}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}