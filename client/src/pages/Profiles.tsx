import { useState } from "react";
import type { Profile, Schedule } from "../types";
import DateProfileCalendar from "../components/DateProfileCalendar";

interface ProfilesProps {
    profiles: Profile[];
    schedulesByProfile: Record<number, Schedule[]>;
    onCreateProfile: (name: string) => Promise<void>;
    onRenameProfile: (
        profile: Profile,
        name: string
    ) => Promise<void>;
    onDeleteProfile: (profile: Profile) => void;
    onOpenProfile: (profile: Profile) => void;
    profileByDay: Record<number, number | null>;
    profileByDate: Record<string, number | null>;
    onAssignProfile: (
        day: number,
        profileId: number | null
    ) => void;
    onAssignDate: (
        date: string,
        profileId: number | null
    ) => void;
}

function getEndTime(time: string) {
    const [hours, minutes] = time
        .split(":")
        .map(Number);

    const totalMinutes =
        hours * 60 + minutes + 45;

    const endHours =
        Math.floor(totalMinutes / 60) % 24;

    const endMinutes =
        totalMinutes % 60;

    return `${String(endHours).padStart(
        2,
        "0"
    )}:${String(endMinutes).padStart(
        2,
        "0"
    )}`;
}

function getProfileInfo(
    schedules: Schedule[]
) {
    const enabledSchedules =
        schedules.filter(
            (schedule) =>
                schedule.enabled !== false
        );

    if (enabledSchedules.length === 0) {
        return {
            count: 0,
            range: "Ajakava puudub",
        };
    }

    const sorted = [
        ...enabledSchedules,
    ].sort((a, b) =>
        a.time.localeCompare(b.time)
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
        count: sorted.length,
        range: `${first.time}–${getEndTime(
            last.time
        )}`,
    };
}

