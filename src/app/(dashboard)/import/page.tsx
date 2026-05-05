"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    Upload, Download, ArrowLeft, CheckCircle2, AlertCircle,
    AlertTriangle, ChevronRight, ChevronLeft, FileSpreadsheet, Building2,
    ChevronDown, Check, Trash2, Eye, EyeOff, X, RefreshCw,
    Info, PackageCheck, ClipboardList, History, Settings2, Loader2,
    ArrowRightLeft, FileDown, SkipForward, RotateCcw, Plus, Calendar,
    Clock, MapPin, User, Users, Save, Filter, ShieldAlert, Package, PencilLine,
} from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import { ConfirmModal } from "@/components/ui/confirm-modal";

// Helpers for Thai date conversion
// Helpers for Thai date conversion
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const formatThaiDate = (d: Date | null | undefined) => {
    if (!d || isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yearBE = d.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
};

const parseThaiDate = (s: string) => {
    if (!s) return undefined;
    const parts = s.split("/");
    if (parts.length !== 3) return undefined;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y) return undefined;
    // ปี พ.ศ. -> ค.ศ.
    return new Date(y - 543, m - 1, d);
};

const ENG_MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const smartParseDate = (v: any, fiscalYear?: string): string => {
    if (!v) return "";

    // 1. If it's already a JS Date
    if (v instanceof Date) return formatThaiDate(v);

    // 2. If it's an Excel Serial Number (e.g. 45145)
    if (typeof v === "number" || (!isNaN(Number(v)) && String(v).length >= 5)) {
        const serial = Number(v);
        const date = new Date((serial - 25569) * 86400 * 1000);
        return formatThaiDate(date);
    }

    const s = String(v).trim();
    if (!s) return "";

    // 3. Robust parsing for DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY
    // Use regex to handle various separators: /, -, space, or even mixed
    let parts = s.split(/[\/\-\s\.]+/);
    if (parts.length === 3) {
        let [d, m, y] = parts;

        // Handle Month Abbreviations (Thai & English)
        if (isNaN(Number(m))) {
            const mLower = m.toLowerCase();
            // Try Thai first
            let mIdx = THAI_MONTHS_SHORT.findIndex(month => mLower.includes(month.replace(".", "")));
            // If not found, try English
            if (mIdx === -1) {
                mIdx = ENG_MONTHS_SHORT.findIndex(month => mLower.startsWith(month));
            }

            if (mIdx !== -1) m = String(mIdx + 1);
        }

        let day = parseInt(d);
        let month = parseInt(m);
        let year = parseInt(y);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return s;

        // Smart Year Guessing
        // If year is 2 digits (e.g., 42, 66), use the prefix from fiscal year if available
        if (year < 100) {
            if (fiscalYear && fiscalYear.length >= 2) {
                const prefix = fiscalYear.slice(0, 2); // e.g. "25"
                year = parseInt(prefix + String(year).padStart(2, '0'));
            } else {
                year += 2500; // Fallback
            }
        } else if (year < 2400) {
            // It's likely AD (e.g., 2023) -> Convert to BE
            year += 543;
        }

        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }

    return s;
};

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

// MapPicker — ssr: false
import type { MapPickerProps } from "@/components/map/map-picker";
const MapPicker = dynamic<MapPickerProps>(() => import("@/components/map/map-picker"), {
    ssr: false,
    loading: () => (
        <div className="h-[320px] bg-gray-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            กำลังโหลดแผนที่
        </div>
    ),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type DuplicateAction = "skip" | "update" | "new";

interface ImportRow {
    _rowIndex: number;
    order?: string | number;
    receivedDate?: string;
    name?: string;
    assetCode?: string;
    quantity?: string | number;
    unitPrice?: string | number;
    totalPrice?: string | number;
    moneyType?: string;
    acquisitionMethod?: string;
    location?: string;
    status?: string;
    assetType?: "general" | "durable";
    department?: string;
    fiscalYear?: string;
    unit?: string;
    locationDetail?: string;
    remark?: string;
    // extra fields (bulk-editable)
    receivedBy?: string;
    createdBy?: string;
    latitude?: number;
    longitude?: number;
    mapPinId?: string;
    // flags
    isDuplicateInFile?: boolean;
    isDuplicateInDB?: boolean;
    isDuplicate?: boolean;
    isIncomplete?: boolean;
    isSelected?: boolean;
    duplicateAction?: DuplicateAction;
    existingName?: string;
    originallyEmptyFields?: string[];
}

interface ImportHistory {
    id: string;
    fileName: string;
    importedAt: string;
    imported: number;
    skipped: number;
    updated: number;
    department: string;
}

interface Category { id: string; name: string; type: string; }

// ─── EXCEL COLUMN MAP ─────────────────────────────────────────────────────────
const SYSTEM_COLS = [
    { key: "receivedDate", label: "วันที่รับ | วันเดือนปีที่รับ | ว/ด/ป ที่รับ" },
    { key: "name", label: "ชื่อรายการ | รายการ | ชื่อครุภัณฑ์" },
    { key: "assetCode", label: "รหัสครุภัณฑ์" },
    { key: "quantity", label: "จำนวน" },
    { key: "unit", label: "หน่วย" },
    { key: "unitPrice", label: "ราคาต่อหน่วย" },
    { key: "totalPrice", label: "มูลค่ารวม" },
    { key: "moneyType", label: "ประเภทเงิน" },
    { key: "acquisitionMethod", label: "วิธีการได้มา" },
    { key: "location", label: "ใช้ประจำที่ไหน" },
    { key: "status", label: "สถานะ" },
] as const;
type SystemColKey = typeof SYSTEM_COLS[number]["key"] | "createdBy" | "receivedBy" | "remark" | "fiscalYear" | "isSelected" | "_rowIndex" | "originallyEmptyFields" | "isDuplicate" | "isIncomplete";

const DEFAULT_COL_MAP: Record<string, SystemColKey> = {
    "วันเดือนปีที่รับ": "receivedDate", "วันที่รับ": "receivedDate", "ว/ด/ป ที่รับ": "receivedDate",
    "รายการ": "name", "ชื่อครุภัณฑ์": "name", "ชื่อรายการ": "name",
    "รหัสครุภัณฑ์": "assetCode", "รหัส": "assetCode",
    "จำนวน": "quantity", "ราคาต่อหน่วย": "unitPrice", "ราคา/หน่วย": "unitPrice",
    "มูลค่ารวม": "totalPrice", "ราคารวม": "totalPrice",
    "ประเภทเงิน": "moneyType", "วิธีการได้มา": "acquisitionMethod", "วิธีได้มา": "acquisitionMethod",
    "ใช้ประจำที่ไหน": "location", "สถานที่": "location", "หน่วย": "unit", "หน่วยนับ": "unit",
    "จำนวน/หน่วย": "quantity", "จำนวน(หน่วย)": "quantity",
    "สถานะ": "status",
    "ใช้งานได้": "status", "ชำรุด": "status", "เสื่อมสภาพ": "status", "สูญหาย": "status", "ไม่จำเป็นต้องใช้ในราชการ": "status"
};

// ─── STEP BAR ─────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
    const steps = [
        { n: 1, label: "นำเข้าไฟล์" },
        { n: 2, label: "ตั้งค่าเริ่มต้น" },
        { n: 3, label: "จับคู่คอลัมน์" },
        { n: 4, label: "ตรวจสอบข้อมูล" },
        { n: 5, label: "นำเข้าสำเร็จ" },
    ];
    return (
        <div className="flex items-center gap-0">
            {steps.map((s, i) => (
                <div key={s.n} className="flex items-center">
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-300",
                        step === s.n ? "bg-[#0f172a] text-white shadow-md" :
                            step > s.n ? "text-emerald-600 bg-emerald-50 border border-emerald-200" :
                                "text-slate-400 bg-slate-50 border border-slate-200"
                    )}>
                        <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0",
                            step === s.n ? "bg-white/20" : step > s.n ? "bg-emerald-100" : "bg-slate-200"
                        )}>
                            {step > s.n ? <Check size={10} strokeWidth={3} /> : s.n}
                        </div>
                        <span className="whitespace-nowrap">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={cn("w-5 h-px mx-0.5", step > s.n ? "bg-emerald-300" : "bg-slate-200")} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── BULK EDIT PANEL ──────────────────────────────────────────────────────────
interface BulkEditPanelProps {
    selectedRows: ImportRow[];
    receivers: Category[];
    recorders: Category[];
    onApply: (patch: Partial<ImportRow>) => void;
    onSaveReceiver: (name: string) => Promise<void>;
    onSaveRecorder: (name: string) => Promise<void>;
}

function BulkEditPanel({ selectedRows, receivers, recorders, onApply, onSaveReceiver, onSaveRecorder }: BulkEditPanelProps) {
    const [receivedBy, setReceivedBy] = useState("");
    const [createdBy, setCreatedBy] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [mapPinId, setMapPinId] = useState("");
    const [showMap, setShowMap] = useState(false);
    const [showReceiverDD, setShowReceiverDD] = useState(false);
    const [showRecorderDD, setShowRecorderDD] = useState(false);
    const receiverRef = useRef<HTMLDivElement>(null);
    const recorderRef = useRef<HTMLDivElement>(null);

    const filteredReceivers = receivers.filter(r => r.name.toLowerCase().includes(receivedBy.toLowerCase()));
    const filteredRecorders = recorders.filter(r => r.name.toLowerCase().includes(createdBy.toLowerCase()));

    // Click outside handlers
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (receiverRef.current && !receiverRef.current.contains(e.target as Node)) setShowReceiverDD(false);
            if (recorderRef.current && !recorderRef.current.contains(e.target as Node)) setShowRecorderDD(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    const handleApply = () => {
        const patch: Partial<ImportRow> = {};
        if (receivedBy.trim()) patch.receivedBy = receivedBy.trim();
        if (createdBy.trim()) patch.createdBy = createdBy.trim();
        if (lat && lng) { patch.latitude = parseFloat(lat); patch.longitude = parseFloat(lng); }
        if (mapPinId) patch.mapPinId = mapPinId;
        if (Object.keys(patch).length === 0) { toast.error("ยังไม่ได้กรอกข้อมูลที่จะแก้ไข"); return; }
        onApply(patch);
        toast.success(`ใช้กับ ${selectedRows.length} รายการแล้ว`);
    };

    const inputCls = "w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300 shadow-sm";

    return (
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl px-5 py-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <Users size={13} className="text-blue-600" />
                </div>
                <p className="text-[13px] font-bold text-blue-800">
                    แก้ไขข้อมูลพร้อมกัน — {selectedRows.length} รายการที่เลือก
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* ผู้รับของ */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                        <User size={12} className="text-slate-400" />
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">ผู้รับของ</label>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                list="bulk-receivers-list"
                                value={receivedBy}
                                onChange={e => setReceivedBy(e.target.value)}
                                placeholder="พิมพ์หรือเลือก"
                                className={inputCls}
                            />
                            <datalist id="bulk-receivers-list">
                                {receivers.map(r => <option key={r.id} value={r.name} />)}
                            </datalist>
                        </div>
                        <button type="button" disabled={!receivedBy.trim() || receivers.some(r => r.name === receivedBy.trim())}
                            onClick={() => onSaveReceiver(receivedBy.trim())}
                            className="h-11 px-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm cursor-pointer">
                            <Save size={14} className="text-blue-500" />
                            <span>บันทึก</span>
                        </button>
                    </div>
                </div>

                {/* ผู้บันทึก */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                        <Users size={12} className="text-slate-400" />
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">ผู้บันทึก</label>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                list="bulk-recorders-list"
                                value={createdBy}
                                onChange={e => setCreatedBy(e.target.value)}
                                placeholder="พิมพ์หรือเลือก"
                                className={inputCls}
                            />
                            <datalist id="bulk-recorders-list">
                                {recorders.map(r => <option key={r.id} value={r.name} />)}
                            </datalist>
                        </div>
                        <button type="button" disabled={!createdBy.trim() || recorders.some(r => r.name === createdBy.trim())}
                            onClick={() => onSaveRecorder(createdBy.trim())}
                            className="h-11 px-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm cursor-pointer">
                            <Save size={14} className="text-blue-500" />
                            <span>บันทึก</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Map Pin */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">ปักหมุดตำแหน่งแผนที่</label>
                    <button type="button" onClick={() => setShowMap(v => !v)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-gray-50 text-[12px] font-semibold text-slate-500 transition-all">
                        <MapPin size={12} />
                        {showMap ? "ซ่อนแผนที่" : "เปิดแผนที่"}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1">ละติจูด</label>
                        <input type="number" className={inputCls} value={lat} placeholder="17.5371"
                            onChange={e => setLat(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1">ลองจิจูด</label>
                        <input type="number" className={inputCls} value={lng} placeholder="101.7178"
                            onChange={e => setLng(e.target.value)} />
                    </div>
                </div>

                {showMap && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 mb-2">
                        <MapPicker
                            height="320px"
                            latitude={lat ? parseFloat(lat) : undefined}
                            longitude={lng ? parseFloat(lng) : undefined}
                            mapPinId={mapPinId}
                            onLocationSelect={(la: number, lo: number, pinId?: string | null) => {
                                setLat(la.toFixed(6));
                                setLng(lo.toFixed(6));
                                setMapPinId(pinId || "");
                            }}
                        />
                    </div>
                )}

                {lat && lng && (
                    <div className="flex items-center gap-2 text-[12px] text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                        <MapPin size={12} />
                        <span className="font-semibold">พิกัดที่เลือก:</span>
                        <span>{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</span>
                    </div>
                )}
            </div>

            {/* Apply button */}
            <div className="flex justify-end pt-1">
                <button type="button" onClick={handleApply}
                    className="group relative flex items-center gap-2 h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-all shadow-md active:scale-[0.97] cursor-pointer">
                    <Check size={14} />
                    ใช้กับ {selectedRows.length} รายการที่เลือก
                </button>
            </div>
        </div>
    );
}

// ── Custom Dropdown Component ───────────────────────────────────────────
interface CustomSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    size?: string;
    onFocus?: () => void;
    onBlur?: (e: React.FocusEvent) => void;
    autoOpen?: boolean;
}

const CustomSelect = ({ value, onChange, options, placeholder = "เลือก", className, icon, size = "md", disabled, onFocus, onBlur, autoOpen = false }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(autoOpen);
    const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

    return (
        <div className={cn("relative", className)}>
            <Popover open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open && onBlur) {
                    setTimeout(() => onBlur({} as any), 100);
                }
            }}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        className={cn(
                            "w-full flex items-center justify-between rounded-full border transition-all shadow-sm outline-none",
                            disabled ? "cursor-not-allowed" : "cursor-pointer",
                            size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-[14px]",
                            isOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200 hover:border-slate-300",
                            value ? "text-slate-900 font-bold" : "text-slate-400 font-medium",
                            disabled ? "opacity-50 grayscale cursor-not-allowed bg-slate-50" : "bg-white"
                        )}
                    >
                        <div className="flex items-center gap-2 truncate">
                            {icon && <div className={cn(isOpen ? "text-blue-500" : "text-slate-400")}>{icon}</div>}
                            <span className="truncate">{selectedLabel}</span>
                        </div>
                        <ChevronDown size={size === "sm" ? 14 : 16} className={cn("text-slate-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                    </button>
                </PopoverTrigger>
                <AnimatePresence>
                    {isOpen && (
                        <PopoverContent
                            forceMount
                            asChild
                            className="p-1.5 bg-white border border-slate-200/60 rounded-xl z-80 w-(--radix-popover-trigger-width) min-w-[220px] data-[side=top]:shadow-[0_-12px_30px_-10px_rgba(0,0,0,0.15)] data-[side=bottom]:shadow-xl"
                            align="start"
                            sideOffset={8}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-0.5"
                            >
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            if (onBlur) onBlur({} as any);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-all text-left group cursor-pointer",
                                            value === opt.value
                                                ? "bg-blue-50 text-blue-600 font-bold"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-medium"
                                        )}
                                    >
                                        <span className="whitespace-nowrap">{opt.label}</span>
                                        {value === opt.value && <Check size={14} className="text-blue-600" />}
                                    </button>
                                ))}
                            </motion.div>
                        </PopoverContent>
                    )}
                </AnimatePresence>
            </Popover>
        </div>
    );
};

