import { useEffect, useState } from "react";
import AudioSettings from "./components/AudioSettings";
import AppLogs from "./components/AppLogs";
import Dashboard from "./pages/Dashboard";
import Sidebar from "./components/Sidebar";
import Profiles from "./pages/Profiles";
import ScheduleEditor from "./pages/ScheduleEditor";
import SoundsPage from "./pages/SoundsPage";
import PlayNowPage from "./pages/PlayNowPage";
import type {
    Profile,
    Schedule,
    Sound,
} from "./types";

import {
    startBellScheduler,
    stopBellScheduler,
} from "./services/bellScheduler";
import { writeAppLog } from "./services/logService";

import {
    getProfiles,
    getSchedules,
    getSounds,
    createProfile,
    updateProfile,
    deleteProfile,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from "./api/api";

type Page =
    | "dashboard"
    | "profiles"
    | "sounds"
    | "playnow"
    | "settings"
    | "schedule-editor";

interface WindowsSettings {
    openAtLogin: boolean;
    openAsHidden: boolean;
}

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

function getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayNumber() {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
}

export default function App() {
    // =========================================
    // PAGE
    // =========================================

    const [currentPage, setCurrentPage] =
        useState<Page>("dashboard");


    // =========================================
    // DATA
    // =========================================

    const [profiles, setProfiles] =
        useState<Profile[]>([]);

    const [
        schedulesByProfile,
        setSchedulesByProfile,
    ] = useState<
        Record<number, Schedule[]>
    >({});

    const [schedules, setSchedules] =
        useState<Schedule[]>([]);

    const [profileByDay, setProfileByDay] =
        useState<Record<number, number | null>>({});

    const [profileByDate, setProfileByDate] =
        useState<Record<string, number | null>>({});

    const [todayNumber, setTodayNumber] =
        useState(getTodayNumber);

    const [sounds, setSounds] =
        useState<Sound[]>([]);


    // =========================================
    // SELECTED PROFILE
    // =========================================

    const [
        selectedProfile,
        setSelectedProfile,
    ] = useState<Profile | null>(null);


    // =========================================
    // LOADING / ERROR
    // =========================================

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [automaticEnabled, setAutomaticEnabled] =
        useState(
            () =>
                localStorage.getItem(
                    "schoolbell-automatic-enabled"
                ) !== "false"
        );

    const [preBellMinutes, setPreBellMinutes] =
        useState(() =>
            Number(
                localStorage.getItem(
                    "schoolbell-pre-bell-minutes"
                ) ?? 2
            )
        );

    const [windowsSettings, setWindowsSettings] =
        useState<WindowsSettings>({
            openAtLogin: false,
            openAsHidden: false,
        });


    // =========================================
    // LOAD DATA
    // =========================================

    useEffect(() => {
        loadData();

    }, []);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            writeAppLog("error", event.message, event.error);
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            writeAppLog(
                "error",
                "Unhandled promise rejection",
                event.reason
            );
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
        };
    }, []);

    useEffect(() => {
        if (automaticEnabled) {
            startBellScheduler();
        } else {
            stopBellScheduler();
        }

        return () => stopBellScheduler();
    }, [automaticEnabled]);

    function handleToggleAutomatic() {
        setAutomaticEnabled((current) => {
            const next = !current;

            localStorage.setItem(
                "schoolbell-automatic-enabled",
                String(next)
            );

            return next;
        });
    }

    function handlePreBellMinutesChange(value: number) {
        const next = Math.max(0, Math.min(60, value));

        setPreBellMinutes(next);
        localStorage.setItem(
            "schoolbell-pre-bell-minutes",
            String(next)
        );
    }

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTodayNumber(getTodayNumber());
        }, 60_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (currentPage !== "settings") {
            return;
        }

        const loadWindowsSettings = async () => {
            if (window.electronAPI) {
                const settings =
                    await window.electronAPI.getWindowsSettings();

                setWindowsSettings(settings);
                return;
            }

            const saved = localStorage.getItem(
                "schoolbell-windows-settings"
            );

            if (saved) {
                setWindowsSettings(
                    JSON.parse(saved) as WindowsSettings
                );
            }
        };

        void loadWindowsSettings();
    }, [currentPage]);

    async function updateWindowsSetting(
        key: keyof WindowsSettings,
        value: boolean
    ) {
        const next = {
            ...windowsSettings,
            [key]: value,
        };

        setWindowsSettings(next);
        localStorage.setItem(
            "schoolbell-windows-settings",
            JSON.stringify(next)
        );

        if (window.electronAPI) {
            await window.electronAPI.setWindowsSettings(next);
        }
    }

    useEffect(() => {
        if (currentPage !== "schedule-editor") {
            return;
        }

        getSounds()
            .then((soundsData) => {
                setSounds(soundsData);
            })
            .catch((loadError) => {
                console.error(
                    "Failed to refresh sounds:",
                    loadError
                );
            });
    }, [currentPage]);

    useEffect(() => {
        const dateProfileId =
            profileByDate[getDateKey(new Date())];
        const hasDateProfile =
            dateProfileId !== null &&
            dateProfileId !== undefined &&
            profiles.some(
                (profile) => profile.id === dateProfileId
            );
        const profileId =
            todayNumber <= 5
                ? (hasDateProfile ? dateProfileId : null) ??
                    profileByDay[todayNumber] ??
                    profiles[0]?.id
                : null;

        setSchedules(
            profileId
                ? schedulesByProfile[profileId] ?? []
                : []
        );
    }, [
        profileByDate,
        profileByDay,
        profiles,
        schedulesByProfile,
        todayNumber,
    ]);