export default function Profiles({
    profiles,
    schedulesByProfile,
    onCreateProfile,
    onRenameProfile,
    onDeleteProfile,
    onOpenProfile,
    profileByDay,
    onAssignProfile,
    profileByDate,
    onAssignDate,
}: ProfilesProps) {
    const [showCreate, setShowCreate] =
        useState(false);

    const [profileName, setProfileName] =
        useState("");

    const [creating, setCreating] =
        useState(false);

    const [menuId, setMenuId] =
        useState<number | null>(null);

    const [editingProfile, setEditingProfile] =
        useState<Profile | null>(null);

    const [editingName, setEditingName] =
        useState("");

    const [savingName, setSavingName] =
        useState(false);

    async function handleCreate() {
        const name =
            profileName.trim();

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
            await onRenameProfile(
                editingProfile,
                editingName.trim()
            );
            setEditingProfile(null);
            setEditingName("");
        } finally {
            setSavingName(false);
        }
    }

    return (
        <main
            className="
                ml-[240px]
                min-h-[900px]
                bg-[#f5f7fb]
                px-[40px]
                pr-[80px]
            "
        >
            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <header className="pt-[72px]">
                <p
                    className="
                        m-0
                        font-['Inter']
                        text-[12px]
                        font-medium
                        uppercase
                        leading-[24px]
                        tracking-[0.4px]
                        text-[#647085]
                    "
                >
                    RASVAD
                </p>

                <div
                    className="
                        mt-[4px]
                        flex
                        items-end
                        justify-between
                    "
                >
                    <div>
                        <h1
                            className="
                                m-0
                                font-['Inter']
                                text-[32px]
                                font-semibold
                                leading-[48px]
                                text-[#1b212d]
                            "
                        >
                            Profiilid
                        </h1>

                        <p
                            className="
                                m-0
                                mt-[2px]
                                font-['Inter']
                                text-[15px]
                                leading-[30px]
                                text-[#647085]
                            "
                        >
                            Loo erinevaid koolikella
                            ajakavasid
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowCreate(true)
                        }
                        className="
                            mb-[2px]
                            h-[44px]
                            w-[250px]
                            rounded-[10px]
                            border-0
                            bg-[#529eff]
                            font-['Inter']
                            text-[14px]
                            font-medium
                            text-white
                            transition
                            hover:bg-[#438fea]
                        "
                    >
                        +&nbsp;&nbsp;Uus profiil
                    </button>
                </div>
            </header>


            {/* ================================= */}
            {/* PROFILES */}
            {/* ================================= */}

            <section className="mt-[30px]">
                <div className="flex flex-col gap-[30px]">

                    {profiles.map(
                        (profile) => {
                            const schedules =
                                schedulesByProfile[
                                    profile.id
                                ] ?? [];

                            const info =
                                getProfileInfo(
                                    schedules
                                );

                            return (
                                <article
                                    key={
                                        profile.id
                                    }
                                    className="
                                        relative
                                        h-[120px]
                                        w-full
                                        cursor-pointer
                                        rounded-[12px]
                                        bg-white
                                        transition
                                        hover:shadow-[0_4px_18px_rgba(27,33,45,0.06)]
                                    "
                                    onClick={() =>
                                        onOpenProfile(
                                            profile
                                        )
                                    }
                                >
                                    {/* BLUE INDICATOR */}

                                    <div
                                        className="
                                            absolute
                                            left-0
                                            top-0
                                            h-full
                                            w-[5px]
                                            rounded-l-[12px]
                                            bg-[#529eff]
                                        "
                                    />


                                    {/* NAME */}

                                    <h2
                                        className="
                                            absolute
                                            left-[30px]
                                            top-[25px]
                                            m-0
                                            font-['Inter']
                                            text-[18px]
                                            font-semibold
                                            leading-[28px]
                                            text-[#1b212d]
                                        "
                                    >
                                        {
                                            profile.name
                                        }
                                    </h2>


                                    {/* INFO */}

                                    <p
                                        className="
                                            absolute
                                            left-[30px]
                                            top-[61px]
                                            m-0
                                            font-['Inter']
                                            text-[14px]
                                            leading-[24px]
                                            text-[#647085]
                                        "
                                    >
                                        {
                                            info.count
                                        }{" "}
                                        {info.count ===
                                        1
                                            ? "tund"
                                            : "tundi"}
                                        {" · "}
                                        {
                                            info.range
                                        }
                                    </p>


                                    {/* EDIT */}

                                    <button
                                        type="button"
                                        onClick={(
                                            event
                                        ) => {
                                            event.stopPropagation();

                                            onOpenProfile(profile);
                                        }}
                                        className="
                                            absolute
                                            right-[70px]
                                            top-[42px]
                                            h-[36px]
                                            w-[36px]
                                            rounded-[8px]
                                            border-0
                                            bg-transparent
                                            text-[18px]
                                            text-[#647085]
                                            hover:bg-[#f5f7fb]
                                        "
                                    >
                                        ✎
                                    </button>


                                    {/* MENU */}

                                    <button
                                        type="button"
                                        onClick={(
                                            event
                                        ) => {
                                            event.stopPropagation();

                                            setMenuId(
                                                menuId ===
                                                    profile.id
                                                    ? null
                                                    : profile.id
                                            );
                                        }}
                                        className="
                                            absolute
                                            right-[25px]
                                            top-[42px]
                                            h-[36px]
                                            w-[36px]
                                            rounded-[8px]
                                            border-0
                                            bg-transparent
                                            text-[22px]
                                            leading-[20px]
                                            text-[#647085]
                                            hover:bg-[#f5f7fb]
                                        "
                                    >
                                        ⋮
                                    </button>


                                    {/* MENU */}

                                    {menuId ===
                                        profile.id && (
                                        <div
                                            className="
                                                absolute
                                                right-[25px]
                                                top-[82px]
                                                z-20
                                                w-[160px]
                                                overflow-hidden
                                                rounded-[10px]
                                                border
                                                border-[#e5e9f0]
                                                bg-white
                                                shadow-[0_8px_25px_rgba(27,33,45,0.10)]
                                            "
                                        >
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    setMenuId(
                                                        null
                                                    );

                                                    setEditingProfile(profile);
                                                    setEditingName(profile.name);
                                                }}
                                                className="
                                                    h-[42px]
                                                    w-full
                                                    border-0
                                                    bg-white
                                                    px-[16px]
                                                    text-left
                                                    font-['Inter']
                                                    text-[14px]
                                                    text-[#1b212d]
                                                    hover:bg-[#f5f7fb]
                                                "
                                            >
                                                Muuda nime
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    setMenuId(
                                                        null
                                                    );

                                                    onDeleteProfile(
                                                        profile
                                                    );
                                                }}
                                                className="
                                                    h-[42px]
                                                    w-full
                                                    border-0
                                                    bg-white
                                                    px-[16px]
                                                    text-left
                                                    font-['Inter']
                                                    text-[14px]
                                                    text-[#e05252]
                                                    hover:bg-[#fff5f5]
                                                "
                                            >
                                                Kustuta
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        }
                    )}


                    {profiles.length === 0 && (
                        <div
                            className="
                                flex
                                h-[120px]
                                w-full
                                items-center
                                justify-center
                                rounded-[12px]
                                bg-white
                                font-['Inter']
                                text-[15px]
                                text-[#647085]
                            "
                        >
                            Profiile veel ei ole
                        </div>
                    )}
                </div>
            </section>

            {/* ================================= */}
            {/* WEEK SCHEDULE */}
            {/* ================================= */}

            <section
                className="
                    mt-[60px]
                    h-[130px]
                    w-full
                    rounded-[12px]
                    bg-white
                    px-[30px]
                    py-[22px]
                "
            >
                <h2
                    className="
                        m-0
                        font-['Inter']
                        text-[17px]
                        font-semibold
                        leading-[28px]
                        text-[#1b212d]
                    "
                >
                    Nädala ajakava
                </h2>

                <div
                    className="
                        mt-[16px]
                        grid
                        grid-cols-5
                        gap-[10px]
                    "
                >
                    {[
                        "Esmaspäev",
                        "Teisipäev",
                        "Kolmapäev",
                        "Neljapäev",
                        "Reede",
                    ].map((dayName, index) => {
                        const day = index + 1;

                        return (
                            <label
                                key={day}
                                className="flex min-w-0 flex-col gap-[6px] font-['Inter'] text-[11px] font-medium text-[#647085]"
                            >
                                <span className="truncate">{dayName}</span>
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
                                    className="h-[36px] min-w-0 rounded-[8px] border-0 bg-[#f5f7fb] px-[6px] text-[11px] text-[#1b212d] outline-none"
                                >
                                    <option value="">Puudub</option>
                                    {profiles.map((profile) => (
                                        <option
                                            key={profile.id}
                                            value={profile.id}
                                        >
                                            {profile.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        );
                    })}
                </div>
            </section>

            <DateProfileCalendar
                profiles={profiles}
                assignments={profileByDate}
                onAssignDate={onAssignDate}
            />


            {editingProfile && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(27,33,45,0.25)]"
                    onClick={() => setEditingProfile(null)}
                >
                    <div
                        className="w-[420px] rounded-[14px] bg-white p-[24px] shadow-[0_15px_50px_rgba(27,33,45,0.15)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="m-0 text-[20px] font-semibold text-[#1b212d]">
                            Muuda profiili nime
                        </h2>
                        <input
                            autoFocus
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    void handleRename();
                                }
                            }}
                            className="mt-[18px] h-[44px] w-full rounded-[8px] border border-[#d9dee8] px-[12px] text-[14px] text-[#1b212d] outline-none focus:border-[#529eff]"
                        />
                        <div className="mt-[18px] flex justify-end gap-[8px]">
                            <button
                                type="button"
                                onClick={() => setEditingProfile(null)}
                                className="rounded-[8px] bg-[#f5f7fb] px-[14px] py-[9px] text-[13px] text-[#647085]"
                            >
                                Tühista
                            </button>
                            <button
                                type="button"
                                disabled={savingName || !editingName.trim()}
                                onClick={() => void handleRename()}
                                className="rounded-[8px] bg-[#529eff] px-[14px] py-[9px] text-[13px] font-medium text-white disabled:opacity-50"
                            >
                                {savingName ? "Salvestan..." : "Salvesta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ================================= */}
            {/* CREATE MODAL */}
            {/* ================================= */}

            {showCreate && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-[rgba(27,33,45,0.25)]
                    "
                    onClick={() =>
                        setShowCreate(false)
                    }
                >
                    <div
                        className="
                            w-[460px]
                            rounded-[16px]
                            bg-white
                            p-[30px]
                            shadow-[0_15px_50px_rgba(27,33,45,0.15)]
                        "
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <h2
                            className="
                                m-0
                                font-['Inter']
                                text-[22px]
                                font-semibold
                                text-[#1b212d]
                            "
                        >
                            Uus profiil
                        </h2>

                        <p
                            className="
                                mt-[6px]
                                font-['Inter']
                                text-[14px]
                                text-[#647085]
                            "
                        >
                            Sisesta uue profiili nimi.
                        </p>

                        <input
                            autoFocus
                            value={
                                profileName
                            }
                            onChange={(event) =>
                                setProfileName(
                                    event.target
                                        .value
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                    "Enter"
                                ) {
                                    handleCreate();
                                }
                            }}
                            placeholder="Näiteks Tavaline koolipäev"
                            className="
                                mt-[22px]
                                h-[46px]
                                w-full
                                rounded-[10px]
                                border
                                border-[#dfe4ec]
                                bg-white
                                px-[14px]
                                font-['Inter']
                                text-[14px]
                                text-[#1b212d]
                                outline-none
                                focus:border-[#529eff]
                                focus:ring-2
                                focus:ring-[#529eff]/20
                            "
                        />

                        <div
                            className="
                                mt-[24px]
                                flex
                                justify-end
                                gap-[10px]
                            "
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setShowCreate(
                                        false
                                    )
                                }
                                className="
                                    h-[44px]
                                    w-[110px]
                                    rounded-[10px]
                                    border-0
                                    bg-[#f5f7fb]
                                    font-['Inter']
                                    text-[14px]
                                    font-medium
                                    text-[#647085]
                                "
                            >
                                Tühista
                            </button>

                            <button
                                type="button"
                                disabled={
                                    creating ||
                                    !profileName.trim()
                                }
                                onClick={
                                    handleCreate
                                }
                                className="
                                    h-[44px]
                                    w-[140px]
                                    rounded-[10px]
                                    border-0
                                    bg-[#529eff]
                                    font-['Inter']
                                    text-[14px]
                                    font-medium
                                    text-white
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {creating
                                    ? "Salvestan..."
                                    : "Loo profiil"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}