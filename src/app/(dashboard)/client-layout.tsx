"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Tags,
    Map,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User,
    Upload,
    Download,
    Shield,
    MoreVertical,
    Settings,
    Menu,
} from "lucide-react";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ImageModal } from "@/components/ui/image-modal";
import { cn } from "@/lib/utils";

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
    collapsed: true,
    setCollapsed: () => {},
    mobileOpen: false,
    setMobileOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const basicMenuItems = [
    { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/assets", label: "ครุภัณฑ์", icon: Package },
    { href: "/map", label: "แผนที่", icon: Map },
    { href: "/import", label: "นำเข้าข้อมูล", icon: Upload },
    { href: "/export", label: "ส่งออกข้อมูล", icon: Download },
];

const adminMenuItems = [
    { href: "/categories", label: "หมวดหมู่", icon: Tags },
    { href: "/users", label: "จัดการผู้ใช้", icon: User },
];

const getAvatarColor = (name: string): string => {
    const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500",
        "bg-amber-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
    ];
    let hash = 0;
    const cleanName = name || "User";
    for (let i = 0; i < cleanName.length; i++) hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function ClientLayout({
    children,
    defaultCollapsed = true,
    initialSession = null,
}: {
    children: React.ReactNode;
    defaultCollapsed?: boolean;
    initialSession?: any;
}) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { data: clientSession } = useSession();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const displayCollapsed = isMobile ? false : collapsed;

    // Use initialSession from server for first render, then fallback to clientSession if updated
    const session = clientSession || initialSession;

    const toggleCollapsed = () => {
        const newVal = !collapsed;
        setCollapsed(newVal);
        // Save to cookie so the server can read it on next request
        document.cookie = `sidebar-collapsed=${newVal}; path=/; max-age=31536000`; // 1 year
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", "--sidebar-width": displayCollapsed ? "4.5rem" : "16rem" } as any}>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 115,
                    }}
                />
            )}

            {/* Sidebar */}
            <aside
                style={{
                    width: displayCollapsed ? "4.5rem" : "16rem",
                    background: "#fdfdfd",
                    color: "#1e293b",
                    display: "flex",
                    flexDirection: "column",
                    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    flexShrink: 0,
                    zIndex: 30,
                    boxShadow: "none",
                    borderRight: "1px solid #cbd5e1",
                    overflow: "hidden",
                }}
                className="sidebar-desktop"
            >
                {/* Logo */}
                <Link
                    href="/dashboard"
                    className="sidebar-logo-link"
                    style={{
                        height: "calc(5rem + 1px)",
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "none",
                        color: "inherit",
                        flexShrink: 0,
                        overflow: "hidden",
                    }}
                >
                    <div style={{ width: "4.5rem", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                        <div
                            className="logo-container"
                            style={{
                                width: "2.5rem",
                                height: "2.5rem",
                                background: "#2563eb",
                                borderRadius: "var(--radius-lg)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                                transition: "all 0.3s ease"
                            }}
                        >
                            <Package size={22} color="white" />
                        </div>
                    </div>
                    <div style={{
                        flex: 1,
                        opacity: displayCollapsed ? 0 : 1,
                        transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                    }}>
                        <h1
                            style={{
                                fontSize: "1.125rem",
                                fontWeight: 700,
                                lineHeight: 1.2,
                                margin: 0,
                                color: "#1e293b",
                                letterSpacing: "-0.02em"
                            }}
                        >
                            ระบบครุภัณฑ์
                        </h1>
                        <p
                            style={{
                                fontSize: "0.7rem",
                                opacity: 0.5,
                                margin: 0,
                                fontWeight: 500,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                            }}
                        >
                            Asset Management
                        </p>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="custom-scrollbar" style={{ flex: 1, padding: "0 0.75rem 0.75rem", overflowY: "auto" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        {/* Main Menu Label */}
                        <div style={{
                            height: "2rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: displayCollapsed ? "center" : "flex-start",
                            fontSize: "0.8125rem",
                            fontWeight: 800,
                            color: "#1e293b",
                            textTransform: "uppercase",
                            letterSpacing: displayCollapsed ? "0.1em" : "0.025em",
                            padding: displayCollapsed ? 0 : "0 0.75rem",
                            overflow: "hidden",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            opacity: 0.6
                        }}>
                            {displayCollapsed ? "..." : "เมนู"}
                        </div>

                        {basicMenuItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    title={displayCollapsed ? item.label : undefined}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        height: "2.75rem",
                                        borderRadius: "var(--radius-md)",
                                        color: isActive ? "#2563eb" : "#64748b",
                                        background: isActive
                                            ? "#eff6ff"
                                            : "transparent",
                                        textDecoration: "none",
                                        fontSize: "0.875rem",
                                        fontWeight: isActive ? 600 : 500,
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        overflow: "hidden",
                                        padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "rgba(224, 231, 255, 0.5)";
                                            e.currentTarget.style.color = "#2563eb";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#64748b";
                                        }
                                    }}
                                >
                                    <div style={{ width: "3.25rem", display: "flex", justifyContent: "center", flexShrink: 0, marginLeft: "-0.25rem" }}>
                                        <Icon size={20} style={{ flexShrink: 0 }} />
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        opacity: displayCollapsed ? 0 : 1,
                                        transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        overflow: "hidden",
                                    }}>
                                        {item.label}
                                    </div>
                                </Link>
                            );
                        })}

                        {/* Admin Section */}
                        {session?.user?.role === "admin" && (
                            <>
                                <div style={{
                                    height: "2.5rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: displayCollapsed ? "center" : "flex-start",
                                    fontSize: "0.8125rem",
                                    fontWeight: 800,
                                    color: "#1e293b",
                                    textTransform: "uppercase",
                                    letterSpacing: displayCollapsed ? "0.1em" : "0.025em",
                                    padding: displayCollapsed ? 0 : "0 0.75rem",
                                    overflow: "hidden",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    marginTop: "0.25rem",
                                    opacity: 0.6
                                }}>
                                    <div style={{
                                        whiteSpace: "nowrap",
                                    }}>
                                        {displayCollapsed ? "..." : "ผู้ดูแลระบบ"}
                                    </div>
                                </div>

                                {adminMenuItems.map((item) => {
                                    const isActive = pathname.startsWith(item.href);
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            title={displayCollapsed ? item.label : undefined}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                height: "2.75rem",
                                                borderRadius: "var(--radius-md)",
                                                color: isActive ? "#2563eb" : "#64748b",
                                                background: isActive
                                                    ? "#eff6ff"
                                                    : "transparent",
                                                textDecoration: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: isActive ? 600 : 500,
                                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                whiteSpace: "nowrap",
                                                flexShrink: 0,
                                                overflow: "hidden",
                                                padding: 0,
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = "rgba(224, 231, 255, 0.5)";
                                                    e.currentTarget.style.color = "#2563eb";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = "#64748b";
                                                }
                                            }}
                                        >
                                            <div style={{ width: "3.25rem", display: "flex", justifyContent: "center", flexShrink: 0, marginLeft: "-0.25rem" }}>
                                                <Icon size={20} style={{ flexShrink: 0 }} />
                                            </div>
                                            <div style={{
                                                flex: 1,
                                                opacity: displayCollapsed ? 0 : 1,
                                                transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                overflow: "hidden",
                                            }}>
                                                {item.label}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </nav>

                {/* Footer section (Profile & Collapse) */}
                <div style={{ padding: "0.75rem", borderTop: "1px solid #cbd5e1" }}>
                    {/* User profile popover */}
                    {session?.user && (() => {
                        const profileButton = (
                            <button
                                title={displayCollapsed ? session.user.name ?? "โปรไฟล์" : undefined}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    height: "3.5rem",
                                    marginBottom: "0.5rem",
                                    borderRadius: "var(--radius-md)",
                                    background: "transparent",
                                    border: "none",
                                    boxShadow: "none",
                                    color: "#1e293b",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    flexShrink: 0,
                                    overflow: "hidden",
                                    padding: 0,
                                    width: "100%",
                                    cursor: "pointer",
                                    textAlign: "left"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#F0F4FF";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <div style={{ width: "3.25rem", display: "flex", justifyContent: "center", flexShrink: 0, marginLeft: "-0.25rem" }}>
                                    <div
                                        className={cn(
                                            "rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                                            !session.user.image && getAvatarColor(session.user.name || "U")
                                        )}
                                        style={{
                                            width: "2.25rem",
                                            height: "2.25rem",
                                            color: "white",
                                            fontWeight: 700,
                                            fontSize: "0.875rem"
                                        }}
                                    >
                                        {session.user.image ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name ?? ""}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <span>{(session.user.name || "U").charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{
                                    flex: 1,
                                    opacity: displayCollapsed ? 0 : 1,
                                    transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    overflow: "hidden",
                                    minWidth: 0,
                                    paddingLeft: "2px"
                                }}>
                                    <div
                                        style={{
                                            fontSize: "0.8125rem",
                                            fontWeight: 600,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            textOverflow: "ellipsis",
                                            overflow: "hidden",
                                            lineHeight: "1.1rem"
                                        }}
                                    >
                                        {session.user.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.6875rem",
                                            fontWeight: 500,
                                            color: session.user.role === "admin" ? "#2563eb" : "#64748b",
                                            whiteSpace: "nowrap",
                                            textOverflow: "ellipsis",
                                            overflow: "hidden",
                                            lineHeight: "0.9rem",
                                            marginTop: "1px"
                                        }}
                                    >
                                        {session.user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้ทั่วไป"}
                                    </div>
                                </div>
                                <div style={{
                                    width: displayCollapsed ? 0 : "2rem",
                                    opacity: displayCollapsed ? 0 : 0.4,
                                    overflow: "hidden",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: "0.25rem"
                                }}>
                                    <MoreVertical size={18} />
                                </div>
                            </button>
                        );

                        if (!mounted) return profileButton;

                        return (
                            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <PopoverTrigger asChild>
                                    {profileButton}
                                </PopoverTrigger>
                                <PopoverContent
                                    side={isMobile ? "top" : "right"}
                                    align={isMobile ? "center" : "end"}
                                    sideOffset={10}
                                    className="w-[200px] p-2 bg-white border border-slate-200 shadow-xl z-150"
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                        <button
                                            onClick={() => {
                                                router.push("/profile");
                                                setMobileOpen(false);
                                                setPopoverOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.75rem",
                                                padding: "0.625rem 0.75rem",
                                                borderRadius: "var(--radius-md)",
                                                fontSize: "0.875rem",
                                                color: "#1e293b",
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                width: "100%",
                                                textAlign: "left",
                                                transition: "background 0.2s"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                        >
                                            <Settings size={16} />
                                            ตั้งค่าโปรไฟล์
                                        </button>
                                        <div style={{ height: "1px", background: "rgba(0,0,0,0.05)", margin: "0.25rem 0" }} />
                                        <button
                                            onClick={async () => {
                                                await handleLogout();
                                                setPopoverOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.75rem",
                                                padding: "0.625rem 0.75rem",
                                                borderRadius: "var(--radius-md)",
                                                fontSize: "0.875rem",
                                                color: "#ef4444",
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                width: "100%",
                                                textAlign: "left",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#fef2f2";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                            }}
                                        >
                                            <LogOut size={16} />
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        );
                    })()}

                    {/* Divider above collapse */}
                    <div style={{
                        height: "1px",
                        background: "#e2e8f0",
                        margin: "0.25rem 0.5rem 0.5rem 0.5rem",
                    }} />

                    {/* Collapse toggle */}
                    <button
                        onClick={toggleCollapsed}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: "2.75rem",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-sidebar-muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.8125rem",
                            width: "100%",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            marginTop: "0.25rem",
                            fontFamily: "inherit",
                            flexShrink: 0,
                            overflow: "hidden",
                            padding: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#e2e8f0";
                            e.currentTarget.style.color = "#1e293b";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#64748b";
                        }}
                    >
                        <div style={{ width: "3.25rem", display: "flex", justifyContent: "center", flexShrink: 0, marginLeft: "-0.25rem" }}>
                            {displayCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </div>
                        <div style={{
                            flex: 1,
                            opacity: displayCollapsed ? 0 : 1,
                            transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            overflow: "hidden",
                        }}>
                            ย่อเมนู
                        </div>
                    </button>
                </div>
            </aside>

             {/* Main Content */}
            <div
                id="main-scroll"
                style={{
                    flex: 1,
                    height: "100vh",
                    overflowY: "auto",
                    overflowX: "hidden",
                    minWidth: 0,
                    background: "#fdfdfd",
                }}
            >
                {/* Mobile Top Navbar */}
                <header className="mobile-navbar" style={{
                    display: "none",
                    height: "4.5rem",
                    borderBottom: "1px solid #cbd5e1",
                    background: "#ffffff",
                    alignItems: "center",
                    padding: "0 1.25rem",
                    position: "relative",
                    zIndex: 80,
                    justifyContent: "space-between",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <button
                            onClick={() => setMobileOpen(true)}
                            style={{
                                background: "transparent",
                                border: "none",
                                padding: "0.5rem",
                                cursor: "pointer",
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: "-0.5rem",
                            }}
                            aria-label="เปิดเมนู"
                        >
                            <Menu size={24} />
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{
                                width: "2rem",
                                height: "2rem",
                                background: "#2563eb",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Package size={14} color="white" />
                            </div>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>ระบบครุภัณฑ์</span>
                        </div>
                    </div>
                </header>

                <main className="main-content-container" style={{ padding: "1.5rem" }}>
                    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
                        {children}
                    </SidebarContext.Provider>
                </main>
            </div>

            {/* Responsive styles */}
            <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop {
            position: fixed !important;
            top: 0; bottom: 0;
            left: 0;
            transform: translateX(${mobileOpen ? "0" : "-100%"});
            width: 16rem !important;
            z-index: 120 !important;
            box-shadow: ${mobileOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none"} !important;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .mobile-navbar {
            display: flex !important;
          }
          .main-content-container {
            padding: 1rem !important;
          }
          div[style*="marginLeft"] {
            margin-left: 0 !important;
          }
        }
        .sidebar-logo-link:hover .logo-container {
            transform: scale(1.05) rotate(5deg);
            background: #1d4ed8 !important;
            box-shadow: 0 3px 12px rgba(37,99,235,0.4) !important;
        }
      `}</style>
        </div>
    );
}
