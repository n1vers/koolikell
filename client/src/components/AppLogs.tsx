import { useState } from "react";
import {
    clearAppLogs,
    getAppLogs,
    type AppLogEntry,
} from "../services/logService";

function formatTimestamp(value: string) {
    return new Date(value).toLocaleString("et-EE");
}

export default function AppLogs() {
    const [logs, setLogs] = useState<AppLogEntry[]>(getAppLogs);

    function handleClear() {
        clearAppLogs();
        setLogs([]);
    }

    return (
        <section className="mt-[18px] max-w-[960px] rounded-[14px] border border-[#e5e9f0] bg-white p-[24px] shadow-[0_8px_24px_rgba(27,33,45,0.04)]">
            <div className="flex items-center justify-between gap-[16px]">
                <div>
                    <h2 className="m-0 text-[18px] font-semibold text-[#1b212d]">
                        Logid
                    </h2>
                    <p className="mt-[7px] text-[13px] text-[#7b8494]">
                        Rakenduse vead ja tehnilised sündmused.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-[8px] border border-[#d9dee8] bg-white px-[12px] py-[8px] text-[13px] font-medium text-[#647085] hover:border-[#529eff] hover:text-[#438fea]"
                >
                    Tühjenda
                </button>
            </div>

            <div className="mt-[16px] max-h-[260px] overflow-y-auto rounded-[9px] border border-[#eef1f5] bg-[#fafbfc]">
                {logs.length === 0 ? (
                    <p className="m-0 px-[14px] py-[18px] text-[13px] text-[#8a93a3]">
                        Logisid pole.
                    </p>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className="border-b border-[#eef1f5] px-[14px] py-[10px] last:border-b-0"
                        >
                            <div className="flex items-center gap-[9px] text-[11px] text-[#8a93a3]">
                                <span className={
                                    log.level === "error"
                                        ? "font-semibold text-[#c24141]"
                                        : log.level === "warn"
                                            ? "font-semibold text-[#b7791f]"
                                            : "font-semibold text-[#438fea]"
                                }>
                                    {log.level.toUpperCase()}
                                </span>
                                <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <p className="m-0 mt-[4px] text-[13px] text-[#374151]">
                                {log.message}
                            </p>
                            {log.details && (
                                <p className="m-0 mt-[3px] break-words text-[11px] text-[#8a93a3]">
                                    {log.details}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
