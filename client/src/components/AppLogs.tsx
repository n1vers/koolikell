import { useMemo, useState } from "react";
import {
    clearAppLogs,
    getAppLogs,
    type AppLogEntry,
} from "../services/logService";

function formatTimestamp(value: string) {
    return new Date(value).toLocaleString("et-EE");
}

const LEVEL_STYLES: Record<
    string,
    { badge: string; bar: string }
> = {
    error: {
        badge: "bg-[#fdecec] text-[#c24141]",
        bar: "bg-[#e05252]",
    },
    warn: {
        badge: "bg-[#fdf3e0] text-[#b7791f]",
        bar: "bg-[#e0a43a]",
    },
    default: {
        badge: "bg-[#eaf2ff] text-[#3f82df]",
        bar: "bg-[#5798f5]",
    },
};

const HEADER_BTN =
    "h-[36px] rounded-[8px] border border-[#d9dee8] bg-white px-[14px] text-[13px] font-medium text-[#647085] transition hover:border-[#5798f5] hover:text-[#3f82df] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#d9dee8] disabled:hover:text-[#647085]";

export default function AppLogs() {
    const [logs, setLogs] = useState<AppLogEntry[]>(getAppLogs);
    const [filter, setFilter] = useState<"all" | AppLogEntry["level"]>("all");

    const counts = useMemo(() => ({
        info: logs.filter((log) => log.level === "info").length,
        warn: logs.filter((log) => log.level === "warn").length,
        error: logs.filter((log) => log.level === "error").length,
    }), [logs]);
    const visibleLogs = filter === "all"
        ? logs
        : logs.filter((log) => log.level === filter);

    function handleClear() {
        clearAppLogs();
        setLogs([]);
    }

    function handleRefresh() {
        setLogs(getAppLogs());
    }

    return (
        <section id="app-logs" className="mt-[18px] w-full max-w-[960px] rounded-[12px] bg-white p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-[16px]">
                <div>
                    <h2 className="m-0 flex items-center gap-[10px] text-[17px] font-semibold leading-[28px] text-[#1b212d]">
                        Logid

                        {logs.length > 0 && (
                            <span className="rounded-full bg-[#f1f4f8] px-[8px] py-[1px] text-[12px] font-medium text-[#7d899d]">
                                {logs.length}
                            </span>
                        )}
                    </h2>

                    <p className="m-0 mt-[2px] text-[13px] text-[#8792a5]">
                        Rakenduse vead ja tehnilised sündmused.
                    </p>
                </div>

                <div className="flex items-center gap-[8px]">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className={HEADER_BTN}
                    >
                        Värskenda
                    </button>

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={logs.length === 0}
                        className={HEADER_BTN}
                    >
                        Tühjenda
                    </button>
                </div>
            </div>

            <div className="mt-[16px] flex flex-wrap gap-[8px]">
                {([
                    ["all", "Kõik", logs.length],
                    ["error", "ERROR", counts.error],
                    ["warn", "WARN", counts.warn],
                    ["info", "INFO", counts.info],
                ] as const).map(([value, label, count]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-full border px-[10px] py-[5px] text-[12px] font-medium ${
                            filter === value
                                ? "border-[#5798f5] bg-[#eaf2ff] text-[#3f82df]"
                                : "border-[#d9dee8] bg-white text-[#647085]"
                        }`}
                    >
                        {label} · {count}
                    </button>
                ))}
            </div>

            {/* LIST */}

            <div className="mt-[18px] max-h-[340px] overflow-y-auto rounded-[10px] border border-[#eef1f5] bg-[#fafbfd]">
                {visibleLogs.length === 0 ? (
                    <p className="m-0 px-[16px] py-[28px] text-center text-[13px] text-[#8a93a3]">
                        Logisid pole.
                    </p>
                ) : (
                    visibleLogs.map((log) => {
                        const styles =
                            LEVEL_STYLES[log.level] ?? LEVEL_STYLES.default;

                        return (
                            <div
                                key={log.id}
                                className="relative border-b border-[#eef1f5] py-[12px] pl-[20px] pr-[16px] last:border-b-0"
                            >
                                <div
                                    className={`absolute bottom-[10px] left-[8px] top-[10px] w-[3px] rounded-full ${styles.bar}`}
                                />

                                <div className="flex items-center gap-[10px] text-[12px] text-[#8a93a3]">
                                    <span
                                        className={`rounded-[5px] px-[7px] py-[1px] text-[10px] font-semibold tracking-wide ${styles.badge}`}
                                    >
                                        {log.level.toUpperCase()}
                                    </span>

                                    <span className="tabular-nums">
                                        {formatTimestamp(log.timestamp)}
                                    </span>
                                </div>

                                <p className="m-0 mt-[6px] text-[13px] leading-[20px] text-[#374151]">
                                    {log.message}
                                </p>

                                {log.details && (
                                    <p className="m-0 mt-[6px] break-words rounded-[6px] bg-[#f1f4f8] px-[10px] py-[6px] font-mono text-[11px] leading-[17px] text-[#6d788b]">
                                        {log.details}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}