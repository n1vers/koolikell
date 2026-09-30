
import { useEffect, useState } from "react";
import "./App.css";

import {
    getProfiles,
    getSchedules,
    createProfile,
    createSchedule,
    getSounds,
    updateSchedule,
    deleteSchedule,
    uploadSound,
} from "./api/api";

import type {
    Profile,
    Schedule,
    Sound,
} from "./types";

type Page =
    | "dashboard"
    | "profiles"
    | "sounds"
    | "settings";

function App() {
    // =========================
    // STATE
    // =========================

    const [profiles, setProfiles] =
        useState<Profile[]>([]);

    const [schedules, setSchedules] =
        useState<Schedule[]>([]);

    const [sounds, setSounds] =
        useState<Sound[]>([]);

    const [activeProfile, setActiveProfile] =
        useState<Profile | null>(null);

    const [currentPage, setCurrentPage] =
        useState<Page>("dashboard");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    // =========================
    // PROFILE FORM
    // =========================

    const [showProfileForm, setShowProfileForm] =
        useState(false);

    const [profileName, setProfileName] =
        useState("");

    const [creatingProfile, setCreatingProfile] =
        useState(false);


    // =========================
    // CREATE SCHEDULE FORM
    // =========================

    const [showScheduleForm, setShowScheduleForm] =
        useState(false);

    const [scheduleDay, setScheduleDay] =
        useState(1);

    const [scheduleTime, setScheduleTime] =
        useState("08:00");

    const [scheduleSound, setScheduleSound] =
        useState<number | null>(null);

    const [creatingSchedule, setCreatingSchedule] =
        useState(false);


    // =========================

    // =========================
// SOUNDS
// =========================

const [showSoundForm, setShowSoundForm] =
    useState(false);

const [soundName, setSoundName] =
    useState("");

const [soundFile, setSoundFile] =
    useState<File | null>(null);

const [uploadingSound, setUploadingSound] =
    useState(false);

const [playingSound, setPlayingSound] =
    useState<number | null>(null);

const [audioPlayer, setAudioPlayer] =
    useState<HTMLAudioElement | null>(null);

    // =========================
// SETTINGS
// =========================

const [outputDevice, setOutputDevice] =
    useState("default");

const [startWithWindows, setStartWithWindows] =
    useState(false);

const [startMinimized, setStartMinimized] =
    useState(false);
    // EDIT SCHEDULE
    // =========================

    const [editingSchedule, setEditingSchedule] =
        useState<Schedule | null>(null);

    const [editDay, setEditDay] =
        useState(1);

    const [editTime, setEditTime] =
        useState("08:00");

    const [editSound, setEditSound] =
        useState<number | null>(null);

    const [editEnabled, setEditEnabled] =
        useState(true);

    const [savingSchedule, setSavingSchedule] =
        useState(false);


    // =========================
    // LOAD DATA
    // =========================

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError("");

                const loadedProfiles =
                    await getProfiles();

                const loadedSounds =
                    await getSounds();

                setProfiles(loadedProfiles);
                setSounds(loadedSounds);

                if (loadedProfiles.length > 0) {
                    const firstProfile =
                        loadedProfiles[0];

                    setActiveProfile(
                        firstProfile
                    );

                    const loadedSchedules =
                        await getSchedules(
                            firstProfile.id
                        );

                    setSchedules(
                        loadedSchedules
                    );
                }
            } catch (error) {
                console.error(error);

                setError(
                    "Andmete laadimine ebaõnnestus"
                );
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);


    // =========================
    // SELECT PROFILE
    // =========================

    async function selectProfile(
        profile: Profile
    ) {
        try {
            setError("");

            setActiveProfile(profile);

            const loadedSchedules =
                await getSchedules(
                    profile.id
                );

            setSchedules(
                loadedSchedules
            );

            setCurrentPage(
                "dashboard"
            );
        } catch (error) {
            console.error(error);

            setError(
                "Ajakava laadimine ebaõnnestus"
            );
        }
    }


    // =========================
    // CREATE PROFILE
    // =========================

    async function handleCreateProfile() {
        if (!profileName.trim()) {
            return;
        }

        try {
            setCreatingProfile(true);
            setError("");

            const newProfile =
                await createProfile(
                    profileName.trim()
                );

            setProfiles(
                (currentProfiles) => [
                    ...currentProfiles,
                    newProfile,
                ]
            );

            setActiveProfile(
                newProfile
            );

            setSchedules([]);

            setProfileName("");

            setShowProfileForm(false);

            setCurrentPage(
                "dashboard"
            );
        } catch (error) {
            console.error(error);

            setError(
                "Profiili loomine ebaõnnestus"
            );
        } finally {
            setCreatingProfile(false);
        }
    }


    // =========================
    // CREATE SCHEDULE
    // =========================

    async function handleCreateSchedule() {
        if (!activeProfile) {
            return;
        }

        try {
            setCreatingSchedule(true);
            setError("");

            const newSchedule =
                await createSchedule(
                    activeProfile.id,
                    scheduleDay,
                    scheduleTime,
                    scheduleSound
                );

            setSchedules(
                (currentSchedules) => [
                    ...currentSchedules,
                    newSchedule,
                ]
            );

            setShowScheduleForm(false);

            setScheduleDay(1);

            setScheduleTime(
                "08:00"
            );

            setScheduleSound(null);
        } catch (error) {
            console.error(error);

            setError(
                "Kella lisamine ebaõnnestus"
            );
        } finally {
            setCreatingSchedule(false);
        }
    }


    // =========================
    // START EDIT
    // =========================

    function startEditSchedule(
        schedule: Schedule
    ) {
        setEditingSchedule(
            schedule
        );

        setEditDay(
            schedule.dayOfWeek
        );

        setEditTime(
            schedule.time
        );

        setEditSound(
            schedule.soundId ?? null
        );

        setEditEnabled(
            schedule.enabled
        );

        setShowScheduleForm(false);
    }


    // =========================
    // UPDATE SCHEDULE
    // =========================

    async function handleUpdateSchedule() {
        if (!editingSchedule) {
            return;
        }

        try {
            setSavingSchedule(true);
            setError("");

            const updatedSchedule =
                await updateSchedule(
                    editingSchedule.id,
                    editDay,
                    editTime,
                    editEnabled,
                    editSound
                );

            setSchedules(
                (currentSchedules) =>
                    currentSchedules.map(
                        (schedule) =>
                            schedule.id ===
                            updatedSchedule.id
                                ? updatedSchedule
                                : schedule
                    )
            );

            setEditingSchedule(
                null
            );
        } catch (error) {
            console.error(error);

            setError(
                "Kella muutmine ebaõnnestus"
            );
        } finally {
            setSavingSchedule(false);
        }
    }


    // =========================
    // DELETE SCHEDULE
    // =========================

    async function handleDeleteSchedule(
        id: number
    ) {
        const confirmed =
            window.confirm(
                "Kas soovid selle kella kustutada?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await deleteSchedule(id);

            setSchedules(
                (currentSchedules) =>
                    currentSchedules.filter(
                        (schedule) =>
                            schedule.id !== id
                    )
            );
        } catch (error) {
            console.error(error);

            setError(
                "Kella kustutamine ebaõnnestus"
            );
        }
    }

    async function handleUploadSound() {
    if (!soundFile) {
        return;
    }

    if (!soundName.trim()) {
        return;
    }

    try {
        setUploadingSound(true);
        setError("");

        const newSound =
            await uploadSound(
                soundFile,
                soundName.trim()
            );

        setSounds(
            (currentSounds) => [
                ...currentSounds,
                newSound,
            ]
        );

        setSoundName("");
        setSoundFile(null);
        setShowSoundForm(false);

    } catch (error) {
        console.error(error);

        setError(
            "Heli üleslaadimine ebaõnnestus"
        );
    } finally {
        setUploadingSound(false);
    }
}

