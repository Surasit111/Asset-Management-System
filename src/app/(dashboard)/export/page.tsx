"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Download,
    Filter,
    Loader2,
    TrendingUp,
    TableIcon,
    ArrowUpDown,
    Check,
    X,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
    id: string;
    assetCode: string;
    name: string;
    assetType: string;
    status: string | null;
    receivedDate: string | null;
    fiscalYear: string | null;
    acquisitionMethod: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number | null;
    moneyType: string | null;
    receivedBy: string | null;
    remark: string | null;
    location: string | null;
    department: string | null;
}

const STATIC_COLUMNS = [
    { id: "receivedDate", label: "ว/ด/ป ที่รับ" },
    { id: "name", label: "รายการ" },
    { id: "assetCode", label: "รหัสครุภัณฑ์" },
    { id: "quantityWithUnit", label: "จำนวน" },
    { id: "unitPrice", label: "ราคาต่อหน่วย" },
    { id: "totalPrice", label: "มูลค่ารวม" },
    { id: "moneyType", label: "ประเภทเงิน" },
    { id: "acquisitionMethod", label: "วิธีการได้มา" },
    { id: "location", label: "ใช้ประจำที่ไหน" },
    { id: "status_group", label: "สถานะ", isGroup: true },
];

const ORDERED_STATUSES = [
    "ใช้งานได้",
    "ชำรุด",
    "เสื่อมสภาพ",
    "สูญหาย",
    "ไม่จำเป็นต้องใช้ในราชการ"
];

// Determine alignment for common cells
const getAlignment = (colId: string, isStatus: boolean) => {
    if (isStatus || ["receivedDate", "assetCode", "quantityWithUnit", "moneyType", "acquisitionMethod", "location"].includes(colId)) {
        return "center";
    }
    if (["unitPrice", "totalPrice"].includes(colId)) {
        return "right";
    }
    return "left";
};

// ── Preview Row Component ──────────────────────────────────────────────────
const PreviewRow = React.memo(({ asset, idx, allColumns }: { asset: Asset; idx: number; allColumns: any[] }) => (
    <tr className="group transition-colors duration-150 hover:bg-slate-100/80 border-b border-slate-200 last:border-0">
        <td className="px-4 py-3 text-[13px] text-slate-400 text-center font-medium">{idx + 1}</td>
        {allColumns.map(col => {
            const align = getAlignment(col.id, !!col.isStatus);
            return (
                <td key={col.id} className={`px-4 py-3 text-[13px] font-medium text-slate-600 whitespace-nowrap transition-colors group-hover:text-blue-600`} style={{ textAlign: align as any }}>
                    {col.isStatus
                        ? (asset.status === col.statusName ? "✓" : "")
                        : col.id === "receivedDate"
                            ? asset.receivedDate ? (asset as any)._formattedDate || new Date(asset.receivedDate).toLocaleDateString("th-TH") : "-"
                            : col.id === "assetType"
                                ? (asset.assetType === "durable" ? "คงทน" : "ทั่วไป")
                                : col.id === "quantityWithUnit"
                                    ? `${asset.quantity?.toLocaleString() || 0} ${asset.unit || ""}`.trim()
                                    : ["unitPrice", "totalPrice"].includes(col.id)
                                        ? (col.id === "unitPrice" ? asset.unitPrice?.toLocaleString() || "-" : (((asset.quantity || 0) * (asset.unitPrice || 0)).toLocaleString()))
                                        : (asset as any)[col.id] || "-"}
                </td>
            );
        })}
    </tr>
), (p, n) => p.asset.id === n.asset.id && (p.asset as any)._formattedDate === (n.asset as any)._formattedDate && p.idx === n.idx && p.allColumns.length === n.allColumns.length);

