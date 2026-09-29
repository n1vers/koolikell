import { useEffect, useState } from "react";
import { getProfiles, getSchedules } from "./api/api";
import type { Profile, Schedule } from "./types";
import "./App.css";

function App() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const loadedProfiles = await getProfiles();

                setProfiles(loadedProfiles);

                if (loadedProfiles.length > 0) {
                    const loadedSchedules = await getSchedules(
                        loadedProfiles[0].id
                    );

                    setSchedules(loadedSchedules);
                }
            } catch (error) {
                console.error(error);

                setError("Andmete laadimine ebaõnnestus");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="loading">
                Laadimine...
            </div>
        );
    }

    if (error) {
        return (
            <div className="error">
                {error}
            </div>
        );
    }

    const nextSchedule = schedules[0];

    return (
        <div className="app">

            {/* SIDEBAR */}

            <aside className="sidebar">

                <div className="logo">
                    SchoolBell
                </div>

                <nav>

                    <button className="nav-item active">
                        Ülevaade
                    </button>

                    <button className="nav-item">
                        Profiilid
                    </button>

                    <button className="nav-item">
                        Helid
                    </button>

                    <button className="nav-item">
                        Seaded
                    </button>

                </nav>

            </aside>


            {/* MAIN CONTENT */}

            <main className="main">

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
                            {nextSchedule?.time ?? "--:--"}
                        </h2>

                        <p>
                            {nextSchedule
                                ? "Ajakavas"
                                : "Kellad puuduvad"}
                        </p>

                        <span className="sound-name">

                            {nextSchedule?.sound?.name ??
                                "Heli pole määratud"}

                        </span>

                    </div>


                    {/* ACTIVE PROFILE */}

                    <div className="card">

                        <p className="card-label">
                            Aktiivne profiil
                        </p>

                        <h2>

                            {profiles.length > 0
                                ? profiles[0].name
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
                            {schedules.length}
                        </h2>

                        <p>
                            Planeeritud sündmust
                        </p>

                    </div>

                </section>


                {/* TODAY'S SCHEDULE */}

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


                        <button className="primary-button">
                            Muuda ajakava
                        </button>

                    </div>


                    {/* SCHEDULE LIST */}

                    <div className="schedule-list">

                        {schedules.length === 0 ? (

                            <p>
                                Ajakava puudub
                            </p>

                        ) : (

                            schedules.map((schedule) => (

                                <div
                                    className="schedule-item"
                                    key={schedule.id}
                                >

                                    <strong>
                                        {schedule.time}
                                    </strong>

                                    <span>

                                        {schedule.sound?.name ??
                                            "Heli pole määratud"}

                                    </span>

                                </div>

                            ))

                        )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default App;