function playSound(sound: Sound) {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }

    const audio = new Audio(
        `http://localhost:3000/sounds/${sound.fileName}`
    );

    audio.play();

    setAudioPlayer(audio);
    setPlayingSound(sound.id);

    audio.onended = () => {
        setPlayingSound(null);
        setAudioPlayer(null);
    };
}
function stopSound() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }

    setAudioPlayer(null);
    setPlayingSound(null);
}
    // =========================
    // LOADING
    // =========================

    if (loading) {
        return (
            <div className="loading">
                Laadimine...
            </div>
        );
    }


    // =========================
    // ERROR
    // =========================

    if (error) {
        return (
            <div className="error">
                {error}
            </div>
        );
    }


    const nextSchedule =
        schedules.length > 0
            ? schedules[0]
            : null;


    // =========================
    // APP
    // =========================

    return (
        <div className="app">

            {/* ========================= */}
            {/* SIDEBAR */}
            {/* ========================= */}

            <aside className="sidebar">

                <div className="logo">
                    SchoolBell
                </div>

                <nav>

                    <button
                        className={`nav-item ${
                            currentPage ===
                            "dashboard"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setCurrentPage(
                                "dashboard"
                            )
                        }
                    >
                        Ülevaade
                    </button>


                    <button
                        className={`nav-item ${
                            currentPage ===
                            "profiles"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setCurrentPage(
                                "profiles"
                            )
                        }
                    >
                        Profiilid
                    </button>


                    <button
    className={`nav-item ${
        currentPage === "sounds"
            ? "active"
            : ""
    }`}
    onClick={() =>
        setCurrentPage("sounds")
    }
>
    Helid
</button>


                    <button
    className={`nav-item ${
        currentPage === "settings"
            ? "active"
            : ""
    }`}
    onClick={() =>
        setCurrentPage("settings")
    }
>
    Seaded
</button>

                </nav>

            </aside>


            {/* ========================= */}
            {/* MAIN */}
            {/* ========================= */}

            <main className="main">

                {/* ================================= */}
                {/* DASHBOARD */}
                {/* ================================= */}

                {currentPage ===
                    "dashboard" && (
                    <>

                        {/* HEADER */}

                        <header className="header">

                            <div>

                                <h1>
                                    Ülevaade
                                </h1>

                                <p>
                                    SchoolBell
                                </p>

                            </div>


                            <div className="status">

                                <span className="status-dot"></span>

                                Süsteem töötab

                            </div>

                        </header>


                        {/* DASHBOARD CARDS */}

                        <section className="dashboard">


                            {/* NEXT BELL */}

                            <div className="card next-bell">

                                <p className="card-label">
                                    Järgmine kell
                                </p>

                                <h2>

                                    {nextSchedule
                                        ? nextSchedule.time
                                        : "--:--"}

                                </h2>

                                <p>

                                    {nextSchedule
                                        ? "Ajakavas"
                                        : "Kellad puuduvad"}

                                </p>

                                <span className="sound-name">

                                    {nextSchedule?.sound
                                        ?.name ??
                                        "Heli pole määratud"}

                                </span>

                            </div>


                            {/* ACTIVE PROFILE */}

                            <div className="card">

                                <p className="card-label">
                                    Aktiivne profiil
                                </p>

                                <h2>

                                    {activeProfile
                                        ? activeProfile.name
                                        : "Profiil puudub"}

                                </h2>

                                <p>
                                    Aktiivne ajakava
                                </p>

                            </div>


                            {/* TODAY'S BELLS */}

                            <div className="card">

                                <p className="card-label">
                                    Tänased kellad
                                </p>

                                <h2>
                                    {
                                        schedules.length
                                    }
                                </h2>

                                <p>
                                    Planeeritud sündmust
                                </p>

                            </div>

                        </section>


                        {/* ========================= */}
                        {/* SCHEDULE */}
                        {/* ========================= */}

                        <section className="schedule-card">


                            <div className="section-header">

                                <div>

                                    <h2>
                                        Tänane ajakava
                                    </h2>

                                    <p>
                                        Tänane koolipäev
                                    </p>

                                </div>


                                <button
                                    className="primary-button"
                                    onClick={() => {
                                        setShowScheduleForm(
                                            true
                                        );

                                        setEditingSchedule(
                                            null
                                        );
                                    }}
                                >
                                    Lisa kell
                                </button>

                            </div>


                            {/* ========================= */}
                            {/* CREATE SCHEDULE FORM */}
                            {/* ========================= */}

                            {showScheduleForm && (
                                <div className="schedule-form">

                                    <h2>
                                        Lisa uus kell
                                    </h2>


                                    <div className="form-group">

                                        <label>
                                            Päev
                                        </label>

                                        <select
                                            value={
                                                scheduleDay
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setScheduleDay(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
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


                                    <div className="form-group">

                                        <label>
                                            Kellaaeg
                                        </label>

                                        <input
                                            type="time"
                                            value={
                                                scheduleTime
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setScheduleTime(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Heli
                                        </label>

                                        <select
                                            value={
                                                scheduleSound ??
                                                ""
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setScheduleSound(
                                                    event
                                                        .target
                                                        .value
                                                        ? Number(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                        : null
                                                )
                                            }
                                        >

                                            <option value="">
                                                Heli pole määratud
                                            </option>

                                            {sounds.map(
                                                (
                                                    sound
                                                ) => (
                                                    <option
                                                        key={
                                                            sound.id
                                                        }
                                                        value={
                                                            sound.id
                                                        }
                                                    >
                                                        {
                                                            sound.name
                                                        }
                                                    </option>
                                                )
                                            )}

                                        </select>

                                    </div>


                                    <div className="form-actions">

                                        <button
                                            className="secondary-button"
                                            onClick={() =>
                                                setShowScheduleForm(
                                                    false
                                                )
                                            }
                                        >
                                            Tühista
                                        </button>


                                        <button
                                            className="primary-button"
                                            onClick={
                                                handleCreateSchedule
                                            }
                                            disabled={
                                                creatingSchedule
                                            }
                                        >
                                            {creatingSchedule
                                                ? "Salvestamine..."
                                                : "Salvesta"}
                                        </button>

                                    </div>

                                </div>
                            )}


                            {/* ========================= */}
                            {/* EDIT SCHEDULE FORM */}
                            {/* ========================= */}

                            {editingSchedule && (
                                <div className="schedule-form">

                                    <h2>
                                        Muuda kella
                                    </h2>


                                    <div className="form-group">

                                        <label>
                                            Päev
                                        </label>

                                        <select
                                            value={
                                                editDay
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEditDay(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
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


                                    <div className="form-group">

                                        <label>
                                            Kellaaeg
                                        </label>

                                        <input
                                            type="time"
                                            value={
                                                editTime
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEditTime(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Heli
                                        </label>

                                        <select
                                            value={
                                                editSound ??
                                                ""
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEditSound(
                                                    event
                                                        .target
                                                        .value
                                                        ? Number(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                        : null
                                                )
                                            }
                                        >

                                            <option value="">
                                                Heli pole määratud
                                            </option>

                                            {sounds.map(
                                                (
                                                    sound
                                                ) => (
                                                    <option
                                                        key={
                                                            sound.id
                                                        }
                                                        value={
                                                            sound.id
                                                        }
                                                    >
                                                        {
                                                            sound.name
                                                        }
                                                    </option>
                                                )
                                            )}

                                        </select>

                                    </div>


                                    <div className="form-group">

                                        <label className="checkbox-label">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    editEnabled
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditEnabled(
                                                        event
                                                            .target
                                                            .checked
                                                    )
                                                }
                                            />

                                            Kell on aktiivne

                                        </label>

                                    </div>


                                    <div className="form-actions">

                                        <button
                                            className="secondary-button"
                                            onClick={() =>
                                                setEditingSchedule(
                                                    null
                                                )
                                            }
                                        >
                                            Tühista
                                        </button>


                                        <button
                                            className="primary-button"
                                            onClick={
                                                handleUpdateSchedule
                                            }
                                            disabled={
                                                savingSchedule
                                            }
                                        >
                                            {savingSchedule
                                                ? "Salvestamine..."
                                                : "Salvesta"}
                                        </button>

                                    </div>

                                </div>
                            )}


                            {/* ========================= */}
                            {/* SCHEDULE LIST */}
                            {/* ========================= */}

                            <div className="schedule-list">

                                {schedules.length ===
                                0 ? (

                                    <p>
                                        Ajakava puudub
                                    </p>

                                ) : (

                                    schedules.map(
                                        (
                                            schedule
                                        ) => (

                                            <div
                                                className="schedule-item"
                                                key={
                                                    schedule.id
                                                }
                                            >

                                                <strong>
                                                    {
                                                        schedule.time
                                                    }
                                                </strong>


                                                <span>

                                                    {schedule
                                                        .sound
                                                        ?.name ??
                                                        "Heli pole määratud"}

                                                </span>


                                                <div className="schedule-actions">

                                                    <button
                                                        className="small-button"
                                                        onClick={() =>
                                                            startEditSchedule(
                                                                schedule
                                                            )
                                                        }
                                                    >
                                                        Muuda
                                                    </button>


                                                    <button
                                                        className="small-button danger"
                                                        onClick={() =>
                                                            handleDeleteSchedule(
                                                                schedule.id
                                                            )
                                                        }
                                                    >
                                                        Kustuta
                                                    </button>

                                                </div>

                                            </div>

                                        )
                                    )

                                )}

                            </div>

                        </section>

                    </>
                )}


                {/* ================================= */}
                {/* PROFILES PAGE */}
                {/* ================================= */}

                {currentPage ===
                    "profiles" && (
                    <>

                        {/* HEADER */}

                        <header className="header">

                            <div>

                                <h1>
                                    Profiilid
                                </h1>

                                <p>
                                    Ajakavade profiilid
                                </p>

                            </div>


                            <button
                                className="primary-button"
                                onClick={() =>
                                    setShowProfileForm(
                                        true
                                    )
                                }
                            >
                                Lisa profiil
                            </button>

                        </header>


                        {/* ========================= */}
                        {/* PROFILE FORM */}
                        {/* ========================= */}

                        {showProfileForm && (
                            <div className="profile-form">

                                <h2>
                                    Uus profiil
                                </h2>

                                <p>
                                    Sisesta profiili nimi.
                                </p>


                                <input
                                    type="text"
                                    value={
                                        profileName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setProfileName(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Profiili nimi"
                                    autoFocus
                                />


                                <div className="form-actions">

                                    <button
                                        className="secondary-button"
                                        onClick={() => {
                                            setShowProfileForm(
                                                false
                                            );

                                            setProfileName(
                                                ""
                                            );
                                        }}
                                    >
                                        Tühista
                                    </button>


                                    <button
                                        className="primary-button"
                                        onClick={
                                            handleCreateProfile
                                        }
                                        disabled={
                                            creatingProfile ||
                                            !profileName.trim()
                                        }
                                    >
                                        {creatingProfile
                                            ? "Loomine..."
                                            : "Loo profiil"}
                                    </button>

                                </div>

                            </div>
                        )}


                        {/* ========================= */}
                        {/* PROFILE LIST */}
                        {/* ========================= */}

                        <section className="profiles-grid">

                            {profiles.length ===
                            0 ? (

                                <div className="card">

                                    <h2>
                                        Profiile ei leitud
                                    </h2>

                                    <p>
                                        Loo uus profiil,
                                        et alustada.
                                    </p>

                                </div>

                            ) : (

                                profiles.map(
                                    (
                                        profile
                                    ) => (

                                        <div
                                            className={`profile-card ${
                                                activeProfile?.id ===
                                                profile.id
                                                    ? "selected"
                                                    : ""
                                            }`}
                                            key={
                                                profile.id
                                            }
                                            onClick={() =>
                                                selectProfile(
                                                    profile
                                                )
                                            }
                                        >

                                            <h2>
                                                {
                                                    profile.name
                                                }
                                            </h2>

                                            <p>
                                                Ajakava profiil
                                            </p>


                                            {activeProfile?.id ===
                                                profile.id && (

                                                <span className="active-profile">
                                                    Aktiivne
                                                </span>

                                            )}

                                        </div>

                                    )
                                )

                            )}

                        </section>

                    </>
                )}

                {currentPage === "sounds" && (
                    <>
                        <header className="header">
                            <div>
                                <h1>Helid</h1>
                                <p>Koolikellade helid</p>
                            </div>

                            <button
                                className="primary-button"
                                onClick={() => setShowSoundForm(true)}
                            >
                                Lisa heli
                            </button>
                        </header>

                        {showSoundForm && (
                            <div className="sound-form">
                                <h2>Lisa uus heli</h2>

                                <div className="form-group">
                                    <label>Heli nimi</label>
                                    <input
                                        type="text"
                                        value={soundName}
                                        onChange={(event) => setSoundName(event.target.value)}
                                        placeholder="Näiteks Tavaline koolikell"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>MP3 fail</label>
                                    <input
                                        type="file"
                                        accept=".mp3,audio/mpeg"
                                        onChange={(event) =>
                                            setSoundFile(event.target.files?.[0] ?? null)
                                        }
                                    />
                                </div>

                                {soundFile && (
                                    <p className="selected-file">
                                        Valitud fail: {soundFile.name}
                                    </p>
                                )}

                                <div className="form-actions">
                                    <button
                                        className="secondary-button"
                                        onClick={() => {
                                            setShowSoundForm(false);
                                            setSoundName("");
                                            setSoundFile(null);
                                        }}
                                    >
                                        Tühista
                                    </button>

                                    <button
                                        className="primary-button"
                                        onClick={handleUploadSound}
                                        disabled={
                                            uploadingSound ||
                                            !soundName.trim() ||
                                            !soundFile
                                        }
                                    >
                                        {uploadingSound ? "Üleslaadimine..." : "Lisa heli"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <section className="sounds-list">
                            {sounds.length === 0 ? (
                                <div className="card">
                                    <h2>Helisid ei ole</h2>
                                    <p>Lisa esimene MP3 fail.</p>
                                </div>
                            ) : (
                                sounds.map((sound) => (
                                    <div className="sound-card" key={sound.id}>
                                        <div className="sound-info">
                                            <div className="sound-icon">🔊</div>
                                            <div>
                                                <h3>{sound.name}</h3>
                                                <p>{sound.fileName}</p>
                                            </div>
                                        </div>

                                        <div className="sound-actions">
                                            {playingSound === sound.id ? (
                                                <button className="small-button" onClick={stopSound}>
                                                    ■ Stop
                                                </button>
                                            ) : (
                                                <button
                                                    className="small-button"
                                                    onClick={() => playSound(sound)}
                                                >
                                                    ▶ Kuula
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>
                    </>
                )}

                    {currentPage === "settings" && (
    <>
        <header className="header">

            <div>
                <h1>
                    Seaded
                </h1>

                <p>
                    SchoolBelli rakenduse seaded
                </p>
            </div>

        </header>


        <section className="settings-card">

            <h2>
                Heli väljund
            </h2>

            <p className="settings-description">
                Vali seade, mida kasutatakse
                koolikella esitamiseks.
            </p>


            <div className="form-group">

                <label>
                    Heliväljundi seade
                </label>

                <select
                    value={outputDevice}
                    onChange={(event) =>
                        setOutputDevice(
                            event.target.value
                        )
                    }
                >

                    <option value="default">
                        Vaikimisi heliseade
                    </option>

                    <option value="speakers">
                        Kõlarid
                    </option>

                    <option value="headphones">
                        Kõrvaklapid
                    </option>

                </select>

            </div>


            <button
                className="secondary-button"
                onClick={() => {
                    const audio =
                        new Audio();

                    audio.src =
                        "http://localhost:3000/sounds/test.mp3";

                    audio.play().catch(
                        console.error
                    );
                }}
            >
                ▶ Testi heli
            </button>

        </section>


        <section className="settings-card">

            <h2>
                Rakenduse käivitamine
            </h2>


            <label className="settings-checkbox">

                <input
                    type="checkbox"
                    checked={
                        startWithWindows
                    }
                    onChange={(event) =>
                        setStartWithWindows(
                            event.target.checked
                        )
                    }
                />

                Käivita koos Windowsiga

            </label>


            <label className="settings-checkbox">

                <input
                    type="checkbox"
                    checked={
                        startMinimized
                    }
                    onChange={(event) =>
                        setStartMinimized(
                            event.target.checked
                        )
                    }
                />

                Käivita süsteemisalves

            </label>

        </section>


        <section className="settings-card">

            <h2>
                Seaded
            </h2>

            <button
                className="primary-button"
                onClick={() => {
                    localStorage.setItem(
                        "schoolbell-settings",
                        JSON.stringify({
                            outputDevice,
                            startWithWindows,
                            startMinimized,
                        })
                    );

                    alert(
                        "Seaded salvestatud"
                    );
                }}
            >
                Salvesta seaded
            </button>

        </section>
    </>
)}

            </main>

        </div>
    );

}

export default App;



