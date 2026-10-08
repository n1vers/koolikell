import { useState } from "react";

import type { Schedule, Sound } from "../types";

interface ScheduleEditorProps {
    profileName: string;
    schedules: Schedule[];
    sounds: Sound[];
    onBack: () => void;
    onSave: () => Promise<void>;
    onAddSchedule: (
        time: string,
        preBellEnabled: boolean,
        soundId: number | null,
        preBellSoundId: number | null
    ) => Promise<void>;
    onUpdateSchedule: (schedule: Schedule) => Promise<void>;
    onDeleteSchedule: (schedule: Schedule) => Promise<void>;
    onRenameProfile: (name: string) => Promise<void>;
}

// Единая сетка для заголовка и строк, чтобы колонки всегда совпадали
const ROW_GRID =
    "grid grid-cols-[36px_96px_minmax(240px,1.2fr)_96px_minmax(160px,1fr)_36px] gap-[16px] items-center";

const SELECT_BASE =
    "h-[36px] min-w-0 w-full rounded-[8px] border border-[#e2e7ef] bg-white px-[10px] text-[13px] text-[#303846] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]";

const INPUT_BASE =
    "h-[40px] w-full rounded-[8px] border border-[#e2e7ef] bg-white px-[12px] text-[13px] text-[#303846] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20";

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-[6px] text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
            {children}
        </div>
    );
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
    onRenameProfile,
}: ScheduleEditorProps) {
    const [saving, setSaving] = useState(false);
    const [editingProfileName, setEditingProfileName] = useState(false);
    const [profileNameDraft, setProfileNameDraft] = useState(profileName);
    const [savingProfileName, setSavingProfileName] = useState(false);

    const [newTime, setNewTime] = useState("08:00");

    const [newPreBellEnabled, setNewPreBellEnabled] = useState(true);

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
                newPreBellSoundId
            );

            setNewTime("08:00");
            setNewPreBellEnabled(true);
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
        <main className="ml-[240px] min-h-screen w-[calc(100%_-_240px)] overflow-x-hidden bg-[#f5f7fb] px-[40px] py-[32px] font-['Inter']">
            {/* HEADER */}

            <div className="mb-[28px] flex items-start justify-between gap-[24px]">
                <div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="mb-[12px] text-[12px] font-medium uppercase tracking-wide text-[#5798f5] transition hover:text-[#3f82df]"
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
                            className="h-[40px] w-full max-w-[520px] rounded-[8px] border border-[#5798f5] bg-white px-[10px] text-[28px] font-semibold leading-tight text-[#202633] outline-none"
                            aria-label="Profiili nimi"
                        />
                    ) : (
                        <h1
                            className="cursor-text text-[28px] font-semibold leading-tight text-[#202633]"
                            onClick={() => {
                                setProfileNameDraft(profileName);
                                setEditingProfileName(true);
                            }}
                            title="Klõpsa nime muutmiseks"
                        >
                            {profileName}
                        </h1>
                    )}

                    <p className="mt-[6px] text-[14px] text-[#7d899d]">
                        Muutke kellade aega, tüüpi ja helisid
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-[22px] h-[44px] min-w-[138px] rounded-[8px] bg-[#5798f5] px-[20px] text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Salvestamine..." : "Salvesta"}
                </button>
            </div>

            <div className="mb-[10px] mt-[28px]">
                <h2 className="m-0 text-[18px] font-semibold text-[#303846]">
                    Olemasolevad kellad
                </h2>
                <p className="m-0 mt-[4px] text-[13px] text-[#8490a3]">
                    Muuda välju otse reas või kustuta kell.
                </p>
            </div>

            {/* TABLE HEADER */}

            <div
                className={`${ROW_GRID} px-[20px] text-[10px] font-medium uppercase tracking-wide text-[#8490a3]`}
            >
                <span>№</span>
                <span>Aeg</span>
                <span>Põhikella heli</span>
                <span>Seisund</span>
                <span>Eelhelin</span>
                <span />
            </div>

            {/* SCHEDULE LIST */}

            <div className="mt-[10px] space-y-[8px]">
                {schedules.map((schedule, index) => (
                    <div
                        key={schedule.id}
                        className={`${ROW_GRID} min-h-[60px] min-w-0 rounded-[10px] bg-white px-[20px] py-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                            schedule.enabled ? "" : "opacity-70"
                        }`}
                    >
                        {/* NUMBER */}

                        <span className="text-[12px] text-[#6d788b]">
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
                            className="h-[32px] w-[88px] rounded-[6px] border border-transparent bg-transparent px-[4px] text-[14px] font-medium text-[#28303d] outline-none transition hover:border-[#e2e7ef] focus:border-[#5798f5]"
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
                            <option value=""> </option>
                            {sounds.map((sound) => (
                                <option key={sound.id} value={sound.id}>
                                    {sound.name}
                                </option>
                            ))}
                        </select>

                        {/* ENABLED */}

                        <label className="flex cursor-pointer items-center gap-[8px]">
                            <input
                                type="checkbox"
                                checked={schedule.enabled}
                                onChange={(event) =>
                                    void updateSchedule(schedule, {
                                        enabled: event.target.checked,
                                    })
                                }
                                className="h-[16px] w-[16px] cursor-pointer accent-[#5798f5]"
                            />

                            <span className="text-[12px] text-[#697589]">
                                {schedule.enabled ? "Sees" : "Väljas"}
                            </span>
                        </label>

                        {/* PRE BELL */}

                        <div className="flex min-w-0 items-center gap-[10px]">
                            <input
                                type="checkbox"
                                checked={schedule.preBellEnabled}
                                onChange={(event) =>
                                    void updateSchedule(schedule, {
                                        preBellEnabled: event.target.checked,
                                    })
                                }
                                aria-label="Eelhelin sisse"
                                className="h-[16px] w-[16px] shrink-0 cursor-pointer accent-[#5798f5]"
                            />

                            <select
                                value={schedule.preBellSoundId ?? ""}
                                disabled={!schedule.preBellEnabled}
                                onChange={(event) =>
                                    void updateSchedule(schedule, {
                                        preBellSoundId: toId(
                                            event.target.value
                                        ),
                                    })
                                }
                                className={SELECT_BASE}
                            >
                                <option value=""></option>
                                {sounds.map((sound) => (
                                    <option key={sound.id} value={sound.id}>
                                        {sound.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* DELETE */}

                        <button
                            type="button"
                            onClick={() => void onDeleteSchedule(schedule)}
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-[18px] text-[#8994a6] transition hover:bg-[#fdecec] hover:text-[#d64545]"
                            title="Kustuta"
                            aria-label="Kustuta"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* ADD */}

            <div className="mt-[36px] rounded-[12px] border border-[#dfe8f5] bg-[#f8fbff] p-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="mb-[4px] text-[18px] font-semibold text-[#303846]">
                    Lisa uus kell
                </div>
                <div className="mb-[16px] text-[13px] text-[#8490a3]">
                    See vorm lisab uue kella profiili. Olemasolevate kellade muutmine toimub ülalolevas nimekirjas.
                </div>

                <div className="grid grid-cols-[120px_150px_minmax(180px,1fr)_minmax(180px,1fr)_auto] items-end gap-[16px]">
                    {/* TIME */}

                    <div>
                        <FieldLabel>Kellaaeg</FieldLabel>

                        <input
                            type="time"
                            value={newTime}
                            onChange={(event) => setNewTime(event.target.value)}
                            className={INPUT_BASE}
                        />
                    </div>

                    {/* SOUND */}

                    <div className="min-w-0">
                        <FieldLabel>Põhikella heli</FieldLabel>

                        <select
                            value={newSoundId ?? ""}
                            onChange={(event) =>
                                (() => {
                                    setAddError("");
                                    rememberSound(
                                        "schoolbell-default-sound-id",
                                        toId(event.target.value),
                                        setNewSoundId
                                    );
                                })()
                            }
                            aria-invalid={newSoundId === null}
                            className={`${INPUT_BASE} ${
                                newSoundId === null
                                    ? "border-[#e05252]"
                                    : ""
                            }`}
                        >
                            <option value=""> </option>
                            {sounds.map((sound) => (
                                <option key={sound.id} value={sound.id}>
                                    {sound.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* PRE BELL SOUND */}

                    <div className="min-w-0">
                        <FieldLabel>Eelheli</FieldLabel>

                        <select
                            value={newPreBellSoundId ?? ""}
                            disabled={!newPreBellEnabled}
                            onChange={(event) =>
                                (() => {
                                    setAddError("");
                                    rememberSound(
                                        "schoolbell-default-pre-bell-sound-id",
                                        toId(event.target.value),
                                        setNewPreBellSoundId
                                    );
                                })()
                            }
                            aria-invalid={
                                newPreBellEnabled &&
                                newPreBellSoundId === null
                            }
                            className={`${INPUT_BASE} ${
                                newPreBellEnabled &&
                                newPreBellSoundId === null
                                    ? "border-[#e05252]"
                                    : ""
                            } disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#a3adbd]`}
                        >
                            <option value=""> </option>
                            {sounds.map((sound) => (
                                <option key={sound.id} value={sound.id}>
                                    {sound.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* PRE BELL */}

                    <div>
                        <FieldLabel>Eelhelin</FieldLabel>

                        <label className="flex h-[40px] cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#e2e7ef] bg-white px-[12px]">
                            <input
                                type="checkbox"
                                checked={newPreBellEnabled}
                                onChange={(event) =>
                                    (() => {
                                        setAddError("");
                                        setNewPreBellEnabled(event.target.checked);
                                    })()
                                }
                                className="h-[16px] w-[16px] cursor-pointer accent-[#5798f5]"
                            />

                            <span className="text-[13px] text-[#596577]">
                                Kasuta
                            </span>
                        </label>
                    </div>

                    {addError && (
                        <p className="col-span-full m-0 text-[12px] text-[#b42318]">
                            {addError}
                        </p>
                    )}

                    {/* ADD BUTTON */}

                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex h-[40px] items-center gap-[6px] whitespace-nowrap rounded-[8px] bg-[#5798f5] px-[18px] text-[13px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7]"
                    >
                        <span className="text-[17px] leading-none">+</span>
                        Lisa kell
                    </button>
                </div>
            </div>
        </main>
    );
}