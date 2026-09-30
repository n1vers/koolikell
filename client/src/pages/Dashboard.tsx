import type { Schedule } from "../types";

interface DashboardProps {
    schedules: Schedule[];

    nextSchedule?: Schedule | null;

    onRingNow: () => void;

    onEditSchedule: (schedule: Schedule) => void;
}

function getEndTime(time: string): string {
    const [hours, minutes] = time
        .split(":")
        .map(Number);

    const totalMinutes =
        hours * 60 + minutes + 45;

    const endHours =
        Math.floor(totalMinutes / 60) % 24;

    const endMinutes =
        totalMinutes % 60;

    return `${String(endHours).padStart(2, "0")}:${String(
        endMinutes
    ).padStart(2, "0")}`;
}

function getTimeUntilNextBell(
    time?: string
): string {
    if (!time) {
        return "—";
    }

    const now = new Date();

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
        return "сегодня позже";
    }

    const difference =
        next.getTime() - now.getTime();

    const minutesLeft = Math.floor(
        difference / 60000
    );

    if (minutesLeft < 1) {
        return "через несколько секунд";
    }

    return `через ${minutesLeft} минут`;
}

export default function Dashboard({
    schedules,
    nextSchedule,
    onRingNow,
    onEditSchedule,
}: DashboardProps) {
    const visibleSchedules =
        schedules.slice(0, 4);

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
                    Добрый день
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
                    Понедельник, 28 сентября 2026
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
                    СИСТЕМА
                </p>


                <p
                    className="
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
                        text-[#40c77a]
                    "
                >
                    ●&nbsp;&nbsp;Автоматические звонки включены
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
                    Следующий звонок
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
                    {nextSchedule?.time ?? "10:45"}
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
                    Урок №3&nbsp; · &nbsp;
                    {getTimeUntilNextBell(
                        nextSchedule?.time
                    )}
                </p>


                <button
                    type="button"
                    onClick={onRingNow}
                    className="
                        absolute
                        left-[800px]
                        top-[130px]
                        h-[44px]
                        w-[230px]
                        rounded-[10px]
                        border-0
                        bg-[#529eff]
                        font-['Inter']
                        text-[14px]
                        font-medium
                        text-white
                        transition
                        hover:bg-[#438fea]
                        active:scale-[0.99]
                    "
                >
                    🔔&nbsp;&nbsp;Прозвонить сейчас
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
                    Сегодняшнее расписание
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
                            Расписание отсутствует
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


                                    {/* END */}

                                    <span
                                        className="
                                            absolute
                                            left-[220px]
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
                                        {getEndTime(
                                            schedule.time
                                        )}
                                    </span>


                                    {/* TYPE */}

                                    <span
                                        className="
                                            absolute
                                            left-[355px]
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
                                        Урок
                                    </span>


                                    {/* SOUND */}

                                    <span
                                        className="
                                            absolute
                                            left-[540px]
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
                                            "school_bell.mp3"}
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