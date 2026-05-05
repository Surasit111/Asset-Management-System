"use client";

import React, {
    useEffect, useState, useCallback, useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package, Plus, SlidersHorizontal,
    Building2, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
    Edit3, Trash2, QrCode, Trash, Search, X, Check, Loader2,
    AlertTriangle, ImageOff, MapPinOff, MapPin, Save,
    Image as ImageIcon, Images,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { QRCodeModal } from "@/components/ui/qr-code-modal";
import { BulkQRCodeModal } from "../../../components/ui/bulk-qr-code-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { BulkImageModal } from "@/components/ui/bulk-image-modal";
import { BulkMapModal } from "@/components/ui/bulk-map-modal";
import { cn } from "@/lib/utils";
import { useSidebar } from "../client-layout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Asset {
    id: string;
    assetCode: string;
    name: string;
    assetType?: string;
    status?: string | null;
    receivedDate?: string | null;
    fiscalYear?: string | null;
    quantity: number;
    unit?: string | null;
    unitPrice?: number | null;
    moneyType?: string | null;
    acquisitionMethod?: string | null;
    department?: string | null;
    location?: string | null;
    remark?: string | null;
    receivedBy?: string | null;
    createdBy?: string | null;
    imageUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    images?: { id: string; url: string }[];
    // computed flags
    hasImage?: boolean;
    hasCoords?: boolean;
    isComplete?: boolean;
}

type QualityFilter = "incomplete" | "noImage" | "noCoords" | null;

// ─── Constants ────────────────────────────────────────────────────────────────
/** [FIX #8] PAGE_SIZE constant แทน hard-code 20 */
const PAGE_SIZE = 20;

