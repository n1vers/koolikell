import { useState } from "react";
import type { Profile } from "../types";

interface DateProfileCalendarProps {
    profiles: Profile[];
    assignments: Record<string, number | null>;
    onAssignDate: (
        date: string,
        profileId: number | null
    ) => void;
}

const monthNames = [
    "Jaanuar", "Veebruar", "Märts", "Aprill", "Mai", "Juuni",
    "Juuli", "August", "September", "Oktoober", "November", "Detsember",
];

function getDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

export default function DateProfileCalendar({
    profiles,
    assignments,
    onAssignDate,
}: DateProfileCalendarProps) {
    const [month, setMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(
        getDateKey(new Date())
    );

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay =
        (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const today = getDateKey(new Date());

    return (
        <section className="mt-[28px] w-full max-w-[1040px] rounded-[14px] border border-[#e5e9f0] bg-white p-[22px]">
            <div className="mb-[16px] flex items-center justify-between">
                <div>
                    <h2 className="m-0 text-[17px] font-semibold text-[#1b212d]">
                        Erandkuupäevad
                    </h2>
                    <p className="m-0 mt-[4px] text-[13px] text-[#7b8494]">
                        Vali kuupäev ja määra selle päeva profiil.
                    </p>
                </div>
                <div className="flex items-center gap-[6px]">
                    <button
                        type="button"
                        onClick={() =>
                            setMonth(new Date(year, monthIndex - 1, 1))
                        }
                        className="h-[30px] w-[30px] rounded-[7px] border border-[#d9dee8] bg-white text-[18px] text-[#647085]"
                    >
                        ‹
                    </button>
                    <span className="min-w-[128px] text-center text-[13px] font-semibold text-[#1b212d]">
                        {monthNames[monthIndex]} {year}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setMonth(new Date(year, monthIndex + 1, 1))
                        }
                        className="h-[30px] w-[30px] rounded-[7px] border border-[#d9dee8] bg-white text-[18px] text-[#647085]"
                    >
                        ›
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-[5px]">
                {["E", "T", "K", "N", "R", "L", "P"].map((day) => (
                    <span
                        key={day}
                        className="pb-[3px] text-center text-[10px] font-semibold text-[#9aa3b2]"
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

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDate(key)}
                            className={`h-[30px] rounded-[6px] border text-[12px] ${
                                active
                                    ? "border-[#529eff] bg-[#e8f2ff] font-semibold text-[#1b212d]"
                                    : assigned
                                        ? "border-[#b9d7ff] bg-[#f5f9ff] text-[#438fea]"
                                        : "border-transparent bg-[#f5f7fb] text-[#647085] hover:border-[#d9dee8]"
                            } ${key === today ? "ring-1 ring-[#529eff]" : ""}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            <div className="mt-[16px] flex items-center gap-[10px] border-t border-[#eef1f5] pt-[16px]">
                <span className="text-[13px] font-medium text-[#374151]">
                    {selectedDate}
                </span>
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
                    className="h-[36px] min-w-[220px] rounded-[8px] border border-[#d9dee8] bg-white px-[10px] text-[13px] text-[#374151] outline-none focus:border-[#529eff]"
                >
                    <option value="">vali profiil</option>
                    {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                            {profile.name}
                        </option>
                    ))}
                </select>
            </div>
        </section>
    );
}
