import { useEffect, useState } from "react";

import Dashboard from "./pages/Dashboard";
import Sidebar from "./components/Sidebar";
import Profiles from "./pages/Profiles";
import ScheduleEditor from "./pages/ScheduleEditor";

import type {
    Profile,
    Schedule,
    Sound,
} from "./types";

import {
    getProfiles,
    getSchedules,
    getSounds,
    createProfile,
    deleteProfile,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from "./api/api";

type Page =
    | "dashboard"
    | "profiles"
    | "sounds"
    | "settings"
    | "schedule-editor";

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


    // =========================================
    // LOAD DATA
    // =========================================

    useEffect(() => {
        loadData();
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

            if (
                profilesData.length > 0
            ) {
                const firstProfile =
                    profilesData[0];

                const firstSchedules =
                    scheduleMap[
                        firstProfile.id
                    ] ?? [];

                setSchedules(
                    firstSchedules
                );
            } else {
                setSchedules([]);
            }
        } catch (error) {
            console.error(
                "Failed to load application data:",
                error
            );

            setError(
                "Andmete laadimine ebaõnnestus"
            );
        } finally {
            setLoading(false);
        }
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

    function handleEditProfile(
        profile: Profile
    ) {
        /*
         * Пока отдельного окна
         * изменения названия профиля
         * нет.
         *
         * Поэтому открываем редактор
         * расписания.
         */

        handleOpenProfile(
            profile
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
        soundId: number | null
    ) {
        if (
            !selectedProfile
        ) {
            return;
        }

        try {
            /*
             * Пока Frame 03 не имеет
             * выбора дня недели.
             *
             * 1 = Monday.
             *
             * Позже сделаем нормальный
             * выбор E/T/K/N/R...
             */

            const dayOfWeek = 1;

            const createdSchedule =
                await createSchedule(
                    selectedProfile.id,
                    dayOfWeek,
                    time,
                    soundId
                );


            // Add to current profile
            setSchedulesByProfile(
                (current) => ({
                    ...current,

                    [selectedProfile.id]:
                        [
                            ...(current[
                                selectedProfile
                                    .id
                            ] ?? []),

                            createdSchedule,
                        ],
                })
            );


            // Update dashboard
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
        if (
            !selectedProfile
        ) {
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

                    schedule.enabled !==
                        false,

                    schedule.soundId ??
                        null
                );


            // Update profile schedules
            setSchedulesByProfile(
                (current) => ({
                    ...current,

                    [selectedProfile.id]:
                        (
                            current[
                                selectedProfile
                                    .id
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


            // Update dashboard
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
    }


    // =========================================
    // MANUAL BELL
    // =========================================

    function handleRingNow() {
        console.log(
            "Manual bell"
        );

        /*
         * Позже здесь подключим
         * реальное воспроизведение MP3.
         */
    }


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
                min-w-[1200px]
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

                    onRingNow={
                        handleRingNow
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

                    onEditProfile={
                        handleEditProfile
                    }

                    onDeleteProfile={
                        handleDeleteProfile
                    }

                    onOpenProfile={
                        handleOpenProfile
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

            {currentPage ===
                "sounds" && (
                <div
                    className="
                        ml-[240px]
                        p-[40px]
                        font-['Inter']
                    "
                >
                    Helid (
                    {sounds.length}
                    )
                </div>
            )}


            {/* ================================= */}
            {/* SETTINGS */}
            {/* ================================= */}

            {currentPage ===
                "settings" && (
                <div
                    className="
                        ml-[240px]
                        p-[40px]
                        font-['Inter']
                    "
                >
                    Seaded
                </div>
            )}
        </div>
    );
}