const THAI_MONTHS = [
    { value: "01", label: "มกราคม" }, { value: "02", label: "กุมภาพันธ์" },
    { value: "03", label: "มีนาคม" }, { value: "04", label: "เมษายน" },
    { value: "05", label: "พฤษภาคม" }, { value: "06", label: "มิถุนายน" },
    { value: "07", label: "กรกฎาคม" }, { value: "08", label: "สิงหาคม" },
    { value: "09", label: "กันยายน" }, { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" }, { value: "12", label: "ธันวาคม" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0 }).format(v);

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

// ── quality flag helpers ──────────────────────────────────────────────────────
const flagAsset = (a: Asset): Asset => ({
    ...a,
    hasImage: !!((a.imageUrl && a.imageUrl.trim() !== "") || (a.images && a.images.length > 0)),
    hasCoords: !!(a.latitude && a.longitude && a.latitude !== 0 && a.longitude !== 0),
    isComplete: !!(
        a.name?.trim() &&
        a.assetCode?.trim() &&
        a.status?.trim() &&
        a.receivedDate &&
        a.quantity > 0 &&
        a.department?.trim() &&
        a.fiscalYear?.trim() &&
        a.unit?.trim() &&
        (a.unitPrice !== null && a.unitPrice !== undefined) &&
        a.moneyType?.trim() &&
        a.acquisitionMethod?.trim() &&
        a.location?.trim() &&
        a.receivedBy?.trim() &&
        a.createdBy?.trim() &&
        a.remark?.trim()
    ),
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssetManagementPage() {
    const router = useRouter();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // filters
    const [filterType, setFilterType] = useState<"" | "general" | "durable">("");
    const { collapsed } = useSidebar();
    const deptMaxWidth = collapsed ? "32rem" : "20rem";

    const [qualityFilter, setQualityFilter] = useState<QualityFilter>(null);
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [fiscalYear, setFiscalYear] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [endMonth, setEndMonth] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [acquisitionFilter, setAcquisitionFilter] = useState("");
    const [moneyTypeFilter, setMoneyTypeFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // sort
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // categories
    const [statuses, setStatuses] = useState<string[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<string[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [fiscalYears, setFiscalYears] = useState<string[]>([]);

    // quality counts
    const [qualityCounts, setQualityCounts] = useState({ incomplete: 0, noImage: 0, noCoords: 0 });

    // selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [qrAsset, setQrAsset] = useState<Asset | null>(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkQrOpen, setBulkQrOpen] = useState(false);
    const [bulkImageOpen, setBulkImageOpen] = useState(false);
    const [isBulkMapOpen, setIsBulkMapOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const deptRef = useRef<HTMLDivElement>(null);

    // [FIX #2] AbortController refs
    const assetsAbortRef = useRef<AbortController | null>(null);
    const statsAbortRef = useRef<AbortController | null>(null);

    // [FIX #1] ใช้ ref track ว่า initial fetch เสร็จแล้วหรือยัง
    // แทนการใช้ isMounted ที่ทำให้เกิด triple-fetch
    const didInitialFetch = useRef(false);

    // ── fetch quality stats ───────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        // [FIX #2] Cancel stats request เก่าก่อน
        statsAbortRef.current?.abort();
        const controller = new AbortController();
        statsAbortRef.current = controller;

        try {
            const p = new URLSearchParams({ limit: "2000" });
            if (departmentFilter) p.set("department", departmentFilter);
            if (filterType) p.set("assetType", filterType);

            const res = await fetch(`/api/assets?${p}`, { signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                const all: Asset[] = (data.assets || []).map(flagAsset);
                setQualityCounts({
                    incomplete: all.filter(a => !a.isComplete).length,
                    noImage: all.filter(a => !a.hasImage).length,
                    noCoords: all.filter(a => !a.hasCoords).length,
                });
                const yrs = [...new Set(all.map(a => a.fiscalYear).filter(Boolean))] as string[];
                setFiscalYears(yrs.sort().reverse());
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") console.error("Failed to fetch stats");
        }
    }, [departmentFilter, filterType]);

    // ── fetch categories ──────────────────────────────────────────────────────
    useEffect(() => {
        // [FIX #3] เพิ่ม AbortController cleanup
        const controller = new AbortController();
        const { signal } = controller;

        Promise.all([
            fetch("/api/categories?type=status", { signal }).then(r => r.json()),
            fetch("/api/categories?type=acquisition_method", { signal }).then(r => r.json()),
            fetch("/api/categories?type=money_type", { signal }).then(r => r.json()),
            fetch("/api/categories?type=department", { signal }).then(r => r.json()),
            fetch("/api/assets?limit=5000", { signal }).then(r => r.ok ? r.json() : { assets: [] }),
        ]).then(([sArr, aArr, mArr, dArr, assetData]) => {
            const all = assetData.assets || [];
            const getMergedValues = (catArr: { name: string }[], field: keyof Asset) => {
                const catNames = catArr.map(c => c.name);
                const existingVals = all.map((a: Asset) => a[field] as string).filter(Boolean);
                return [...new Set([...catNames, ...existingVals])].sort();
            };
            setStatuses(getMergedValues(sArr, "status"));
            setAcquisitionMethods(getMergedValues(aArr, "acquisitionMethod"));
            setMoneyTypes(getMergedValues(mArr, "moneyType"));
            setDepartments(getMergedValues(dArr, "department"));
        }).catch(err => {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        });

        return () => controller.abort();
    }, []);

    // ── outside click ─────────────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            const t = e.target as Element;
            if (activeDropdown && !t.closest("[data-menu-trigger]") && !t.closest("[data-dropdown-content]"))
                setActiveDropdown(null);
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [activeDropdown]);

    // ── fetch assets ──────────────────────────────────────────────────────────
    const fetchAssets = useCallback(async (opts: {
        p?: number; s?: string; type?: string; fy?: string;
        sm?: string; em?: string; sf?: string; af?: string;
        mf?: string; df?: string; qf?: QualityFilter;
        sb?: string | null; so?: "asc" | "desc";
        soft?: boolean;
    } = {}) => {
        // [FIX #2] Cancel request เก่าก่อน
        assetsAbortRef.current?.abort();
        const controller = new AbortController();
        assetsAbortRef.current = controller;

        const soft = opts.soft ?? false;
        if (!soft) setLoading(true);
        setIsFetching(true);

        // [FIX #1] รับ params ตรงๆ ไม่ fallback ไป closure state
        // ทุก caller ต้องส่งค่าที่ต้องการมาเอง
        const curPage = opts.p ?? page;
        const curSearch = opts.s ?? search;
        const curType = opts.type ?? filterType;
        const curFY = opts.fy ?? fiscalYear;
        const curSM = opts.sm ?? startMonth;
        const curEM = opts.em ?? endMonth;
        const curSF = opts.sf ?? statusFilter;
        const curAF = opts.af ?? acquisitionFilter;
        const curMF = opts.mf ?? moneyTypeFilter;
        const curDF = opts.df ?? departmentFilter;
        const curQF = opts.qf !== undefined ? opts.qf : qualityFilter;
        const curSB = opts.sb !== undefined ? opts.sb : sortBy;
        const curSO = opts.so ?? sortOrder;

        try {
            const p = new URLSearchParams({ page: curPage.toString(), limit: PAGE_SIZE.toString() });
            if (curSearch) p.set("search", curSearch);
            if (curType) p.set("assetType", curType);
            if (curFY) p.set("fiscalYear", curFY);
            if (curSM) p.set("startMonth", curSM);
            if (curEM) p.set("endMonth", curEM);
            if (curSF) p.set("status", curSF);
            if (curAF) p.set("acquisitionMethod", curAF);
            if (curMF) p.set("moneyType", curMF);
            if (curDF) p.set("department", curDF);
            if (curQF) p.set("qualityFilter", curQF);
            if (curSB) { p.set("sortBy", curSB); p.set("sortOrder", curSO); }

            const res = await fetch(`/api/assets?${p}`, { signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                setAssets((data.assets || []).map(flagAsset));
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    }, []); // stable — ไม่ depend บน state เพราะรับผ่าน opts

    // ── [FIX #1] Initial fetch — ยิงครั้งเดียวตอน mount ──────────────────────
    useEffect(() => {
        if (didInitialFetch.current) return;
        didInitialFetch.current = true;
        fetchAssets({ p: 1 });
        fetchStats();
    }, [fetchAssets, fetchStats]);

    // ── Filter/sort change → reset page แล้ว fetch ───────────────────────────
    useEffect(() => {
        if (!didInitialFetch.current) return;
        setPage(1);
        fetchAssets({
            p: 1, s: search, type: filterType, fy: fiscalYear,
            sm: startMonth, em: endMonth, sf: statusFilter,
            af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter,
            qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true,
        });
        fetchStats();
    }, [filterType, qualityFilter, fiscalYear, startMonth, endMonth,
        statusFilter, acquisitionFilter, moneyTypeFilter, departmentFilter,
        sortBy, sortOrder]);

    // ── Page change → fetch ───────────────────────────────────────────────────
    useEffect(() => {
        if (!didInitialFetch.current) return;
        fetchAssets({
            p: page, s: search, type: filterType, fy: fiscalYear,
            sm: startMonth, em: endMonth, sf: statusFilter,
            af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter,
            qf: qualityFilter, sb: sortBy, so: sortOrder,
        });
    }, [page]);

    // ── Search debounce ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!didInitialFetch.current) return;
        const t = setTimeout(() => {
            setPage(1);
            fetchAssets({
                p: 1, s: search, type: filterType, fy: fiscalYear,
                sm: startMonth, em: endMonth, sf: statusFilter,
                af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter,
                qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true,
            });
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // ── sort ──────────────────────────────────────────────────────────────────
    const handleSort = (field: string) => {
        if (sortBy === field) {
            if (sortOrder === "desc") setSortOrder("asc");
            else { setSortBy(null); setSortOrder("desc"); }
        } else {
            setSortBy(field);
            setSortOrder("desc");
        }
        setPage(1);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 shrink-0 group-hover:text-blue-500 transition-colors" />;
        return sortOrder === "asc"
            ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            : <ArrowDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    };

    // [FIX #3] buildPageNumbers คืน (number | "dots")[] type-safe
    const buildPageNumbers = (neighbors = 2): (number | "dots")[] => {
        const tp = totalPages;
        const cur = page;

        if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);

        const result: (number | "dots")[] = [];
        result.push(1);

        let start = Math.max(2, cur - neighbors);
        let end = Math.min(tp - 1, cur + neighbors);

        if (cur <= neighbors + 2) end = 1 + (neighbors * 2 + 1);
        else if (cur >= tp - (neighbors + 1)) start = tp - (neighbors * 2 + 1);

        if (start > 2) result.push("dots");
        for (let i = start; i <= end; i++) {
            if (!result.includes(i)) result.push(i);
        }
        if (end < tp - 1) result.push("dots");
        if (!result.includes(tp)) result.push(tp);

        return result;
    };

    // ── checkbox ──────────────────────────────────────────────────────────────
    const toggleAll = async () => {
        const allInPage = assets.every(a => selectedIds.has(a.id));
        if (allInPage && selectedIds.size >= total) {
            setSelectedIds(new Set());
        } else {
            try {
                // [FIX #7] ส่ง filter ทั้งหมดให้ครบ ไม่ใช่แค่ search + filterType
                const p = new URLSearchParams({ limit: "1000" });
                if (search) p.set("search", search);
                if (filterType) p.set("assetType", filterType);
                if (fiscalYear) p.set("fiscalYear", fiscalYear);
                if (startMonth) p.set("startMonth", startMonth);
                if (endMonth) p.set("endMonth", endMonth);
                if (statusFilter) p.set("status", statusFilter);
                if (acquisitionFilter) p.set("acquisitionMethod", acquisitionFilter);
                if (moneyTypeFilter) p.set("moneyType", moneyTypeFilter);
                if (departmentFilter) p.set("department", departmentFilter);
                if (qualityFilter) p.set("qualityFilter", qualityFilter);

                const res = await fetch(`/api/assets?${p}`);
                if (res.ok) {
                    const data = await res.json();
                    setSelectedIds(new Set(data.assets.map((a: Asset) => a.id)));
                }
            } catch {
                toast.error("ไม่สามารถเลือกทั้งหมดได้");
            }
        }
    };

    const toggleOne = (id: string) => {
        const n = new Set(selectedIds);
        n.has(id) ? n.delete(id) : n.add(id);
        setSelectedIds(n);
    };

    // ── delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("ลบครุภัณฑ์เรียบร้อย");
                setDeleteOpen(false);
                setDeleteTarget(null);
                fetchAssets({ p: page, s: search, type: filterType, fy: fiscalYear, sm: startMonth, em: endMonth, sf: statusFilter, af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter, qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true });
                fetchStats();
            } else {
                toast.error("ไม่สามารถลบได้");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await Promise.all([...selectedIds].map(id => fetch(`/api/assets/${id}`, { method: "DELETE" })));
            toast.success(`ลบ ${selectedIds.size} รายการเรียบร้อย`);
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
            fetchAssets({ p: page, s: search, type: filterType, fy: fiscalYear, sm: startMonth, em: endMonth, sf: statusFilter, af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter, qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true });
            fetchStats();
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsDeleting(false);
        }
    };

    // ── helpers ───────────────────────────────────────────────────────────────
    const countLabel = filterType === "general" ? "จำนวนครุภัณฑ์ทั่วไป"
        : filterType === "durable" ? "จำนวนพัสดุคงทนถาวร" : "จำนวนครุภัณฑ์ทั้งหมด";
    const countAccentColor = filterType === "general" ? "text-blue-600"
        : filterType === "durable" ? "text-orange-500" : "text-slate-900";

    const tabs = [
        { id: "" as const, label: "ทั้งหมด" },
        { id: "general" as const, label: "แบบทั่วไป" },
        { id: "durable" as const, label: "แบบคงทน" },
    ];
    const TAB_COLORS: Record<string, string> = { "": "#0f172a", general: "#2563eb", durable: "#f97316" };

    const qualityBadges = [
        {
            key: "incomplete" as QualityFilter,
            label: "ข้อมูลไม่ครบ", count: qualityCounts.incomplete,
            icon: <AlertTriangle size={12} />,
            activeClass: "bg-orange-500 text-white border-orange-500",
            inactiveClass: "bg-orange-50 text-orange-600 border-orange-300 hover:bg-orange-100",
            dot: "bg-orange-400",
        },
        {
            key: "noImage" as QualityFilter,
            label: "ไม่มีรูปภาพ", count: qualityCounts.noImage,
            icon: <ImageOff size={12} />,
            activeClass: "bg-violet-500 text-white border-violet-500",
            inactiveClass: "bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100",
            dot: "bg-violet-400",
        },
        {
            key: "noCoords" as QualityFilter,
            label: "ไม่มีพิกัด", count: qualityCounts.noCoords,
            icon: <MapPinOff size={12} />,
            activeClass: "bg-yellow-500 text-white border-yellow-500",
            inactiveClass: "bg-yellow-50 text-yellow-600 border-yellow-300 hover:bg-yellow-100",
            dot: "bg-yellow-400",
        },
    ];

    const handleRowClick = (asset: Asset) => router.push(`/assets/${asset.id}`);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-transparent font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif] -m-6">

            {/* ══ Header ════════════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-50 bg-white border-b border-[#cbd5e1] flex items-center transition-none shrink-0" style={{ minHeight: "80px" }}>
                <div className="w-full px-10 flex items-center justify-between flex-nowrap gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-[26px] font-extrabold text-[#0f172a] tracking-tight m-0 whitespace-nowrap">รายการครุภัณฑ์</h1>
                        <div className="w-px h-8 bg-slate-200 shrink-0" />
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] text-slate-400 font-medium">{countLabel}</span>
                            <span className={`text-[20px] font-extrabold tabular-nums ${loading ? "text-slate-300" : countAccentColor}`}>
                                {total.toLocaleString("th-TH")}
                            </span>
                            <span className="text-[14px] text-slate-400 font-medium">รายการ</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Dept */}
                        <div ref={deptRef} className="relative">
                            <button data-menu-trigger onClick={() => setActiveDropdown(prev => prev === "dept" ? null : "dept")}
                                className={cn("group flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-bold cursor-pointer transition-all bg-white shadow-sm h-10",
                                    (activeDropdown === "dept" || departmentFilter) ? "border-blue-600 text-blue-600" : "border-slate-300 text-slate-500 hover:border-blue-600 hover:text-blue-600"
                                )} style={{ fontFamily: "inherit", whiteSpace: "nowrap", maxWidth: deptMaxWidth, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                                <Building2 size={14} className={cn("transition-transform duration-200 shrink-0", (activeDropdown === "dept" || departmentFilter) ? "text-blue-600 scale-125" : "text-slate-400 group-hover:text-blue-600 group-hover:scale-125")} />
                                <div className={cn("flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden transition-colors", departmentFilter ? "text-blue-700" : "text-slate-400 group-hover:text-blue-600")}>
                                    <span className="shrink-0">หน่วยงาน :</span>
                                    <span className="truncate font-bold">{departmentFilter || "(ทั้งหมด)"}</span>
                                </div>
                                <ChevronDown size={13} className={cn("transition-transform duration-200", (activeDropdown === "dept" || departmentFilter) ? "text-blue-600" : "text-slate-400 group-hover:text-blue-600", activeDropdown === "dept" && "rotate-180")} />
                            </button>
                            <AnimatePresence>
                                {activeDropdown === "dept" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        data-dropdown-content
                                        className="absolute top-[calc(100%+6px)] right-0 min-w-56 bg-white border border-gray-100 rounded-lg shadow-xl p-1.5 z-50"
                                    >
                                        <div className="max-h-80 overflow-y-auto flex flex-col gap-1">
                                            {["", ...departments].map(d => (
                                                <button key={d || "__all"} onClick={() => { setDepartmentFilter(d); setActiveDropdown(null); }}
                                                    className={cn("flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all",
                                                        departmentFilter === d ? "bg-blue-50 text-blue-600 font-bold" : "text-[#0f172a] font-medium hover:bg-indigo-50 hover:text-blue-600"
                                                    )} style={{ fontFamily: "inherit" }}>
                                                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                                        {departmentFilter === d && <Check size={14} className="text-blue-600" strokeWidth={3} />}
                                                    </div>
                                                    <span className="truncate">{d || "ทั้งหมด"}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-8 bg-slate-200 shrink-0" />

                        {/* Search */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input type="text" placeholder="ค้นหารหัส, ชื่อ..." value={search} onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[13px] outline-none hover:border-blue-400 focus:border-blue-500 focus:bg-white transition-all duration-300"
                                style={{ width: "14rem", fontFamily: "inherit" }} />
                        </div>

                        {/* Add */}
                        <Link href="/assets/new" className="group flex items-center gap-2.5 h-10 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[13px] font-bold shadow-md transition-all whitespace-nowrap">
                            <Plus size={15} className="group-hover:scale-125 transition-transform duration-200" />เพิ่มรายการครุภัณฑ์
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Selection Bar ─────────────────────────────────────────────── */}
            <div className="fixed top-[100px] left-0 right-0 pointer-events-none z-40 flex justify-center pl-(--sidebar-width,0px) transition-all duration-300 ease-in-out">
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="pointer-events-auto flex items-center gap-3 p-[0.6rem_1rem] bg-white/90 backdrop-blur-md rounded-full border border-slate-200 shadow-[0_0_40px_0_rgba(0,0,0,0.35)]"
                        >
                            <div className="flex items-center gap-2 px-2 border-r border-slate-200 mr-1">
                                <span className="text-[15px] font-black text-black">{selectedIds.size}</span>
                                <span className="text-[13px] font-medium text-black whitespace-nowrap opacity-80">รายการที่เลือก</span>
                            </div>
                            <div className="flex items-center gap-2.5 border-r border-slate-200 pr-5 mr-1">
                                <button onClick={() => setBulkQrOpen(true)}
                                    className="h-8 px-4 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 border border-blue-500/30 rounded-full font-bold text-[12px] flex items-center gap-2 transition-all cursor-pointer">
                                    <QrCode size={15} /> พิมพ์ QR ทั้งหมด
                                </button>
                                <button onClick={() => setBulkDeleteOpen(true)}
                                    className="h-8 px-4 bg-red-500/5 hover:bg-red-500/10 text-red-600 border border-red-500/30 rounded-full font-bold text-[12px] flex items-center gap-2 transition-all cursor-pointer">
                                    <Trash size={15} /> ลบที่เลือก
                                </button>
                            </div>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="h-8 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-bold text-[12px] flex items-center gap-2 cursor-pointer">
                                <X size={15} /> ยกเลิก
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <main className="flex-1 w-full pl-10 pr-[34.7px] pt-5 pb-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center" style={{ height: "520px" }}>
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-[13px] font-bold text-slate-400">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-300">

                        {/* ══ Toolbar Card ══════════════════════════════════════════ */}
                        <div className={cn(
                            "bg-white rounded-lg border border-slate-200 shadow-sm mb-5 transition-all duration-300",
                            isFetching && "opacity-70 pointer-events-none grayscale-[0.2]"
                        )} style={{ overflow: "visible" }}>

                            {/* Row 1: Tabs + Quality badges */}
                            <div className="flex items-center gap-3 px-6 py-5 flex-wrap">
                                <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl h-10 items-center gap-1">
                                    {tabs.map(tab => {
                                        const active = filterType === tab.id;
                                        return (
                                            <button key={tab.id} type="button" onClick={() => setFilterType(tab.id)}
                                                className="relative px-5 py-1.5 rounded-lg border-none cursor-pointer text-[13px] font-bold transition-all duration-200 flex items-center h-8"
                                                style={{ background: active ? TAB_COLORS[tab.id] : "transparent", color: active ? "#fff" : "#94a3b8", fontFamily: "inherit" }}
                                                onMouseEnter={e => { if (!active) e.currentTarget.style.color = TAB_COLORS[tab.id]; }}
                                                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#94a3b8"; }}>
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex-1" />

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">คุณภาพข้อมูล</span>
                                    {qualityBadges.map(badge => (
                                        <button key={badge.key} type="button"
                                            onClick={() => setQualityFilter(qualityFilter === badge.key ? null : badge.key)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all cursor-pointer",
                                                qualityFilter === badge.key ? badge.activeClass : badge.inactiveClass
                                            )}>
                                            {badge.icon}
                                            <span>{badge.label}</span>
                                            <span className={cn(
                                                "min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold px-1",
                                                qualityFilter === badge.key ? "bg-white/25 text-white" : cn(badge.dot, "text-white")
                                            )}>
                                                {badge.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-200" />

                            {/* Row 2: Filter toggle + bulk actions */}
                            <div className="px-6 py-3.5 bg-slate-50/50 rounded-b-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowFilters(v => !v)}
                                        className={cn("group flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[13px] font-bold cursor-pointer transition-all",
                                            showFilters ? "bg-white border-blue-600 text-blue-600 shadow-sm" : "bg-transparent border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600 hover:bg-white"
                                        )} style={{ fontFamily: "inherit" }}>
                                        <SlidersHorizontal size={13} className={cn(showFilters ? "text-blue-600 scale-125" : "text-slate-400 group-hover:text-blue-600")} />
                                        <span>ตัวกรองข้อมูล</span>
                                        <ChevronDown size={13} className={cn("transition-transform", showFilters ? "rotate-180 text-blue-600" : "text-slate-400")} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setBulkImageOpen(true)}
                                        className="group flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[12px] font-bold shadow-sm transition-all cursor-pointer active:scale-95">
                                        <Images size={14} className="group-hover:rotate-12 transition-transform" />
                                        จัดการรูปภาพกลุ่ม
                                    </button>
                                    <button onClick={() => setIsBulkMapOpen(true)}
                                        className="group flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[12px] font-bold shadow-sm transition-all cursor-pointer active:scale-95">
                                        <MapPin size={14} className="group-hover:animate-bounce transition-transform" />
                                        ปักหมุดแผนที่กลุ่ม
                                    </button>
                                </div>
                            </div>

                            {/* Filter Panel */}
                            <div className="bg-white rounded-b-xl" style={{ display: "grid", gridTemplateRows: showFilters ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease", overflow: (showFilters && activeDropdown) ? "visible" : "clip" }}>
                                <div style={{ overflow: (showFilters && activeDropdown) ? "visible" : "clip", minHeight: 0 }}>
                                    <div className="grid gap-x-3 gap-y-1.5 px-6 pb-2.5 pt-4 border-t border-slate-200"
                                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))" }}>
                                        {[
                                            { label: "ปีงบประมาณ", value: fiscalYear, setter: setFiscalYear, options: fiscalYears.map(y => ({ value: y, label: y })) },
                                            { label: "เดือนเริ่มต้น", value: startMonth, setter: setStartMonth, type: "month" as const },
                                            { label: "เดือนสิ้นสุด", value: endMonth, setter: setEndMonth, type: "month" as const },
                                            { label: "สถานะ", value: statusFilter, setter: setStatusFilter, options: statuses.map(s => ({ value: s, label: s })) },
                                            { label: "วิธีการได้มา", value: acquisitionFilter, setter: setAcquisitionFilter, options: acquisitionMethods.map(a => ({ value: a, label: a })) },
                                            { label: "ประเภทเงิน", value: moneyTypeFilter, setter: setMoneyTypeFilter, options: moneyTypes.map(m => ({ value: m, label: m })) },
                                        ].map(f => {
                                            const isOpen = activeDropdown === f.label;
                                            const displayValue = f.type === "month"
                                                ? THAI_MONTHS.find(m => m.value === (f.value ? f.value.split("-")[1] : ""))?.label
                                                : f.value;
                                            const options = f.type === "month"
                                                ? [{ value: "", label: "ทั้งหมด" }, ...THAI_MONTHS]
                                                : [{ value: "", label: "ทั้งหมด" }, ...(f.options || [])];
                                            return (
                                                <div key={f.label} className="relative">
                                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wide select-none">{f.label}</label>
                                                    <button type="button" data-menu-trigger onClick={() => setActiveDropdown(isOpen ? null : f.label)}
                                                        className={cn("w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[13px] font-bold transition-all cursor-pointer",
                                                            (isOpen || f.value) ? "bg-white border-blue-600 text-blue-600 shadow-sm" : "bg-gray-50 border-gray-200 text-slate-500 hover:bg-white hover:border-blue-600 hover:text-blue-600"
                                                        )}>
                                                        <span className={cn("truncate", !f.value && "text-gray-400")}>{displayValue || "ทั้งหมด"}</span>
                                                        <ChevronDown size={14} className={cn("opacity-40 transition-transform", isOpen && "rotate-180")} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                                data-dropdown-content
                                                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 p-1.5"
                                                            >
                                                                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                                    {options.map(o => {
                                                                        const isSelected = f.type === "month"
                                                                            ? (f.value ? f.value.split("-")[1] : "") === o.value
                                                                            : f.value === o.value;
                                                                        return (
                                                                            <button key={o.value || "__all"} type="button"
                                                                                className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                                                    isSelected ? "bg-blue-50 text-blue-600 font-bold" : "text-[#0f172a] hover:bg-indigo-50 hover:text-blue-600"
                                                                                )}
                                                                                onClick={() => {
                                                                                    if (f.type === "month") {
                                                                                        if (!o.value) f.setter("");
                                                                                        else { const yr = fiscalYear ? parseInt(fiscalYear) - 543 : new Date().getFullYear(); f.setter(`${yr}-${o.value}`); }
                                                                                    } else f.setter(o.value);
                                                                                    setActiveDropdown(null);
                                                                                }}>
                                                                                {o.label}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <div className="flex items-center h-10">
                                                <button onClick={() => { setFiscalYear(""); setStartMonth(""); setEndMonth(""); setStatusFilter(""); setAcquisitionFilter(""); setMoneyTypeFilter(""); }}
                                                    className="p-0 bg-transparent border-none text-[11px] font-semibold text-gray-400 cursor-pointer uppercase tracking-wide hover:text-blue-600 transition-colors select-none"
                                                    style={{ fontFamily: "inherit", whiteSpace: "nowrap" }}>
                                                    ล้างตัวกรองทั้งหมด
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══ Table ════════════════════════════════════════════════ */}
                        <div className={cn(
                            "bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible transition-all duration-300 relative",
                            isFetching && "opacity-70 grayscale-[0.2]"
                        )}>
                            {isFetching && !loading && (
                                <div className="absolute top-0 left-0 right-0 h-0.5 z-50 overflow-hidden rounded-t-xl">
                                    <div className="h-full bg-blue-500 animate-[loading-bar_1.5s_infinite_ease-in-out]" style={{ width: "40%" }} />
                                    <style>{`
                                        @keyframes loading-bar {
                                            0% { transform: translateX(-100%); }
                                            100% { transform: translateX(300%); }
                                        }
                                    `}</style>
                                </div>
                            )}
                            <div className="overflow-x-auto custom-scrollbar rounded-t-xl pb-20 -mb-20">
                                <table className="w-full text-left border-collapse min-w-[1100px]">
                                    <thead className="sticky top-0 z-10 bg-[#fafafa] border-b border-slate-200">
                                        <tr>
                                            <th className="w-[50px] px-4 py-3.5 text-center">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                                                    checked={assets.length > 0 && assets.every(a => selectedIds.has(a.id))} onChange={toggleAll} />
                                            </th>
                                            <th onClick={() => handleSort("receivedDate")} className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors align-middle group select-none">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 group-hover:text-blue-500 leading-snug">วันที่รับ /<br />ปีงบประมาณ</span>
                                                    <SortIcon field="receivedDate" />
                                                </div>
                                            </th>
                                            <th className="pl-0 pr-4 py-3 align-middle select-none">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 leading-snug">ชื่อรายการ /<br />รหัสครุภัณฑ์</span>
                                            </th>
                                            <th className="px-2 py-3 align-middle select-none w-px whitespace-nowrap">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">ประเภท</span>
                                            </th>
                                            <th className="px-2 py-3 align-middle select-none w-px whitespace-nowrap">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">วิธีการได้มา</span>
                                            </th>
                                            <th className="px-2 py-3 align-middle select-none w-px whitespace-nowrap">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">ประเภทเงิน</span>
                                            </th>
                                            <th className="px-2 py-3 text-center align-middle select-none w-px whitespace-nowrap">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">สถานะ</span>
                                            </th>
                                            <th className="px-4 py-3 text-center align-middle select-none">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">จำนวน</span>
                                            </th>
                                            <th onClick={() => handleSort("unitPrice")} className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors align-middle group select-none">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500 group-hover:text-blue-500 whitespace-nowrap">ราคา<br />(รวม/ต่อหน่วย)</span>
                                                    <SortIcon field="unitPrice" />
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 align-middle select-none">
                                                <span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">ใช้ประจำที่ไหน</span>
                                            </th>
                                            <AnimatePresence mode="popLayout">
                                                {selectedIds.size === 0 && (
                                                    <>
                                                        <th className="px-2 py-3 text-center align-middle select-none w-12"><span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">QR</span></th>
                                                        <th className="px-2 py-3 text-right align-middle select-none w-12"><span className="text-[10px] uppercase tracking-[0.18em] font-extrabold text-gray-500">จัดการ</span></th>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {assets.length === 0 ? (
                                            <tr>
                                                <td colSpan={12} className="py-20 text-center px-4">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                        <Package className="w-8 h-8 text-gray-200" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-[#0f172a]">ยังไม่มีข้อมูลครุภัณฑ์</h3>
                                                    <p className="text-xs text-gray-400 mt-1">ลองปรับตัวกรองหรือเพิ่มครุภัณฑ์ใหม่</p>
                                                </td>
                                            </tr>
                                        ) : assets.map(asset => {
                                            const ss = statusStyle(asset.status ?? null);
                                            const totalPrice = (asset.quantity || 0) * (asset.unitPrice || 0);
                                            return (
                                                <tr key={asset.id}
                                                    className={cn(
                                                        "h-[64px] transition-all duration-150 group cursor-pointer relative hover:bg-slate-50/80",
                                                        activeDropdown === `context-${asset.id}` ? "z-20" : "z-1"
                                                    )}
                                                    onClick={() => handleRowClick(asset)}>
                                                    <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                                                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleOne(asset.id)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                                    </td>
                                                    <td className="pl-4 pr-3 py-3 w-32">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-[#0f172a] whitespace-nowrap">
                                                                {asset.receivedDate ? new Date(asset.receivedDate).toLocaleDateString("th-TH") : "-"}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400">ปีงบประมาณ {asset.fiscalYear || "-"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="pl-0 pr-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">{asset.name}</span>
                                                            <span className="text-sm font-medium text-gray-500 mt-0.5">{asset.assetCode}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 w-px whitespace-nowrap">
                                                        {asset.assetType === "durable"
                                                            ? <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">คงทน</span>
                                                            : <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">ทั่วไป</span>}
                                                    </td>
                                                    <td className="px-2 py-3 w-px whitespace-nowrap">
                                                        <span className={`text-[11px] font-medium border px-2 py-0.5 rounded-lg ${acqBadge(asset.acquisitionMethod ?? null)}`}>
                                                            {asset.acquisitionMethod || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 w-px whitespace-nowrap">
                                                        <span className="text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                                            {asset.moneyType || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 w-px whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 ${ss.bg} ${ss.color} ${ss.border} border text-[10px] font-bold rounded-full`}>
                                                            {statusLabel(asset.status ?? null)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        <span className="text-sm font-semibold text-[#0f172a]">{asset.quantity} {asset.unit || "หน่วย"}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-bold text-[#0f172a]">{fmt(totalPrice)}</span>
                                                            <span className="text-[11px] font-medium text-gray-500">หน่วยละ {fmt(asset.unitPrice || 0)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <span className="text-[11px] text-gray-600 font-medium truncate max-w-[120px] block">{asset.location || "-"}</span>
                                                    </td>
                                                    <AnimatePresence mode="popLayout">
                                                        {selectedIds.size === 0 && (
                                                            <>
                                                                <td className="px-2 py-3 text-center w-12 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                    <button title="QR Code" onClick={() => { setQrAsset(asset); setQrOpen(true); }}
                                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-slate-200 hover:text-gray-700 transition-all cursor-pointer">
                                                                        <QrCode size={16} />
                                                                    </button>
                                                                </td>
                                                                <td className="px-2 py-3 text-right w-12 relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                                    <button data-menu-trigger
                                                                        onClick={e => { e.stopPropagation(); const id = `context-${asset.id}`; setActiveDropdown(activeDropdown === id ? null : id); }}
                                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-slate-200 hover:text-gray-700 transition-all cursor-pointer">
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                                                                        </svg>
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {activeDropdown === `context-${asset.id}` && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                                                data-dropdown-content
                                                                                className="absolute right-[calc(100%-8px)] top-1/2 -translate-y-1/2 min-w-36 bg-white rounded-xl border border-gray-200 shadow-2xl p-1.5 text-left z-40"
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <button type="button"
                                                                                    onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/assets/${asset.id}?edit=true`); setActiveDropdown(null); }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-transparent text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-100" style={{ fontFamily: "inherit" }}>
                                                                                    <Edit3 size={14} />แก้ไข
                                                                                </button>
                                                                                <button type="button"
                                                                                    onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(asset); setDeleteOpen(true); setActiveDropdown(null); }}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-transparent text-red-500 text-sm font-medium cursor-pointer hover:bg-red-50" style={{ fontFamily: "inherit" }}>
                                                                                    <Trash2 size={14} />ลบ
                                                                                </button>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </td>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-8 py-4 flex flex-col sm:flex-row items-center justify-between bg-white border-t border-slate-200 gap-4 rounded-b-xl">
                                <span className="text-xs text-slate-400 font-medium">
                                    แสดง{" "}
                                    <span className="text-[13.5px] font-medium text-slate-500 mx-0.5">
                                        {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
                                    </span>{" "}
                                    จากทั้งหมด{" "}
                                    <span className="text-[13.5px] font-medium text-slate-500 mx-0.5">{total}</span> รายการ
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                        className={`h-8 px-3 rounded-full border border-slate-200 flex items-center gap-1 text-[12px] font-bold transition-colors ${page <= 1 ? "bg-[#f8fafc] text-slate-400 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"}`}>
                                        <ChevronLeft className="w-3.5 h-3.5" />ย้อนกลับ
                                    </button>
                                    {buildPageNumbers(2).map((p, i) =>
                                        p === "dots" ? (
                                            <span key={`dots-${i}`} className="text-slate-400 text-[12px] px-1">...</span>
                                        ) : (
                                            <button key={p} onClick={() => setPage(p)}
                                                className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-bold transition-all cursor-pointer border",
                                                    p === page
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                        : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100"
                                                )}>
                                                {p}
                                            </button>
                                        )
                                    )}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
                                        className={`h-8 px-3 rounded-full border border-slate-200 flex items-center gap-1 text-[12px] font-bold transition-colors ${(page >= totalPages || totalPages === 0) ? "bg-[#f8fafc] text-slate-400 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"}`}>
                                        ถัดไป<ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Modals ── */}
            <QRCodeModal isOpen={qrOpen} onClose={() => { setQrOpen(false); setQrAsset(null); }}
                asset={qrAsset ? { id: qrAsset.id, assetCode: qrAsset.assetCode, name: qrAsset.name, assetType: qrAsset.assetType || "general", location: qrAsset.location || null } : null} />

            <ConfirmModal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }} onConfirm={handleDelete}
                title="ลบครุภัณฑ์"
                description={deleteTarget ? <>คุณต้องการลบ <strong>{deleteTarget.name}</strong> ({deleteTarget.assetCode}) ออกจากระบบหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</> : ""}
                confirmText="ลบ" type="danger" isLoading={isDeleting} />

            <ConfirmModal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
                title="ลบรายการที่เลือก"
                description={<>คุณต้องการลบ <strong>{selectedIds.size} รายการ</strong> ออกจากระบบหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</>}
                confirmText={`ลบ ${selectedIds.size} รายการ`} type="danger" isLoading={isDeleting} />

            <BulkQRCodeModal isOpen={bulkQrOpen} onClose={() => setBulkQrOpen(false)} assets={assets.filter(a => selectedIds.has(a.id))} />

            <BulkImageModal
                isOpen={bulkImageOpen}
                onClose={() => setBulkImageOpen(false)}
                assets={selectedIds.size > 0 ? assets.filter(a => selectedIds.has(a.id)) : assets.filter(a => !a.hasImage)}
                onSaved={() => {
                    fetchAssets({ p: page, s: search, type: filterType, fy: fiscalYear, sm: startMonth, em: endMonth, sf: statusFilter, af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter, qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true });
                    fetchStats();
                }}
            />

            <BulkMapModal
                isOpen={isBulkMapOpen}
                onClose={() => setIsBulkMapOpen(false)}
                onSaved={() => {
                    fetchAssets({ p: page, s: search, type: filterType, fy: fiscalYear, sm: startMonth, em: endMonth, sf: statusFilter, af: acquisitionFilter, mf: moneyTypeFilter, df: departmentFilter, qf: qualityFilter, sb: sortBy, so: sortOrder, soft: true });
                    fetchStats();
                }}
            />
        </div>
    );
}