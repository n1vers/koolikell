import { useState } from "react";
import type { Profile, Schedule } from "../types";
import DateProfileCalendar from "../components/DateProfileCalendar";

interface ProfilesProps {
    profiles: Profile[];
    schedulesByProfile: Record<number, Schedule[]>;
    onCreateProfile: (name: string) => Promise<void>;
    onRenameProfile: (profile: Profile, name: string) => Promise<void>;
    onDeleteProfile: (profile: Profile) => void;
    onOpenProfile: (profile: Profile) => void;
    onCopyProfile: (profile: Profile) => Promise<void>;
    profileByDay: Record<number, number | null>;
    profileByDate: Record<string, number | null>;
    onAssignProfile: (day: number, profileId: number | null) => void;
    onAssignDate: (date: string, profileId: number | null) => void;
}

const WEEKDAYS = ["Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede"];

function getEndTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number);

    const totalMinutes = hours * 60 + minutes + 45;

    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(
        2,
        "0"
    )}`;
}

function getProfileInfo(schedules: Schedule[]) {
    const enabledSchedules = schedules.filter(
        (schedule) => schedule.enabled !== false
    );

    if (enabledSchedules.length === 0) {
        return {
            count: 0,
            range: "Ajakava puudub",
        };
    }

    const sorted = [...enabledSchedules].sort((a, b) =>
        a.time.localeCompare(b.time)
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
        count: sorted.length,
        range: `${first.time}–${getEndTime(last.time)}`,
    };
}

// ============================================
// ICONS
// ============================================

function PencilIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
            aria-hidden="true"
        >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    );
}

function DotsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
        </svg>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
            {children}
        </span>
    );
}

const ICON_BTN =
    "flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[#647085] transition hover:bg-[#f1f4f8] hover:text-[#1b212d]";

const INPUT_BASE =
    "w-full rounded-[10px] border border-[#dfe4ec] bg-white px-[14px] text-[14px] text-[#1b212d] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20";

export default function Profiles({
    profiles,
    schedulesByProfile,
    onCreateProfile,
    onRenameProfile,
    onDeleteProfile,
    onOpenProfile,
    onCopyProfile,
    profileByDay,
    onAssignProfile,
    profileByDate,
    onAssignDate,
}: ProfilesProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [creating, setCreating] = useState(false);
    const [menuId, setMenuId] = useState<number | null>(null);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [editingName, setEditingName] = useState("");
    const [savingName, setSavingName] = useState(false);

    async function handleCreate() {
        const name = profileName.trim();

        if (!name) {
            return;
        }

        try {
            setCreating(true);

            await onCreateProfile(name);

            setProfileName("");
            setShowCreate(false);
        } finally {
            setCreating(false);
        }
    }

    async function handleRename() {
        if (!editingProfile || !editingName.trim()) {
            return;
        }

        try {
            setSavingName(true);
            await onRenameProfile(editingProfile, editingName.trim());
            setEditingProfile(null);
            setEditingName("");
        } finally {
            setSavingName(false);
        }
    }

    return (
        <main className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] pb-[56px] pt-[48px] font-['Inter']">
            <div className="mx-auto w-full max-w-[1040px]">
                {/* HEADER */}

                <header className="flex items-end justify-between gap-[24px]">
                    <div>
                        <p className="m-0 text-[12px] font-medium uppercase tracking-[0.08em] text-[#8490a3]">
                            Rasvad
                        </p>

                        <h1 className="m-0 mt-[6px] text-[28px] font-semibold leading-tight text-[#1b212d]">
                            Profiilid
                        </h1>

                        <p className="m-0 mt-[6px] text-[14px] text-[#647085]">
                            Loo erinevaid koolikella ajakavasid
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="flex h-[44px] items-center gap-[8px] whitespace-nowrap rounded-[10px] border-0 bg-[#5798f5] px-[20px] text-[14px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7]"
                    >
                        <span className="text-[18px] leading-none">+</span>
                        Uus profiil
                    </button>
                </header>

                {/* PROFILES */}

                <section className="mt-[28px]">
                    <div className="flex flex-col gap-[12px]">
                        {profiles.map((profile) => {
                            const schedules = schedulesByProfile[profile.id] ?? [];
                            const info = getProfileInfo(schedules);

                            return (
                                <article
                                    key={profile.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onOpenProfile(profile)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.target === event.currentTarget &&
                                            (event.key === "Enter" || event.key === " ")
                                        ) {
                                            event.preventDefault();
                                            onOpenProfile(profile);
                                        }
                                    }}
                                    className="relative flex min-h-[88px] w-full cursor-pointer items-center gap-[16px] overflow-visible rounded-[12px] bg-white py-[16px] pl-[30px] pr-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition hover:shadow-[0_4px_18px_rgba(27,33,45,0.07)] focus-visible:ring-2 focus-visible:ring-[#5798f5]/40"
                                >
                                    {/* BLUE INDICATOR */}

                                    <div className="absolute left-0 top-0 h-full w-[5px] rounded-l-[12px] bg-[#5798f5]" />

                                    {/* NAME + INFO */}

                                    <div className="min-w-0 flex-1">
                                        <h2 className="m-0 truncate text-[18px] font-semibold leading-[26px] text-[#1b212d]">
                                            {profile.name}
                                        </h2>

                                        <p className="m-0 mt-[4px] flex items-center gap-[8px] text-[14px] text-[#647085]">
                                            <span className="rounded-full bg-[#eaf2ff] px-[8px] py-[1px] text-[12px] font-medium text-[#3f82df]">
                                                {info.count}{" "}
                                                {info.count === 1 ? "tund" : "tundi"}
                                            </span>

                                            <span>{info.range}</span>
                                        </p>
                                    </div>

                                    {/* ACTIONS */}

                                    <div className="flex shrink-0 items-center gap-[4px]">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onOpenProfile(profile);
                                            }}
                                            className={ICON_BTN}
                                            title="Muuda ajakava"
                                            aria-label="Muuda ajakava"
                                        >
                                            <PencilIcon />
                                        </button>

                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setMenuId(
                                                        menuId === profile.id
                                                            ? null
                                                            : profile.id
                                                    );
                                                }}
                                                className={ICON_BTN}
                                                title="Rohkem"
                                                aria-label="Rohkem"
                                                aria-haspopup="menu"
                                                aria-expanded={menuId === profile.id}
                                            >
                                                <DotsIcon />
                                            </button>

                                            {menuId === profile.id && (
                                                <>
                                                    {/* Клик вне меню закрывает его */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setMenuId(null);
                                                        }}
                                                    />

                                                    <div
                                                        role="menu"
                                                        className="absolute right-0 top-[40px] z-20 w-[170px] overflow-hidden rounded-[10px] border border-[#e5e9f0] bg-white py-[4px] shadow-[0_8px_25px_rgba(27,33,45,0.12)]"
                                                    >
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setMenuId(null);
                                                                setEditingProfile(profile);
                                                                setEditingName(profile.name);
                                                            }}
                                                            className="h-[40px] w-full border-0 bg-white px-[16px] text-left text-[14px] text-[#1b212d] transition hover:bg-[#f5f7fb]"
                                                        >
                                                            Muuda nime
                                                        </button>

                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setMenuId(null);
                                                                void onCopyProfile(profile);
                                                            }}
                                                            className="h-[40px] w-full border-0 bg-white px-[16px] text-left text-[14px] text-[#1b212d] transition hover:bg-[#f5f7fb]"
                                                        >
                                                            Kopeeri profiil
                                                        </button>

                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setMenuId(null);
                                                                onDeleteProfile(profile);
                                                            }}
                                                            className="h-[40px] w-full border-0 bg-white px-[16px] text-left text-[14px] text-[#e05252] transition hover:bg-[#fff5f5]"
                                                        >
                                                            Kustuta
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}

                        {profiles.length === 0 && (
                            <div className="flex min-h-[120px] w-full items-center justify-center rounded-[12px] bg-white text-[15px] text-[#647085] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                                Profiile veel ei ole
                            </div>
                        )}
                    </div>
                </section>

                {/* WEEK SCHEDULE */}

                <section className="mt-[40px] w-full rounded-[12px] bg-white p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <h2 className="m-0 text-[17px] font-semibold leading-[28px] text-[#1b212d]">
                        Nädala ajakava
                    </h2>

                    <p className="m-0 mt-[2px] text-[13px] text-[#8792a5]">
                        Vali iga nädalapäeva jaoks profiil.
                    </p>

                    <div className="mt-[18px] grid grid-cols-5 gap-[14px]">
                        {WEEKDAYS.map((dayName, index) => {
                            const day = index + 1;

                            return (
                                <label key={day} className="flex min-w-0 flex-col gap-[6px]">
                                    <FieldLabel>{dayName}</FieldLabel>

                                    <select
                                        value={profileByDay[day] ?? ""}
                                        onChange={(event) =>
                                            onAssignProfile(
                                                day,
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : null
                                            )
                                        }
                                        className="h-[40px] min-w-0 rounded-[8px] border border-[#e2e7ef] bg-white px-[10px] text-[13px] text-[#1b212d] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20"
                                    >
                                        <option value="">Puudub</option>

                                        {profiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {profile.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            );
                        })}
                    </div>
                </section>

                {/* DATE CALENDAR */}

                <div className="mt-[24px]">
                    <DateProfileCalendar
                        profiles={profiles}
                        assignments={profileByDate}
                        onAssignDate={onAssignDate}
                    />
                </div>
            </div>

            {/* RENAME MODAL */}

            {editingProfile && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(27,33,45,0.3)] p-[24px]"
                    onClick={() => setEditingProfile(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-[440px] max-w-full rounded-[16px] bg-white p-[28px] shadow-[0_15px_50px_rgba(27,33,45,0.18)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="m-0 text-[20px] font-semibold text-[#1b212d]">
                            Muuda profiili nime
                        </h2>

                        <div className="mt-[18px]">
                            <FieldLabel>Profiili nimi</FieldLabel>

                            <input
                                autoFocus
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleRename();
                                    }

                                    if (event.key === "Escape") {
                                        setEditingProfile(null);
                                    }
                                }}
                                className={`${INPUT_BASE} mt-[6px] h-[44px]`}
                            />
                        </div>

                        <div className="mt-[22px] flex justify-end gap-[10px]">
                            <button
                                type="button"
                                onClick={() => setEditingProfile(null)}
                                className="h-[40px] rounded-[10px] border-0 bg-[#f5f7fb] px-[18px] text-[14px] font-medium text-[#647085] transition hover:bg-[#ebeff5]"
                            >
                                Tühista
                            </button>

                            <button
                                type="button"
                                disabled={savingName || !editingName.trim()}
                                onClick={() => void handleRename()}
                                className="h-[40px] rounded-[10px] border-0 bg-[#5798f5] px-[18px] text-[14px] font-medium text-white transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingName ? "Salvestan..." : "Salvesta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}

            {showCreate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(27,33,45,0.3)] p-[24px]"
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-[460px] max-w-full rounded-[16px] bg-white p-[28px] shadow-[0_15px_50px_rgba(27,33,45,0.18)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="m-0 text-[22px] font-semibold text-[#1b212d]">
                            Uus profiil
                        </h2>

                        <p className="m-0 mt-[6px] text-[14px] text-[#647085]">
                            Sisesta uue profiili nimi.
                        </p>

                        <div className="mt-[20px]">
                            <FieldLabel>Profiili nimi</FieldLabel>

                            <input
                                autoFocus
                                value={profileName}
                                onChange={(event) => setProfileName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleCreate();
                                    }

                                    if (event.key === "Escape") {
                                        setShowCreate(false);
                                    }
                                }}
                                placeholder="Näiteks Tavaline koolipäev"
                                className={`${INPUT_BASE} mt-[6px] h-[46px]`}
                            />
                        </div>

                        <div className="mt-[24px] flex justify-end gap-[10px]">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="h-[44px] min-w-[110px] rounded-[10px] border-0 bg-[#f5f7fb] px-[18px] text-[14px] font-medium text-[#647085] transition hover:bg-[#ebeff5]"
                            >
                                Tühista
                            </button>

                            <button
                                type="button"
                                disabled={creating || !profileName.trim()}
                                onClick={() => void handleCreate()}
                                className="h-[44px] min-w-[140px] rounded-[10px] border-0 bg-[#5798f5] px-[18px] text-[14px] font-medium text-white transition hover:bg-[#4688e7] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? "Salvestan..." : "Loo profiil"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}