import type { ReactNode } from "react";

type PageId = "dashboard" | "profiles" | "playnow" | "sounds" | "settings";

interface SidebarProps {
    currentPage: string;

    onNavigate: (page: PageId) => void;
    accessRole?: "master" | "playnow" | null;
    pinsConfigured: boolean | null;
    onRequestPin: () => void;
    onLogout: () => void;
}

// ============================================
// ICONS
// ============================================

function Icon({ children }: { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[20px] w-[20px] shrink-0"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

const ICONS: Record<PageId, ReactNode> = {
    dashboard: (
        <Icon>
            <path d="m3 11 9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M10 20v-6h4v6" />
        </Icon>
    ),
    profiles: (
        <Icon>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
        </Icon>
    ),
    sounds: (
        <Icon>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </Icon>
    ),
    playnow: (
        <Icon>
            <circle cx="12" cy="12" r="9" />
            <path d="m10 8.5 5.5 3.5-5.5 3.5Z" />
        </Icon>
    ),
    settings: (
        <Icon>
            <path d="M4 7h9" />
            <path d="M17 7h3" />
            <circle cx="15" cy="7" r="2" />
            <path d="M4 17h3" />
            <path d="M11 17h9" />
            <circle cx="9" cy="17" r="2" />
        </Icon>
    ),
};

const ITEMS: { id: PageId; label: string }[] = [
    { id: "dashboard", label: "Avaleht" },
    { id: "profiles", label: "Ajakavad" },
    { id: "sounds", label: "Helid" },
    { id: "playnow", label: "PlayNow" },
    { id: "settings", label: "Seaded" },
];

export default function Sidebar({
    currentPage,
    onNavigate,
    accessRole = null,
    pinsConfigured,
    onRequestPin,
    onLogout,
}: SidebarProps) {
    const visibleItems =
        pinsConfigured === false || accessRole === "master"
            ? ITEMS
            : accessRole === "playnow"
                ? ITEMS.filter((item) => item.id === "playnow")
                : ITEMS.filter((item) => item.id === "dashboard");

    return (
        <aside className="fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-[#e8ecf2] bg-white font-['Inter']">
            {/* LOGO */}

            <div className="flex h-[92px] shrink-0 items-center gap-[12px] px-[28px]">
                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#5798f5] text-white shadow-[0_2px_6px_rgba(87,152,245,0.35)]">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[20px] w-[20px]"
                        aria-hidden="true"
                    >
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                </div>

                <span className="text-[20px] font-semibold leading-none text-[#1b212d]">
                    koolikell
                </span>
            </div>

            {/* NAVIGATION */}

            <nav
                aria-label="Peamenüü"
                className="flex flex-1 flex-col gap-[6px] overflow-y-auto px-[16px] pb-[16px]"
            >
                {visibleItems.map((item) => {
                    const active = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onNavigate(item.id)}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex h-[44px] w-full items-center gap-[14px] rounded-[10px] border-0 px-[16px] text-left text-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5798f5]/40 ${
                                active
                                    ? "bg-[#eaf2ff] font-medium text-[#1b212d]"
                                    : "bg-transparent font-normal text-[#647085] hover:bg-[#f5f7fb] hover:text-[#1b212d]"
                            }`}
                        >
                            {active && (
                                <span className="absolute left-0 top-[10px] h-[24px] w-[3px] rounded-r-full bg-[#5798f5]" />
                            )}

                            <span
                                className={
                                    active ? "text-[#5798f5]" : "text-[#8490a3]"
                                }
                            >
                                {ICONS[item.id]}
                            </span>

                            {item.label}
                        </button>
                    );
                })}

                {accessRole === null && pinsConfigured === true && (
                    <button
                        type="button"
                        onClick={onRequestPin}
                        className="mt-[8px] flex h-[44px] w-full items-center gap-[14px] rounded-[10px] border border-[#d9dee8] px-[16px] text-left text-[15px] text-[#647085] transition hover:border-[#5798f5] hover:text-[#3f82df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5798f5]/40"
                    >
                        <span className="text-[#8490a3]">
                            <Icon>
                                <rect x="5" y="10" width="14" height="10" rx="2" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </Icon>
                        </span>
                        Sisesta PIN
                    </button>
                )}

                {accessRole !== null && (
                    <button
                        type="button"
                        onClick={onLogout}
                        className="mt-[8px] flex h-[44px] w-full items-center gap-[14px] rounded-[10px] border border-[#f0caca] px-[16px] text-left text-[15px] text-[#b42318] transition hover:bg-[#fff5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d64545]/40"
                    >
                        <span className="text-[#d64545]">
                            <Icon>
                                <path d="M9 5H5v14h4" />
                                <path d="m14 8 4 4-4 4" />
                                <path d="M18 12H9" />
                            </Icon>
                        </span>
                        Välju
                    </button>
                )}
            </nav>
        </aside>
    );
}