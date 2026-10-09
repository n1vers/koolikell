import { useEffect, useRef, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Sidebar from "./components/Sidebar";
import Profiles from "./pages/Profiles";
import ScheduleEditor from "./pages/ScheduleEditor";
import SoundsPage from "./pages/SoundsPage";
import PlayNowPage from "./pages/PlayNowPage";
import Settings, {
    type ConnectionInfo,
    type WindowsSettings,
} from "./pages/Settings";
import type {
    Profile,
    Schedule,
    Sound,
} from "./types";

import {
    startBellScheduler,
    stopBellScheduler,
} from "./services/bellScheduler";
import { installRuntimeLogging, writeAppLog } from "./services/logService";
import { playBell } from "./services/bellAudio";

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
    getAutomaticEnabled,
    setAutomaticEnabled as updateAutomaticEnabled,
    getProfileAssignments,
    setProfileAssignments,
    getSyncedSettings,
    updateSyncedSettings,
    updatePins,
    disablePins,
    verifyPin,
    getPinStatus,
    getNtpServer,
    setNtpServer,
    type PinRole,
} from "./api/api";
import { API_URL } from "./api/apiBase";

type Page =
    | "dashboard"
    | "profiles"
    | "sounds"
    | "playnow"
    | "settings"
    | "schedule-editor";


const ACCESS_ROLE_STORAGE_KEY = "schoolbell-access-role";