// ── Luxury Combobox Component (Search + Type) ────────────────────────────────
interface LuxuryComboboxProps {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    size?: "sm" | "md";
    icon?: React.ReactNode;
    disabled?: boolean;
    onSelect?: (val: string) => void;
    onFocus?: () => void;
    onBlur?: (e: React.FocusEvent) => void;
    autoOpen?: boolean;
}

export function LuxuryCombobox({
    value,
    onChange,
    onSelect,
    options,
    placeholder = "เลือกรายการ...",
    className,
    disabled = false,
    icon,
    size = "md",
    onFocus,
    onBlur,
    autoOpen = false
}: LuxuryComboboxProps) {
    const [isOpen, setIsOpen] = useState(autoOpen);
    const [search, setSearch] = useState(value);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, showAbove: false });
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputHeight = size === "sm" ? "h-9" : "h-11";

    const filteredOptions = options.filter(opt =>
        (opt.label || "").toLowerCase().includes((search || "").toLowerCase())
    );

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePos = () => {
                const rect = containerRef.current!.getBoundingClientRect();
                const dropdownMaxHeight = 260; // Approximate max height of dropdown
                const spaceBelow = window.innerHeight - rect.bottom;
                const showAbove = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;

                setCoords({
                    top: showAbove ? rect.top + window.scrollY : rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    showAbove
                });
            };
            updatePos();
            window.addEventListener('scroll', updatePos, true);
            window.addEventListener('resize', updatePos);
            return () => {
                window.removeEventListener('scroll', updatePos, true);
                window.removeEventListener('resize', updatePos);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                const portal = document.getElementById('portal-root-combo');
                if (!portal?.contains(e.target as Node)) {
                    setIsOpen(false);
                    if (onBlur) onBlur({} as any);
                }
            }
        };
        if (isOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen, onBlur]);

    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setSearch(value);
        }
    }, [value]);

    return (
        <div ref={containerRef}
            onClick={() => inputRef.current?.focus()}
            className={cn("relative w-full", className)}>
            <div className={cn("relative w-full flex items-center rounded-full transition-all border border-slate-200 shadow-sm",
                inputHeight,
                disabled ? "opacity-50 grayscale cursor-not-allowed bg-slate-50" : "bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 cursor-text")}>
                {icon && <div className="pl-3 text-slate-400 shrink-0">{icon}</div>}
                <input
                    ref={inputRef}
                    type="text"
                    disabled={disabled}
                    value={search}
                    placeholder={placeholder}
                    className={cn(
                        "flex-1 h-full px-3 text-[13px] bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-slate-300",
                        disabled ? "cursor-text" : "cursor-text",
                        search ? "text-slate-900 font-bold" : "text-slate-400 font-medium"
                    )}
                    onChange={e => {
                        const v = e.target.value;
                        setSearch(v);
                        onChange(v);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        if (onFocus) onFocus();
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            setIsOpen(false);
                            if (onSelect) onSelect(search);
                        }
                    }}
                />
                <ChevronDown
                    size={14}
                    className={cn("mr-3 text-slate-400 transition-transform duration-200 shrink-0 pointer-events-none", isOpen && "rotate-180")}
                />
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    id="portal-root-combo"
                    style={{
                        position: 'absolute',
                        top: coords.showAbove ? coords.top - 8 : coords.top + 8,
                        left: coords.left,
                        width: coords.width,
                        zIndex: 80,
                        transform: coords.showAbove ? 'translateY(-100%)' : 'none'
                    }}
                >
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: coords.showAbove ? 8 : -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: coords.showAbove ? 8 : -8, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={cn(
                                "p-1.5 bg-white border border-slate-200/60 rounded-xl flex flex-col gap-0.5 max-h-52 overflow-y-auto custom-scrollbar",
                                coords.showAbove
                                    ? "shadow-[0_-12px_30px_-10px_rgba(0,0,0,0.15)]" // Shadow goes UP
                                    : "shadow-xl" // Normal shadow goes DOWN
                            )}
                        >
                            {filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onChange(opt.value);
                                        if (onSelect) onSelect(opt.value);
                                        setSearch(opt.label);
                                        setIsOpen(false);
                                        if (onBlur) onBlur({} as any);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-all text-left cursor-pointer",
                                        value === opt.value
                                            ? "bg-blue-50 text-blue-600 font-semibold"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                                    )}
                                >
                                    <span className="whitespace-nowrap">{opt.label}</span>
                                    {value === opt.value && <Check size={13} className="text-blue-500 shrink-0" />}
                                </button>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </div>
    );
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Combobox({ value, onChange, options, placeholder, className, readOnly }: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    const filtered = options.filter(opt =>
        opt.toLowerCase().includes((search || value || "").toLowerCase())
    );

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const inputCls = "w-full h-9 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[13px] transition-all placeholder:text-slate-300";

    return (
        <div ref={ref} className={cn("relative", className)}>
            <div className="relative">
                <input type="text" value={value} placeholder={placeholder} readOnly={readOnly}
                    className={cn(inputCls, readOnly && "cursor-pointer select-none bg-slate-50/30")}
                    onClick={() => { if (readOnly) setOpen(!open); }}
                    onChange={e => { if (!readOnly) { onChange(e.target.value); setSearch(e.target.value); setOpen(true); } }}
                    onFocus={() => setOpen(true)} />
                <ChevronDown size={14} className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform pointer-events-none", open && "rotate-180")} />
            </div>
            {open && (filtered.length > 0 || search) && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
                        <button type="button"
                            onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                            className="w-full px-3 py-2 text-left text-[12px] font-bold text-rose-500 hover:bg-rose-50 transition-colors border-b border-slate-50 italic">
                            -- ไม่ระบุ (ล้างค่า) --
                        </button>
                        {filtered.length > 0 ? (
                            filtered.map((opt, i) => (
                                <button key={i} type="button"
                                    onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                                    className="w-full px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group cursor-pointer">
                                    {opt}
                                    {value === opt && <Check size={12} className="text-blue-500" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center">
                                <p className="text-[11px] text-slate-400 italic">ไม่พบรายชื่อ {!readOnly && "- พิมพ์เพื่อเพิ่มใหม่"}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface EditableCellProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    type?: string;
    isDate?: boolean;
    className?: string;
    isCombobox?: boolean;
    customSelectOptions?: { value: string; label: string }[];
    onFocus?: () => void;
    onBlur?: () => void;
}

const EditableCell = ({ value, onChange, placeholder, readOnly, type = "text", isDate, className, isCombobox, customSelectOptions, onFocus, onBlur }: EditableCellProps) => {
    const [editing, setEditing] = useState(!value && !readOnly);
    const [temp, setTemp] = useState(value);
    const [autoOpen, setAutoOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTemp(value);
        // Force editing if it's empty and not read-only
        if (!value && !readOnly) {
            setEditing(true);
            setAutoOpen(false); // Don't auto-open list for empty fields by default
        }
    }, [value, readOnly]);

    const handleBlur = (e: React.FocusEvent) => {
        // Only blur if the focus truly left the container
        if (containerRef.current?.contains(e.relatedTarget as Node)) return;

        // For dropdowns, we only auto-close if we're NOT currently interacting with the portal
        // But we always want to trigger the parent's onBlur to handle row state
        if (customSelectOptions) {
            // We'll let the component's internal logic handle the 'setEditing(false)' 
            // via its own click-outside handler to avoid portal conflicts.
            if (onBlur) onBlur();
            return;
        }

        onChange(temp);
        if (temp) setEditing(false);
        if (onBlur) onBlur();
    };

    const handleFinalSave = () => {
        onChange(temp);
        if (temp) setEditing(false);
        if (onBlur) onBlur();
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        const formatted = formatThaiDate(date);
        onChange(formatted);
        setTemp(formatted);
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onChange(temp);
            if (temp) setEditing(false);
        }
        if (e.key === "Escape") {
            setTemp(value);
            if (value) setEditing(false);
        }
    };

    const handleEnterEdit = () => {
        if (!readOnly) {
            setEditing(true);
            setAutoOpen(true);
            if (onFocus) onFocus();
            // Focus after re-render
            setTimeout(() => {
                const input = containerRef.current?.querySelector('input');
                if (input) (input as HTMLInputElement).focus();
            }, 0);
        }
    };

    if (!editing) {
        return (
            <div
                onClick={handleEnterEdit}
                className={cn(
                    "w-full h-9 px-3 flex items-center transition-colors group",
                    !readOnly ? "cursor-pointer hover:bg-slate-50" : "cursor-default",
                    !value && "text-slate-300 italic",
                    className
                )}
            >
                <span className="text-[13px] truncate flex-1">{value || placeholder || "คลิกเพื่อแก้ไข"}</span>
                {!readOnly && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                        <PencilLine size={8} />
                    </div>
                )}
            </div>
        );
    }

    if (customSelectOptions) {
        return (
            <div className="w-full h-9" ref={containerRef}>
                {isCombobox ? (
                    <LuxuryCombobox
                        value={temp}
                        onChange={v => {
                            setTemp(v);
                            onChange(v);
                        }}
                        onSelect={v => {
                            setTemp(v);
                            onChange(v);
                            if (v) setEditing(false);
                            if (onBlur) onBlur();
                        }}
                        options={customSelectOptions}
                        placeholder={placeholder}
                        size="sm"
                        className="bg-transparent"
                        onFocus={onFocus}
                        autoOpen={autoOpen}
                    />
                ) : (
                    <CustomSelect
                        value={temp}
                        onChange={v => {
                            setTemp(v);
                            onChange(v);
                            if (v) setEditing(false);
                            if (onBlur) onBlur();
                        }}
                        options={customSelectOptions}
                        placeholder={placeholder}
                        size="sm"
                        className="bg-transparent"
                        onFocus={onFocus}
                        autoOpen={autoOpen}
                    />
                )}
            </div>
        );
    }

    const handleDateInputChange = (v: string) => {
        let val = v.replace(/\D/g, "");
        if (val.length > 8) val = val.slice(0, 8);
        let formatted = val;
        if (val.length > 2) formatted = val.slice(0, 2) + "/" + val.slice(2);
        if (val.length > 4) formatted = formatted.slice(0, 5) + "/" + val.slice(4);
        setTemp(formatted);
        onChange(formatted);
    };

    if (isDate) {
        return (
            <div className="w-full h-9 relative group" ref={containerRef}>
                <input
                    type="text"
                    value={temp}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-full pl-3 pr-9 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300",
                        readOnly && "bg-slate-50/50 cursor-not-allowed opacity-60",
                        className
                    )}
                    onChange={e => handleDateInputChange(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                {!readOnly && (
                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all">
                                <Calendar size={14} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-10000" align="end" sideOffset={8}>
                            <UICalendar
                                mode="single"
                                selected={parseThaiDate(temp)}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-9" ref={containerRef}>
            <input
                type={type}
                value={temp}
                readOnly={readOnly}
                placeholder={placeholder}
                className={cn(
                    "w-full h-full px-3 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300",
                    readOnly && "bg-slate-50/50 cursor-not-allowed opacity-60",
                    className
                )}
                onChange={e => { setTemp(e.target.value); onChange(e.target.value); }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ImportPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState(1);
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState("");
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[][]>([]);
    const [colMapping, setColMapping] = useState<Record<string, SystemColKey | "">>({});
    const [defaults, setDefaults] = useState({
        assetType: "general" as "general" | "durable",
        status: "",
        moneyType: "",
        acquisitionMethod: "",
        location: "",
        department: "",
        fiscalYear: (new Date().getFullYear() + 543).toString(),
    });
    const [globalDupAction, setGlobalDupAction] = useState<DuplicateAction>("skip");
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [checkingDB, setCheckingDB] = useState(false);

    // filters step 4
    const [showDuplicates, setShowDuplicates] = useState(true);
    const [showIncomplete, setShowIncomplete] = useState(true);
    const [showNormal, setShowNormal] = useState(true);
    const [locationFilter, setLocationFilter] = useState(""); // filter by location column
    const [showLocationDD, setShowLocationDD] = useState(false);
    const locationDDRef = useRef<HTMLDivElement>(null);

    // categories
    const [departments, setDepartments] = useState<Category[]>([]);
    const [statuses, setStatuses] = useState<Category[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<Category[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Category[]>([]);
    const [receivers, setReceivers] = useState<Category[]>([]);
    const [recorders, setRecorders] = useState<Category[]>([]);
    const [units, setUnits] = useState<Category[]>([]);

    // import result
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState({ imported: 0, skipped: 0, updated: 0 });

    // Step 5 States
    const [step5Selection, setStep5Selection] = useState<Set<number>>(new Set());
    const [bulkRecorder, setBulkRecorder] = useState("");
    const [bulkRecipient, setBulkRecipient] = useState("");
    const [bulkNote, setBulkNote] = useState("");
    const [bulkStatus, setBulkStatus] = useState("");
    const [bulkMoneyType, setBulkMoneyType] = useState("");
    const [bulkMethod, setBulkMethod] = useState("");
    const [bulkLocation, setBulkLocation] = useState("");
    const [step5Filter, setStep5Filter] = useState<"all_rows" | "all_problems" | "dup" | "inc">("all_rows");
    const [step5SubFilter, setStep5SubFilter] = useState<string>("all");
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [showDupErrorModal, setShowDupErrorModal] = useState(false);
    const [showIncompleteErrorModal, setShowIncompleteErrorModal] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmType, setDeleteConfirmType] = useState<"step4" | "step5">("step4");
    const [showTemplateDD, setShowTemplateDD] = useState(false);
    const templateDDRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

    const scrollToColumn = (colId: string) => {
        const el = document.getElementById(`col-head-${colId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    // Auto-sync bulk actions with defaults when entering step 4
    useEffect(() => {
        if (step === 4) {
            if (!bulkStatus) setBulkStatus(defaults.status);
            if (!bulkMoneyType) setBulkMoneyType(defaults.moneyType);
            if (!bulkMethod) setBulkMethod(defaults.acquisitionMethod);
            if (!bulkLocation) setBulkLocation(defaults.location);
        }
    }, [step, defaults]);

    // history
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<ImportHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // computed
    const dupInFileRows = rows.filter(r => r.isDuplicateInFile);
    const dupInDBRows = rows.filter(r => r.isDuplicateInDB && !r.isDuplicateInFile);
    const incompleteRows = rows.filter(r => r.isIncomplete);
    const normalRows = rows.filter(r => !r.isDuplicate && !r.isIncomplete);
    const selectedRows = rows.filter(r => r.isSelected);
    const rowsToImport = rows.filter(r => !r.isSelected);

    const getRowColor = (r: ImportRow) => {
        if (r.isDuplicate) return { bg: "bg-red-50/80", border: "border-l-4 border-l-red-500", text: "text-red-700" };
        if (r.isIncomplete) return { bg: "bg-amber-50/80", border: "border-l-4 border-l-amber-500", text: "text-amber-700" };
        return { bg: "bg-emerald-50/80", border: "border-l-4 border-l-emerald-500", text: "text-emerald-700" };
    };

    // unique locations from rows
    const uniqueLocations = useMemo(() => {
        const locs = [...new Set(rows.map(r => r.location).filter(Boolean))] as string[];
        return locs.sort();
    }, [rows]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (locationDDRef.current && !locationDDRef.current.contains(e.target as Node))
                setShowLocationDD(false);
            if (templateDDRef.current && !templateDDRef.current.contains(e.target as Node))
                setShowTemplateDD(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // fetch all categories
    useEffect(() => {
        Promise.all([
            fetch("/api/categories?type=department").then(r => r.json()),
            fetch("/api/categories?type=status").then(r => r.json()),
            fetch("/api/categories?type=money_type").then(r => r.json()),
            fetch("/api/categories?type=acquisition_method").then(r => r.json()),
            fetch("/api/categories?type=location").then(r => r.json()),
            fetch("/api/categories?type=recipient").then(r => r.json()),
            fetch("/api/categories?type=recorder").then(r => r.json()),
            fetch("/api/categories?type=unit").then(r => r.json()),
        ]).then(([d, s, m, a, l, r, rec, u]) => {
            setDepartments(d); setStatuses(s); setMoneyTypes(m);
            setAcquisitionMethods(a); setLocations(l); setReceivers(r); setRecorders(rec);
            setUnits(u);
        }).catch(console.error);
    }, []);

    // fetch history
    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch("/api/assets/import/history");
            if (res.ok) setHistory(await res.json());
        } catch { console.error("fetch history failed"); }
        finally { setLoadingHistory(false); }
    }, []);

    // ── parse excel ──────────────────────────────────────────────────────────
    const parseExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: "array", cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
                let headerIdx = 0;
                for (let i = 0; i < Math.min(8, json.length); i++) {
                    const matches = (json[i] || []).filter((c: any) => DEFAULT_COL_MAP[String(c || "").trim()]);
                    if (matches.length >= 2) { headerIdx = i; break; }
                }
                const headers = (json[headerIdx] || []).map((c: any) => String(c || "").trim()).filter(Boolean);
                const dataRows = json.slice(headerIdx + 1).filter(row => row.some((c: any) => c !== "" && c !== null && c !== undefined));
                setRawHeaders(headers);
                setRawData(dataRows);
                setFileName(file.name);
                const autoMap: Record<string, SystemColKey | ""> = {};
                headers.forEach(h => { autoMap[h] = DEFAULT_COL_MAP[h] || ""; });
                setColMapping(autoMap);
                toast.success(`โหลดสำเร็จ — พบ ${dataRows.length} แถว`);
                setStep(2);
            } catch { toast.error("ไม่สามารถอ่านไฟล์ได้"); }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFile = (file: File) => {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error("รองรับเฉพาะ .xlsx, .xls, .csv"); return; }
        handleFileLogic(file);
    };

    const handleFileLogic = (file: File) => {
        parseExcel(file);
    };

    // ── apply mapping → rows ─────────────────────────────────────────────────
    const applyMappingAndDefaults = async () => {
        const parsed: ImportRow[] = rawData.map((row, idx) => {
            const obj: ImportRow = { _rowIndex: idx + 1, isSelected: false, originallyEmptyFields: [] };
            let statusTickedCount = 0;
            let foundStatus = "";

            rawHeaders.forEach((h, i) => {
                const sysKey = colMapping[h];
                if (!sysKey) return;
                const val = row[i] !== undefined ? row[i] : ""; // Keep original type for date parsing
                if (sysKey === "receivedDate") {
                    obj.receivedDate = smartParseDate(val, defaults.fiscalYear);
                } else if (sysKey === "status") {
                    const sVal = String(val).trim();
                    if (sVal !== "") {
                        // If it's a matrix (tick), use header name. If it's text, use the text value.
                        if (sVal === "1" || sVal === "✓" || sVal.toLowerCase() === "true" || sVal === "ตกลง") {
                            statusTickedCount++;
                            if (!foundStatus) foundStatus = h;
                        } else {
                            obj.status = sVal === "ปกติ" ? "ใช้งานได้" : sVal;
                        }
                    }
                } else if (sysKey === "quantity") {
                    const sVal = String(val).trim();
                    const match = sVal.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
                    if (match) {
                        obj.quantity = match[1];
                        if (match[2] && !obj.unit) obj.unit = match[2];
                    } else {
                        obj.quantity = sVal;
                    }
                } else if (sysKey === "unit") {
                    obj.unit = String(val).trim();
                } else if (sysKey === "unitPrice") {
                    obj.unitPrice = String(val).trim();
                } else if (sysKey === "totalPrice") {
                    obj.totalPrice = String(val).trim();
                } else {
                    (obj as any)[sysKey] = String(val).trim();
                }
            });

            // Consolidate findings
            obj.status = statusTickedCount === 1 ? foundStatus : "";
            if (!obj.assetType) obj.assetType = defaults.assetType;
            if (!obj.department) obj.department = defaults.department;
            obj.fiscalYear = defaults.fiscalYear;
            if (!obj.status && defaults.status) obj.status = defaults.status;
            if (!obj.moneyType && defaults.moneyType) obj.moneyType = defaults.moneyType;
            if (!obj.acquisitionMethod && defaults.acquisitionMethod) obj.acquisitionMethod = defaults.acquisitionMethod;
            if (!obj.location && defaults.location) obj.location = defaults.location;

            // Auto-calculate Total Price if missing but quantity and unitPrice exist
            if (!obj.totalPrice) {
                const q = parseFloat(String(obj.quantity || 0));
                const p = parseFloat(String(obj.unitPrice || 0));
                if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
                    obj.totalPrice = String(q * p);
                }
            }

            // Final Check: Only fields that are TRULY EMPTY at this point are editable
            const fields = [
                "receivedDate", "name", "assetCode", "quantity", "unitPrice", "totalPrice",
                "moneyType", "acquisitionMethod", "location", "unit", "status", "createdBy", "receivedBy", "remark", "fiscalYear"
            ];
            fields.forEach(f => {
                const val = (obj as any)[f];
                if (val === undefined || val === null || val === "") {
                    if (!obj.originallyEmptyFields?.includes(f)) obj.originallyEmptyFields?.push(f);
                }
            });

            return obj;
        });
        const cc: Record<string, number> = {};
        parsed.forEach(r => { if (r.assetCode) cc[r.assetCode] = (cc[r.assetCode] || 0) + 1; });
        const withFlags = parsed.map(r => ({
            ...r,
            isDuplicateInFile: !!(r.assetCode && cc[r.assetCode] > 1),
            isIncomplete: !r.name || !r.assetCode || !r.receivedDate || !r.location || !r.status || !r.unit || !r.createdBy || !r.receivedBy || !r.remark,
            isDuplicate: !!(r.assetCode && cc[r.assetCode] > 1),
            duplicateAction: globalDupAction,
        }));
        setRows(withFlags);
        setStep(4); // Transition to Review (Step 4)
        // check DB
        const codes = [...new Set(withFlags.map(r => r.assetCode).filter(Boolean))];
        if (codes.length > 0) {
            setCheckingDB(true);
            try {
                const res = await fetch("/api/assets/check-codes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ codes }),
                });
                if (res.ok) {
                    const { duplicates } = await res.json() as { duplicates: { code: string; name: string }[] };
                    const dupMap: Record<string, string> = {};
                    duplicates.forEach((d: { code: string; name: string }) => { dupMap[d.code] = d.name; });
                    setRows(prev => prev.map(r => ({
                        ...r,
                        isDuplicateInDB: !!(r.assetCode && dupMap[r.assetCode]),
                        existingName: r.assetCode ? dupMap[r.assetCode] : undefined,
                        isDuplicate: !!(r.isDuplicateInFile || (r.assetCode && dupMap[r.assetCode])),
                    })));
                }
            } catch { toast.error("ไม่สามารถตรวจสอบรหัสซ้ำได้"); }
            finally { setCheckingDB(false); }
        }
    };

    // ── bulk edit apply ──────────────────────────────────────────────────────
    const handleBulkApply = (patch: Partial<ImportRow>) => {
        setRows(prev => prev.map(r => r.isSelected ? { ...r, ...patch } : r));
    };

    // ── download template ────────────────────────────────────────────────────
    const downloadTemplate = (type: "normal" | "bulk" | "status" | "status_unit" = "normal") => {
        let headers = ["วันเดือนปีที่รับ", "รายการ", "รหัสครุภัณฑ์", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "มูลค่ารวม", "ประเภทเงิน", "วิธีการได้มา", "ใช้ประจำที่ไหน", "สถานะ"];

        let exampleRows: any[][] = [];
        let filename = "";

        if (type === "normal") {
            headers = headers.filter(h => h !== "หน่วย");
            exampleRows = [["01/01/2568", "คอมพิวเตอร์เดสก์ท็อป", "AMS-001", "1 เครื่อง", "25000", "25000", "งบประมาณ", "ตกลงราคา", "ห้องคอมพิวเตอร์", "ใช้งานได้"]];
            filename = "template_import_normal.xlsx";
        } else if (type === "bulk") {
            exampleRows = [["01/01/2568", "เก้าอี้สำนักงาน", "CHAIR-001", "10", "ตัว", "1500", "15000", "งบประมาณ", "ตกลงราคา", "ห้องประชุม", "ใช้งานได้"]];
            filename = "template_import_split_qty_unit.xlsx";
        } else if (type === "status") {
            // แบบระบุสถานะ 5 คอลัมน์ + รวมจำนวน/หน่วย
            headers = headers.filter(h => h !== "สถานะ" && h !== "จำนวน" && h !== "หน่วย");
            headers.splice(3, 0, "จำนวน");
            headers.push("ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "สูญหาย", "ไม่จำเป็นต้องใช้ในราชการ");
            exampleRows = [
                ["01/01/2568", "เครื่องปรับอากาศ", "AC-001", "1 เครื่อง", "35000", "35000", "งบประมาณ", "ตกลงราคา", "ห้องทำงาน", "1", "", "", "", ""],
                ["01/01/2568", "ตู้เอกสารเหล็ก", "CAB-002", "1 ใบ", "4500", "45000", "งบประมาณ", "ตกลงราคา", "ห้องพัสดุ", "", "1", "", "", ""]
            ];
            filename = "template_import_status_matrix.xlsx";
        } else if (type === "status_unit") {
            // แบบแยกสถานะและหน่วย (Super Matrix - Optimized)
            headers = headers.filter(h => h !== "สถานะ" && h !== "หน่วย");
            // Insert 'หน่วย' after 'จำนวน' (which is at index 3)
            headers.splice(4, 0, "หน่วย");
            headers.push("ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "สูญหาย", "ไม่จำเป็นต้องใช้ในราชการ");
            exampleRows = [
                ["01/01/2568", "คอมพิวเตอร์", "PC-001", "1", "เครื่อง", "25000", "25000", "งบประมาณ", "ตกลงราคา", "ห้องสมุด", "1", "", "", "", ""],
                ["01/01/2568", "โต๊ะทำงาน", "TABLE-002", "1", "ตัว", "4500", "45000", "งบประมาณ", "ตกลงราคา", "สำนักงาน", "1", "", "", "", ""]
            ];
            filename = "template_import_super_matrix.xlsx";
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
        ws["!cols"] = headers.map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // ถ้าเป็นแบบสถานะ ให้เพิ่ม Sheet คู่มือสถานะ
        if (type === "status") {
            const statusGuideHeaders = ["รายการสถานะที่รองรับ", "คำอธิบาย"];
            const statusGuideRows = [
                ["ใช้งานได้", "ครุภัณฑ์อยู่ในสภาพสมบูรณ์ พร้อมใช้งาน"],
                ["ชำรุด", "ครุภัณฑ์เสียหายเล็กน้อย ยังซ่อมแซมได้"],
                ["เสื่อมสภาพ", "ครุภัณฑ์หมดอายุการใช้งาน หรือไม่คุ้มค่าที่จะซ่อม"],
                ["สูญหาย", "ครุภัณฑ์ไม่อยู่ในสถานที่ครอบครอง"],
                ["ไม่จำเป็นต้องใช้ในราชการ", "ครุภัณฑ์ที่จำหน่ายออกจากบัญชี หรืออยู่นอกเหนือการควบคุม"]
            ];
            const wsGuide = XLSX.utils.aoa_to_sheet([statusGuideHeaders, ...statusGuideRows]);
            wsGuide["!cols"] = [{ wch: 30 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, wsGuide, "Status_Guide");
        }

        XLSX.writeFile(wb, filename);
        const labelMap = {
            normal: "แบบมาตรฐาน",
            bulk: "แบบแยกจำนวนและหน่วย",
            status: "แบบแยกสถานะ",
            status_unit: "แบบแยกสถานะและหน่วย"
        };
        const label = labelMap[type];
        toast.success(`ดาวน์โหลดเทมเพลต (${label}) สำเร็จ`);
        setShowTemplateDD(false);
    };

    // ── select by location ───────────────────────────────────────────────────
    const selectByLocation = (loc: string) => {
        setLocationFilter(loc);
        setRows(prev => prev.map(r => ({ ...r, isSelected: loc === "" ? false : r.location === loc })));
        setShowLocationDD(false);
    };

    const selectAll = () => setRows(prev => prev.map(r => ({ ...r, isSelected: true })));
    const deselectAll = () => setRows(prev => prev.map(r => ({ ...r, isSelected: false })));
    const toggleSelect = (idx: number) => setRows(prev => prev.map(r => r._rowIndex === idx ? { ...r, isSelected: !r.isSelected } : r));

    const executeDeleteSelected = () => {
        setRows(prev => {
            const remaining = prev.filter(r => !r.isSelected);
            const cc: Record<string, number> = {};
            remaining.forEach(r => { if (r.assetCode) cc[r.assetCode] = (cc[r.assetCode] || 0) + 1; });
            return remaining.map(r => ({ ...r, isDuplicateInFile: !!(r.assetCode && cc[r.assetCode] > 1), isDuplicate: !!(r.isDuplicateInDB || (r.assetCode && cc[r.assetCode] > 1)) }));
        });
        setLocationFilter("");
        setDeleteConfirmOpen(false);
        toast.success("ลบรายการที่เลือกแล้ว");
    };

    const deleteSelected = () => {
        if (selectedRows.length === 0) { toast.error("กรุณาเลือกรายการที่ต้องการลบ"); return; }
        setDeleteConfirmType("step4");
        setDeleteConfirmOpen(true);
    };

    const setRowDupAction = (idx: number, action: DuplicateAction) =>
        setRows(prev => prev.map(r => r._rowIndex === idx ? { ...r, duplicateAction: action } : r));

    const applyGlobalDupAction = (action: DuplicateAction) => {
        setGlobalDupAction(action);
        setRows(prev => prev.map(r => r.isDuplicate ? { ...r, duplicateAction: action } : r));
    };

    // ── save receiver / recorder ─────────────────────────────────────────────
    const saveReceiver = async (name: string) => {
        try {
            const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: "recipient" }) });
            if (res.ok) { const nr = await res.json(); setReceivers(p => [...p, nr].sort((a, b) => a.name.localeCompare(b.name))); toast.success("บันทึกรายชื่อสำเร็จ"); }
            else { toast.error("ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
    };

    const saveRecorder = async (name: string) => {
        try {
            const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type: "recorder" }) });
            if (res.ok) { const nr = await res.json(); setRecorders(p => [...p, nr].sort((a, b) => a.name.localeCompare(b.name))); toast.success("บันทึกรายชื่อสำเร็จ"); }
            else { toast.error("ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
    };




    // ── import ───────────────────────────────────────────────────────────────
    const handleImport = async () => {
        const dups = rows.filter(r => r.isDuplicate);
        if (dups.length > 0) {
            setShowDupErrorModal(true);
            return;
        }

        const toImport = rows.filter(r => !r.isSelected);
        if (!toImport.length) { toast.error("ไม่มีรายการที่จะนำเข้า"); return; }
        setImporting(true);
        try {
            const payload = toImport.map(r => ({
                assetCode: r.assetCode || "",
                name: r.name || "",
                receivedDate: r.receivedDate || null,
                quantity: parseFloat(String(r.quantity || "1").replace(/,/g, "")) || 1,
                unitPrice: parseFloat(String(r.unitPrice || "0").replace(/,/g, "")) || 0,
                moneyType: r.moneyType || null,
                acquisitionMethod: r.acquisitionMethod || null,
                location: r.location || null,
                unit: r.unit || null,
                status: r.status || null,
                department: defaults.department || null,
                assetType: defaults.assetType,
                receivedBy: r.receivedBy || null,
                createdBy: r.createdBy || null,
                latitude: r.latitude || null,
                longitude: r.longitude || null,
                remark: r.remark || null,
                fiscalYear: defaults.fiscalYear,
                duplicateAction: globalDupAction,
            }));
            const res = await fetch("/api/assets/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assets: payload, fileName, department: defaults.department }),
            });
            if (res.ok) {
                const data = await res.json();
                setImportResult({ imported: data.imported || 0, skipped: data.skipped || 0, updated: data.updated || 0 });
                fetchHistory(); // Refresh history
                setStep(5); // Transition to Result (Step 5)
                toast.success("นำเข้าข้อมูลสำเร็จ!");
            } else { const d = await res.json(); toast.error(d.error || "เกิดข้อผิดพลาด"); }
        } catch { toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
        finally { setImporting(false); }
    };

    const resetAll = () => {
        setStep(1); setRows([]); setFileName(""); setRawHeaders([]); setRawData([]);
        setColMapping({}); setImportResult({ imported: 0, skipped: 0, updated: 0 });
        setLocationFilter(""); deselectAll();
    };

    const formatNum = (v?: string | number) => {
        if (v === undefined || v === null || v === "") return "—";
        const n = parseFloat(String(v).replace(/,/g, ""));
        return isNaN(n) ? String(v) : new Intl.NumberFormat("th-TH").format(n);
    };

    const unmappedRequired = ["name", "assetCode"].filter(k => !Object.values(colMapping).includes(k as SystemColKey));

    const visibleRows = rows.filter(r => {
        if (locationFilter && r.location !== locationFilter) return false;
        if ((r.isDuplicateInFile || r.isDuplicateInDB) && !showDuplicates) return false;
        if (r.isIncomplete && !r.isDuplicate && !showIncomplete) return false;
        if (!r.isDuplicate && !r.isIncomplete && !showNormal) return false;
        return true;
    });

    const selectCls = "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-blue-400 transition-all";

    const canPrev = step > 1 && step < 5;
    const canNext = (step === 2 && !!defaults.department && !!defaults.fiscalYear) ||
        (step === 3 && Object.values(colMapping).filter(v => v !== "").length >= 2) ||
        (step === 4 && !importing);

    const prevStep = () => { if (canPrev) setStep(step - 1); };
    const nextStep = () => {
        if (step === 2) setStep(3);
        else if (step === 3) applyMappingAndDefaults();
        else if (step === 4) handleImport();
    };

    const applyBulkStep5 = () => {
        const count = step5Selection.size;
        if (count === 0) { toast.error("กรุณาเลือกรายการที่ต้องการแก้ไข"); return; }

        setRows(prev => prev.map(r => {
            if (step5Selection.has(r._rowIndex)) {
                const canEdit = (k: string) => !r.originallyEmptyFields || r.originallyEmptyFields.includes(k);
                const next = {
                    ...r,
                    createdBy: (bulkRecorder && canEdit("createdBy")) ? bulkRecorder : r.createdBy,
                    receivedBy: (bulkRecipient && canEdit("receivedBy")) ? bulkRecipient : r.receivedBy,
                    remark: (bulkNote && canEdit("remark")) ? bulkNote : r.remark,
                    status: (bulkStatus && canEdit("status")) ? bulkStatus : r.status,
                    moneyType: (bulkMoneyType && canEdit("moneyType")) ? bulkMoneyType : r.moneyType,
                    acquisitionMethod: (bulkMethod && canEdit("acquisitionMethod")) ? bulkMethod : r.acquisitionMethod,
                    location: (bulkLocation && canEdit("location")) ? bulkLocation : r.location,
                };
                // Re-calculate isIncomplete for the row
                next.isIncomplete = !next.name || !next.assetCode || !next.receivedDate || !next.location || !next.status || !next.unit || !next.createdBy || !next.receivedBy || !next.remark;
                return next;
            }
            return r;
        }));

        setStep5Selection(new Set());
        setBulkRecorder(""); setBulkRecipient(""); setBulkNote("");
        setBulkStatus(""); setBulkMoneyType(""); setBulkMethod(""); setBulkLocation("");
        toast.success(`อัปเดตข้อมูล ${count} รายการเรียบร้อยแล้ว`);
    };

    const executeDeleteStep5Selected = () => {
        if (step5Selection.size === 0) return;
        setRows(prev => prev.filter(r => !step5Selection.has(r._rowIndex)));
        setStep5Selection(new Set());
        setDeleteConfirmOpen(false);
        toast.success(`ลบรายการที่เลือกเรียบร้อย`);
    };

    const deleteStep5Selected = () => {
        if (step5Selection.size === 0) { toast.error("กรุณาเลือกรายการที่ต้องการลบ"); return; }
        setDeleteConfirmType("step5");
        setDeleteConfirmOpen(true);
    };

    const toggleStep5Row = (idx: number) => {
        setStep5Selection(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleStep5All = (visibleRows: ImportRow[]) => {
        if (step5Selection.size === visibleRows.length) {
            setStep5Selection(new Set());
        } else {
            setStep5Selection(new Set(visibleRows.map(r => r._rowIndex)));
        }
    };


    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-100 -m-6 page-import">

            {/* ══ Navbar ═══════════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-90 bg-[#ffffff] border-b border-[#cbd5e1] flex items-center shrink-0" style={{ minHeight: "80px" }}>
                <div className="w-full px-10 flex items-center gap-4 relative">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col">
                            <h1 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight">นำเข้าข้อมูลครุภัณฑ์</h1>
                        </div>
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="pointer-events-auto">
                            <StepBar step={step} />
                        </div>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2.5 shrink-0">

                        <button onClick={() => { setShowHistory(v => !v); if (!showHistory) fetchHistory(); }}
                            className={cn("group flex items-center gap-2 h-9 px-4 rounded-lg border text-[12px] font-semibold transition-all shadow-sm active:scale-95 cursor-pointer",
                                showHistory ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500")}>
                            <History size={14} /> ประวัติ
                        </button>
                        <div className="relative" ref={templateDDRef}>
                            <button onClick={() => setShowTemplateDD(!showTemplateDD)} className="group flex items-center gap-2 h-9 px-4 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[12px] font-bold text-amber-600 transition-all shadow-sm active:scale-95 cursor-pointer">
                                <FileDown size={14} className="text-amber-500 mr-1" />
                                เทมเพลต
                                <ChevronDown size={12} className={cn("ml-1.5 transition-transform", showTemplateDD && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {showTemplateDD && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-100"
                                    >
                                        <button onClick={() => downloadTemplate("normal")} className="w-full flex flex-col items-start p-2.5 rounded-lg hover:bg-amber-50 transition-colors text-left group cursor-pointer">
                                            <span className="text-[13px] font-bold text-slate-700">1. แบบมาตรฐาน</span>
                                            <span className="text-[11px] text-slate-400 font-medium">(ตัดคอลัมน์หน่วยออก / รวมในช่องจำนวน)</span>
                                        </button>
                                        <button onClick={() => downloadTemplate("bulk")} className="w-full flex flex-col items-start p-2.5 rounded-lg hover:bg-blue-50 transition-colors text-left group border-t border-slate-50 mt-1 cursor-pointer">
                                            <span className="text-[13px] font-bold text-slate-700">2. แบบแยกจำนวนและหน่วย</span>
                                            <span className="text-[11px] text-slate-400 font-medium">(มีทั้งคอลัมน์จำนวน และคอลัมน์หน่วย)</span>
                                        </button>
                                        <button onClick={() => downloadTemplate("status")} className="w-full flex flex-col items-start p-2.5 rounded-lg hover:bg-emerald-50 transition-colors text-left group border-t border-slate-50 mt-1 cursor-pointer">
                                            <span className="text-[13px] font-bold text-slate-700">3. แบบแยกสถานะ (รวมจำนวน/หน่วย)</span>
                                            <span className="text-[11px] text-slate-400 font-medium">(รวมหน่วยในคอลัมน์จำนวน + 5 คอลัมน์สถานะ | พิมพ์ "1" หรืออะไรก็ได้)</span>
                                        </button>
                                        <button onClick={() => downloadTemplate("status_unit")} className="w-full flex flex-col items-start p-2.5 rounded-lg hover:bg-purple-50 transition-colors text-left group border-t border-slate-50 mt-1 cursor-pointer">
                                            <span className="text-[13px] font-bold text-slate-700">4. แบบแยกสถานะและหน่วย</span>
                                            <span className="text-[11px] text-slate-400 font-medium">(แยกคอลัมน์จำนวน และคอลัมน์หน่วย + 5 คอลัมน์สถานะ | พิมพ์ "1" หรืออะไรก็ได้)</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            <div className="w-full pl-10 pr-10 pt-2 pb-16">

                {/* History Panel */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden"
                            style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}
                        >
                            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <History size={14} className="text-slate-400" />
                                    <p className="text-[13px] font-bold text-[#0f172a]">ประวัติการนำเข้า</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={15} /></button>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                {loadingHistory ? (
                                    <div className="divide-y divide-slate-50">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-slate-100 rounded-full w-2/3" />
                                                    <div className="h-2 bg-slate-50 rounded-full w-1/3" />
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <div className="w-10 h-4 bg-slate-50 rounded-full" />
                                                    <div className="w-10 h-4 bg-slate-50 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="py-4 flex justify-center border-t-0">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span className="text-[11px] font-bold">กำลังโหลดประวัติ...</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="px-5 py-12 text-center flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                                            <History size={24} />
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-400">ยังไม่มีประวัติการนำเข้า</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {history.map(h => (
                                            <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet size={13} className="text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-semibold text-[#0f172a] truncate">{h.fileName}</p>
                                                    <div className="flex gap-3 mt-0.5">
                                                        <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={9} />{new Date(h.importedAt).toLocaleString("th-TH")}</span>
                                                        {h.department && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Building2 size={9} />{h.department}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 shrink-0">
                                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">+{h.imported}</span>
                                                    {h.updated > 0 && <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">↑{h.updated}</span>}
                                                    {h.skipped > 0 && <span className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">ข้าม {h.skipped}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ════ STEP 1: Upload ════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="max-w-2xl mx-auto mt-8 space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                            <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet size={16} className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">อัปโหลดไฟล์ข้อมูล</p>
                                    <p className="text-xs text-gray-400 mt-0.5">รองรับ .xlsx, .xls, .csv</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn("flex flex-col items-center justify-center gap-4 py-16 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                                        dragging ? "border-blue-400 bg-blue-50/50 scale-[1.01]" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/50")}>
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all", dragging ? "bg-blue-100" : "bg-slate-100")}>
                                        <Upload size={28} className={dragging ? "text-blue-500" : "text-slate-400"} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[15px] font-bold text-slate-700">{dragging ? "วางไฟล์ที่นี่เลย!" : "คลิกหรือลากไฟล์มาวาง"}</p>
                                        <p className="text-[13px] text-slate-400 mt-1">รองรับ Excel (.xlsx, .xls) และ CSV</p>
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                            </div>
                            <div className="mx-6 mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[12px] text-amber-700">แนะนำใช้ <strong>Template</strong> จากระบบ — ถ้า header ต่างออกไป สามารถจับคู่ได้ในขั้นตอนถัดไป</p>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-w-3xl mx-auto mt-8">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                    <Settings2 size={15} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">ตั้งค่าเริ่มต้น</p>
                                    <p className="text-xs text-gray-400 mt-0.5">ใช้กับแถวที่ช่องว่าง — สามารถแก้รายการได้อีกครั้งในขั้นถัดไป</p>
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">ประเภทครุภัณฑ์ <span className="text-red-400">*</span></label>
                                    <div className="flex gap-2">
                                        {[{ k: "general", l: "แบบทั่วไป" }, { k: "durable", l: "แบบคงทน" }].map(t => (
                                            <button key={t.k} type="button" onClick={() => setDefaults(p => ({ ...p, assetType: t.k as any }))}
                                                className={cn("flex-1 py-2 rounded-lg text-[13px] font-bold border transition-all cursor-pointer",
                                                    defaults.assetType === t.k ? (t.k === "general" ? "bg-blue-600 text-white border-blue-600" : "bg-orange-600 text-white border-orange-600") : "bg-slate-50 border-slate-200 text-slate-500")}>
                                                {t.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">หน่วยงาน <span className="text-red-500">*</span></label>
                                    <CustomSelect
                                        value={defaults.department}
                                        onChange={val => setDefaults(p => ({ ...p, department: val }))}
                                        options={departments.map(d => ({ value: d.name, label: d.name }))}
                                        placeholder="— ไม่ระบุ —"
                                        icon={<Building2 size={15} />}
                                    />
                                </div>
                            </div>
                            <div className="px-5 pb-8 border-t border-slate-100 pt-8 flex flex-col items-center">
                                <div className="max-w-xs w-full space-y-3 text-center">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">ปีงบประมาณ <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <Calendar size={18} />
                                        </div>
                                        <input type="text"
                                            inputMode="numeric"
                                            value={defaults.fiscalYear}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === "" || /^\d+$/.test(val)) {
                                                    setDefaults(p => ({ ...p, fiscalYear: val }));
                                                }
                                            }}
                                            placeholder="เช่น 2567"
                                            className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-[18px] font-black transition-all shadow-sm text-center tracking-[0.2em]" />
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 pb-5 flex justify-between">
                                <button onClick={() => setStep(1)} className="flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-500 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer">
                                    <ChevronLeft size={16} /> ย้อนกลับ
                                </button>
                                <button onClick={() => setStep(3)} disabled={!canNext}
                                    className={cn("flex items-center gap-2 h-10 px-8 rounded-lg text-white text-[14px] font-bold transition-all shadow-md cursor-pointer",
                                        canNext ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed opacity-50")}>
                                    ถัดไป <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="max-w-3xl mx-auto mt-8">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                    <ArrowRightLeft size={15} className="text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">จับคู่คอลัมน์</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{fileName} — {rawHeaders.length} คอลัมน์, {rawData.length} แถว</p>
                                </div>
                            </div>
                            <div className="p-5 space-y-8">


                                {/* General Mapping Section */}
                                <div className="space-y-4">
                                    <p className="text-[12px] font-bold text-slate-400 mb-1 uppercase tracking-wide flex items-center gap-2">
                                        <Filter size={14} className="text-slate-300" /> การจับคู่คอลัมน์จากไฟล์
                                    </p>
                                    <div className="space-y-2">
                                        {rawHeaders.filter(h => {
                                            // HIDE Matrix Unit columns (เครื่อง, ตัว, อัน, ชุด) as requested
                                            const isMatrixUnit = ["เครื่อง", "ตัว", "อัน", "ชุด"].includes(h);
                                            // HIDE Matrix Status columns in Step 3 list (Auto-handled)
                                            const isMatrixStatus = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "สูญหาย", "ไม่จำเป็นต้องใช้ในราชการ"].includes(h);
                                            return !isMatrixUnit && !isMatrixStatus;
                                        }).map(h => (
                                            <div key={h} className="flex items-center gap-3">
                                                <div className="w-52 shrink-0 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] font-semibold text-slate-700 truncate">{h}</div>
                                                <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                                <CustomSelect
                                                    className="flex-1"
                                                    size="sm"
                                                    value={colMapping[h] || ""}
                                                    onChange={val => setColMapping(prev => ({ ...prev, [h]: val as SystemColKey | "" }))}
                                                    options={[
                                                        { value: "", label: "— ไม่ใช้ —" },
                                                        ...SYSTEM_COLS.map(sc => ({ value: sc.key, label: sc.label.split(" | ")[0] }))
                                                    ]}
                                                    placeholder="— ไม่ใช้ —"
                                                />
                                                {colMapping[h] ? <Check size={16} className="text-emerald-500 shrink-0" /> : <div className="w-4 shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Mapping Checklist Section */}
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-[12px] font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-slate-300" /> ตรวจสอบความครบถ้วนของคอลัมน์ระบบ
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {SYSTEM_COLS.map(sc => {
                                            const mappedKeys = Object.values(colMapping);
                                            let isMapped = mappedKeys.includes(sc.key as any);

                                            // Smart mapping detection (Implied)
                                            if (sc.key === "unit" && !isMapped) {
                                                isMapped = mappedKeys.includes("quantity");
                                            }

                                            const label = sc.label.split(" | ")[0];
                                            return (
                                                <div key={sc.key} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border transition-all",
                                                    isMapped ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-500 shadow-xs")}>
                                                    <span className="text-[12px] font-bold">{label}</span>
                                                    {isMapped ? <CheckCircle2 size={14} /> : <X size={14} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(() => {
                                        const mappedKeys = Object.values(colMapping);
                                        const unmapped = SYSTEM_COLS.filter(sc => {
                                            // Only warn about core inventory fields
                                            const coreFields = ["receivedDate", "name", "assetCode", "quantity", "unitPrice", "totalPrice", "moneyType", "acquisitionMethod", "location", "unit", "status"];
                                            if (!coreFields.includes(sc.key)) return false;

                                            let isMapped = mappedKeys.includes(sc.key as any);
                                            if (sc.key === "unit" && !isMapped) {
                                                isMapped = mappedKeys.includes("quantity");
                                            }
                                            return !isMapped;
                                        });

                                        // Analyze Quantity column for units
                                        const qtyHeader = Object.keys(colMapping).find(h => colMapping[h] === "quantity");
                                        const unitHeader = Object.keys(colMapping).find(h => colMapping[h] === "unit");
                                        let hasEmbeddedUnits = false;
                                        if (qtyHeader) {
                                            const qtyIdx = rawHeaders.indexOf(qtyHeader);
                                            if (qtyIdx !== -1) {
                                                hasEmbeddedUnits = rawData.some(row => {
                                                    const val = String(row[qtyIdx] || "").trim();
                                                    return /[^\d\.\s,]{2,}/.test(val); // Detect non-numeric text (at least 2 chars to avoid symbols/noise)
                                                });
                                            }
                                        }

                                        if (unmapped.length > 0) {
                                            return (
                                                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-3 shadow-xs transition-all animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex items-center gap-3">
                                                        <AlertTriangle size={18} className="text-amber-600" />
                                                        <p className="text-[12px] text-amber-700 font-bold leading-relaxed">
                                                            ตรวจพบ {unmapped.length} คอลัมน์ที่ยังไม่ได้จับคู่ ข้อมูลส่วนนี้จะถูกเว้นว่างไว้ในระบบ
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 ml-7">
                                                        {unmapped.map(sc => (
                                                            <span key={sc.key} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[10px] font-bold text-amber-600 shadow-sm">
                                                                {sc.label.split(" | ")[0]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow-xs space-y-3 transition-all animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                                    <p className="text-[12px] text-emerald-600 font-bold leading-relaxed">
                                                        คอลัมน์ระบบถูกจับคู่ครบถ้วนแล้ว พร้อมสำหรับการตรวจสอบข้อมูล
                                                    </p>
                                                </div>

                                                {qtyHeader && (hasEmbeddedUnits || !unitHeader) && (
                                                    <div className={cn("ml-7 pl-3 border-l-2 py-0.5 flex flex-col gap-0.5",
                                                        hasEmbeddedUnits ? "border-emerald-200" : "border-amber-200")}>
                                                        <p className="text-[11px] font-bold text-emerald-700/70 uppercase tracking-tight">การวิเคราะห์ข้อมูลเพิ่มเติม</p>
                                                        <p className={cn("text-[12px] font-medium",
                                                            hasEmbeddedUnits ? "text-emerald-600" : "text-amber-600")}>
                                                            {hasEmbeddedUnits
                                                                ? "• ตรวจพบหน่วยนับห้อยท้ายในข้อมูลแล้ว ระบบจะแยกหน่วยนับให้อัตโนมัติ"
                                                                : "• ไม่พบหน่วยนับห้อยท้าย อย่าลืมระบุหน่วยนับในขั้นตอนถัดไป"}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="px-5 pb-5 flex justify-between">
                                <button onClick={() => setStep(2)} className="flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-500 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer">
                                    <ChevronLeft size={16} /> ย้อนกลับ
                                </button>
                                <button onClick={applyMappingAndDefaults} disabled={Object.values(colMapping).filter(v => v !== "").length < 2}
                                    className="flex items-center gap-2 h-10 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer">
                                    ถัดไป (ตรวจสอบข้อมูล) <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* ════ STEP 4: Check Data (Remediation) ════════════════════════════ */}
                {step === 4 && (
                    <div className="space-y-6">
                        {/* File Info Card */}
                        <div className="bg-white rounded-xl border border-slate-200 px-6 py-2 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                    <FileSpreadsheet size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-black text-[#0f172a] tracking-tight truncate max-w-[500px]">{fileName || "ไม่พบชื่อไฟล์"}</span>
                                    <div className="w-px h-3 bg-slate-200 mx-1" />
                                    <span className="text-[13px] font-bold text-blue-600">{rows.length} รายการ</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-[10px] font-bold uppercase tracking-wider">File Information</span>
                                <Info size={14} className="opacity-50" />
                            </div>
                        </div>

                        {/* Bulk Action Bar */}
                        <div className={cn("bg-white rounded-xl border border-slate-200 shadow-xl relative z-40 transition-all",
                            step5Selection.size > 0 ? "ring-2 ring-blue-500/20 translate-y-0" : "opacity-80 scale-[0.99]")}>

                            {/* Header Row 2: Bulk Actions */}
                            <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/10 rounded-t-xl">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                        <Package size={15} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#0f172a]">จัดการข้อมูลแบบกลุ่ม ({step5Selection.size} รายการที่เลือก)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={applyBulkStep5} disabled={step5Selection.size === 0}
                                        className={cn("h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95",
                                            step5Selection.size === 0 ? "cursor-not-allowed" : "cursor-pointer")}>
                                        <CheckCircle2 size={13} /> บันทึกการแก้ไข
                                    </button>
                                    <button onClick={deleteStep5Selected} disabled={step5Selection.size === 0}
                                        className={cn("h-8 px-4 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-bold transition-all disabled:opacity-50 active:scale-95",
                                            step5Selection.size === 0 ? "cursor-not-allowed" : "cursor-pointer")}>
                                        ลบที่เลือก
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 px-6 relative">
                                <div className="absolute top-1 right-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBulkRecorder("");
                                            setBulkRecipient("");
                                            setBulkStatus("");
                                            setBulkLocation("");
                                            setBulkMoneyType("");
                                            setBulkMethod("");
                                            setBulkNote("");
                                        }}
                                        disabled={step5Selection.size === 0}
                                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-0"
                                    >
                                        <RotateCcw size={10} />
                                        ล้างตัวกรองข้อมูล
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 items-end">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">ผู้บันทึก</label>
                                        <LuxuryCombobox
                                            value={bulkRecorder}
                                            onChange={setBulkRecorder}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...recorders.map(c => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="เลือก"
                                            icon={<User size={12} />}
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">ผู้รับของ</label>
                                        <LuxuryCombobox
                                            value={bulkRecipient}
                                            onChange={setBulkRecipient}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...receivers.map(c => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="เลือก"
                                            icon={<Users size={12} />}
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">สถานะ</label>
                                        <CustomSelect
                                            value={bulkStatus}
                                            onChange={setBulkStatus}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...statuses.map((c: Category) => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="สถานะ"
                                            icon={<Clock size={12} />}
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">สถานที่</label>
                                        <CustomSelect
                                            value={bulkLocation}
                                            onChange={setBulkLocation}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...locations.map((c: Category) => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="สถานที่"
                                            icon={<MapPin size={12} />}
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">ประเภทเงิน</label>
                                        <CustomSelect
                                            value={bulkMoneyType}
                                            onChange={setBulkMoneyType}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...moneyTypes.map((c: Category) => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="เงิน"
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">วิธีได้มา</label>
                                        <CustomSelect
                                            value={bulkMethod}
                                            onChange={setBulkMethod}
                                            options={[
                                                { value: "", label: "-- ไม่ระบุ --" },
                                                ...acquisitionMethods.map((c: Category) => ({ value: c.name, label: c.name }))
                                            ]}
                                            placeholder="วิธี"
                                            size="sm"
                                            disabled={step5Selection.size === 0}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1">หมายเหตุ</label>
                                        <input type="text" value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="หมายเหตุ"
                                            disabled={step5Selection.size === 0}
                                            className={cn("w-full h-9 px-3 rounded-lg border border-slate-200 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-[12px] font-bold transition-all placeholder:text-slate-300",
                                                step5Selection.size === 0 ? "bg-slate-50 opacity-50 grayscale cursor-not-allowed" : "bg-white")} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ boxShadow: "0 0 40px rgba(0,0,0,0.06), 0 0 20px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.02)" }}>
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                                    {[
                                        { id: "all_rows", label: "แสดงทั้งหมด", count: rows.length },
                                        { id: "all_problems", label: "เฉพาะที่มีปัญหา", count: rows.filter(r => r.isDuplicate || r.isIncomplete).length },
                                        { id: "dup", label: "ข้อมูลซ้ำ", count: rows.filter(r => r.isDuplicate).length },
                                        { id: "inc", label: "ข้อมูลขาดหาย", count: rows.filter(r => r.isIncomplete).length },
                                    ].map(f => (
                                        <button key={f.id} onClick={() => { setStep5Filter(f.id as any); setStep5SubFilter("all"); }}
                                            className={cn("px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2 cursor-pointer",
                                                step5Filter === f.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                            {f.label}
                                            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]",
                                                step5Filter === f.id ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500")}>
                                                {f.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="hidden md:flex items-center gap-6">
                                    {/* Status Pills */}
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                            <CheckCircle2 size={13} />
                                            พร้อม {rows.filter(r => !r.isDuplicate && !r.isIncomplete).length} รายการ
                                        </div>
                                        {rows.filter(r => r.isDuplicate).length > 0 && (
                                            <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[11px] font-bold border border-red-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                                <AlertCircle size={13} />
                                                ข้อมูลซ้ำ {rows.filter(r => r.isDuplicate).length} รายการ
                                            </div>
                                        )}
                                        {rows.filter(r => r.isIncomplete).length > 0 && (
                                            <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[11px] font-bold border border-amber-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                                <AlertTriangle size={13} />
                                                ข้อมูลขาดหาย {rows.filter(r => r.isIncomplete).length} รายการ
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="flex flex-col items-end gap-1.5 min-w-[240px]">
                                        <div className="flex items-center justify-between w-full px-1">
                                            <span className="text-[11px] font-bold text-slate-500">ความพร้อมของข้อมูล</span>
                                            <span className="text-[11px] font-black text-blue-600">
                                                {normalRows.length}/{rows.length} <span className="text-slate-400 font-medium">(เสร็จสิ้นไปแล้ว {Math.round((normalRows.length / (rows.length || 1)) * 100)}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-px">
                                            <div className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                                style={{ width: `${(normalRows.length / (rows.length || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-filters for Incomplete Data */}
                            {step5Filter === "inc" && (
                                <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ตัวกรองตามคอลัมน์ (แสดงเฉพาะแถวที่มีข้อมูลว่าง)</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {[
                                            { id: "all", label: "ทั้งหมด", count: rows.filter(r => r.isIncomplete).length },
                                            { id: "date", label: "วันที่รับ", count: rows.filter(r => r.isIncomplete && !r.receivedDate).length },
                                            { id: "name", label: "ชื่อรายการ", count: rows.filter(r => r.isIncomplete && !r.name).length },
                                            { id: "code", label: "รหัสครุภัณฑ์", count: rows.filter(r => r.isIncomplete && !r.assetCode).length },
                                            { id: "qty", label: "จำนวน", count: rows.filter(r => r.isIncomplete && !r.quantity).length },
                                            { id: "price", label: "ราคา/หน่วย", count: rows.filter(r => r.isIncomplete && !r.unitPrice).length },
                                            { id: "total", label: "มูลค่ารวม", count: rows.filter(r => r.isIncomplete && !r.totalPrice).length },
                                            { id: "money", label: "ประเภทเงิน", count: rows.filter(r => r.isIncomplete && !r.moneyType).length },
                                            { id: "method", label: "วิธีการได้มา", count: rows.filter(r => r.isIncomplete && !r.acquisitionMethod).length },
                                            { id: "loc", label: "ใช้ประจำที่ไหน", count: rows.filter(r => r.isIncomplete && !r.location).length },
                                            { id: "unit", label: "หน่วย", count: rows.filter(r => r.isIncomplete && !r.unit).length },
                                            { id: "stat", label: "สถานะ", count: rows.filter(r => r.isIncomplete && !r.status).length },
                                            { id: "rec", label: "ผู้บันทึก", count: rows.filter(r => r.isIncomplete && !r.createdBy).length },
                                            { id: "recei", label: "ผู้รับของ", count: rows.filter(r => r.isIncomplete && !r.receivedBy).length },
                                            { id: "note", label: "หมายเหตุ", count: rows.filter(r => r.isIncomplete && !r.remark).length },
                                        ].map(s => (
                                            <button key={s.id}
                                                onClick={() => {
                                                    setStep5SubFilter(s.id);
                                                    if (s.id !== "all") scrollToColumn(s.id);
                                                }}
                                                className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer",
                                                    step5SubFilter === s.id
                                                        ? "bg-amber-500 border-amber-600 text-white shadow-sm"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600")}>
                                                {s.label}
                                                {s.count > 0 && (
                                                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]",
                                                        step5SubFilter === s.id ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600")}>
                                                        {s.count}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div ref={tableScrollRef} className="overflow-x-auto">
                                <table className="w-full text-left border-collapse" style={{ minWidth: "2200px" }}>
                                    <thead className="bg-slate-50/80 sticky top-0 z-10">
                                        <tr className="border-b border-slate-100">
                                            <th className="w-[50px] px-6 py-4 text-center bg-slate-50/80">
                                                <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                                    checked={rows.filter(r => {
                                                        if (step5Filter === "all_rows") return true;
                                                        if (step5Filter === "all_problems") return r.isDuplicate || r.isIncomplete;
                                                        if (step5Filter === "dup") return r.isDuplicate;
                                                        return r.isIncomplete;
                                                    }).length > 0 &&
                                                        rows.filter(r => {
                                                            if (step5Filter === "all_rows") return true;
                                                            if (step5Filter === "all_problems") return r.isDuplicate || r.isIncomplete;
                                                            if (step5Filter === "dup") return r.isDuplicate;
                                                            return r.isIncomplete;
                                                        }).every(r => step5Selection.has(r._rowIndex))}
                                                    onChange={() => toggleStep5All(rows.filter(r => {
                                                        if (step5Filter === "all_rows") return true;
                                                        if (step5Filter === "all_problems") return r.isDuplicate || r.isIncomplete;
                                                        if (step5Filter === "dup") return r.isDuplicate;
                                                        return r.isIncomplete;
                                                    }))} />
                                            </th>
                                            <th className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center">#</th>
                                            <th id="col-head-date" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">ว/ด/ป ที่รับ</th>
                                            <th id="col-head-name" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">รายการ</th>
                                            <th id="col-head-code" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">รหัสครุภัณฑ์</th>
                                            <th id="col-head-qty" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center">จำนวน</th>
                                            <th id="col-head-unit" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">หน่วย</th>
                                            <th id="col-head-price" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-right">ราคาต่อหน่วย</th>
                                            <th id="col-head-total" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-right">มูลค่ารวม</th>
                                            <th id="col-head-money" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">ประเภทเงิน</th>
                                            <th id="col-head-method" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">วิธีการได้มา</th>
                                            <th id="col-head-loc" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">ใช้ประจำที่ไหน</th>
                                            <th id="col-head-stat" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400">สถานะ</th>
                                            <th id="col-head-rec" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center border-l border-slate-100">ผู้บันทึก</th>
                                            <th id="col-head-recei" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center">ผู้รับของ</th>
                                            <th id="col-head-note" className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center">หมายเหตุ</th>
                                            <th className="px-3 py-3 text-[10px] uppercase tracking-wide font-extrabold text-slate-400 text-center border-l border-slate-100">ตรวจสอบ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.filter(r => {
                                            // Always show the row currently being edited to avoid unmounting during interaction
                                            if (activeRowIndex === r._rowIndex) return true;

                                            if (step5Filter === "all_rows") return true;
                                            if (step5Filter === "all_problems") return r.isDuplicate || r.isIncomplete;
                                            if (step5Filter === "dup") return r.isDuplicate;
                                            if (!r.isIncomplete) return false;
                                            if (step5SubFilter === "all") return true;
                                            if (step5SubFilter === "date") return !r.receivedDate;
                                            if (step5SubFilter === "name") return !r.name;
                                            if (step5SubFilter === "code") return !r.assetCode;
                                            if (step5SubFilter === "qty") return !r.quantity;
                                            if (step5SubFilter === "price") return !r.unitPrice;
                                            if (step5SubFilter === "total") return !r.totalPrice;
                                            if (step5SubFilter === "money") return !r.moneyType;
                                            if (step5SubFilter === "method") return !r.acquisitionMethod;
                                            if (step5SubFilter === "loc") return !r.location;
                                            if (step5SubFilter === "unit") return !r.unit;
                                            if (step5SubFilter === "stat") return !r.status;
                                            if (step5SubFilter === "rec") return !r.createdBy;
                                            if (step5SubFilter === "recei") return !r.receivedBy;
                                            if (step5SubFilter === "note") return !r.remark;
                                            return true;
                                        }).map((row) => {
                                            const colors = getRowColor(row);
                                            const isDup = row.isDuplicate;
                                            const isInc = row.isIncomplete && !isDup;
                                            const isDbDup = row.isDuplicateInDB;

                                            const upd = (k: keyof ImportRow, v: any) => {
                                                setRows(prev => {
                                                    const updated = prev.map(r => {
                                                        if (r._rowIndex === row._rowIndex) {
                                                            const next = { ...r, [k]: v } as ImportRow;

                                                            // Auto-calculate Total Price
                                                            if (k === "quantity" || k === "unitPrice") {
                                                                const q = parseFloat(String(next.quantity || 0));
                                                                const p = parseFloat(String(next.unitPrice || 0));
                                                                if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
                                                                    next.totalPrice = String(q * p);
                                                                }
                                                            }

                                                            next.isIncomplete = !next.name || !next.assetCode || !next.receivedDate || !next.location || !next.status || !next.unit || !next.createdBy || !next.receivedBy || !next.remark;
                                                            return next;
                                                        }
                                                        return r;
                                                    });

                                                    if (k === "assetCode") {
                                                        const counts: Record<string, number> = {};
                                                        updated.forEach(r => { if (r.assetCode) counts[r.assetCode] = (counts[r.assetCode] || 0) + 1; });
                                                        return updated.map(r => ({
                                                            ...r,
                                                            isDuplicateInFile: !!(r.assetCode && counts[r.assetCode] > 1),
                                                            isDuplicate: !!((r.assetCode && counts[r.assetCode] > 1) || r.isDuplicateInDB)
                                                        }));
                                                    }
                                                    return updated;
                                                });
                                            };

                                            const isEdit = (k: string) => {
                                                if (!row.originallyEmptyFields) return true;
                                                return row.originallyEmptyFields.includes(k);
                                            };

                                            const isChanged = (k: string) => {
                                                const val = row[k as keyof ImportRow];
                                                if (!val || String(val).trim() === "" || String(val).trim() === "null") return false;
                                                return isEdit(k);
                                            };

                                            const changedCls = (k: string) => isChanged(k) ? "bg-blue-50/70 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)] transition-colors duration-500" : "";

                                            return (
                                                <tr key={row._rowIndex} className={cn("text-[12px] transition-colors", colors.bg, colors.border, step5Selection.has(row._rowIndex) ? "bg-blue-50/20" : "")}>
                                                    <td className="px-6 py-4 text-center">
                                                        <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                                            checked={step5Selection.has(row._rowIndex)} onChange={() => toggleStep5Row(row._rowIndex)} />
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 text-center font-medium">{row._rowIndex}</td>
                                                    <td className={cn("p-1", changedCls("receivedDate"))}>
                                                        <EditableCell value={row.receivedDate || ""} isDate readOnly={!isEdit("receivedDate")} placeholder="วว/ดด/ปปปป" onChange={(v: string) => upd("receivedDate", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("min-w-[180px] p-1", changedCls("name"))}>
                                                        <EditableCell value={row.name || ""} readOnly={!isEdit("name")} placeholder="ชื่อรายการ" className="font-semibold" onChange={(v: string) => upd("name", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("assetCode"))}>
                                                        <EditableCell value={row.assetCode || ""} readOnly={!isEdit("assetCode")} placeholder="รหัส" onChange={(v: string) => upd("assetCode", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("text-center p-1", changedCls("quantity"))}>
                                                        <EditableCell value={row.quantity ? String(row.quantity) : ""} readOnly={!isEdit("quantity")} type="number" placeholder="0" className="text-center" onChange={(v: string) => upd("quantity", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("unit"))}>
                                                        <EditableCell value={row.unit || ""} readOnly={!isEdit("unit")} placeholder="หน่วย" onChange={(v: string) => upd("unit", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            isCombobox={true}
                                                            customSelectOptions={units.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("text-right p-1", changedCls("unitPrice"))}>
                                                        <EditableCell value={row.unitPrice ? String(row.unitPrice) : ""} readOnly={!isEdit("unitPrice")} type="number" placeholder="0.00" className="text-right" onChange={(v: string) => upd("unitPrice", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("text-right p-1", changedCls("totalPrice"))}>
                                                        <EditableCell value={row.totalPrice ? String(row.totalPrice) : ""} readOnly={!isEdit("totalPrice")} type="number" placeholder="0.00" className="text-right font-bold" onChange={(v: string) => upd("totalPrice", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("moneyType"))}>
                                                        <EditableCell value={row.moneyType || ""} readOnly={!isEdit("moneyType")} placeholder="ประเภทเงิน" onChange={(v: string) => upd("moneyType", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            customSelectOptions={moneyTypes.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("acquisitionMethod"))}>
                                                        <EditableCell value={row.acquisitionMethod || ""} readOnly={!isEdit("acquisitionMethod")} placeholder="วิธีได้มา" onChange={(v: string) => upd("acquisitionMethod", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            customSelectOptions={acquisitionMethods.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("location"))}>
                                                        <EditableCell value={row.location || ""} readOnly={!isEdit("location")} placeholder="ใช้ที่ไหน" onChange={(v: string) => upd("location", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            customSelectOptions={locations.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("status"))}>
                                                        <EditableCell
                                                            value={row.status || ""}
                                                            readOnly={!isEdit("status")}
                                                            placeholder="สถานะ"
                                                            onChange={(v: string) => upd("status", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            customSelectOptions={statuses.map(c => ({ value: c.name, label: c.name }))}
                                                        />
                                                    </td>
                                                    <td className={cn("border-l border-slate-50 p-1", changedCls("createdBy"))}>
                                                        <EditableCell value={row.createdBy || ""} readOnly={!isEdit("createdBy")} placeholder="ผู้บันทึก" onChange={(v: string) => upd("createdBy", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            isCombobox={true}
                                                            customSelectOptions={recorders.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("receivedBy"))}>
                                                        <EditableCell value={row.receivedBy || ""} readOnly={!isEdit("receivedBy")} placeholder="ผู้รับของ" onChange={(v: string) => upd("receivedBy", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)}
                                                            isCombobox={true}
                                                            customSelectOptions={receivers.map(c => ({ value: c.name, label: c.name }))} />
                                                    </td>
                                                    <td className={cn("p-1", changedCls("remark"))}>
                                                        <EditableCell value={row.remark || ""} readOnly={!isEdit("remark")} placeholder="หมายเหตุ" onChange={(v: string) => upd("remark", v)} onFocus={() => setActiveRowIndex(row._rowIndex)} onBlur={() => setActiveRowIndex(null)} />
                                                    </td>
                                                    <td className="px-3 py-3 text-center border-l border-slate-50">
                                                        <div className={cn("w-6 h-6 rounded-full mx-auto flex items-center justify-center shadow-sm",
                                                            isDbDup ? "bg-red-500 text-white" : isDup ? "bg-red-100 text-red-600" : isInc ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
                                                            {isDbDup ? <ShieldAlert size={12} /> : isDup ? <AlertCircle size={12} /> : isInc ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rows.filter(r => {
                                            if (step5Filter === "all_rows") return true;
                                            if (step5Filter === "all_problems") return r.isDuplicate || r.isIncomplete;
                                            if (step5Filter === "dup") return r.isDuplicate;
                                            if (!r.isIncomplete) return false;
                                            if (step5SubFilter === "all") return true;
                                            if (step5SubFilter === "date") return !r.receivedDate;
                                            if (step5SubFilter === "name") return !r.name;
                                            if (step5SubFilter === "code") return !r.assetCode;
                                            if (step5SubFilter === "qty") return !r.quantity;
                                            if (step5SubFilter === "price") return !r.unitPrice;
                                            if (step5SubFilter === "total") return !r.totalPrice;
                                            if (step5SubFilter === "money") return !r.moneyType;
                                            if (step5SubFilter === "method") return !r.acquisitionMethod;
                                            if (step5SubFilter === "loc") return !r.location;
                                            if (step5SubFilter === "stat") return !r.status;
                                            if (step5SubFilter === "rec") return !r.createdBy;
                                            if (step5SubFilter === "recei") return !r.receivedBy;
                                            if (step5SubFilter === "note") return !r.remark;
                                            return true;
                                        }).length === 0 && (
                                                <tr>
                                                    <td colSpan={16} className="py-24 text-center px-4 bg-slate-50/20">
                                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-500 shadow-inner border border-emerald-100">
                                                            <CheckCircle2 size={40} />
                                                        </div>
                                                        <h3 className="text-[18px] font-extrabold text-[#0f172a] tracking-tight">ไม่มีข้อมูลที่ต้องแก้ไข</h3>
                                                        <p className="text-[13px] text-slate-400 mt-2 max-w-[280px] mx-auto leading-relaxed">ข้อมูลทั้งหมดอยู่ในสถานะพร้อมนำเข้าเข้าสู่ระบบแล้ว</p>
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer Actions for Step 5 - Now Integrated into the same card */}
                            <div className="px-8 py-6 border-t border-slate-200 bg-slate-50/30 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => setStep(3)} disabled={importing}
                                        className="flex items-center gap-2 h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[14px] font-bold text-slate-500 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer">
                                        <ChevronLeft size={18} /> ย้อนกลับไปจับคู่คอลัมน์
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">

                                    <button onClick={handleImport} disabled={importing}
                                        className="flex items-center gap-3 h-12 px-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-black transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] cursor-pointer"
                                    >
                                        {importing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span>กำลังนำเข้าข้อมูล</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>ยืนยันนำเข้า {rows.length} รายการ</span>
                                                <ChevronRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════ STEP 5: Result ══════════════════════════════════════════ */}
                {step === 5 && (
                    <div className="max-w-md mx-auto mt-6">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden" style={{ boxShadow: "0 0 50px rgba(0,0,0,0.08), 0 10px 30px rgba(0,0,0,0.04)" }}>
                            <div className="px-8 py-10 flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-6 shadow-inner">
                                    <CheckCircle2 size={40} className="text-emerald-500" />
                                </div>
                                <h2 className="text-[24px] font-black text-[#0f172a] tracking-tight m-0 leading-tight">นำเข้าข้อมูลสำเร็จ!</h2>
                                <p className="text-[14px] text-slate-400 mt-2 font-medium">ระบบได้บันทึกข้อมูลเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว</p>

                                <div className="flex gap-3 mt-8">
                                    {[
                                        { n: importResult.imported, l: "สำเร็จ", c: "emerald" },
                                        { n: importResult.updated, l: "อัปเดต", c: "blue" },
                                    ].filter(s => s.n > 0 || s.l === "สำเร็จ").map(s => (
                                        <div key={s.l} className={cn("flex flex-col items-center px-6 py-4 rounded-2xl border",
                                            s.c === "emerald" ? "bg-emerald-50/50 border-emerald-200" :
                                                s.c === "blue" ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200")}>
                                            <span className={cn("text-[1.8rem] font-black leading-none",
                                                s.c === "emerald" ? "text-emerald-600" :
                                                    s.c === "blue" ? "text-blue-600" : "text-slate-500")}>{s.n}</span>
                                            <span className={cn("text-[11px] font-bold mt-1 uppercase tracking-wider",
                                                s.c === "emerald" ? "text-emerald-500" :
                                                    s.c === "blue" ? "text-blue-500" : "text-slate-400")}>{s.l}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full h-px bg-slate-100 my-8" />

                                <div className="flex flex-col w-full gap-2.5">
                                    <Link href="/assets" className="flex items-center justify-center gap-2.5 h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold transition-all shadow-lg shadow-blue-200 active:scale-[0.98]">
                                        <PackageCheck size={18} /> ดูรายการครุภัณฑ์ทั้งหมด
                                    </Link>

                                    <button onClick={resetAll} className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-500 transition-all active:scale-[0.98] cursor-pointer">
                                        <Upload size={14} className="opacity-60" /> นำเข้าไฟล์ใหม่
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ════ MODAL: Duplicate Error Alert ═════════════════════════════ */}
                <AnimatePresence>
                    {showDupErrorModal && (
                        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setShowDupErrorModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <ShieldAlert size={40} className="text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-3">ไม่สามารถดำเนินการได้</h3>
                                    <p className="text-slate-500 text-[15px] leading-relaxed">
                                        กรุณาลบข้อมูลครุภัณฑ์ที่มีข้อมูลซ้ำออกก่อน<br />ดำเนินการนำเข้าข้อมูล
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                    <button onClick={() => setShowDupErrorModal(false)}
                                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-[0.98] cursor-pointer">
                                        รับทราบ
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ════ MODAL: Incomplete Error Alert ════════════════════════════ */}
                <AnimatePresence>
                    {showIncompleteErrorModal && (
                        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setShowIncompleteErrorModal(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <AlertTriangle size={40} className="text-amber-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-3">ข้อมูลยังไม่ครบถ้วน</h3>
                                    <p className="text-slate-500 text-[15px] leading-relaxed">
                                        กรุณากรอกข้อมูลในช่องว่าง (แถบสีส้ม) ให้ครบถ้วน<br />หรือลบรายการที่ไม่ต้องการออกก่อนดำเนินการ
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                    <button onClick={() => setShowIncompleteErrorModal(false)}
                                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-[0.98] cursor-pointer">
                                        รับทราบ
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <ConfirmModal
                    isOpen={deleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    onConfirm={deleteConfirmType === "step4" ? executeDeleteSelected : executeDeleteStep5Selected}
                    title="ยืนยันการลบข้อมูล"
                    description={
                        <div className="space-y-3">
                            <p>คุณต้องการลบข้อมูลที่เลือกจำนวน <strong>{deleteConfirmType === "step4" ? selectedRows.length : step5Selection.size}</strong> รายการ ใช่หรือไม่?</p>
                            <p className="text-[12px] text-red-500 font-medium italic mt-2">* การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                        </div>
                    }
                    confirmText="ยืนยันการลบ"
                    type="danger"
                />
            </div>
        </div>
    );
}