export default function ExportPage() {
    // Data States
    const [assets, setAssets] = useState<Asset[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [fiscalYear, setFiscalYear] = useState("");
    const [assetType, setAssetType] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<string | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const deptRef = useRef<HTMLDivElement>(null);
    const typeRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);

    // Modal States
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [customFileName, setCustomFileName] = useState("");
    const [modalSortOrder, setModalSortOrder] = useState<"asc" | "desc" | null>(null);
    const [selectedDateFormat, setSelectedDateFormat] = useState("DD/MM/YYYY");
    const [showLeadingZero, setShowLeadingZero] = useState(true);
    const [modalPreviewAssets, setModalPreviewAssets] = useState<Asset[]>([]);
    const [modalPreviewLoading, setModalPreviewLoading] = useState(false);

    const DATE_FORMATS = useMemo(() => {
        const now = new Date();
        const d = now.getDate();
        const m = now.getMonth();
        const yAD = now.getFullYear();
        const yBE = yAD + 543;

        const dd = showLeadingZero ? String(d).padStart(2, '0') : String(d);
        const mm = showLeadingZero ? String(m + 1).padStart(2, '0') : String(m + 1);
        const yyBE = String(yBE).slice(-2);
        const yyAD = String(yAD).slice(-2);

        const thMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const thMonthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const enMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const enMonthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return [
            // Priority Formats (Based on user selection)
            { id: "DD/MM/YYYY", label: `${dd}/${mm}/${yBE}`, desc: "ตัวเลข (ทับ)" },
            { id: "TH-SHORT-DASH-YY", label: `${dd}-${thMonthsShort[m]}-${yyBE}`, desc: "ไทยย่อ ย่อปี (ขีด)" },
            { id: "EN-SHORT-DASH-YY", label: `${dd}-${enMonthsShort[m]}-${yyBE}`, desc: "Eng ย่อ ย่อปี (ขีด/พ.ศ.)" },

            // Numeric
            { id: "DD-MM-YYYY", label: `${dd}-${mm}-${yBE}`, desc: "ตัวเลข (ขีด)" },
            { id: "DD/MM/YY", label: `${dd}/${mm}/${yyBE}`, desc: "ตัวเลขย่อปี (ทับ)" },
            { id: "DD-MM-YY", label: `${dd}-${mm}-${yyBE}`, desc: "ตัวเลขย่อปี (ขีด)" },

            // Thai
            { id: "TH-FULL", label: `${dd} ${thMonthsFull[m]} ${yBE}`, desc: "ไทยเต็ม" },
            { id: "TH-FULL-YY", label: `${dd} ${thMonthsFull[m]} ${yyBE}`, desc: "ไทยเต็ม ย่อปี" },
            { id: "TH-SHORT", label: `${dd} ${thMonthsShort[m]} ${yBE}`, desc: "ไทยย่อ" },
            { id: "TH-SHORT-YY", label: `${dd} ${thMonthsShort[m]} ${yyBE}`, desc: "ไทยย่อ ย่อปี" },
            { id: "TH-FULL-DASH", label: `${dd}-${thMonthsFull[m]}-${yBE}`, desc: "ไทยเต็ม (ขีด)" },
            { id: "TH-SHORT-DASH", label: `${dd}-${thMonthsShort[m]}-${yBE}`, desc: "ไทยย่อ (ขีด)" },

            // English
            { id: "EN-FULL", label: `${dd} ${enMonthsFull[m]} ${yBE}`, desc: "Eng เต็ม (พ.ศ.)" },
            { id: "EN-SHORT", label: `${dd} ${enMonthsShort[m]} ${yBE}`, desc: "Eng ย่อ (พ.ศ.)" },
            { id: "EN-SHORT-YY", label: `${dd} ${enMonthsShort[m]} ${yyBE}`, desc: "Eng ย่อ ย่อปี (พ.ศ.)" },
            { id: "EN-FULL-DASH", label: `${dd}-${enMonthsFull[m]}-${yBE}`, desc: "Eng เต็ม (ขีด/พ.ศ.)" },
            { id: "EN-SHORT-DASH", label: `${dd}-${enMonthsShort[m]}-${yBE}`, desc: "Eng ย่อ (ขีด/พ.ศ.)" },

            // AD variants
            { id: "AD-EN-FULL", label: `${dd} ${enMonthsFull[m]} ${yAD}`, desc: "Eng เต็ม (ค.ศ.)" },
            { id: "AD-EN-SHORT-YY", label: `${dd} ${enMonthsShort[m]} ${yyAD}`, desc: "Eng ย่อ ย่อปี (ค.ศ.)" },
        ];
    }, [showLeadingZero]);

    const formatAssetDate = useCallback((dateStr: string | null) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const day = d.getDate();
        const month = d.getMonth();
        const yearAD = d.getFullYear();
        const yearBE = yearAD + 543;
        
        const dd = showLeadingZero ? String(day).padStart(2, '0') : String(day);
        const mm = showLeadingZero ? String(month + 1).padStart(2, '0') : String(month + 1);
        const yyBE = String(yearBE).slice(-2);
        const yyAD = String(yearAD).slice(-2);

        const thMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const thMonthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        const enMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const enMonthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        switch (selectedDateFormat) {
            // Numeric
            case "DD/MM/YYYY": return `${dd}/${mm}/${yearBE}`;
            case "DD-MM-YYYY": return `${dd}-${mm}-${yearBE}`;
            case "DD/MM/YY": return `${dd}/${mm}/${yyBE}`;
            case "DD-MM-YY": return `${dd}-${mm}-${yyBE}`;
            
            // Thai
            case "TH-FULL": return `${dd} ${thMonthsFull[month]} ${yearBE}`;
            case "TH-FULL-YY": return `${dd} ${thMonthsFull[month]} ${yyBE}`;
            case "TH-SHORT": return `${dd} ${thMonthsShort[month]} ${yearBE}`;
            case "TH-SHORT-YY": return `${dd} ${thMonthsShort[month]} ${yyBE}`;
            case "TH-FULL-DASH": return `${dd}-${thMonthsFull[month]}-${yearBE}`;
            case "TH-SHORT-DASH": return `${dd}-${thMonthsShort[month]}-${yearBE}`;
            case "TH-SHORT-DASH-YY": return `${dd}-${thMonthsShort[month]}-${yyBE}`;
            
            // English (BE)
            case "EN-FULL": return `${dd} ${enMonthsFull[month]} ${yearBE}`;
            case "EN-SHORT": return `${dd} ${enMonthsShort[month]} ${yearBE}`;
            case "EN-SHORT-YY": return `${dd} ${enMonthsShort[month]} ${yyBE}`;
            case "EN-FULL-DASH": return `${dd}-${enMonthsFull[month]}-${yearBE}`;
            case "EN-SHORT-DASH": return `${dd}-${enMonthsShort[month]}-${yearBE}`;
            case "EN-SHORT-DASH-YY": return `${dd}-${enMonthsShort[month]}-${yyBE}`;

            // AD
            case "AD-EN-FULL": return `${dd} ${enMonthsFull[month]} ${yearAD}`;
            case "AD-EN-SHORT-YY": return `${dd} ${enMonthsShort[month]} ${yyAD}`;
            
            default: return `${dd}/${mm}/${yearBE}`;
        }
    }, [selectedDateFormat, showLeadingZero]);

    // Filter Options Metadata
    const [departments, setDepartments] = useState<string[]>([]);
    const [availableFiscalYears, setAvailableFiscalYears] = useState<string[]>([]);

    const fileName = `รายงานครุภัณฑ์_${fiscalYear || "ทั้งหมด"}_${new Date().toISOString().split('T')[0]}`;
    const actualFileName = customFileName.trim() ? customFileName.trim() : fileName;

    const ALL_COLUMNS = useMemo(() => {
        const cols: any[] = [];
        STATIC_COLUMNS.forEach(col => {
            if (col.isGroup && col.id === "status_group") {
                ORDERED_STATUSES.forEach(s => {
                    cols.push({ id: `status_${s}`, label: s, isStatus: true, statusName: s });
                });
            } else {
                cols.push(col);
            }
        });
        return cols;
    }, []);

    // Fetch initial categories/metadata
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const [d] = await Promise.all([
                    fetch("/api/categories?type=department").then(r => r.json()),
                ]);
                setDepartments(d?.map((c: any) => c.name) || []);
            } catch (err) {
                console.error("Fetch categories error:", err);
            }
        };
        fetchCategories();
    }, []);

    const fetchMainData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: "10",
            });
            if (sortBy) params.set("sortBy", sortBy);
            if (sortOrder) params.set("sortOrder", sortOrder);
            if (assetType) params.set("assetType", assetType);
            if (fiscalYear) params.set("fiscalYear", fiscalYear);
            if (departmentFilter) params.set("department", departmentFilter);

            const res = await fetch(`/api/assets?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
                setTotal(data.total || data.assets?.length || 0);

                if (availableFiscalYears.length === 0 && data.assets?.length > 0) {
                    const years = [...new Set(data.assets.map((a: any) => a.fiscalYear).filter(Boolean))] as string[];
                    setAvailableFiscalYears(years.sort().reverse());
                }
            }
        } catch (err) {
            console.error("Fetch data error:", err);
            toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, [fiscalYear, assetType, departmentFilter, sortBy, sortOrder]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                (deptRef.current && !deptRef.current.contains(event.target as Node)) &&
                (typeRef.current && !typeRef.current.contains(event.target as Node)) &&
                (yearRef.current && !yearRef.current.contains(event.target as Node))
            ) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setLoading(true); // Show loading immediately when filters change
        const timer = setTimeout(() => {
            fetchMainData();
        }, 400); // Debounce
        return () => clearTimeout(timer);
    }, [fetchMainData]);

    // Modal Preview Fetching
    useEffect(() => {
        if (!isConfirmModalOpen || !modalSortOrder) return;
        const fetchModalPreview = async () => {
            setModalPreviewLoading(true);
            try {
                const params = new URLSearchParams({
                    limit: "5",
                    sortBy: "receivedDate",
                    sortOrder: modalSortOrder
                });
                if (assetType) params.set("assetType", assetType);
                if (fiscalYear) params.set("fiscalYear", fiscalYear);
                if (departmentFilter) params.set("department", departmentFilter);

                const res = await fetch(`/api/assets?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setModalPreviewAssets(data.assets || []);
                }
            } catch (err) {
                console.error("Modal preview error:", err);
            } finally {
                setModalPreviewLoading(false);
            }
        };
        fetchModalPreview();
    }, [isConfirmModalOpen, modalSortOrder, assetType, fiscalYear, departmentFilter]);

    const handleClearFilters = () => {
        setFiscalYear("");
        setAssetType("");
        setDepartmentFilter("");
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            if (sortOrder === "asc") {
                setSortOrder("desc");
            } else if (sortOrder === "desc") {
                // Third click: Reset to Initial state (None)
                setSortBy(null);
                setSortOrder(null);
            } else {
                setSortOrder("asc");
            }
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handleExport = async (sortOrderOverride: "asc" | "desc") => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ limit: "100000" });
            params.set("sortBy", "receivedDate");
            params.set("sortOrder", sortOrderOverride);

            if (assetType) params.set("assetType", assetType);
            if (fiscalYear) params.set("fiscalYear", fiscalYear);
            if (departmentFilter) params.set("department", departmentFilter);

            const res = await fetch(`/api/assets?${params}`);
            if (!res.ok) throw new Error("Export Fetch failed");

            const data = await res.json();
            const allAssets = data.assets || [];

            if (allAssets.length === 0) {
                toast.error("ไม่มีข้อมูลที่จะส่งออก");
                return;
            }

            // Map data
            const rows = allAssets.map((a: any, idx: number) => {
                const row: any = {};
                STATIC_COLUMNS.forEach(col => {
                    if (col.isGroup && col.id === "status_group") {
                        ORDERED_STATUSES.forEach(s => {
                            row[s] = a.status === s ? "✓" : "";
                        });
                    } else {
                        let val = a[col.id];
                        if (col.id === "receivedDate") val = formatAssetDate(a.receivedDate);
                        else if (col.id === "totalPrice") val = (a.quantity || 0) * (a.unitPrice || 0);
                        else if (col.id === "quantityWithUnit") val = `${a.quantity?.toLocaleString() || 0} ${a.unit || ""}`.trim();
                        else if (col.id === "unitPrice") val = a.unitPrice ? a.unitPrice.toLocaleString() : "0";
                        else if (col.id === "assetType") val = val === "durable" ? "คงทน" : val === "general" ? "ทั่วไป" : val;
                        row[col.label] = val ?? "";
                    }
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Assets Report");

            // Apply Styles & Alignment
            const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
            const headers = Object.keys(rows[0] || {});

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    const cell = ws[cell_ref];
                    if (!cell) continue;

                    if (!cell.s) cell.s = {};
                    if (!cell.s.alignment) cell.s.alignment = {};

                    if (R === 0) {
                        cell.s.alignment = { horizontal: "center", vertical: "center" };
                        cell.s.font = { bold: true };
                        cell.s.fill = { fgColor: { rgb: "F3F4F6" } };
                    } else {
                        const headerName = headers[C];
                        const isStatusCol = ORDERED_STATUSES.includes(headerName);

                        if (headerName === "ว/ด/ป ที่รับ" || headerName === "รหัสครุภัณฑ์" || headerName === "จำนวน" || headerName === "ประเภทเงิน" || headerName === "วิธีการได้มา" || headerName === "ใช้ประจำที่ไหน" || isStatusCol) {
                            cell.s.alignment = { horizontal: "center", vertical: "center" };
                        } else if (headerName === "ราคาต่อหน่วย" || headerName === "มูลค่ารวม") {
                            cell.s.alignment = { horizontal: "right", vertical: "center" };
                        } else {
                            cell.s.alignment = { horizontal: "left", vertical: "center" };
                        }
                    }
                }
            }

            // Auto-width
            const cols = headers.map(key => ({
                wch: Math.max(key.length * 2, 15)
            }));
            ws["!cols"] = cols;

            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([buf], { type: "application/octet-stream" });
            saveAs(blob, `${actualFileName}.xlsx`);

            toast.success(`ส่งออกสำเร็จ ${rows.length} รายการ`);
            setIsConfirmModalOpen(false);
            setModalSortOrder(null);
        } catch (err) {
            console.error("Export Error:", err);
            toast.error("เกิดข้อผิดพลาดในการส่งออก");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent -m-6 flex flex-col">

            <main className="flex-1 w-full px-10 pt-8 pb-5 flex flex-col gap-4">
                <div className="w-full bg-white rounded-xl border border-slate-200 relative z-10" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                    {/* ── Card Header ── */}
                    <div className="px-6 py-5 border-b border-slate-200 shrink-0">
                        <h1 className="text-[22px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight">ส่งออกข้อมูลครุภัณฑ์</h1>
                    </div>
                    {/* Top Section: Stats & Action */}
                    <div className="py-5 px-6 flex flex-col md:flex-row md:items-center gap-6">
                        {/* Left Side: Stats */}
                        <div className="flex items-center gap-5 flex-1">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                <TrendingUp size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest m-0 mb-1">รายการที่จะส่งออก</p>
                                <p className="text-2xl font-black text-slate-900 m-0">{total.toLocaleString()} <span className="text-sm font-medium text-slate-500 ml-1">รายการ</span></p>
                            </div>
                        </div>

                        {/* Vertical Divider */}
                        <div className="hidden md:block w-px h-16 bg-slate-200" />

                        {/* Right Side: Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1 justify-end">
                            <div className="flex flex-col gap-1.5 w-full sm:w-72">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ตั้งชื่อไฟล์ส่งออก (ถ้ามี)</label>
                                <input
                                    type="text"
                                    value={customFileName}
                                    onChange={e => setCustomFileName(e.target.value)}
                                    placeholder={fileName}
                                    className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[13px] font-medium text-slate-900 outline-none hover:border-blue-600 focus:border-blue-600 transition-all h-[44px]"
                                />
                            </div>
                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={loading || total === 0}
                                className="w-full sm:w-auto min-w-[170px] h-[44px] px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 mt-1 sm:mt-5 cursor-pointer"
                            >
                                <Download size={18} />
                                สร้างรายงาน Excel
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Bottom Section: Filters */}
                    <div className="p-4 px-6 bg-slate-50/50 rounded-b-xl">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Filter size={12} />
                                </div>
                                <h2 className="text-[12px] font-extrabold text-slate-700">ตัวกรองข้อมูลที่ต้องการ</h2>
                            </div>
                            <button onClick={handleClearFilters} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors cursor-pointer border-none bg-transparent">
                                ล้างตัวกรองทั้งหมด
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5" ref={deptRef}>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">หน่วยงาน/แผนก</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === "dept" ? null : "dept")}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-[13px] font-bold outline-none transition-all h-[44px] cursor-pointer",
                                            (activeDropdown === "dept" || departmentFilter)
                                                ? "border-blue-600 text-blue-600 shadow-sm"
                                                : "border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600"
                                        )}
                                    >
                                        <span className="truncate">{departmentFilter || "ทั้งหมดทุกหน่วยงาน"}</span>
                                        <ChevronDown size={14} className={cn("transition-transform duration-200", (activeDropdown === "dept" || departmentFilter) ? "text-blue-600" : "text-slate-400", activeDropdown === "dept" && "rotate-180")} />
                                    </button>

                                    {activeDropdown === "dept" && (
                                        <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                <button
                                                    onClick={() => { setDepartmentFilter(""); setActiveDropdown(null); }}
                                                    className={cn(
                                                        "flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                        departmentFilter === "" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-indigo-100/50 hover:text-blue-600"
                                                    )}
                                                >
                                                    ทั้งหมดทุกหน่วยงาน
                                                    {departmentFilter === "" && <Check size={14} strokeWidth={3} />}
                                                </button>
                                                {departments.map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => { setDepartmentFilter(d); setActiveDropdown(null); }}
                                                        className={cn(
                                                            "flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                            departmentFilter === d ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-indigo-100/50 hover:text-blue-600"
                                                        )}
                                                    >
                                                        {d}
                                                        {departmentFilter === d && <Check size={14} strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5" ref={typeRef}>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ประเภทครุภัณฑ์</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-[13px] font-bold outline-none transition-all h-[44px] cursor-pointer",
                                            (activeDropdown === "type" || assetType)
                                                ? "border-blue-600 text-blue-600 shadow-sm"
                                                : "border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600"
                                        )}
                                    >
                                        <span className="truncate">{assetType === "durable" ? "ครุภัณฑ์คงทน" : assetType === "general" ? "ครุภัณฑ์ทั่วไป" : "ทั้งหมดทุกประเภท"}</span>
                                        <ChevronDown size={14} className={cn("transition-transform duration-200", (activeDropdown === "type" || assetType) ? "text-blue-600" : "text-slate-400", activeDropdown === "type" && "rotate-180")} />
                                    </button>

                                    {activeDropdown === "type" && (
                                        <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                {[
                                                    { v: "", l: "ทั้งหมดทุกประเภท" },
                                                    { v: "durable", l: "ครุภัณฑ์คงทน" },
                                                    { v: "general", l: "ครุภัณฑ์ทั่วไป" }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.v}
                                                        onClick={() => { setAssetType(opt.v); setActiveDropdown(null); }}
                                                        className={cn(
                                                            "flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                            assetType === opt.v ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-indigo-100/50 hover:text-blue-600"
                                                        )}
                                                    >
                                                        {opt.l}
                                                        {assetType === opt.v && <Check size={14} strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5" ref={yearRef}>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ปีงบประมาณ</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === "year" ? null : "year")}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-[13px] font-bold outline-none transition-all h-[44px] cursor-pointer",
                                            (activeDropdown === "year" || fiscalYear)
                                                ? "border-blue-600 text-blue-600 shadow-sm"
                                                : "border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600"
                                        )}
                                    >
                                        <span className="truncate">{fiscalYear || "ทั้งหมดทุกปี"}</span>
                                        <ChevronDown size={14} className={cn("transition-transform duration-200", (activeDropdown === "year" || fiscalYear) ? "text-blue-600" : "text-slate-400", activeDropdown === "year" && "rotate-180")} />
                                    </button>

                                    {activeDropdown === "year" && (
                                        <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                <button
                                                    onClick={() => { setFiscalYear(""); setActiveDropdown(null); }}
                                                    className={cn(
                                                        "flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                        fiscalYear === "" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-indigo-100/50 hover:text-blue-600"
                                                    )}
                                                >
                                                    ทั้งหมดทุกปี
                                                    {fiscalYear === "" && <Check size={14} strokeWidth={3} />}
                                                </button>
                                                {(availableFiscalYears.length ? availableFiscalYears : ["2568"]).map(year => (
                                                    <button
                                                        key={year}
                                                        onClick={() => { setFiscalYear(year); setActiveDropdown(null); }}
                                                        className={cn(
                                                            "flex items-center justify-between w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                            fiscalYear === year ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-indigo-100/50 hover:text-blue-600"
                                                        )}
                                                    >
                                                        {year}
                                                        {fiscalYear === year && <Check size={14} strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Table Background (General) */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-2" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                        <TableIcon size={18} className="text-slate-400" />
                        <h2 className="text-sm font-extrabold text-slate-700">พรีวิวตารางข้อมูล (5 รายการแรก)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr className="bg-[#fafafa] border-b border-slate-200">
                                    <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">ลำดับ</th>
                                    {ALL_COLUMNS.map(col => {
                                        const isSortable = !col.isStatus;
                                        const align = getAlignment(col.id, !!col.isStatus);
                                        return (
                                            <th
                                                key={col.id}
                                                onClick={() => isSortable && handleSort(col.id)}
                                                className={`px-4 py-4 text-[11px] font-bold text-[#334155] uppercase tracking-wider whitespace-nowrap ${isSortable ? "cursor-pointer hover:bg-gray-100 hover:text-blue-500 transition-all select-none" : ""}`}
                                            >
                                                <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
                                                    {col.label}
                                                    {isSortable && (
                                                        sortBy === col.id ? (
                                                            sortOrder === "asc" ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
                                                        ) : (
                                                            <ArrowUpDown size={12} className="opacity-20" />
                                                        )
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="h-[45px]">
                                            <td className="px-4 py-3 text-center">
                                                <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto" />
                                            </td>
                                            {ALL_COLUMNS.map(col => (
                                                <td key={col.id} className="px-4 py-3">
                                                    <div className={`h-4 bg-slate-200 rounded animate-pulse ${getAlignment(col.id, !!col.isStatus) === "right" ? "ml-auto w-20" : getAlignment(col.id, !!col.isStatus) === "center" ? "mx-auto w-12" : "w-24"}`} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : assets.length === 0 ? (
                                    <tr><td colSpan={15} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>ไม่พบข้อมูลตามเงื่อนไขที่กำหนด</td></tr>
                                ) : (
                                    <>
                                        {assets.slice(0, 5).map((asset, idx) => (
                                            <PreviewRow key={asset.id} asset={asset} idx={idx} allColumns={ALL_COLUMNS} />
                                        ))}
                                        {/* Lock Height (Fixed 5 rows) */}
                                        {assets.length < 5 && [...Array(5 - assets.length)].map((_, i) => (
                                            <tr key={`empty-${i}`} className="h-[45px] border-b border-slate-200 last:border-0 pointer-events-none select-none">
                                                <td colSpan={ALL_COLUMNS.length + 1}></td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* THE COMPLEX EXPORT MODAL */}
                <AnimatePresence>
                    {isConfirmModalOpen && (
                        <div style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem"
                        }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsConfirmModalOpen(false)}
                                style={{
                                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                                    background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                style={{
                                    background: "white", borderRadius: "1rem", width: "100%", maxWidth: "1100px",
                                    border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh",
                                    position: "relative", zIndex: 1001
                                }}
                            >
                                <div style={{ padding: "1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>ยืนยันการส่งออกข้อมูล</h3>
                                    <button onClick={() => setIsConfirmModalOpen(false)} style={{ color: "#9ca3af", padding: "0.25rem", borderRadius: "0.5rem" }} className="hover:bg-gray-100 cursor-pointer">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
                                    {/* Row 1: File Info & Sorting */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                                        {/* Left Side: File Info */}
                                        <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                                            <div className="mb-4">
                                                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อไฟล์ส่งออก</p>
                                                <p className="text-[15px] font-bold text-slate-900 break-all m-0">{actualFileName}.xlsx</p>
                                            </div>
                                            <div className="pt-4 border-t border-slate-200">
                                                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">จำนวนข้อมูลที่จะส่งออก</p>
                                                <p className="text-2xl font-black text-blue-600 m-0">{total.toLocaleString()} <span className="text-sm font-bold text-slate-500 ml-1">รายการ</span></p>
                                            </div>
                                        </div>

                                        {/* Right Side: Sorting Options (Shrunk to match height) */}
                                        <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                                            <p className="text-[13px] font-extrabold text-slate-700 mb-5 flex items-center gap-2">
                                                <ArrowUpDown size={16} className="text-blue-600" /> การเรียงลำดับข้อมูล <span className="text-red-500">*</span>
                                            </p>
                                            <div className="flex flex-col gap-2.5">
                                                <button
                                                    onClick={() => setModalSortOrder("asc")}
                                                    className={`w-full p-3 rounded-xl border-2 flex items-center justify-between bg-white cursor-pointer group transition-all duration-200 hover:scale-[1.01] ${modalSortOrder === "asc" ? "border-blue-600 shadow-md" : "border-slate-200 bg-white"}`}
                                                >
                                                    <div className="text-left">
                                                        <p className={`text-[13px] font-bold m-0 transition-colors ${modalSortOrder === "asc" ? "text-blue-600" : "text-slate-600"}`}>เก่าที่สุดไปหาใหม่ที่สุด</p>
                                                    </div>
                                                    {modalSortOrder === "asc" && <Check size={18} className="text-blue-600" strokeWidth={3} />}
                                                </button>

                                                <button
                                                    onClick={() => setModalSortOrder("desc")}
                                                    className={`w-full p-3 rounded-xl border-2 flex items-center justify-between bg-white cursor-pointer group transition-all duration-200 hover:scale-[1.01] ${modalSortOrder === "desc" ? "border-blue-600 shadow-md" : "border-slate-200 bg-white"}`}
                                                >
                                                    <div className="text-left">
                                                        <p className={`text-[13px] font-bold m-0 transition-colors ${modalSortOrder === "desc" ? "text-blue-600" : "text-slate-600"}`}>ใหม่ที่สุดไปหาเก่าที่สุด</p>
                                                    </div>
                                                    {modalSortOrder === "desc" && <Check size={18} className="text-blue-600" strokeWidth={3} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Full Width Date Format Card */}
                                    <div className="mb-8">
                                        <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-6 mb-5">
                                                <p className="text-[13px] font-extrabold text-slate-700 flex items-center gap-2 m-0 shrink-0">
                                                    <Filter size={16} className="text-blue-600" /> รูปแบบวันที่ (วดป) <span className="text-red-500">*</span>
                                                </p>
                                                
                                                {/* Tabs Switcher - Moved to Left */}
                                                <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
                                                    <button
                                                        onClick={() => setShowLeadingZero(false)}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                                                            !showLeadingZero ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                        )}
                                                    >
                                                        ไม่มีเลข 0 นำหน้า
                                                    </button>
                                                    <button
                                                        onClick={() => setShowLeadingZero(true)}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                                                            showLeadingZero ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                                        )}
                                                    >
                                                        มีเลข 0 นำหน้า
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-5">
                                                {/* Group 1: Standard */}
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">รูปแบบมาตรฐาน</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                                                        {DATE_FORMATS.slice(0, 3).map(fmt => (
                                                            <button
                                                                key={fmt.id}
                                                                onClick={() => setSelectedDateFormat(fmt.id)}
                                                                className={cn(
                                                                    "p-3 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] cursor-pointer group flex flex-col justify-center",
                                                                    selectedDateFormat === fmt.id
                                                                        ? "bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-100"
                                                                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50/50"
                                                                )}
                                                            >
                                                                <p className="text-[14px] font-bold m-0 leading-tight tracking-tight whitespace-nowrap">{fmt.label}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider & Label */}
                                                <div className="flex items-center gap-4 py-1">
                                                    <div className="h-px bg-slate-200 flex-1" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">รูปแบบอื่นๆ</span>
                                                    <div className="h-px bg-slate-200 flex-1" />
                                                </div>

                                                {/* Group 2: Others */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                    {DATE_FORMATS.slice(3).map(fmt => (
                                                        <button
                                                            key={fmt.id}
                                                            onClick={() => setSelectedDateFormat(fmt.id)}
                                                            className={cn(
                                                                "p-2.5 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] cursor-pointer group flex flex-col justify-center",
                                                                selectedDateFormat === fmt.id
                                                                    ? "bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-100"
                                                                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50/50"
                                                            )}
                                                        >
                                                            <p className="text-[13px] font-bold m-0 leading-tight tracking-tight whitespace-nowrap">{fmt.label}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5-Item Preview Live Preview Table */}
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                                            <p style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                                                <TableIcon size={14} /> ตัวอย่างข้อมูล 5 ลำดับแรก (ตามการเรียงลำดับที่เลือก):
                                            </p>
                                            {modalPreviewLoading && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white custom-scrollbar">
                                            <table className="w-full text-[12px] border-collapse min-w-[1200px]">
                                                <thead className="bg-[#fafafa]">
                                                    <tr>
                                                        <th className="px-4 py-3 text-center text-[#334155] font-bold border-b border-slate-200">ลำดับ</th>
                                                        {ALL_COLUMNS.map(col => {
                                                            const align = getAlignment(col.id, !!col.isStatus);
                                                            return <th key={col.id} className="px-4 py-3 text-[#334155] font-bold border-b border-slate-200" style={{ textAlign: align as any }}>{col.label}</th>;
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody style={{ opacity: modalPreviewLoading ? 0.4 : 1, transition: "opacity 0.2s" }}>
                                                    {(modalPreviewAssets.length > 0 ? modalPreviewAssets : assets).slice(0, 5).map((a, i) => (
                                                        <PreviewRow key={a.id} asset={{ ...a, _formattedDate: formatAssetDate(a.receivedDate) } as any} idx={i} allColumns={ALL_COLUMNS} />
                                                    ))}
                                                    {/* Modal Preview Fixed 5 rows */}
                                                    {Math.min(modalPreviewAssets.length || assets.length, 5) < 5 && [...Array(5 - Math.min(modalPreviewAssets.length || assets.length, 5))].map((_, i) => (
                                                        <tr key={`modal-empty-${i}`} className="h-[38px] border-b border-slate-200 last:border-0">
                                                            <td colSpan={ALL_COLUMNS.length + 1}></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
                                    <button
                                        onClick={() => setIsConfirmModalOpen(false)}
                                        className="px-12 py-3 rounded-xl bg-white border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        disabled={!modalSortOrder || exporting}
                                        onClick={() => modalSortOrder && handleExport(modalSortOrder)}
                                        className={`px-12 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all shadow-md active:scale-95 ${modalSortOrder
                                            ? "bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            }`}
                                    >
                                        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                        {exporting ? "กำลังส่งออก..." : "ยืนยันและส่งออก Excel"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}