function getStoredAccessRole(): PinRole {
    const storedRole = sessionStorage.getItem(ACCESS_ROLE_STORAGE_KEY);
    return storedRole === "master" || storedRole === "playnow"
        ? storedRole
        : null;
}

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

    const [accessRole, setAccessRole] = useState<PinRole>(getStoredAccessRole);
    const [currentPage, setCurrentPage] = useState<Page>(() =>
        getStoredAccessRole() === "playnow" ? "playnow" : "dashboard"
    );
    const [pinPrompt, setPinPrompt] = useState<"master" | "playnow" | null>(null);
    const [pendingPage, setPendingPage] = useState<"profiles" | "sounds" | "settings" | "playnow">("profiles");
    const [pinValue, setPinValue] = useState("");
    const [pinError, setPinError] = useState("");
    const [currentMasterPin, setCurrentMasterPin] = useState("");
    const [nextMasterPin, setNextMasterPin] = useState("");
    const [playNowPin, setPlayNowPin] = useState("");
    const [pinsConfigured, setPinsConfigured] = useState<boolean | null>(null);


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
    const [notice, setNotice] =
        useState("");
    const refreshInFlight = useRef(false);

    const [automaticEnabled, setAutomaticEnabled] =
        useState(
            () =>
                localStorage.getItem(
                    "schoolbell-automatic-enabled"
                ) !== "false"
        );

    const [, setPreBellMinutes] =
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
    const [connectionInfo, setConnectionInfo] =
        useState<ConnectionInfo | null>(null);
    const [ntpServer, setNtpServerValue] = useState("ntp1.eenet.ee");


    // =========================================
    // LOAD DATA
    // =========================================

    useEffect(() => {
        installRuntimeLogging();
        writeAppLog("info", "Frontend session started", {
            userAgent: navigator.userAgent,
            language: navigator.language,
            online: navigator.onLine,
            screen: `${window.screen.width}x${window.screen.height}`,
            electron: Boolean(window.electronAPI),
        });
        void loadData(true);

    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void loadData();
        }, 2000);
        return () => window.clearInterval(timer);
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

    useEffect(() => {
        const canViewCurrentPage =
            currentPage === "dashboard" ||
            pinsConfigured === false ||
            (accessRole === "master") ||
            (accessRole === "playnow" && currentPage === "playnow");

        if (pinsConfigured !== false && accessRole === "playnow" && currentPage !== "playnow") {
            setCurrentPage("playnow");
            setSelectedProfile(null);
            return;
        }

        if (!canViewCurrentPage) {
            setCurrentPage("dashboard");
            setSelectedProfile(null);
        }
    }, [accessRole, currentPage, pinsConfigured]);

    useEffect(() => {
        if (accessRole === null) {
            sessionStorage.removeItem(ACCESS_ROLE_STORAGE_KEY);
        } else {
            sessionStorage.setItem(ACCESS_ROLE_STORAGE_KEY, accessRole);
        }
    }, [accessRole]);

    useEffect(() => {
        if (!notice) {
            return;
        }

        const timer = window.setTimeout(() => {
            setNotice("");
        }, 3000);

        return () => window.clearTimeout(timer);
    }, [notice]);

    async function handleToggleAutomatic() {
        if (pinsConfigured !== false && accessRole !== "master") {
            return;
        }

        const next = !automaticEnabled;
        try {
            const saved = await updateAutomaticEnabled(next);
            setAutomaticEnabled(saved);
            void window.electronAPI?.setAutomaticEnabled(saved).catch((trayError) => {
                writeAppLog("warn", "Tray icon update failed", trayError);
            });
            localStorage.setItem(
                "schoolbell-automatic-enabled",
                String(saved)
            );
        } catch (toggleError) {
            writeAppLog("error", "Automatic calling setting update failed", toggleError);
            setError("Automaatsete kõnede seadistuse muutmine ebaõnnestus");
        }
    }

    async function handleNtpServerChange(value: string) {
        const server = value.trim();
        setNtpServerValue(server);
        try {
            setNtpServerValue(await setNtpServer(server));
            setNotice("NTP-server salvestatud");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "NTP-serveri salvestamine ebaõnnestus");
        }
    }

    function requestNavigation(page: "dashboard" | "profiles" | "sounds" | "playnow" | "settings") {
        if (accessRole === "playnow") {
            return;
        }
        if (page === "dashboard" || accessRole === "master" || pinsConfigured === false) {
            setCurrentPage(page);
            return;
        }
        setPinPrompt(page === "playnow" ? "playnow" : "master");
        setPendingPage(page);
        setPinValue("");
        setPinError("");
    }

    function openLogs() {
        setCurrentPage("settings");
        window.setTimeout(() => {
            document.getElementById("app-logs")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    }

    function handleLogout() {
        setAccessRole(null);
        sessionStorage.removeItem(ACCESS_ROLE_STORAGE_KEY);
        setCurrentPage("dashboard");
        setSelectedProfile(null);
        setPinPrompt(null);
        setPinValue("");
        setPinError("");
    }

    async function submitPin() {
        try {
            const role = await verifyPin(pinValue);
            if (role === null || (pinPrompt === "playnow" && role !== "playnow" && role !== "master")) {
                setPinError("Vale PIN");
                return;
            }
            setAccessRole(role);
            setCurrentPage(
                role === "playnow" ? "playnow" : pendingPage
            );
            setPinPrompt(null);
            setPinValue("");
        } catch (pinErrorValue) {
            writeAppLog("error", "PIN verification failed", pinErrorValue);
            setPinError("PIN-i kontroll ebaõnnestus");
        }
    }

    async function savePinSettings(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        try {
            await updatePins(currentMasterPin, nextMasterPin, playNowPin);
            setPinsConfigured(true);
            setAccessRole("master");
            setCurrentMasterPin("");
            setNextMasterPin("");
            setPlayNowPin("");
            setNotice("PIN-id salvestatud");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "PIN-ide salvestamine ebaõnnestus");
        }

    }

    async function turnOffPins() {
        try {
            await disablePins();
            setPinsConfigured(false);
            setAccessRole(null);
            setNotice("PIN-id välja lülitatud");
        } catch (disableError) {
            setError(disableError instanceof Error ? disableError.message : "PIN-ide väljalülitamine ebaõnnestus");
        }
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

        let disposed = false;

        const loadSyncedSettings = async () => {
            try {
                const settings = await getSyncedSettings();
                const savedNtpServer = await getNtpServer();
                if (disposed) {
                    return;
                }
                setNtpServerValue(savedNtpServer);
                setPreBellMinutes(settings.preBellMinutes);
                localStorage.setItem("schoolbell-pre-bell-minutes", String(settings.preBellMinutes));
                setWindowsSettings(settings.windows);
                if (window.electronAPI) {
                    await window.electronAPI.setWindowsSettings(settings.windows);
                }
            } catch (loadError) {
                if (!disposed) {
                    writeAppLog("error", "Pre-bell setting sync failed", loadError);
                }
            }
        };

        void loadSyncedSettings();
        const syncedSettingsTimer = window.setInterval(() => {
            void loadSyncedSettings();
        }, 3000);

        const loadWindowsSettings = async () => {
            try {
                if (window.electronAPI) {
                    const settings =
                        await window.electronAPI.getWindowsSettings();
                    setWindowsSettings(settings);

                    if (window.electronAPI.getConnectionInfo) {
                        try {
                            setConnectionInfo(
                                await window.electronAPI.getConnectionInfo()
                            );
                            return;
                        } catch (connectionError) {
                            console.warn(
                                "Electron connection info unavailable, using server fallback:",
                                connectionError
                            );
                        }
                    }
                } else {
                    const saved = localStorage.getItem(
                        "schoolbell-windows-settings"
                    );

                    if (saved) {
                        setWindowsSettings(
                            JSON.parse(saved) as WindowsSettings
                        );
                    }
                }

                const response = await fetch(
                    `${API_URL}/api/connection-info`
                );
                if (response.ok) {
                    setConnectionInfo(
                        (await response.json()) as ConnectionInfo
                    );
                }
            } catch (loadError) {
                console.error(
                    "Failed to load connection information:",
                    loadError
                );
            }
        };

        void loadWindowsSettings();
        return () => {
            disposed = true;
            window.clearInterval(syncedSettingsTimer);
        };
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
        try {
            const synced = await updateSyncedSettings({ windows: next });
            setWindowsSettings(synced.windows);
        } catch (saveError) {
            writeAppLog("error", "Windows settings synchronization failed", saveError);
            setError("Windowsi seadistuse sünkroonimine ebaõnnestus");
        }

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
        if (!window.electronAPI) {
            console.log("Electron API unavailable");

            return;
        }

        const unsubscribe = window.electronAPI.onBell((event) => {
            console.log("🔔 Bell received:", event);

            if (!event.soundUrl) {
                console.warn("No sound assigned to this schedule");

                return;
            }

            playBell(event.soundUrl)
                .then(() => {
                    console.log(`🔊 Playing ${event.type}`);
                })
                .catch((error) => {
                    console.error("Failed to play sound:", error);
                });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    async function loadData(initialLoad = false) {
        if (refreshInFlight.current) {
            return;
        }

        refreshInFlight.current = true;
        try {
            if (initialLoad) {
                setLoading(true);
                setError("");
            }

            // -----------------------------
            // Profiles
            // -----------------------------

            const profilesData =
                await getProfiles();

            setProfiles(
                profilesData
            );

            const [savedAssignments, serverAutomaticEnabled, serverPinsConfigured] = await Promise.all([
                getProfileAssignments(),
                getAutomaticEnabled(),
                getPinStatus(),
            ]);
            setPinsConfigured(serverPinsConfigured);
            if (!serverPinsConfigured) {
                setAccessRole(null);
            }
            const localProfileByDay = JSON.parse(
                localStorage.getItem("schoolbell-profile-by-day") ?? "{}"
            ) as Record<string, number | null>;
            const localProfileByDate = JSON.parse(
                localStorage.getItem("schoolbell-profile-by-date") ?? "{}"
            ) as Record<string, number | null>;
            const hasServerAssignments =
                Object.keys(savedAssignments.profileByDay).length > 0 ||
                Object.keys(savedAssignments.profileByDate).length > 0;
            const assignments = hasServerAssignments
                ? savedAssignments
                : {
                    profileByDay: localProfileByDay,
                    profileByDate: localProfileByDate,
                };
            const existingProfileIds = new Set(
                profilesData.map((profile) => profile.id)
            );
            const cleanedProfileByDay = Object.fromEntries(
                Object.entries(assignments.profileByDay).map(([day, profileId]) => [
                    day,
                    profileId !== null && existingProfileIds.has(profileId)
                        ? profileId
                        : null,
                ])
            );
            const cleanedProfileByDate = Object.fromEntries(
                Object.entries(assignments.profileByDate).filter(
                    ([, profileId]) =>
                        profileId !== null && existingProfileIds.has(profileId)
                )
            );
            const cleanedAssignments = {
                profileByDay: cleanedProfileByDay,
                profileByDate: cleanedProfileByDate,
            };
            const assignmentsChanged =
                JSON.stringify(cleanedAssignments) !== JSON.stringify(assignments);
            if (!hasServerAssignments && (
                Object.keys(localProfileByDay).length > 0 ||
                Object.keys(localProfileByDate).length > 0
            )) {
                void setProfileAssignments(cleanedAssignments).catch((migrationError) => {
                    writeAppLog("error", "Profile assignment migration failed", migrationError);
                });
            }
            if (assignmentsChanged) {
                void setProfileAssignments(cleanedAssignments).catch((cleanupError) => {
                    writeAppLog("error", "Invalid profile assignment cleanup failed", cleanupError);
                });
            }
            setAutomaticEnabled(serverAutomaticEnabled);
            void window.electronAPI?.setAutomaticEnabled(serverAutomaticEnabled).catch((trayError) => {
                writeAppLog("warn", "Tray icon update failed", trayError);
            });
            localStorage.setItem(
                "schoolbell-automatic-enabled",
                String(serverAutomaticEnabled)
            );
            setProfileByDay(cleanedAssignments.profileByDay);
            setProfileByDate(cleanedAssignments.profileByDate);
            localStorage.setItem(
                "schoolbell-profile-by-day",
                JSON.stringify(cleanedAssignments.profileByDay)
            );
            localStorage.setItem(
                "schoolbell-profile-by-date",
                JSON.stringify(cleanedAssignments.profileByDate)
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

        } catch (error) {
            console.error(
                "Failed to load application data:",
                error
            );

            if (initialLoad) {
                setError(
                    "Andmete laadimine ebaõnnestus"
                );
            }
            writeAppLog(
                "error",
                "Andmete laadimine ebaõnnestus",
                error
            );
        } finally {
            refreshInFlight.current = false;
            if (initialLoad) {
                setLoading(false);
            }
        }
    }

    async function handleAssignProfile(
        day: number,
        profileId: number | null
    ) {
        const next = {
            ...profileByDay,
            [day]: profileId,
        };
        setProfileByDay(next);
        try {
            await setProfileAssignments({
                profileByDay: next,
                profileByDate,
            });
        } catch (assignmentError) {
            writeAppLog("error", "Weekly profile assignment update failed", assignmentError);
        }
        /* localStorage remains a fallback for the bell scheduler during startup. */
        localStorage.setItem("schoolbell-profile-by-day", JSON.stringify(next));
    }

    async function handleAssignDate(
        date: string,
        profileId: number | null
    ) {
        const next = { ...profileByDate };
        if (profileId === null) {
            delete next[date];
        } else {
            next[date] = profileId;
        }
        setProfileByDate(next);
        try {
            await setProfileAssignments({
                profileByDay,
                profileByDate: next,
            });
        } catch (assignmentError) {
            writeAppLog("error", "Calendar profile assignment update failed", assignmentError);
        }
        localStorage.setItem("schoolbell-profile-by-date", JSON.stringify(next));
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

            if (
                profiles.length === 0 &&
                Object.values(profileByDay).every(
                    (profileId) => profileId === null || profileId === undefined
                )
            ) {
                const weeklyAssignments: Record<number, number> = {};
                for (let day = 1; day <= 5; day += 1) {
                    weeklyAssignments[day] = createdProfile.id;
                }
                setProfileByDay(weeklyAssignments);
                await setProfileAssignments({
                    profileByDay: weeklyAssignments,
                    profileByDate,
                });
                localStorage.setItem(
                    "schoolbell-profile-by-day",
                    JSON.stringify(weeklyAssignments)
                );
            }
        } catch (error) {
            console.error(
                "Failed to create profile:",
                error
            );

            throw error;
        }

    }

    async function handleCopyProfile(profile: Profile) {
        try {
            const sourceSchedules = schedulesByProfile[profile.id] ?? [];
            const copiedProfile = await createProfile(`${profile.name} (koopia)`);
            const copiedProfileWithSettings = await updateProfile(
                copiedProfile.id,
                copiedProfile.name,
                {
                    preBellMinutes: profile.preBellMinutes,
                    lessonDurationMinutes: profile.lessonDurationMinutes,
                }
            );
            const copiedSchedules = await Promise.all(
                sourceSchedules.map((schedule) =>
                    createSchedule(
                        copiedProfile.id,
                        schedule.dayOfWeek,
                        schedule.time,
                        schedule.type,
                        schedule.preBellEnabled,
                        schedule.soundId,
                        schedule.preBellSoundId,
                        schedule.changeBellEnabled,
                        schedule.changeBellSoundId
                    )
                )
            );
            setProfiles((current) => [...current, copiedProfileWithSettings]);
            setSchedulesByProfile((current) => ({
                ...current,
                [copiedProfile.id]: copiedSchedules,
            }));
        } catch (error) {
            writeAppLog("error", "Profile copy failed", error);
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

            const nextProfileByDay = Object.fromEntries(
                Object.entries(profileByDay).map(([day, profileId]) => [
                    day,
                    profileId === profile.id ? null : profileId,
                ])
            );
            const nextProfileByDate = Object.fromEntries(
                Object.entries(profileByDate).filter(
                    ([, profileId]) => profileId !== profile.id
                )
            );
            setProfileByDay(nextProfileByDay);
            setProfileByDate(nextProfileByDate);
            await setProfileAssignments({
                profileByDay: nextProfileByDay,
                profileByDate: nextProfileByDate,
            });
            localStorage.setItem(
                "schoolbell-profile-by-day",
                JSON.stringify(nextProfileByDay)
            );
            localStorage.setItem(
                "schoolbell-profile-by-date",
                JSON.stringify(nextProfileByDate)
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

    async function handleUpdateProfileSettings(
        changes: Partial<Pick<Profile, "preBellMinutes" | "lessonDurationMinutes" | "changeBellEnabled" | "changeBellSoundId">>
    ) {
        if (!selectedProfile) {
            return;
        }
        const updatedProfile = await updateProfile(
            selectedProfile.id,
            selectedProfile.name,
            changes
        );
        setProfiles((current) =>
            current.map((item) => item.id === updatedProfile.id ? updatedProfile : item)
        );
        setSelectedProfile((current) =>
            current?.id === updatedProfile.id ? updatedProfile : current
        );
    }


    // =========================================
    // OPEN PROFILE
    // =========================================

    function handleOpenProfile(
        profile: Profile
    ) {
        if (pinsConfigured !== false && accessRole !== "master") {
            setPinPrompt("master");
            setPendingPage("profiles");
            setPinValue("");
            setPinError("");
            return;
        }

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
        preBellSoundId: number | null,
        changeBellEnabled: boolean,
        changeBellSoundId: number | null
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
                    preBellSoundId,
                    changeBellEnabled,
                    changeBellSoundId
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
                    schedule.preBellSoundId ?? null,
                    schedule.changeBellEnabled,
                    schedule.changeBellSoundId ?? null
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
         * РЎРµР№С‡Р°СЃ РёР·РјРµРЅРµРЅРёСЏ СЂР°СЃРїРёСЃР°РЅРёСЏ
         * РѕС‚РїСЂР°РІР»СЏСЋС‚СЃСЏ РІ API СЃСЂР°Р·Сѓ
         * РїСЂРё РёР·РјРµРЅРµРЅРёРё.
         *
         * РџРѕСЌС‚РѕРјСѓ Р·РґРµСЃСЊ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ
         * РѕР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ.
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
         * РќР°Р№РґС‘Рј РїСЂРѕС„РёР»СЊ,
         * РєРѕС‚РѕСЂРѕРјСѓ РїСЂРёРЅР°РґР»РµР¶РёС‚ СЂР°СЃРїРёСЃР°РЅРёРµ.
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
            <div className="flex min-h-screen flex-col items-center justify-center gap-[16px] bg-[#f5f7fb] font-['Inter'] text-[#647085]">
                <div
                    className="h-[32px] w-[32px] animate-spin rounded-full border-[3px] border-[#dbe3f0] border-t-[#5798f5]"
                    aria-hidden="true"
                />

                <span className="text-[14px]">Laadimine...</span>
            </div>

        );
    }


    // =========================================
    // ERROR
    // =========================================

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-[24px] font-['Inter']">
                <div
                    role="alert"
                    className="w-[420px] max-w-full rounded-[16px] bg-white p-[28px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                >
                    <div className="mx-auto mb-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#fdecec] text-[22px] font-semibold text-[#d64545]">
                        !
                    </div>

                    <p className="m-0 text-[15px] text-[#1b212d]">{error}</p>

                    <button
                        type="button"
                        onClick={() => void loadData(true)}
                        className="mt-[20px] h-[40px] rounded-[10px] bg-[#5798f5] px-[20px] text-[14px] font-medium text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] transition hover:bg-[#4688e7]"
                    >
                        Proovi uuesti
                    </button>
                </div>
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
            {notice && (
                <div
                    role="status"
                    className="fixed right-[24px] top-[24px] z-[120] rounded-[10px] bg-[#e9f8ef] px-[16px] py-[12px] text-[14px] font-medium text-[#18794e] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                >
                    {notice}
                </div>
            )}

            {/* ================================= */}
            {/* SIDEBAR */}
            {/* ================================= */}

            <Sidebar
                currentPage={
                    currentPage
                }
                onNavigate={requestNavigation}
                accessRole={accessRole}
                pinsConfigured={pinsConfigured}
                onLogout={handleLogout}
                onRequestPin={() => {
                    setPinPrompt("master");
                    setPendingPage("profiles");
                    setPinValue("");
                    setPinError("");
                }}
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

                    lessonDurationMinutes={
                        profiles.find(
                            (profile) =>
                                profile.id === schedules[0]?.profileId
                        )?.lessonDurationMinutes ?? 45
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

                    canManage={
                        pinsConfigured === false || accessRole === "master"
                    }
                    onOpenLogs={openLogs}
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

                    onCopyProfile={
                        handleCopyProfile
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
                        profile={selectedProfile}
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

                        onRenameProfile={
                            (name) =>
                                selectedProfile
                                    ? handleRenameProfile(selectedProfile, name)
                                    : Promise.resolve()
                        }
                        onUpdateProfile={handleUpdateProfileSettings}
                    />
                )}


            {/* ================================= */}
            {/* SOUNDS */}
            {/* ================================= */}

            {currentPage === "sounds" && (
                <SoundsPage />
            )}

            <div className={currentPage === "playnow" ? "" : "hidden"}>
                <PlayNowPage />
            </div>


            {/* ================================= */}
            {/* SETTINGS */}
            {/* ================================= */}

            {currentPage === "settings" && (
                <Settings
                    windowsSettings={windowsSettings}
                    connectionInfo={connectionInfo}
                    ntpServer={ntpServer}
                    currentMasterPin={currentMasterPin}
                    nextMasterPin={nextMasterPin}
                    playNowPin={playNowPin}
                    pinsConfigured={pinsConfigured}
                    onNtpServerChange={handleNtpServerChange}
                    onWindowsSettingChange={updateWindowsSetting}
                    onPinChange={(key, value) => {
                        if (key === "currentMaster") setCurrentMasterPin(value);
                        if (key === "nextMaster") setNextMasterPin(value);
                        if (key === "playNow") setPlayNowPin(value);
                    }}
                    onSavePins={(event) => void savePinSettings(event)}
                    onDisablePins={() => void turnOffPins()}
                />
            )}

            {pinPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-[20px]">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitPin();
                        }}
                        className="w-full max-w-[360px] rounded-[16px] bg-white p-[24px] shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
                    >
                        <h2 className="m-0 text-[20px] font-semibold text-[#1b212d]">
                            {pinPrompt === "playnow" ? "PlayNow PIN" : "Meister-PIN"}
                        </h2>
                        <p className="mt-[8px] text-[13px] text-[#647085]">
                            Sisesta neljakohaline PIN juurdepääsu avamiseks.
                        </p>
                        <input
                            autoFocus
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={pinValue}
                            onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="mt-[16px] h-[44px] w-full rounded-[8px] border border-[#d9dee8] px-[12px] text-center text-[20px] tracking-[0.3em] outline-none"
                        />
                        {pinError && <p className="mt-[8px] text-[12px] text-[#b42318]">{pinError}</p>}
                        <div className="mt-[18px] flex justify-end gap-[8px]">
                            <button type="button" onClick={() => setPinPrompt(null)} className="rounded-[8px] border border-[#d9dee8] px-[14px] py-[9px] text-[13px] text-[#647085]">Tühista</button>
                            <button type="submit" className="rounded-[8px] bg-[#5798f5] px-[14px] py-[9px] text-[13px] font-medium text-white">Ava</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
