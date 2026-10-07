import { useEffect, useState } from "react";
import type { Schedule } from "../types";

interface DashboardProps {
    schedules: Schedule[];

    nextSchedule?: Schedule | null;

    automaticEnabled: boolean;

    onToggleAutomatic: () => void;

    onEditSchedule: (schedule: Schedule) => void;

    canManage: boolean;
}

function getTimeUntilNextBell(time: string | undefined, now: Date): string {
    if (!time) {
        return "—";
    }

    const [hours, minutes] = time.split(":").map(Number);

    const next = new Date();

    next.setHours(hours, minutes, 0, 0);

    if (next.getTime() < now.getTime()) {
        return "hiljem täna";
    }

    const difference = next.getTime() - now.getTime();

    const minutesLeft = Math.floor(difference / 60000);

    if (minutesLeft < 1) {
        return "mõne sekundi pärast";
    }

    return `${minutesLeft} min pärast`;
}

function getNextSchedule(schedules: Schedule[], now: Date) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return (
        schedules.find((schedule) => {
            const [hours, minutes] = schedule.time.split(":").map(Number);

            return hours * 60 + minutes >= currentMinutes;
        }) ?? null
    );
}

// ============================================
// ICONS
// ============================================

function NoteIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[16px] w-[16px] shrink-0"
            aria-hidden="true"
        >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
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

const ROW_GRID =
    "grid grid-cols-[40px_84px_96px_minmax(0,1fr)_36px] items-center gap-[16px]";

