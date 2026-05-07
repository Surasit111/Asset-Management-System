"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    Package, Coins, ArrowUpRight, SlidersHorizontal,
    ChevronDown, Building2, ArrowUpDown, Check,
    ArrowUp, ArrowDown, X,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { useSidebar } from "../client-layout";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PinnedAsset {
    id: string;
    assetCode: string;
    name: string;
    status: string | null;
    location: string | null;
    latitude: number;
    longitude: number;
    mapPinId: string | null;
    assetType: string;
    images?: { url: string }[];
}

interface RecentAsset {
    id: string;
    assetCode: string;
    name: string;
    status: string | null;
    createdAt: string;
    receivedDate: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number | null;
    assetType: string;
    fiscalYear: string | null;
    acquisitionMethod: string | null;
    moneyType: string | null;
    location: string | null;
}

interface MapPin {
    id: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    [key: string]: unknown;
}

interface DashboardStats {
    totalAssets: number;
    totalValue: number;
    recentAssets: RecentAsset[];
    statusCounts: Array<{ name: string; value: number }>;
    acquisitionCounts: Array<{ name: string; value: number }>;
    moneyTypeCounts: Array<{ name: string; value: number }>;
    pinCounts: Record<string, number>; // mapPinId → asset count (lightweight)
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

const TH_MONTHS = [
    { value: "01", label: "มกราคม" }, { value: "02", label: "กุมภาพันธ์" },
    { value: "03", label: "มีนาคม" }, { value: "04", label: "เมษายน" },
    { value: "05", label: "พฤษภาคม" }, { value: "06", label: "มิถุนายน" },
    { value: "07", label: "กรกฎาคม" }, { value: "08", label: "สิงหาคม" },
    { value: "09", label: "กันยายน" }, { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" }, { value: "12", label: "ธันวาคม" },
];

const TAB_COLORS: Record<string, string> = {
    all: "#0f172a", general: "#2563eb", durable: "#f97316",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

const statusStyle = (status: string | null) => {
    const s = status || "";
    if (s.includes("ใช้งานได้") || s === "normal")
        return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
    if (s.includes("ชำรุด") || s === "repair")
        return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
    if (s.includes("เสื่อมสภาพ"))
        return { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
    if (s.includes("สูญหาย"))
        return { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" };
    if (s.includes("ซ่อม") || s.includes("ส่งซ่อม"))
        return { color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" };
    if (s.includes("จำหน่าย") || s === "dispose" || s.includes("ไม่จำเป็นต้องใช้ในราชการ"))
        return { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" };
    return { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
};

const statusLabel = (status: string | null) => {
    if (!status) return "ไม่ระบุ";
    if (status === "normal") return "ใช้งานได้";
    if (status === "repair") return "ส่งซ่อม";
    if (status === "dispose") return "จำหน่าย";
    return status;
};

const acqBadge = (m: string | null) => {
    const v = m || "";
    if (v.includes("ตกลงราคา")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (v.includes("เฉพาะเจาะจง")) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
    if (v.includes("ประกวดราคา")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (v.includes("บริจาค")) return "bg-lime-50 text-lime-700 border-lime-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
};

// module-level stable function — ไม่สร้าง reference ใหม่ทุก render
const getBarColor = (name: string, type: "status" | "acq" | "money" | string, idx: number, total: number) => {
    if (type === "status") {
        if (name.includes("ใช้งานได้")) return "#34d399";
        if (name.includes("ชำรุด")) return "#fbbf24";
        if (name.includes("เสื่อมสภาพ")) return "#f97316";
        if (name.includes("สูญหาย")) return "#ef4444";
        if (name.includes("ส่งซ่อม")) return "#818cf8";
        return "#94a3b8";
    }
    if (type === "acq") {
        if (name.includes("ตกลงราคา")) return "#6366f1";
        if (name.includes("เฉพาะเจาะจง")) return "#d946ef";
        if (name.includes("ประกวดราคา")) return "#22d3ee";
        if (name.includes("บริจาค")) return "#a3e635";
        return "#94a3b8";
    }
    const hue = 210 - (idx * (210 / Math.max(total - 1, 1)));
    return `hsl(${hue}, 70%, 60%)`;
};

// ─────────────────────────────────────────────
// Shimmer Skeleton
// ─────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
    background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "skeletonShimmer 1.5s infinite",
};

const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div className={cn("rounded", className)} style={{ ...shimmerStyle, ...style }} />
);

const SkeletonStyle = () => (
    <style>{`
        @keyframes skeletonShimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `}</style>
);

// ─────────────────────────────────────────────
// Dynamic imports
// ─────────────────────────────────────────────

const AssetMap = dynamic(() => import("@/components/map/asset-map"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-50 animate-pulse" />,
});

const RechartsWrapper = dynamic(() => import("@/components/dashboard/recharts-wrapper"), {
    ssr: false,
    loading: () => null,
});

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<"all" | "general" | "durable">("all");
    const [showFilters, setShowFilters] = useState(false);
    const [masterPins, setMasterPins] = useState<MapPin[]>([]);
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

    const [fiscalYear, setFiscalYear] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [acquisitionFilter, setAcquisitionFilter] = useState("");
    const [moneyTypeFilter, setMoneyTypeFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const [statuses, setStatuses] = useState<string[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<string[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<string[]>([]);
    const [fiscalYears, setFiscalYears] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);


    const { collapsed } = useSidebar();
    const [isTransitioning, setIsTransitioning] = useState(false);

    // ── Sidebar Transition Effect ─────────────
    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 400); // 300ms (Sidebar transition) + 100ms (Recharts debounce)
        return () => clearTimeout(timer);
    }, [collapsed]);

    const statsAbortRef = useRef<AbortController | null>(null);

    // ── outside click ──────────────────────────
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            const t = e.target as Element;
            if (activeDropdown && !t.closest("[data-menu-trigger]") && !t.closest("[data-dropdown-content]"))
                setActiveDropdown(null);
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [activeDropdown]);

    // ── fetch dropdown options ─────────────────
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        Promise.all([
            fetch("/api/categories?type=status", { signal }).then(r => r.json()),
            fetch("/api/categories?type=acquisition_method", { signal }).then(r => r.json()),
            fetch("/api/categories?type=money_type", { signal }).then(r => r.json()),
            fetch("/api/categories?type=department", { signal }).then(r => r.json()),
            fetch("/api/assets/distinct-filters", { signal }).then(r => r.ok ? r.json() : {}),
        ]).then(([sArr, aArr, mArr, dArr, dbFilters]: any[]) => {
            const getMergedValues = (catArr: { name: string }[], dbVals: string[]) => {
                const catNames = catArr?.map(c => c.name) || [];
                return [...new Set([...catNames, ...(dbVals || [])])].sort();
            };

            setStatuses(getMergedValues(sArr, dbFilters.status));
            setAcquisitionMethods(getMergedValues(aArr, dbFilters.acquisitionMethod));
            setMoneyTypes(getMergedValues(mArr, dbFilters.moneyType));
            setDepartments(getMergedValues(dArr, dbFilters.department));
            if (dbFilters.fiscalYear) setFiscalYears(dbFilters.fiscalYear);
        }).catch(err => {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        });

        return () => controller.abort();
    }, []);

    // ── fetch stats ────────────────────────────
    const fetchStats = useCallback(async () => {
        statsAbortRef.current?.abort();
        const controller = new AbortController();
        statsAbortRef.current = controller;

        setLoading(true);
        try {
            const p = new URLSearchParams({ type: filterType });
            if (fiscalYear) p.set("fiscalYear", fiscalYear);
            if (startMonth) p.set("startMonth", startMonth);
            if (endMonth) p.set("endMonth", endMonth);
            if (statusFilter) p.set("status", statusFilter);
            if (acquisitionFilter) p.set("acquisitionMethod", acquisitionFilter);
            if (moneyTypeFilter) p.set("moneyType", moneyTypeFilter);
            if (departmentFilter) p.set("department", departmentFilter);

            const res = await fetch(`/api/dashboard?${p}`, { signal: controller.signal });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterType, fiscalYear, startMonth, endMonth, statusFilter, acquisitionFilter, moneyTypeFilter, departmentFilter]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ── fetch map pins ─────────────────────────
    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/map-pins", { signal: controller.signal })
            .then(r => r.ok ? r.json() : [])
            .then(setMasterPins)
            .catch(err => {
                if ((err as Error)?.name !== "AbortError") console.error(err);
            });
        return () => controller.abort();
    }, []);

    // ── map / sidebar ──────────────────────────
    const selectedPin = useMemo(
        () => masterPins.find(p => p.id === selectedPinId) || null,
        [masterPins, selectedPinId],
    );

    const [sidebarPage, setSidebarPage] = useState(1);
    const [sidebarAssets, setSidebarAssets] = useState<PinnedAsset[]>([]);
    const [sidebarLoading, setSidebarLoading] = useState(false);
    const sidebarAbortRef = useRef<AbortController | null>(null);

    // lazy fetch assets for a specific pin when clicked
    const fetchPinAssets = useCallback(async (pinId: string) => {
        sidebarAbortRef.current?.abort();
        const ctrl = new AbortController();
        sidebarAbortRef.current = ctrl;
        setSidebarLoading(true);
        setSidebarAssets([]);
        try {
            const res = await fetch(`/api/assets?mapPinId=${pinId}&limit=500`, { signal: ctrl.signal });
            if (res.ok) {
                const data = await res.json();
                setSidebarAssets(data.assets || []);
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        } finally {
            setSidebarLoading(false);
        }
    }, []);

    const paginatedSidebarAssets = useMemo(() => {
        const start = (sidebarPage - 1) * ITEMS_PER_PAGE;
        return sidebarAssets.slice(start, start + ITEMS_PER_PAGE);
    }, [sidebarAssets, sidebarPage]);

    const sidebarTotalPages = Math.ceil(sidebarAssets.length / ITEMS_PER_PAGE);

    useEffect(() => { setSidebarPage(1); }, [selectedPinId]);

    // pinCounts comes directly from the API — no client-side computation needed
    const pinAssetCounts = useMemo(() => stats?.pinCounts ?? {}, [stats?.pinCounts]);


    // ── sidebar pagination builder ─────────────
    const buildSidebarPages = (): (number | "dots")[] => {
        const pages: (number | "dots")[] = [];
        const current = sidebarPage;

        if (sidebarTotalPages <= 5) {
            for (let i = 1; i <= sidebarTotalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push("dots");
            const start = Math.max(2, current - 1);
            const end = Math.min(sidebarTotalPages - 1, current + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (current < sidebarTotalPages - 2) pages.push("dots");
            if (!pages.includes(sidebarTotalPages)) pages.push(sidebarTotalPages);
        }
        return pages;
    };

    // ── misc ───────────────────────────────────
    const fmt = (v: number) => new Intl.NumberFormat("th-TH").format(v);

    const countLabel = filterType === "general" ? "จำนวนครุภัณฑ์ทั่วไป"
        : filterType === "durable" ? "จำนวนพัสดุคงทนถาวร"
            : "จำนวนครุภัณฑ์ทั้งหมด";

    const countAccentColor = filterType === "general" ? "text-blue-600"
        : filterType === "durable" ? "text-orange-500"
            : "text-slate-900";

    const hasActiveFilter = !!(
        fiscalYear || startMonth || endMonth ||
        statusFilter || acquisitionFilter || moneyTypeFilter
    );

    const tabs = [
        { id: "all" as const, label: "ทั้งหมด" },
        { id: "general" as const, label: "แบบทั่วไป" },
        { id: "durable" as const, label: "แบบคงทน" },
    ];

    const deptMaxWidth = collapsed ? "24rem" : "16rem";

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-100 -m-6">
            <style>{`
                .recharts-surface:focus,
                .recharts-wrapper:focus,
                .recharts-layer:focus,
                svg:focus {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `}</style>

            {/* ══ Navbar ══════════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-110 bg-[#ffffff] border-b border-[#cbd5e1] flex items-center transition-none shrink-0" style={{ minHeight: "80px" }}>
                <div className="w-full px-10 py-4 flex items-center gap-4 relative">

                    {/* Title */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-[22px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight">แดชบอร์ด</h1>
                            </div>
                        </div>
                    </div>

                    {/* Center Tabs */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl h-10 items-center gap-1 pointer-events-auto">
                            {tabs.map(tab => {
                                const active = filterType === tab.id;
                                return (
                                    <button key={tab.id} type="button" onClick={() => setFilterType(tab.id)}
                                        className="relative px-5 py-1.5 rounded-lg border-none cursor-pointer text-[13px] font-bold transition-all duration-200"
                                        style={{
                                            background: active ? TAB_COLORS[tab.id] : "transparent",
                                            color: active ? "#fff" : "#94a3b8",
                                            fontFamily: "inherit",
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = TAB_COLORS[tab.id]; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#94a3b8"; }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Right controls */}
                    <div className="flex items-center gap-2.5 shrink-0">

                        {/* Filter toggle */}
                        <button onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                "group flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-bold cursor-pointer transition-all bg-white shadow-sm h-10",
                                showFilters || hasActiveFilter
                                    ? "border-blue-600 text-blue-600"
                                    : "border-slate-300 text-slate-500 hover:border-blue-600 hover:text-blue-600"
                            )}
                            style={{ fontFamily: "inherit" }}
                        >
                            <SlidersHorizontal size={14} className={cn(
                                "transition-transform duration-200",
                                (showFilters || hasActiveFilter) ? "text-blue-600 scale-125" : "text-slate-400 group-hover:text-blue-600 group-hover:scale-125"
                            )} />
                            <span>ตัวกรอง</span>
                            {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                            <ChevronDown size={13} className={cn(
                                "transition-transform duration-200",
                                (showFilters || hasActiveFilter) ? "text-blue-600" : "text-slate-400 group-hover:text-blue-600",
                                showFilters && "rotate-180"
                            )} />
                        </button>

                        {/* Department dropdown */}
                        <div className="relative">
                            <button data-menu-trigger
                                onClick={() => setActiveDropdown(prev => prev === "dept" ? null : "dept")}
                                className={cn(
                                    "group flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-bold cursor-pointer transition-all bg-white shadow-sm h-10",
                                    (activeDropdown === "dept" || departmentFilter)
                                        ? "border-blue-600 text-blue-600"
                                        : "border-slate-300 text-slate-500 hover:border-blue-600 hover:text-blue-600"
                                )}
                                style={{
                                    fontFamily: "inherit",
                                    whiteSpace: "nowrap",
                                    maxWidth: deptMaxWidth,
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                            >
                                <Building2 size={14} className={cn(
                                    "transition-transform duration-200 shrink-0",
                                    (activeDropdown === "dept" || departmentFilter) ? "text-blue-600 scale-125" : "text-slate-400 group-hover:text-blue-600 group-hover:scale-125"
                                )} />
                                <div className={cn(
                                    "flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden transition-colors",
                                    departmentFilter ? "text-blue-700" : "text-slate-400 group-hover:text-blue-600"
                                )}>
                                    <span className="shrink-0">หน่วยงาน :</span>
                                    <span className="truncate font-bold">{departmentFilter || "(ทั้งหมด)"}</span>
                                </div>
                                <ChevronDown size={13} className={cn(
                                    "transition-transform duration-200",
                                    (activeDropdown === "dept" || departmentFilter) ? "text-blue-600" : "text-slate-400 group-hover:text-blue-600",
                                    activeDropdown === "dept" && "rotate-180"
                                )} />
                            </button>

                            {activeDropdown === "dept" && (
                                <div data-dropdown-content
                                    className="absolute top-[calc(100%+0.35rem)] right-0 min-w-56 bg-white border border-slate-100 rounded-lg shadow-md p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                        {["", ...departments].map(d => (
                                            <button key={d || "__all"}
                                                onClick={() => { setDepartmentFilter(d); setActiveDropdown(null); }}
                                                className={cn(
                                                    "flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg border-none text-[13px] cursor-pointer transition-all",
                                                    departmentFilter === d
                                                        ? "bg-blue-50 text-blue-600 font-bold"
                                                        : "text-[#0f172a] font-medium hover:bg-indigo-100/50 hover:text-blue-600"
                                                )}
                                                style={{ fontFamily: "inherit" }}
                                            >
                                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                                    {departmentFilter === d && <Check size={14} className="text-blue-600" strokeWidth={3} />}
                                                </div>
                                                <span className="truncate">{d || "ทั้งหมด"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ══ Filter Panel ════════════════════════════════════════════════ */}
            <div className="sticky top-[80px] z-100 transition-none">
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: activeDropdown ? "visible" : "hidden" }}
                            className="bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm"
                        >
                            <div className="px-10 py-4">
                                <div className="grid gap-x-3 gap-y-2"
                                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))" }}>
                                    {[
                                        {
                                            label: "ปีงบประมาณ", value: fiscalYear, setter: setFiscalYear,
                                            options: fiscalYears.map(y => ({ value: y, label: y })),
                                        },
                                        { label: "เดือนเริ่มต้น", value: startMonth, setter: setStartMonth, type: "month" as const },
                                        { label: "เดือนสิ้นสุด", value: endMonth, setter: setEndMonth, type: "month" as const },
                                        {
                                            label: "สถานะ", value: statusFilter, setter: setStatusFilter,
                                            options: statuses.map(s => ({ value: s, label: s })),
                                        },
                                        {
                                            label: "วิธีการได้มา", value: acquisitionFilter, setter: setAcquisitionFilter,
                                            options: acquisitionMethods.map(a => ({ value: a, label: a })),
                                        },
                                        {
                                            label: "ประเภทเงิน", value: moneyTypeFilter, setter: setMoneyTypeFilter,
                                            options: moneyTypes.map(m => ({ value: m, label: m })),
                                        },
                                    ].map(f => {
                                        const isOpen = activeDropdown === f.label;
                                        const displayValue = f.type === "month"
                                            ? TH_MONTHS.find(m => m.value === (f.value ? f.value.split("-")[1] : ""))?.label
                                            : f.value;

                                        const options = f.type === "month"
                                            ? [{ value: "", label: "ทั้งหมด" }, ...TH_MONTHS]
                                            : [{ value: "", label: "ทั้งหมด" }, ...(f.options || [])];

                                        return (
                                            <div key={f.label} className="relative">
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide select-none cursor-default">
                                                    {f.label}
                                                </label>
                                                <button type="button"
                                                    onClick={() => setActiveDropdown(isOpen ? null : f.label)}
                                                    data-menu-trigger
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[13px] font-bold transition-all cursor-pointer",
                                                        (isOpen || f.value)
                                                            ? "bg-white border-blue-600 text-blue-600 shadow-sm"
                                                            : "bg-gray-50 border-gray-200 text-slate-500 hover:bg-white hover:border-blue-600 hover:text-blue-600"
                                                    )}
                                                >
                                                    <span className={cn("truncate", !f.value && "text-slate-500")}>
                                                        {displayValue || "ทั้งหมด"}
                                                    </span>
                                                    <ChevronDown size={14} className={cn("opacity-40 transition-transform duration-200", isOpen && "rotate-180 opacity-80")} />
                                                </button>

                                                {isOpen && (
                                                    <div data-dropdown-content
                                                        className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-slate-100 rounded-lg shadow-md z-30 p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                            {options.map(o => {
                                                                const isSelected = f.type === "month"
                                                                    ? (f.value ? f.value.split("-")[1] : "") === o.value
                                                                    : f.value === o.value;

                                                                return (
                                                                    <button key={o.value || "__all"}
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                                            isSelected
                                                                                ? "bg-blue-50 text-blue-600 font-bold"
                                                                                : "text-[#0f172a] hover:bg-indigo-100/50 hover:text-blue-600"
                                                                        )}
                                                                        onClick={() => {
                                                                            if (f.type === "month") {
                                                                                if (!o.value) {
                                                                                    f.setter("");
                                                                                } else {
                                                                                    const yr = fiscalYear
                                                                                        ? parseInt(fiscalYear) - 543
                                                                                        : new Date().getFullYear();
                                                                                    f.setter(`${yr}-${o.value}`);
                                                                                }
                                                                            } else {
                                                                                f.setter(o.value);
                                                                            }
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        style={{ fontFamily: "inherit" }}
                                                                    >
                                                                        <span className="truncate">{o.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Reset filters */}
                                    <div className="flex items-end pb-1">
                                        <button
                                            onClick={() => {
                                                setFiscalYear("");
                                                setStartMonth("");
                                                setEndMonth("");
                                                setStatusFilter("");
                                                setAcquisitionFilter("");
                                                setMoneyTypeFilter("");
                                                setDepartmentFilter("");
                                            }}
                                            className="text-[11px] font-semibold text-gray-400 hover:text-blue-600 cursor-pointer uppercase tracking-wide transition-colors select-none border-none bg-transparent p-0"
                                            style={{ fontFamily: "inherit", whiteSpace: "nowrap" }}
                                        >
                                            ล้างตัวกรองทั้งหมด
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ══ Content ═════════════════════════════════════════════════════ */}
            <div className="w-full pl-10 pr-10 pb-16 pt-5" style={{ transition: "none" }}>
                <div className="space-y-4 animate-in fade-in duration-300">
                    <SkeletonStyle />

                    {/* ── 1. Stat Cards ── */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            {
                                label: countLabel,
                                value: fmt(stats?.totalAssets || 0),
                                unit: "รายการ",
                                icon: <Package size={26} className="text-slate-400" strokeWidth={1.5} />,
                            },
                            {
                                label: "มูลค่ารวมปัจจุบัน",
                                value: fmt(stats?.totalValue || 0),
                                unit: "บาท",
                                icon: <Coins size={26} className="text-slate-400" strokeWidth={1.5} />,
                            },
                        ].map((card, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 h-[112px] flex items-center justify-between">
                                {loading ? (
                                    <>
                                        <div>
                                            <Skeleton className="h-[16px] w-32 mb-2" />
                                            <div className="flex items-baseline gap-2">
                                                <Skeleton className="h-[36px] w-24" />
                                                <Skeleton className="h-[20px] w-12" />
                                            </div>
                                        </div>
                                        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{card.label}</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className={cn("text-[2.25rem] font-extrabold leading-none tracking-tight", countAccentColor)}>{card.value}</span>
                                                <span className="text-[13px] text-gray-400 font-medium">{card.unit}</span>
                                            </div>
                                        </div>
                                        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                            {card.icon}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── 2. Charts Row ── */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            {
                                title: "สถิติตามสถานะ",
                                data: stats?.statusCounts,
                                type: "status" as const,
                                skeletonBars: ["60%", "35%", "75%", "45%", "85%", "55%"],
                            },
                            {
                                title: "วิธีการได้มา",
                                data: stats?.acquisitionCounts,
                                type: "acq" as const,
                                skeletonBars: ["50%", "80%", "30%", "65%", "40%", "70%"],
                            },
                        ].map(chart => (
                            <div key={chart.title} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5 overflow-hidden">
                                <p className="text-[13px] font-bold text-[#0f172a] mb-4">{chart.title}</p>
                                <div className="h-52 relative outline-none">
                                    {(isTransitioning || (loading && stats)) && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white">
                                            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mb-2" />
                                            <span className="text-[10px] text-slate-400 font-semibold tracking-wide">{loading ? "กำลังโหลดข้อมูล..." : "กำลังปรับขนาด..."}</span>
                                        </div>
                                    )}
                                    <div className={cn("h-full transition-opacity duration-150", (isTransitioning || (loading && stats)) ? "opacity-0" : "opacity-100")}>
                                        {loading && !stats ? (
                                            <div className="flex gap-3 h-full">
                                                <div className="flex flex-col justify-between pb-6 shrink-0">
                                                    {[1, 2, 3, 4].map(t => <Skeleton key={t} className="h-2 w-6" />)}
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex-1 flex items-end gap-1.5 border-l border-b border-slate-100 px-1 pb-1">
                                                        {chart.skeletonBars.map((h, j) => <Skeleton key={j} className="flex-1 rounded-sm" style={{ height: h }} />)}
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2 px-1">
                                                        {chart.skeletonBars.map((_, j) => <Skeleton key={j} className="flex-1 h-2" />)}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // ✅ ลบ collapsed prop ออก — ไม่ส่งเข้า RechartsWrapper อีกต่อไป
                                            <RechartsWrapper
                                                data={chart.data}
                                                type={chart.type}
                                                getBarColor={getBarColor}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── 3. Money Type Chart ── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5">
                        <p className="text-[13px] font-bold text-[#0f172a] mb-4">ประเภทเงิน</p>
                        <div className="relative outline-none" style={{ height: "280px" }}>
                            {(isTransitioning || (loading && stats)) && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white">
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mb-2" />
                                    <span className="text-[10px] text-slate-400 font-semibold tracking-wide">{loading ? "กำลังโหลดข้อมูล..." : "กำลังปรับขนาด..."}</span>
                                </div>
                            )}
                            <div className={cn("h-full transition-opacity duration-150", (isTransitioning || (loading && stats)) ? "opacity-0" : "opacity-100")}>
                                {loading && !stats ? (
                                    <div className="flex gap-3 h-full">
                                        <div className="flex flex-col justify-between pb-10 shrink-0">
                                            {[1, 2, 3, 4].map(t => <Skeleton key={t} className="h-2 w-6" />)}
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex-1 flex items-end gap-2 border-l border-b border-slate-100 px-2 pb-1">
                                                {["30%", "55%", "25%", "80%", "45%", "70%", "35%", "60%"].map((h, j) => (
                                                    <Skeleton key={j} className="flex-1 rounded-sm" style={{ height: h }} />
                                                ))}
                                            </div>
                                            <div className="flex gap-2 mt-2 px-2">
                                                {["30%", "55%", "25%", "80%", "45%", "70%", "35%", "60%"].map((_, j) => (
                                                    <Skeleton key={j} className="flex-1 h-2" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // ✅ isMoney chart — ไม่มี collapsed อยู่แล้ว ไม่ต้องเปลี่ยน
                                    <RechartsWrapper
                                        data={stats?.moneyTypeCounts}
                                        isMoney={true}
                                        getBarColor={getBarColor}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── 4. Recent Assets Table ── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <p className="text-[13px] font-bold text-[#0f172a]">รายการครุภัณฑ์ล่าสุด</p>
                            <Link href="/assets" className="text-[12px] font-semibold text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                                ดูทั้งหมด <ArrowUpRight size={13} />
                            </Link>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="bg-[#fafafa] border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 align-top select-none">
                                            <div className="flex items-start justify-start gap-0.5 text-left">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug whitespace-nowrap">
                                                    วันที่รับ /<br />ปีงบประมาณ
                                                </span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 align-top select-none">
                                            <div className="flex items-start justify-start gap-0.5 text-left">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">
                                                    ชื่อรายการ / รหัสครุภัณฑ์
                                                </span>
                                            </div>
                                        </th>
                                        <th className="px-1 py-3 text-left align-top select-none w-px whitespace-nowrap">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">ประเภท</span>
                                        </th>
                                        <th className="px-1 py-3 text-left align-top select-none w-px whitespace-nowrap">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">วิธีการได้มา</span>
                                        </th>
                                        <th className="px-1 py-3 text-left align-top select-none w-px whitespace-nowrap">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">ประเภทเงิน</span>
                                        </th>
                                        <th className="px-1 py-3 text-center align-top select-none w-px whitespace-nowrap">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">สถานะ</span>
                                        </th>
                                        <th className="px-4 py-3 text-center align-top select-none">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">จำนวน</span>
                                        </th>
                                        <th className="px-4 py-3 align-top select-none w-px whitespace-nowrap text-right">
                                            <div className="flex items-start justify-end gap-0.5 text-right">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug whitespace-nowrap">
                                                    ราคา<br />(รวม / ต่อหน่วย)
                                                </span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left align-top select-none">
                                            <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">ใช้ประจำที่ไหน</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                            <tr key={i} className="h-[64px]">
                                                <td className="px-4 py-3"><div className="flex flex-col gap-1.5"><Skeleton className="h-[14px] w-16" /><Skeleton className="h-[11px] w-20" /></div></td>
                                                <td className="px-4 py-3"><div className="flex flex-col gap-1.5 w-full max-w-[250px]"><Skeleton className="h-[14px] w-[85%]" /><Skeleton className="h-[12px] w-[45%]" /></div></td>
                                                <td className="px-1 py-3"><Skeleton className="h-[20px] w-10 rounded-md" /></td>
                                                <td className="px-1 py-3"><Skeleton className="h-[20px] w-16 rounded-lg" /></td>
                                                <td className="px-1 py-3"><Skeleton className="h-[20px] w-20 rounded-lg" /></td>
                                                <td className="px-1 py-3 text-center"><Skeleton className="h-[22px] w-16 rounded-full mx-auto" /></td>
                                                <td className="px-4 py-3 text-center"><Skeleton className="h-[14px] w-10 mx-auto" /></td>
                                                <td className="px-4 py-3 text-right"><div className="flex flex-col items-end gap-1.5"><Skeleton className="h-[14px] w-12" /><Skeleton className="h-[11px] w-20" /></div></td>
                                                <td className="px-4 py-3"><Skeleton className="h-[11px] w-[85%]" /></td>
                                            </tr>
                                        ))
                                    ) : (stats?.recentAssets && stats.recentAssets.length > 0) ? stats.recentAssets.map(asset => {
                                        const ss = statusStyle(asset.status ?? null);
                                        const totalPrice = (asset.quantity || 0) * (asset.unitPrice || 0);
                                        return (
                                            <tr key={asset.id}
                                                className="h-[64px] transition-all duration-150 hover:bg-slate-50 group cursor-pointer"
                                                onClick={() => router.push(`/assets/${asset.id}`)}
                                            >
                                                <td className="px-4 py-3 w-32">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-[#0f172a] whitespace-nowrap">
                                                            {asset.receivedDate ? new Date(asset.receivedDate).toLocaleDateString("th-TH") : "-"}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 whitespace-nowrap">ปีงบประมาณ {asset.fiscalYear || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span 
                                                            className={cn(
                                                                "text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-all block truncate",
                                                                collapsed ? "max-w-[450px]" : "max-w-[250px]"
                                                            )}
                                                            title={asset.name}
                                                        >
                                                            {asset.name}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-500 mt-0.5">{asset.assetCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-1 py-3 w-px whitespace-nowrap">
                                                    {asset.assetType === "durable" ? (
                                                        <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">คงทน</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">ทั่วไป</span>
                                                    )}
                                                </td>
                                                <td className="px-1 py-3 w-px whitespace-nowrap">
                                                    <span className={`text-[11px] font-medium border px-2 py-0.5 rounded-lg whitespace-nowrap ${acqBadge(asset.acquisitionMethod ?? null)}`}>
                                                        {asset.acquisitionMethod || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-1 py-3 w-px whitespace-nowrap">
                                                    <span className="text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                        {asset.moneyType || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-1 py-3 w-px whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 whitespace-nowrap ${ss.bg} ${ss.color} ${ss.border} border text-[10px] font-bold rounded-full`}>
                                                        {statusLabel(asset.status ?? null)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-[#0f172a]">{asset.quantity} {asset.unit || "หน่วย"}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right w-px whitespace-nowrap">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-bold text-[#0f172a]">{fmt(totalPrice)}</span>
                                                        <span className="text-[11px] font-medium text-gray-500 mt-0.5">หน่วยละ {fmt(asset.unitPrice || 0)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[11px] text-gray-600 font-medium truncate max-w-[120px] block">{asset.location || "—"}</span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={9} className="py-16 text-center">
                                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                    <Package className="w-7 h-7 text-gray-200" />
                                                </div>
                                                <p className="text-sm font-bold text-[#0f172a]">ยังไม่มีข้อมูลครุภัณฑ์</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 5. Map Section ── */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <p className="text-[13px] font-bold text-[#0f172a]">ใช้ประจำที่ไหน</p>
                            <Link href="/map" className="text-[12px] font-semibold text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                                แผนที่เต็มจอ <ArrowUpRight size={13} />
                            </Link>
                        </div>
                        <div className="relative" style={{ height: "520px" }}>
                            {loading ? (
                                <>
                                    <Skeleton className="absolute inset-0 rounded-none" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-500" style={{ animation: "spin 1s linear infinite" }} />
                                        <p className="text-[12px] font-semibold text-slate-400 tracking-wide">กำลังโหลดแผนที่...</p>
                                    </div>
                                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                </>
                            ) : (
                                <>
                                    <AssetMap
                                        assets={[]}
                                        masterPins={masterPins}
                                        pinAssetCounts={pinAssetCounts}
                                        onPinClick={(pinId: string | null) => {
                                            setSelectedPinId(pinId);
                                            if (pinId) fetchPinAssets(pinId);
                                            else setSidebarAssets([]);
                                        }}
                                        forcedActivePinId={selectedPinId}
                                    />

                                    <AnimatePresence>
                                        {selectedPin && (
                                            <motion.div
                                                initial={{ x: "100%", opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: "100%", opacity: 0 }}
                                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                                className="absolute top-0 right-0 h-full w-72 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl overflow-hidden"
                                            >
                                                <motion.div
                                                    key={selectedPinId}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="flex flex-col h-full"
                                                >
                                                    {/* Sidebar header */}
                                                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                                                        <div>
                                                            <p className="text-[13px] font-bold text-[#0f172a] line-clamp-1">{selectedPin.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">{sidebarLoading ? 'กำลังโหลด...' : `พบครุภัณฑ์ ${sidebarAssets.length} รายการ`}</p>
                                                        </div>
                                                        <button aria-label="ปิดรายการครุภัณฑ์" onClick={() => setSelectedPinId(null)}
                                                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                                                            <X size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Sidebar list */}
                                                    <div className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0 custom-scrollbar">
                                                        <div className="space-y-2 flex-1">
                                                            {paginatedSidebarAssets.length > 0 ? paginatedSidebarAssets.map(asset => (
                                                                <Link key={asset.id} href={`/assets/${asset.id}`}
                                                                    className="flex gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                                                                    <div className="w-11 h-11 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative">
                                                                        {asset.images?.[0]?.url
                                                                            ? <Image src={asset.images[0].url} alt={asset.name} fill sizes="44px" className="object-cover" unoptimized />
                                                                            : <div className="w-full h-full flex items-center justify-center text-slate-400"><Package className="w-5 h-5" /></div>
                                                                        }
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[12px] font-bold text-[#0f172a] line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">{asset.name}</p>
                                                                        <p className="text-[10px] text-slate-500 mt-0.5">{asset.assetCode}</p>
                                                                        <div className="flex gap-1 mt-1.5">
                                                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600">{asset.status || "—"}</span>
                                                                            <span className={cn(
                                                                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                                                                asset.assetType === "durable" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                                                                            )}>{asset.assetType === "durable" ? "คงทน" : "ทั่วไป"}</span>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            )) : (
                                                                <div className="flex flex-col items-center justify-center h-full py-8 text-gray-300">
                                                                    <Package className="w-8 h-8 mb-2" />
                                                                    <p className="text-xs font-bold text-slate-500">ไม่มีครุภัณฑ์ในสถานที่นี้</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Sidebar pagination */}
                                                    {sidebarTotalPages > 1 && (
                                                        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                                                            <button
                                                                aria-label="ย้อนกลับ"
                                                                disabled={sidebarPage === 1}
                                                                onClick={() => setSidebarPage(p => p - 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                                            >
                                                                <ChevronLeft size={14} />
                                                            </button>

                                                            <div className="flex items-center gap-1">
                                                                {buildSidebarPages().map((p, idx) =>
                                                                    p === "dots" ? (
                                                                        <span key={`dots-${idx}`} className="text-[10px] text-gray-300 px-0.5">...</span>
                                                                    ) : (
                                                                        <button key={p}
                                                                            onClick={() => setSidebarPage(p)}
                                                                            className={cn(
                                                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer",
                                                                                p === sidebarPage
                                                                                    ? "bg-blue-600 text-white shadow-md"
                                                                                    : "text-slate-400 hover:bg-slate-100"
                                                                            )}
                                                                        >
                                                                            {p}
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>

                                                            <button
                                                                aria-label="ถัดไป"
                                                                disabled={sidebarPage === sidebarTotalPages}
                                                                onClick={() => setSidebarPage(p => p + 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                                            >
                                                                <ChevronRight size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}