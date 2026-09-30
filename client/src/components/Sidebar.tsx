interface SidebarProps {
    currentPage: string;

    onNavigate: (
        page:
            | "dashboard"
            | "profiles"
            | "sounds"
            | "settings"
    ) => void;
}

export default function Sidebar({
    currentPage,
    onNavigate,
}: SidebarProps) {
    const items = [
        {
            id: "dashboard",
            icon: "⌂",
            label: "Главная",
        },
        {
            id: "profiles",
            icon: "▣",
            label: "Расписания",
        },
        {
            id: "sounds",
            icon: "♫",
            label: "Звуки",
        },
        {
            id: "settings",
            icon: "⚙",
            label: "Настройки",
        },
    ] as const;

    return (
        <aside
            className="
                fixed
                left-0
                top-0
                z-50
                h-screen
                w-[240px]
                bg-white
            "
        >
            {/* LOGO */}

            <div
                className="
                    absolute
                    left-[32px]
                    top-[30px]
                    h-[32px]
                    w-[180px]
                    font-['Inter']
                    text-[21px]
                    font-semibold
                    leading-[32px]
                    text-[#1b212d]
                "
            >
                🔔&nbsp; KooliKell
            </div>


            {/* NAVIGATION */}

            <nav
                className="
                    absolute
                    left-[16px]
                    top-[92px]
                    flex
                    w-[208px]
                    flex-col
                    gap-[14px]
                "
            >
                {items.map((item) => {
                    const active =
                        currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                                onNavigate(
                                    item.id
                                )
                            }
                            className={`
                                h-[44px]
                                w-[208px]
                                rounded-[10px]
                                border-0
                                px-[18px]
                                text-left
                                font-['Inter']
                                text-[15px]
                                leading-[26px]
                                transition
                                ${
                                    active
                                        ? `
                                            bg-[#e8f2ff]
                                            font-medium
                                            text-[#1b212d]
                                        `
                                        : `
                                            bg-transparent
                                            font-normal
                                            text-[#647085]
                                            hover:bg-[#f5f7fb]
                                        `
                                }
                            `}
                        >
                            {item.icon}
                            &nbsp;&nbsp;
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}