export default function Dashboard({
    schedules,
    automaticEnabled,
    onToggleAutomatic,
    onEditSchedule,
    canManage,
}: DashboardProps) {
    const [now, setNow] = useState(() => new Date());

    const [ntpOffsetMs, setNtpOffsetMs] = useState<number | null>(null);

    useEffect(() => {
        if (!window.electronAPI?.getNtpTime) {
            return;
        }

        const syncTime = async () => {
            try {
                const result = await window.electronAPI?.getNtpTime();

                setNtpOffsetMs(result?.offsetMs ?? null);
            } catch {
                setNtpOffsetMs(null);
            }
        };

        void syncTime();
        const timer = window.setInterval(syncTime, 300_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    const visibleSchedules = schedules.slice(0, 4);

    const upcomingSchedule = getNextSchedule(schedules, now);

    const dateLabel = new Intl.DateTimeFormat("et-EE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(now);

    const timeLabel = now.toLocaleTimeString("et-EE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const ntpDifference =
        ntpOffsetMs !== null && Math.abs(ntpOffsetMs) >= 500
            ? ` · arvuti ${
                  ntpOffsetMs > 0 ? "jääb" : "on"
              } ${(Math.abs(ntpOffsetMs) / 1000).toFixed(1)} s ${
                  ntpOffsetMs > 0 ? "maha" : "ees"
              }`
            : "";

    return (
        <main className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] pb-[56px] pt-[48px] font-['Inter']">
            <div className="mx-auto w-full max-w-[1040px]">
                {/* HEADER */}

                <header>
                    <h1 className="m-0 text-[28px] font-semibold leading-tight text-[#1b212d]">
                        Tere päevast
                    </h1>

                    <p className="m-0 mt-[6px] text-[14px] text-[#647085]">
                        {dateLabel} ·{" "}
                        <span className="tabular-nums">{timeLabel}</span> · NTP
                        ntp1.eenet.ee
                        {ntpDifference}
                    </p>
                </header>

                {/* SYSTEM */}

                <section className="mt-[28px] flex flex-wrap items-start justify-between gap-[24px] rounded-[16px] bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    <div className="min-w-0">
                        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8490a3]">
                            Süsteem
                        </p>

                        <div
                            className={`mt-[10px] flex items-center gap-[10px] text-[20px] font-semibold ${
                                automaticEnabled
                                    ? "text-[#1f9d57]"
                                    : "text-[#8a93a3]"
                            }`}
                        >
                            <span
                                className={`h-[10px] w-[10px] shrink-0 rounded-full ${
                                    automaticEnabled
                                        ? "bg-[#40c77a] shadow-[0_0_0_4px_rgba(64,199,122,0.18)]"
                                        : "bg-[#c1c8d4]"
                                }`}
                            />

                            {automaticEnabled
                                ? "Automaatsed kellad on sisse lülitatud"
                                : "Automaatsed kellad on välja lülitatud"}
                        </div>

                        <div className="mt-[24px] flex flex-wrap gap-x-[56px] gap-y-[16px]">
                            <div>
                                <p className="m-0 text-[13px] text-[#647085]">
                                    Järgmine kell
                                </p>

                                <p className="m-0 mt-[4px] text-[32px] font-semibold leading-[40px] tabular-nums text-[#1b212d]">
                                    {upcomingSchedule?.time ?? "--:--"}
                                </p>
                            </div>

                            <div>
                                <p className="m-0 text-[13px] text-[#647085]">
                                    Järgmine sündmus
                                </p>

                                <p className="m-0 mt-[4px] text-[20px] font-medium leading-[40px] text-[#3f82df]">
                                    {getTimeUntilNextBell(
                                        upcomingSchedule?.time,
                                        now
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={onToggleAutomatic}
                            className={`h-[44px] min-w-[190px] rounded-[10px] border px-[20px] text-[14px] font-medium transition active:scale-[0.99] ${
                                automaticEnabled
                                    ? "border-[#d9dee8] bg-white text-[#1b212d] hover:border-[#e05252] hover:text-[#e05252]"
                                    : "border-transparent bg-[#5798f5] text-white shadow-[0_1px_3px_rgba(87,152,245,0.35)] hover:bg-[#4688e7]"
                            }`}
                        >
                            {automaticEnabled ? "Lülita välja" : "Lülita sisse"}
                        </button>
                    )}
                </section>

                {/* TODAY */}

                <section className="mt-[36px]">
                    <h2 className="m-0 text-[20px] font-semibold leading-[32px] text-[#1b212d]">
                        Tänane ajakava
                    </h2>

                    <div className="mt-[16px] flex flex-col gap-[10px]">
                        {visibleSchedules.length === 0 ? (
                            <div className="flex min-h-[76px] w-full items-center justify-center rounded-[12px] bg-white px-[24px] text-[15px] text-[#647085] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                                Tänane ajakava puudub
                            </div>
                        ) : (
                            visibleSchedules.map((schedule, index) => {
                                const isNext =
                                    upcomingSchedule?.id === schedule.id;

                                return (
                                    <div
                                        key={schedule.id}
                                        className={`${ROW_GRID} min-h-[64px] w-full rounded-[12px] bg-white px-[24px] py-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                                            isNext
                                                ? "ring-1 ring-[#5798f5]/50"
                                                : ""
                                        }`}
                                    >
                                        {/* NUMBER */}

                                        <span className="text-[14px] font-medium tabular-nums text-[#8490a3]">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>

                                        {/* START */}

                                        <span className="text-[16px] font-semibold tabular-nums text-[#1b212d]">
                                            {schedule.time}
                                        </span>

                                        {/* TYPE */}

                                        <span className="flex items-center gap-[8px]">
                                            <span className="rounded-full bg-[#f1f4f8] px-[10px] py-[2px] text-[12px] font-medium text-[#647085]">
                                                Tund
                                            </span>

                                            {isNext && (
                                                <span className="rounded-full bg-[#eaf2ff] px-[8px] py-[2px] text-[11px] font-medium text-[#3f82df]">
                                                    Järgmine
                                                </span>
                                            )}
                                        </span>

                                        {/* SOUND */}

                                        <span className="flex min-w-0 items-center gap-[8px] text-[14px] text-[#647085]">
                                            <NoteIcon />

                                            <span className="truncate">
                                                {schedule.sound?.name ??
                                                    "koolikell.mp3"}
                                            </span>
                                        </span>

                                        {/* MORE */}

                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onEditSchedule(schedule)
                                                }
                                                className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[#647085] transition hover:bg-[#f1f4f8] hover:text-[#1b212d]"
                                                title="Muuda"
                                                aria-label="Muuda"
                                            >
                                                <DotsIcon />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}