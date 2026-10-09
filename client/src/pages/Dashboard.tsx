import { useEffect, useRef, useState } from "react";
import { getNtpServer } from "../api/api";
import { getAppLogs, type AppLogEntry } from "../services/logService";
import type { Schedule } from "../types";

interface DashboardProps {
    schedules: Schedule[];

    lessonDurationMinutes: number;

    nextSchedule?: Schedule | null;

    automaticEnabled: boolean;

    onToggleAutomatic: () => void;

    onEditSchedule: (schedule: Schedule) => void;

    canManage: boolean;
    onOpenLogs: () => void;
}

function getTimeUntilNextBell(schedule: Schedule | null, now: Date): string {
    if (!schedule) {
        return "—";
    }

    const [hours, minutes] = schedule.time.split(":").map(Number);

    const next = new Date();

    next.setHours(hours, minutes, 0, 0);

    if (next.getTime() <= now.getTime()) {
        return "00:00";
    }

    const totalSeconds = Math.ceil((next.getTime() - now.getTime()) / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function getNextSchedule(
    schedules: Schedule[],
    now: Date,
    lessonDurationMinutes: number
) {
    const currentSeconds =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const explicitEndTimes = new Set(
        schedules
            .filter((schedule) => schedule.type === "LESSON_END")
            .map((schedule) => schedule.time)
    );

    const events = schedules.flatMap((schedule) => {
        if (schedule.type !== "LESSON_START") {
            return [schedule];
        }

        const endTime = getLessonEndTime(schedule, lessonDurationMinutes);
        if (!endTime || explicitEndTimes.has(endTime)) {
            return [schedule];
        }

        return [
            schedule,
            {
                ...schedule,
                id: -schedule.id,
                time: endTime,
                type: "LESSON_END" as const,
                preBellEnabled: false,
                preBellSoundId: null,
                changeBellEnabled: false,
                changeBellSoundId: null,
            },
        ];
    }).sort((a, b) => a.time.localeCompare(b.time));

    return (
        events.find((schedule) => {
            const [hours, minutes] = schedule.time.split(":").map(Number);

            return hours * 3600 + minutes * 60 >= currentSeconds;
        }) ?? null
    );
}

function getLessonEndTime(
    schedule: Schedule,
    lessonDurationMinutes: number
) {
    if (schedule.type !== "LESSON_START") {
        return null;
    }

    const [hours, minutes] = schedule.time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    const endMinutes =
        (hours * 60 + minutes + lessonDurationMinutes) % (24 * 60);

    return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
        endMinutes % 60
    ).padStart(2, "0")}`;
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
    "grid grid-cols-[40px_84px_minmax(0,1fr)_36px] items-center gap-[16px]";
const DASHBOARD_LOGS_SEEN_KEY = "schoolbell-dashboard-logs-seen-at";
const DASHBOARD_LOG_IDS_SEEN_KEY = "schoolbell-dashboard-log-ids-seen";

function readSeenDashboardLogIds() {
    try {
        const value = JSON.parse(
            localStorage.getItem(DASHBOARD_LOG_IDS_SEEN_KEY) ?? "[]"
        );
        return new Set<string>(
            Array.isArray(value)
                ? value.filter((id): id is string => typeof id === "string")
                : []
        );
    } catch {
        return new Set<string>();
    }
}

function getDashboardLogKey(log: AppLogEntry) {
    return log.id ||
        `${log.timestamp}|${log.level}|${log.message}|${log.details ?? ""}`;
}

export default function Dashboard({
    schedules,
    lessonDurationMinutes,
    automaticEnabled,
    onToggleAutomatic,
    onEditSchedule,
    canManage,
    onOpenLogs,
}: DashboardProps) {
    const [now, setNow] = useState(() => new Date());
    const [clockOffsetMs, setClockOffsetMs] = useState(0);
    const [syncingTime, setSyncingTime] = useState(false);
    const [syncError, setSyncError] = useState("");
    const [importantLogs, setImportantLogs] = useState<AppLogEntry[]>([]);
    const seenDashboardLogsAt = useRef(
        Number(
            localStorage.getItem(DASHBOARD_LOGS_SEEN_KEY) ??
                sessionStorage.getItem(DASHBOARD_LOGS_SEEN_KEY) ??
                "0"
        )
    );
    const seenDashboardLogIds = useRef(readSeenDashboardLogIds());

    const [ntpOffsetMs, setNtpOffsetMs] = useState<number | null>(null);
    const [ntpServer, setNtpServer] = useState("ntp1.eenet.ee");

    async function checkTime() {
        const server = await getNtpServer();
        setNtpServer(server);
        if (!window.electronAPI?.getNtpTime) {
            return;
        }
        const result = await window.electronAPI.getNtpTime(server);
        setNtpOffsetMs(result.offsetMs);
        setClockOffsetMs(result.offsetMs);
    }

    async function synchronizeTime() {
        setSyncingTime(true);
        setSyncError("");
        try {
            const server = await getNtpServer();
            setNtpServer(server);
            if (!window.electronAPI?.syncSystemTime) {
                throw new Error("Süsteemiaega saab sünkroonida ainult Windowsi rakenduses.");
            }
            await window.electronAPI.syncSystemTime(server);
            setNtpOffsetMs(0);
            setClockOffsetMs(0);
            setNow(new Date());
        } catch (error) {
            setSyncError(error instanceof Error ? error.message : "Aja sünkroonimine ebaõnnestus.");
            throw error;
        } finally {
            setSyncingTime(false);
        }
    }

    useEffect(() => {
        const refreshLogs = () => {
            setImportantLogs(
                getAppLogs().filter(
                    (log) =>
                        log.level !== "info" &&
                            !seenDashboardLogIds.current.has(getDashboardLogKey(log)) &&
                            new Date(log.timestamp).getTime() >
                                seenDashboardLogsAt.current
                )
            );
        };
        refreshLogs();
        const timer = window.setInterval(refreshLogs, 5000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        void checkTime().catch(() => {
            setNtpOffsetMs(null);
        });
        const timer = window.setInterval(() => {
            void checkTime().catch(() => setNtpOffsetMs(null));
        }, 300_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date(Date.now() + clockOffsetMs));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [clockOffsetMs]);

    const upcomingSchedule = getNextSchedule(
        schedules,
        now,
        lessonDurationMinutes
    );

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
        ntpOffsetMs !== null && Math.abs(ntpOffsetMs) >= 1000
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
                        {ntpServer}
                        {ntpDifference}
                        {ntpOffsetMs !== null && Math.abs(ntpOffsetMs) >= 1000 && (
                            <button
                                type="button"
                                onClick={() => void synchronizeTime()}
                                disabled={syncingTime}
                                className="ml-[8px] rounded-[6px] border border-[#d9dee8] bg-white px-[8px] py-[3px] text-[12px] font-medium text-[#3f82df] disabled:opacity-50"
                            >
                                {syncingTime ? "Sünkroniseerin..." : "Sünkroniseeri"}
                            </button>
                        )}
                    </p>
                    {syncError && (
                        <p className="m-0 mt-[8px] text-[12px] text-[#b42318]">{syncError}</p>
                    )}

                    {importantLogs.length > 0 && (
                        <div className="mt-[16px] flex items-center justify-between gap-[12px] rounded-[10px] border border-[#f1d39a] bg-[#fff9ed] px-[14px] py-[12px]">
                            <div className="min-w-0">
                                <p className="m-0 text-[13px] font-semibold text-[#8a5a00]">
                                    {importantLogs.length} olulist logi: {importantLogs[0].level.toUpperCase()}
                                </p>
                                <p className="m-0 mt-[3px] truncate text-[12px] text-[#8a6b2d]">
                                    {importantLogs[0].message}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const latestLogTimestamp = Math.max(
                                        ...importantLogs.map((log) =>
                                            new Date(log.timestamp).getTime()
                                        )
                                    );
                                    seenDashboardLogsAt.current = latestLogTimestamp;
                                    importantLogs.forEach((log) =>
                                        seenDashboardLogIds.current.add(
                                            getDashboardLogKey(log)
                                        )
                                    );
                                    localStorage.setItem(
                                        DASHBOARD_LOGS_SEEN_KEY,
                                        String(latestLogTimestamp)
                                    );
                                    localStorage.setItem(
                                        DASHBOARD_LOG_IDS_SEEN_KEY,
                                        JSON.stringify([
                                            ...seenDashboardLogIds.current,
                                        ])
                                    );
                                    setImportantLogs([]);
                                    onOpenLogs();
                                }}
                                className="shrink-0 rounded-[8px] bg-[#e0a43a] px-[12px] py-[8px] text-[12px] font-medium text-white"
                            >
                                Ava logid
                            </button>
                        </div>
                    )}
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

                                <div className="mt-[4px] flex items-baseline gap-[8px]">
                                    <p className="m-0 text-[32px] font-semibold leading-[40px] tabular-nums text-[#1b212d]">
                                        {upcomingSchedule?.time ?? "--:--"}
                                    </p>
                                    {upcomingSchedule?.type === "LESSON_END" && (
                                        <span className="text-[12px] font-medium text-[#8490a3]">
                                            lõpp
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="m-0 text-[13px] text-[#647085]">
                                    Järgmine sündmus
                                </p>

                                <p className="m-0 mt-[4px] text-[20px] font-medium leading-[40px] text-[#3f82df]">
                                    {getTimeUntilNextBell(
                                        upcomingSchedule,
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

                    <div className="mt-[16px] grid grid-cols-1 gap-[10px] md:grid-cols-2">
                        {schedules.length === 0 ? (
                            <div className="flex min-h-[76px] w-full items-center justify-center rounded-[12px] bg-white px-[24px] text-[15px] text-[#647085] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                                Tänane ajakava puudub
                            </div>
                        ) : (
                            schedules.map((schedule, index) => {
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

                                        <span className="flex flex-col gap-[2px]">
                                            <span className="text-[16px] font-semibold tabular-nums text-[#1b212d]">
                                                {schedule.time}
                                            </span>
                                            {schedule.type === "LESSON_START" && (
                                                <span className="text-[12px] font-medium tabular-nums text-[#8490a3]">
                                                    Lõpp{" "}
                                                    {getLessonEndTime(
                                                        schedule,
                                                        lessonDurationMinutes
                                                    ) ?? "—"}
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
                                            {schedule.preBellEnabled && (
                                                <span className="shrink-0 rounded-full bg-[#eaf2ff] px-[8px] py-[2px] text-[11px] font-medium text-[#3f82df]">
                                                    Eelhelin
                                                </span>
                                            )}
                                            {isNext && (
                                                <span className="shrink-0 rounded-full bg-[#eaf2ff] px-[8px] py-[2px] text-[11px] font-medium text-[#3f82df]">
                                                    Järgmine
                                                </span>
                                            )}
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