useEffect(() => {

    if (
        !window.electronAPI
    ) {

        console.log(
            "Electron API unavailable"
        );

        return;

    }


    const unsubscribe =
        window.electronAPI.onBell(
            (event) => {

                console.log(
                    "🔔 Bell received:",
                    event
                );


                if (
                    !event.soundUrl
                ) {

                    console.warn(
                        "No sound assigned to this schedule"
                    );

                    return;

                }


                const audio =
                    new Audio(
                        event.soundUrl
                    );


                audio.volume = 1;


                audio.play()
                    .then(
                        () => {

                            console.log(
                                `🔊 Playing ${event.type}`
                            );

                        }
                    )
                    .catch(
                        (error) => {

                            console.error(
                                "Failed to play sound:",
                                error
                            );

                        }
                    );

            }
        );


    return () => {

        unsubscribe();

    };

}, []);

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            // -----------------------------
            // Profiles
            // -----------------------------

            const profilesData =
                await getProfiles();

            setProfiles(
                profilesData
            );

            const savedAssignments =
                JSON.parse(
                    localStorage.getItem(
                        "schoolbell-profile-by-day"
                    ) ?? "{}"
                ) as Record<string, number>;

            const assignments = WEEK_DAYS.reduce(
                (result, day) => {
                    const profileId =
                        savedAssignments[String(day)];

                    result[day] = profilesData.some(
                        (profile) => profile.id === profileId
                    )
                        ? profileId
                        : profilesData[0]?.id ?? null;

                    return result;
                },
                {} as Record<number, number | null>
            );

            setProfileByDay(assignments);

            localStorage.setItem(
                "schoolbell-profile-by-day",
                JSON.stringify(assignments)
            );

            const savedDateAssignments =
                JSON.parse(
                    localStorage.getItem(
                        "schoolbell-profile-by-date"
                    ) ?? "{}"
                ) as Record<string, number>;

            setProfileByDate(savedDateAssignments);


            // -----------------------------
            // Sounds
            // -----------------------------

            const soundsData =
                await getSounds();

            setSounds(
                soundsData
            );


            // -----------------------------
            // Schedules
            // -----------------------------

            const scheduleMap:
                Record<
                    number,
                    Schedule[]
                > = {};

            for (
                const profile
                of profilesData
            ) {
                try {
                    const profileSchedules =
                        await getSchedules(
                            profile.id
                        );

                    scheduleMap[
                        profile.id
                    ] = profileSchedules;
                } catch (scheduleError) {
                    console.error(
                        `Failed to load schedules for profile ${profile.id}`,
                        scheduleError
                    );

                    scheduleMap[
                        profile.id
                    ] = [];
                }
            }

            setSchedulesByProfile(
                scheduleMap
            );


            // -----------------------------
            // Dashboard schedules
            // -----------------------------

        } catch (error) {
            console.error(
                "Failed to load application data:",
                error
            );

            setError(
                "Andmete laadimine ebaõnnestus"
            );
            writeAppLog(
                "error",
                "Andmete laadimine ebaõnnestus",
                error
            );
        } finally {
            setLoading(false);
        }
    }

    function handleAssignProfile(
        day: number,
        profileId: number | null
    ) {
        setProfileByDay((current) => {
            const next = {
                ...current,
                [day]: profileId,
            };

            localStorage.setItem(
                "schoolbell-profile-by-day",
                JSON.stringify(next)
            );

            return next;
        });
    }

    function handleAssignDate(
        date: string,
        profileId: number | null
    ) {
        setProfileByDate((current) => {
            const next = {
                ...current,
                [date]: profileId,
            };

            if (profileId === null) {
                delete next[date];
            }

            localStorage.setItem(
                "schoolbell-profile-by-date",
                JSON.stringify(next)
            );

            return next;
        });
    }


    // =========================================
    // CREATE PROFILE
    // =========================================

    async function handleCreateProfile(
        name: string
    ) {
        try {
            const createdProfile =
                await createProfile(
                    name
                );

            setProfiles(
                (current) => [
                    ...current,
                    createdProfile,
                ]
            );

            setSchedulesByProfile(
                (current) => ({
                    ...current,

                    [createdProfile.id]:
                        [],
                })
            );
        } catch (error) {
            console.error(
                "Failed to create profile:",
                error
            );

            throw error;
        }
    }


    // =========================================
    // DELETE PROFILE
    // =========================================

    async function handleDeleteProfile(
        profile: Profile
    ) {
        const confirmed =
            window.confirm(
                `Kustuta profiil "${profile.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            await deleteProfile(
                profile.id
            );

            // Remove profile
            setProfiles(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                            profile.id
                    )
            );


            // Remove schedules
            setSchedulesByProfile(
                (current) => {
                    const copy = {
                        ...current,
                    };

                    delete copy[
                        profile.id
                    ];

                    return copy;
                }
            );


            // Close editor if this
            // profile was opened
            if (
                selectedProfile?.id ===
                profile.id
            ) {
                setSelectedProfile(
                    null
                );

                setCurrentPage(
                    "profiles"
                );
            }
        } catch (error) {
            console.error(
                "Failed to delete profile:",
                error
            );
        }
    }


    // =========================================
    // EDIT PROFILE
    // =========================================

    async function handleRenameProfile(
        profile: Profile
        , name: string
    ) {
        const updatedProfile = await updateProfile(
            profile.id,
            name.trim()
        );

        setProfiles((current) =>
            current.map((item) =>
                item.id === updatedProfile.id
                    ? updatedProfile
                    : item
            )
        );

        setSelectedProfile((current) =>
            current?.id === updatedProfile.id
                ? updatedProfile
                : current
        );
    }


    // =========================================
    // OPEN PROFILE
    // =========================================

    function handleOpenProfile(
        profile: Profile
    ) {
        setSelectedProfile(
            profile
        );

        setCurrentPage(
            "schedule-editor"
        );
    }


    // =========================================
    // BACK FROM EDITOR
    // =========================================

    function handleBackFromEditor() {
        setSelectedProfile(
            null
        );

        setCurrentPage(
            "profiles"
        );
    }


    // =========================================
    // ADD SCHEDULE
    // =========================================

    async function handleAddSchedule(
    time: string,
    preBellEnabled: boolean,
    soundId: number | null,
    preBellSoundId: number | null
) {
    if (!selectedProfile) {
        return;
    }

    try {
        const dayOfWeek = 1;

        const createdSchedule =
            await createSchedule(
                selectedProfile.id,
                dayOfWeek,
                time,
                "LESSON_START",
                preBellEnabled,
                soundId,
                preBellSoundId
            );

        setSchedulesByProfile(
            (current) => ({
                ...current,

                [selectedProfile.id]: [
                    ...(current[
                        selectedProfile.id
                    ] ?? []),

                    createdSchedule,
                ],
            })
        );

        setSchedules(
            (current) => [
                ...current,
                createdSchedule,
            ]
        );

    } catch (error) {
        console.error(
            "Failed to create schedule:",
            error
        );
    }
}


    // =========================================
    // UPDATE SCHEDULE
    // =========================================

    async function handleUpdateSchedule(
    schedule: Schedule
) {
    if (!selectedProfile) {
        return;
    }

    try {
        const updatedSchedule =
            await updateSchedule(
                schedule.id,

                Number(
                    schedule.dayOfWeek
                ),

                schedule.time,

                "LESSON_START",

                schedule.enabled,

                schedule.preBellEnabled,

                    schedule.soundId ?? null,
                    schedule.preBellSoundId ?? null
            );

        setSchedulesByProfile(
            (current) => ({
                ...current,

                [selectedProfile.id]:
                    (
                        current[
                            selectedProfile.id
                        ] ?? []
                    ).map(
                        (item) =>
                            item.id ===
                            updatedSchedule.id
                                ? updatedSchedule
                                : item
                    ),
            })
        );

        setSchedules(
            (current) =>
                current.map(
                    (item) =>
                        item.id ===
                        updatedSchedule.id
                            ? updatedSchedule
                            : item
                )
        );

    } catch (error) {
        console.error(
            "Failed to update schedule:",
            error
        );
    }
}


    // =========================================
    // DELETE SCHEDULE
    // =========================================

    async function handleDeleteSchedule(
        schedule: Schedule
    ) {
        if (
            !selectedProfile
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Kas kustutada see tund?"
            );

        if (!confirmed) {
            return;
        }

        try {
            await deleteSchedule(
                schedule.id
            );


            // Remove from profile
            setSchedulesByProfile(
                (current) => ({
                    ...current,

                    [selectedProfile.id]:
                        (
                            current[
                                selectedProfile
                                    .id
                            ] ?? []
                        ).filter(
                            (item) =>
                                item.id !==
                                schedule.id
                        ),
                })
            );


            // Remove from dashboard
            setSchedules(
                (current) =>
                    current.filter(
                        (item) =>
                            item.id !==
                            schedule.id
                    )
            );
        } catch (error) {
            console.error(
                "Failed to delete schedule:",
                error
            );
        }
    }


    // =========================================
    // SAVE SCHEDULES
    // =========================================

    async function handleSaveSchedules() {
        /*
         * Сейчас изменения расписания
         * отправляются в API сразу
         * при изменении.
         *
         * Поэтому здесь достаточно
         * обновить данные.
         */

        await loadData();
        setSelectedProfile(null);
        setCurrentPage("profiles");
    }


    // =========================================
    // MANUAL BELL
    // =========================================

    // =========================================
    // DASHBOARD EDIT
    // =========================================

    function handleEditSchedule(
        schedule: Schedule
    ) {
        /*
         * Найдём профиль,
         * которому принадлежит расписание.
         */

        let profileForSchedule:
            | Profile
            | null = null;

        for (
            const profile
            of profiles
        ) {
            const profileSchedules =
                schedulesByProfile[
                    profile.id
                ] ?? [];

            const found =
                profileSchedules.some(
                    (item) =>
                        item.id ===
                        schedule.id
                );

            if (found) {
                profileForSchedule =
                    profile;

                break;
            }
        }


        if (
            profileForSchedule
        ) {
            handleOpenProfile(
                profileForSchedule
            );
        } else {
            setCurrentPage(
                "profiles"
            );
        }
    }


    // =========================================
    // LOADING
    // =========================================

    if (loading) {
        return (
            <div
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-[#f5f7fb]
                    font-['Inter']
                    text-[#647085]
                "
            >
                Laadimine...
            </div>
        );
    }


    // =========================================
    // ERROR
    // =========================================

    if (error) {
        return (
            <div
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-[#f5f7fb]
                    font-['Inter']
                    text-[#647085]
                "
            >
                {error}
            </div>
        );
    }


    // =========================================
    // APP
    // =========================================

    return (
        <div
            className="
                min-h-screen
                min-w-0
                overflow-x-hidden
                bg-[#f5f7fb]
            "
        >
            {/* ================================= */}
            {/* SIDEBAR */}
            {/* ================================= */}

            <Sidebar
                currentPage={
                    currentPage
                }
                onNavigate={
                    setCurrentPage
                }
            />


            {/* ================================= */}
            {/* DASHBOARD */}
            {/* ================================= */}

            {currentPage ===
                "dashboard" && (
                <Dashboard
                    schedules={
                        schedules
                    }

                    nextSchedule={
                        schedules[0] ??
                        null
                    }

                    automaticEnabled={
                        automaticEnabled
                    }

                    onToggleAutomatic={
                        handleToggleAutomatic
                    }

                    onEditSchedule={
                        handleEditSchedule
                    }
                />
            )}


            {/* ================================= */}
            {/* PROFILES */}
            {/* ================================= */}

            {currentPage ===
                "profiles" && (
                <Profiles
                    profiles={
                        profiles
                    }

                    schedulesByProfile={
                        schedulesByProfile
                    }

                    onCreateProfile={
                        handleCreateProfile
                    }

                    onRenameProfile={
                        handleRenameProfile
                    }

                    onDeleteProfile={
                        handleDeleteProfile
                    }

                    onOpenProfile={
                        handleOpenProfile
                    }

                    profileByDay={
                        profileByDay
                    }

                    onAssignProfile={
                        handleAssignProfile
                    }

                    profileByDate={
                        profileByDate
                    }

                    onAssignDate={
                        handleAssignDate
                    }
                />
            )}


            {/* ================================= */}
            {/* SCHEDULE EDITOR */}
            {/* ================================= */}

            {currentPage ===
                "schedule-editor" &&
                selectedProfile && (
                    <ScheduleEditor
                        profileName={
                            selectedProfile.name
                        }

                        schedules={
                            schedulesByProfile[
                                selectedProfile
                                    .id
                            ] ?? []
                        }

                        sounds={
                            sounds
                        }

                        onBack={
                            handleBackFromEditor
                        }

                        onSave={
                            handleSaveSchedules
                        }

                        onAddSchedule={
                            handleAddSchedule
                        }

                        onUpdateSchedule={
                            handleUpdateSchedule
                        }

                        onDeleteSchedule={
                            handleDeleteSchedule
                        }
                    />
                )}


            {/* ================================= */}
            {/* SOUNDS */}
            {/* ================================= */}

            {currentPage === "sounds" && (
    <SoundsPage />
)}

            {currentPage === "playnow" && (
                <PlayNowPage />
            )}


            {/* ================================= */}
            {/* SETTINGS */}
            {/* ================================= */}

            {currentPage ===
                "settings" && (
                <main className="ml-[240px] min-h-screen bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] py-[56px] font-['Inter']">
                    <header className="mb-[32px] max-w-[720px]">
                        <p className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#647085]">
                            RAKENDUS
                        </p>
                        <h1 className="m-0 text-[32px] font-semibold leading-[1.15] text-[#1b212d]">
                            Seaded
                        </h1>
                        <p className="mt-[10px] text-[15px] leading-[24px] text-[#647085]">
                            Kohanda heli ja Windowsi käitumist.
                        </p>
                    </header>

                    <div className="grid w-full max-w-[960px] gap-[18px] xl:grid-cols-2">
                        <section className="rounded-[14px] border border-[#e5e9f0] bg-white p-[24px] shadow-[0_8px_24px_rgba(27,33,45,0.04)]">
                            <h2 className="m-0 text-[18px] font-semibold text-[#1b212d]">
                                Heli
                            </h2>
                            <p className="mb-[24px] mt-[8px] text-[14px] leading-[22px] text-[#647085]">
                                Vali heliväljund ja helitugevus.
                            </p>
                            <AudioSettings />

                            <div className="mt-[24px] border-t border-[#eef1f5] pt-[20px]">
                                <label className="block text-[14px] font-medium text-[#1f2937]">
                                    Predzvoni aeg
                                </label>
                                <p className="mt-[5px] text-[13px] leading-[20px] text-[#7b8494]">
                                    Mitu minutit enne kella predzvon mängib.
                                </p>
                                <div className="mt-[10px] flex items-center gap-[8px]">
                                    <input
                                        type="number"
                                        min="0"
                                        max="60"
                                        value={preBellMinutes}
                                        onChange={(event) =>
                                            handlePreBellMinutesChange(
                                                Number(event.target.value)
                                            )
                                        }
                                        className="h-[38px] w-[90px] rounded-[8px] border border-[#d9dee8] px-[10px] text-[14px] text-[#1f2937] outline-none focus:border-[#529eff]"
                                    />
                                    <span className="text-[13px] text-[#647085]">min</span>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[14px] border border-[#e5e9f0] bg-white p-[24px] shadow-[0_8px_24px_rgba(27,33,45,0.04)]">
                            <h2 className="m-0 text-[18px] font-semibold text-[#1b212d]">
                                Windows
                            </h2>
                            <p className="mb-[18px] mt-[8px] text-[14px] leading-[22px] text-[#647085]">
                                Määra, kuidas SchoolBell Windowsis käivitub.
                            </p>

                            <label className="flex cursor-pointer items-start justify-between gap-[20px] border-b border-[#eef1f5] py-[16px]">
                                <span>
                                    <span className="block text-[14px] font-medium text-[#1b212d]">
                                        Käivita Windowsiga
                                    </span>
                                    <span className="mt-[4px] block text-[13px] leading-[20px] text-[#7b8494]">
                                        Ava SchoolBell automaatselt pärast sisselogimist.
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={windowsSettings.openAtLogin}
                                    onChange={(event) =>
                                        void updateWindowsSetting(
                                            "openAtLogin",
                                            event.target.checked
                                        )
                                    }
                                    className="mt-[3px] h-[18px] w-[18px] accent-[#529eff]"
                                />
                            </label>

                            <label className="flex cursor-pointer items-start justify-between gap-[20px] py-[16px]">
                                <span>
                                    <span className="block text-[14px] font-medium text-[#1b212d]">
                                        Käivita minimeeritult
                                    </span>
                                    <span className="mt-[4px] block text-[13px] leading-[20px] text-[#7b8494]">
                                        Käivitub taustal ilma akent avamata.
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={windowsSettings.openAsHidden}
                                    onChange={(event) =>
                                        void updateWindowsSetting(
                                            "openAsHidden",
                                            event.target.checked
                                        )
                                    }
                                    className="mt-[3px] h-[18px] w-[18px] accent-[#529eff]"
                                />
                            </label>
                        </section>
                    </div>

                    <section className="mt-[18px] w-full max-w-[960px] rounded-[14px] border border-[#e5e9f0] bg-white p-[24px] shadow-[0_8px_24px_rgba(27,33,45,0.04)]">
                        <h2 className="m-0 text-[18px] font-semibold text-[#1b212d]">
                            Avatud lähtekoodiga projekt
                        </h2>
                        <p className="mt-[8px] text-[14px] leading-[22px] text-[#647085]">
                            SchoolBell on avatud lähtekoodiga projekt.
                        </p>
                        <a
                            href="https://github.com/n1vers/koolikell"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-[12px] inline-block text-[14px] font-medium text-[#397ed8] underline underline-offset-[3px] hover:text-[#2465b8]"
                        >
                            Vaata projekti GitHubis
                        </a>
                    </section>

                    <AppLogs />
                </main>
            )}
        </div>
    );
}