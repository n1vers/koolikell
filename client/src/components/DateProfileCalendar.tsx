import { useState } from "react";
import type { Profile } from "../types";

interface DateProfileCalendarProps {
    profiles: Profile[];
    assignments: Record<string, number | null>;
    onAssignDate: (date: string, profileId: number | null) => void;
}

const monthNames = [
    "Jaanuar", "Veebruar", "Märts", "Aprill", "Mai", "Juuni",
    "Juuli", "August", "September", "Oktoober", "November", "Detsember",
];

const weekdayLabels = ["E", "T", "K", "N", "R", "L", "P"];

function getDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

// 2026-10-07 → 07.10.2026
function formatDateKey(key: string) {
    const [year, month, day] = key.split("-");
    return `${day}.${month}.${year}`;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[16px] w-[16px]"
            aria-hidden="true"
        >
            <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
        </svg>
    );
}

const NAV_BTN =
    "flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border border-[#d9dee8] bg-white text-[#647085] transition hover:border-[#5798f5] hover:text-[#3f82df]";

export default function DateProfileCalendar({
    profiles,
    assignments,
    onAssignDate,
}: DateProfileCalendarProps) {
    const [month, setMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(getDateKey(new Date()));

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const today = getDateKey(new Date());

    function goToToday() {
        const now = new Date();
        setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDate(getDateKey(now));
    }

    function getProfileName(profileId: number | null | undefined) {
        if (profileId == null) {
            return "";
        }

        return profiles.find((profile) => profile.id === profileId)?.name ?? "";
    }

    return (
        <section className="w-full rounded-[12px] bg-white p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {/* HEADER */}

            <div className="mb-[18px] flex items-start justify-between gap-[16px]">
                <div>
                    <h2 className="m-0 text-[17px] font-semibold leading-[28px] text-[#1b212d]">
                        Erandkuupäevad
                    </h2>

                    <p className="m-0 mt-[2px] text-[13px] text-[#8792a5]">
                        Vali kuupäev ja määra selle päeva profiil.
                    </p>
                </div>

                <div className="flex items-center gap-[8px]">
                    <button
                        type="button"
                        onClick={goToToday}
                        className="h-[32px] rounded-[8px] border border-[#d9dee8] bg-white px-[12px] text-[12px] font-medium text-[#647085] transition hover:border-[#5798f5] hover:text-[#3f82df]"
                    >
                        Täna
                    </button>

                    <button
                        type="button"
                        onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
                        className={NAV_BTN}
                        aria-label="Eelmine kuu"
                    >
                        <ChevronIcon direction="left" />
                    </button>

                    <span className="min-w-[132px] text-center text-[14px] font-semibold text-[#1b212d]">
                        {monthNames[monthIndex]} {year}
                    </span>

                    <button
                        type="button"
                        onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
                        className={NAV_BTN}
                        aria-label="Järgmine kuu"
                    >
                        <ChevronIcon direction="right" />
                    </button>
                </div>
            </div>

            {/* GRID */}

            <div className="grid grid-cols-7 gap-[6px]">
                {weekdayLabels.map((day, index) => (
                    <span
                        key={day}
                        className={`pb-[4px] text-center text-[11px] font-semibold uppercase tracking-wide ${
                            index >= 5 ? "text-[#c1c8d4]" : "text-[#9aa3b2]"
                        }`}
                    >
                        {day}
                    </span>
                ))}

                {Array.from({ length: firstDay }, (_, index) => (
                    <span key={`empty-${index}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const key = getDateKey(new Date(year, monthIndex, day));
                    const assigned = assignments[key] != null;
                    const active = selectedDate === key;
                    const isToday = key === today;
                    const isWeekend = (firstDay + index) % 7 >= 5;
                    const profileName = getProfileName(assignments[key]);

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDate(key)}
                            title={profileName || undefined}
                            aria-pressed={active}
                            aria-label={
                                profileName
                                    ? `${formatDateKey(key)} — ${profileName}`
                                    : formatDateKey(key)
                            }
                            className={`relative h-[44px] rounded-[8px] border text-[13px] transition ${
                                active
                                    ? "border-[#5798f5] bg-[#5798f5] font-semibold text-white shadow-[0_1px_3px_rgba(87,152,245,0.4)]"
                                    : assigned
                                        ? "border-[#b9d7ff] bg-[#f3f8ff] font-medium text-[#3f82df] hover:border-[#5798f5]"
                                        : `border-transparent bg-[#f5f7fb] hover:border-[#d9dee8] ${
                                              isWeekend ? "text-[#a3adbd]" : "text-[#4b5667]"
                                          }`
                            } ${
                                isToday && !active
                                    ? "ring-1 ring-inset ring-[#5798f5]"
                                    : ""
                            }`}
                        >
                            {day}

                            {assigned && (
                                <span
                                    className={`absolute bottom-[5px] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full ${
                                        active ? "bg-white" : "bg-[#5798f5]"
                                    }`}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* LEGEND */}

            <div className="mt-[14px] flex items-center gap-[16px] text-[12px] text-[#8792a5]">
                <span className="flex items-center gap-[6px]">
                    <span className="h-[10px] w-[10px] rounded-[3px] border border-[#b9d7ff] bg-[#f3f8ff]" />
                    Profiil määratud
                </span>

                <span className="flex items-center gap-[6px]">
                    <span className="h-[10px] w-[10px] rounded-[3px] ring-1 ring-inset ring-[#5798f5]" />
                    Täna
                </span>
            </div>

            {/* ASSIGN */}

            <div className="mt-[18px] flex flex-wrap items-end gap-[16px] border-t border-[#eef1f5] pt-[18px]">
                <div>
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
                        Valitud kuupäev
                    </div>

                    <div className="flex h-[40px] min-w-[130px] items-center rounded-[8px] bg-[#f5f7fb] px-[14px] text-[14px] font-medium text-[#1b212d]">
                        {formatDateKey(selectedDate)}
                    </div>
                </div>

                <div>
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-wide text-[#8490a3]">
                        Profiil
                    </div>

                    <select
                        value={assignments[selectedDate] ?? ""}
                        onChange={(event) =>
                            onAssignDate(
                                selectedDate,
                                event.target.value
                                    ? Number(event.target.value)
                                    : null
                            )
                        }
                        className="h-[40px] min-w-[240px] rounded-[8px] border border-[#e2e7ef] bg-white px-[12px] text-[13px] text-[#303846] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20"
                    >
                        <option value="">Vali profiil</option>

                        {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name}
                            </option>
                        ))}
                    </select>
                </div>

                {assignments[selectedDate] != null && (
                    <button
                        type="button"
                        onClick={() => onAssignDate(selectedDate, null)}
                        className="h-[40px] rounded-[8px] px-[12px] text-[13px] font-medium text-[#8994a6] transition hover:bg-[#fef2f2] hover:text-[#dc2626]"
                    >
                        Eemalda
                    </button>
                )}
            </div>
        </section>
    );
}