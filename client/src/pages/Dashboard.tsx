import { useEffect, useState } from "react";
import type { Schedule } from "../types";

interface DashboardProps {
    schedules: Schedule[];

    nextSchedule?: Schedule | null;

    automaticEnabled: boolean;

    onToggleAutomatic: () => void;

    onEditSchedule: (schedule: Schedule) => void;
}

function getTimeUntilNextBell(
    time: string | undefined,
    now: Date
): string {
    if (!time) {
        return "—";
    }

    const [hours, minutes] = time
        .split(":")
        .map(Number);

    const next = new Date();

    next.setHours(
        hours,
        minutes,
        0,
        0
    );

    if (next.getTime() < now.getTime()) {
        return "hiljem täna";
    }

    const difference =
        next.getTime() - now.getTime();

    const minutesLeft = Math.floor(
        difference / 60000
    );

    if (minutesLeft < 1) {
        return "mõne sekundi pärast";
    }

    return `${minutesLeft} min pärast`;
}

function getNextSchedule(
    schedules: Schedule[],
    now: Date
) {
    const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

    return schedules.find((schedule) => {
        const [hours, minutes] = schedule.time
            .split(":")
            .map(Number);

        return hours * 60 + minutes >= currentMinutes;
    }) ?? null;
}

export default function Dashboard({
    schedules,
    automaticEnabled,
    onToggleAutomatic,
    onEditSchedule,
}: DashboardProps) {
    const [now, setNow] =
        useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    const visibleSchedules =
        schedules.slice(0, 4);

    const upcomingSchedule =
        getNextSchedule(schedules, now);

    const dateLabel = new Intl.DateTimeFormat(
        "et-EE",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    ).format(now);

    const timeLabel = now.toLocaleTimeString(
        "et-EE",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }
    );

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
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <header className="pt-[78px]">
                <h1
                    className="
                        m-0
                        h-[48px]
                        w-[850px]
                        font-['Inter']
                        text-[32px]
                        font-semibold
                        leading-[48px]
                        text-[#1b212d]
                    "
                >
                    Tere päevast
                </h1>

                <p
                    className="
                        m-0
                        h-[30px]
                        w-[850px]
                        font-['Inter']
                        text-[15px]
                        font-normal
                        leading-[30px]
                        text-[#647085]
                    "
                >
                    {dateLabel} · {timeLabel}
                </p>
            </header>


            {/* ========================= */}
            {/* SYSTEM */}
            {/* ========================= */}

            <section
                className="
                    relative
                    mt-[30px]
                    h-[190px]
                    w-full
                    rounded-[16px]
                    bg-white
                "
            >
                <p
                    className="
                        absolute
                        left-[35px]
                        top-[28px]
                        m-0
                        h-[24px]
                        w-[300px]
                        font-['Inter']
                        text-[12px]
                        font-medium
                        leading-[24px]
                        text-[#647085]
                    "
                >
                    SÜSTEEM
                </p>


                <p
                    className={`
                        absolute
                        left-[35px]
                        top-[56px]
                        m-0
                        h-[46px]
                        w-[500px]
                        font-['Inter']
                        text-[24px]
                        font-semibold
                        leading-[46px]
                        ${
                            automaticEnabled
                                ? "text-[#40c77a]"
                                : "text-[#9aa3b2]"
                        }
                    `}
                >
                    {automaticEnabled
                        ? "●  Automaatsed kellad on sisse lülitatud"
                        : "○  Automaatsed kellad on välja lülitatud"}
                </p>


                <p
                    className="
                        absolute
                        left-[35px]
                        top-[116px]
                        m-0
                        h-[24px]
                        w-[300px]
                        font-['Inter']
                        text-[14px]
                        font-normal
                        leading-[24px]
                        text-[#647085]
                    "
                >
                    Järgmine kell
                </p>


                <p
                    className="
                        absolute
                        left-[35px]
                        top-[140px]
                        m-0
                        h-[40px]
                        w-[240px]
                        font-['Inter']
                        text-[30px]
                        font-semibold
                        leading-[40px]
                        text-[#1b212d]
                    "
                >
                    {upcomingSchedule?.time ?? "--:--"}
                </p>


                <p
                    className="
                        absolute
                        left-[310px]
                        top-[116px]
                        m-0
                        h-[24px]
                        w-[260px]
                        font-['Inter']
                        text-[14px]
                        font-normal
                        leading-[24px]
                        text-[#647085]
                    "
                >
                    Järgmine sündmus&nbsp; · &nbsp;
                    {getTimeUntilNextBell(
                        upcomingSchedule?.time,
                        now
                    )}
                </p>


                <button
                    type="button"
                    onClick={onToggleAutomatic}
                    className="
                        absolute
                        right-[35px]
                        top-[28px]
                        h-[44px]
                        min-w-[190px]
                        rounded-[10px]
                        border
                        border-[#d9dee8]
                        bg-white
                        font-['Inter']
                        text-[14px]
                        font-medium
                        text-[#1b212d]
                        transition
                        hover:border-[#529eff]
                        hover:text-[#438fea]
                        active:scale-[0.99]
                    "
                >
                    {automaticEnabled
                        ? "Lülita välja"
                        : "Lülita sisse"}
                </button>
            </section>


            {/* ========================= */}
            {/* TODAY */}
            {/* ========================= */}

            <section className="mt-[30px]">
                <h2
                    className="
                        m-0
                        h-[32px]
                        w-[500px]
                        font-['Inter']
                        text-[22px]
                        font-semibold
                        leading-[32px]
                        text-[#1b212d]
                    "
                >
                    Tänane ajakava
                </h2>


                <div className="mt-[23px] flex flex-col gap-[12px]">
                    {visibleSchedules.length === 0 ? (
                        <div
                            className="
                                flex
                                h-[76px]
                                w-full
                                items-center
                                rounded-[12px]
                                bg-white
                                px-[25px]
                                font-['Inter']
                                text-[15px]
                                text-[#647085]
                            "
                        >
                            Tänane ajakava puudub
                        </div>
                    ) : (
                        visibleSchedules.map(
                            (schedule, index) => (
                                <div
                                    key={schedule.id}
                                    className="
                                        relative
                                        flex
                                        h-[76px]
                                        w-full
                                        items-center
                                        rounded-[12px]
                                        bg-white
                                    "
                                >
                                    {/* NUMBER */}

                                    <span
                                        className="
                                            absolute
                                            left-[25px]
                                            top-[15px]
                                            h-[28px]
                                            w-[42px]
                                            font-['Inter']
                                            text-[16px]
                                            font-medium
                                            leading-[28px]
                                            text-[#647085]
                                        "
                                    >
                                        {String(
                                            index + 1
                                        ).padStart(2, "0")}
                                    </span>


                                    {/* START */}

                                    <span
                                        className="
                                            absolute
                                            left-[95px]
                                            top-[15px]
                                            h-[28px]
                                            w-[100px]
                                            font-['Inter']
                                            text-[16px]
                                            font-medium
                                            leading-[28px]
                                            text-[#1b212d]
                                        "
                                    >
                                        {schedule.time}
                                    </span>


                                    {/* TYPE */}

                                    <span
                                        className="
                                            absolute
                                            left-[220px]
                                            top-[15px]
                                            h-[28px]
                                            w-[160px]
                                            font-['Inter']
                                            text-[15px]
                                            font-normal
                                            leading-[28px]
                                            text-[#1b212d]
                                        "
                                    >
                                        Tund
                                    </span>


                                    {/* SOUND */}

                                    <span
                                        className="
                                            absolute
                                            left-[405px]
                                            top-[15px]
                                            h-[28px]
                                            w-[300px]
                                            overflow-hidden
                                            text-ellipsis
                                            whitespace-nowrap
                                            font-['Inter']
                                            text-[14px]
                                            font-normal
                                            leading-[28px]
                                            text-[#647085]
                                        "
                                    >
                                        ♫&nbsp;&nbsp;
                                        {schedule.sound?.fileName ??
                                            "koolikell.mp3"}
                                    </span>


                                    {/* MORE */}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onEditSchedule(
                                                schedule
                                            )
                                        }
                                        className="
                                            absolute
                                            left-[970px]
                                            top-[15px]
                                            h-[28px]
                                            w-[70px]
                                            border-0
                                            bg-transparent
                                            p-0
                                            font-['Inter']
                                            text-[24px]
                                            font-normal
                                            leading-[28px]
                                            text-[#647085]
                                        "
                                    >
                                        ⋮
                                    </button>
                                </div>
                            )
                        )
                    )}
                </div>
            </section>
        </main>
    );
}