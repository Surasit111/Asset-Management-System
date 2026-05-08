"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Save, X, Upload, Image as ImageIcon,
    Plus, AlertCircle, Package, MapPin, QrCode,
    Pencil, Trash2, Loader2, Settings, Info,
    Search, ChevronDown, Check,
} from "lucide-react";
import React, { use, useRef } from "react";
import { ImageModal } from "@/components/ui/image-modal";
import { QRCodeModal } from "@/components/ui/qr-code-modal";
import { ThaiDateInput } from "@/components/ui/thai-date-input";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

// MapPicker — ssr: false
import type { MapPickerProps } from "@/components/map/map-picker";
const MapPicker = dynamic<MapPickerProps>(() => import("@/components/map/map-picker"), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] bg-gray-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            กำลังโหลดแผนที่...
        </div>
    ),
});

interface AssetImage { id: string; url: string; }

interface Asset {
    id: string;
    assetType: string;
    assetCode: string;
    name: string;
    status: string | null;
    receivedDate: string | null;
    fiscalYear: string | null;
    acquisitionMethod: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number | null;
    moneyType: string | null;
    receivedBy: string | null;
    createdBy: string | null;
    remark: string | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    locationDetail: string | null;
    imageUrl: string | null;
    mapPinId: string | null;
    department: string | null;
    images: AssetImage[];
    createdAt: string;
    updatedAt: string;
}

interface Category { id: string; name: string; type: string; }

/* ─── sub-components ──────────────────────────────────────────────── */

function SectionHeader({ icon, label, sub, accent }: {
    icon: React.ReactNode; label: string; sub?: string; accent: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-6 pb-2">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", accent)}>
                {icon}
            </div>
            <div>
                <p className="text-[15px] font-bold text-gray-900 tracking-tight">{label}</p>
                {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );
}

function ReadonlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <div className={cn(
                "min-h-9 px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 flex items-center text-sm",
                value ? "text-gray-700" : "text-gray-400",
                mono && "tracking-wide"
            )}>
                {value || "—"}
            </div>
        </div>
    );
}

/* ─── main page ───────────────────────────────────────────────────── */

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState<Record<string, string>>({});
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [viewingIndex, setViewingIndex] = useState<number | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // categories
    const [statuses, setStatuses] = useState<Category[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<Category[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Category[]>([]);
    const [units, setUnits] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Category[]>([]);
    const [receivers, setReceivers] = useState<Category[]>([]);
    const [recorders, setRecorders] = useState<Category[]>([]);

    // ── Dropdown & Search States ──
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const [moneyTypeSearch, setMoneyTypeSearch] = useState("");
    const [receiverSearch, setReceiverSearch] = useState("");
    const [recorderSearch, setRecorderSearch] = useState("");
    const [showMap, setShowMap] = useState(false);

    const [showSaveReceiverConfirm, setShowSaveReceiverConfirm] = useState(false);
    const [isSavingReceiver, setIsSavingReceiver] = useState(false);
    const [showSaveRecorderConfirm, setShowSaveRecorderConfirm] = useState(false);
    const [isSavingRecorder, setIsSavingRecorder] = useState(false);
    const [showSaveMoneyTypeConfirm, setShowSaveMoneyTypeConfirm] = useState(false);
    const [isSavingMoneyType, setIsSavingMoneyType] = useState(false);

    // section shortcuts
    const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchAsset();
        fetchCategories();
        if (searchParams.get("edit") === "true") setEditing(true);
    }, [id, searchParams]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const handleScroll = () => { if (!scrollTimeoutRef.current) setActiveShortcut(null); };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    const scrollToSection = (id: string) => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        setActiveShortcut(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
        scrollTimeoutRef.current = setTimeout(() => { scrollTimeoutRef.current = null; }, 1000);
    };

    const fetchAsset = async () => {
        try {
            const res = await fetch(`/api/assets/${id}`);
            if (res.ok) {
                const data = await res.json();
                setAsset(data);
                setForm({
                    assetCode: data.assetCode || "",
                    name: data.name || "",
                    status: data.status || "",
                    receivedDate: data.receivedDate ? new Date(data.receivedDate).toISOString().split("T")[0] : "",
                    fiscalYear: data.fiscalYear || "",
                    acquisitionMethod: data.acquisitionMethod || "",
                    quantity: data.quantity?.toString() || "1",
                    unit: data.unit || "",
                    unitPrice: data.unitPrice?.toString() || "",
                    moneyType: data.moneyType || "",
                    department: data.department || "",
                    receivedBy: data.receivedBy || "",
                    createdBy: data.createdBy || "",
                    remark: data.remark || "",
                    location: data.location || "",
                    latitude: data.latitude?.toString() || "",
                    longitude: data.longitude?.toString() || "",
                    locationDetail: data.locationDetail || "",
                    imageUrl: data.imageUrl || "",
                    mapPinId: data.mapPinId || "",
                });
                setUploadedImages(data.images?.map((img: AssetImage) => img.url) || []);
            } else { setError("ไม่พบครุภัณฑ์"); }
        } catch { setError("เกิดข้อผิดพลาด"); }
        finally { setLoading(false); }
    };

    const fetchCategories = async () => {
        try {
            const [s, a, m, l, u, d, r, rec] = await Promise.all([
                fetch("/api/categories?type=status").then(r => r.json()),
                fetch("/api/categories?type=acquisition_method").then(r => r.json()),
                fetch("/api/categories?type=money_type").then(r => r.json()),
                fetch("/api/categories?type=location").then(r => r.json()),
                fetch("/api/categories?type=unit").then(r => r.json()),
                fetch("/api/categories?type=department").then(r => r.json()),
                fetch("/api/categories?type=recipient").then(r => r.json()),
                fetch("/api/categories?type=recorder").then(r => r.json()),
            ]);
            setStatuses(s); setAcquisitionMethods(a); setMoneyTypes(m);
            setLocations(l); setUnits(u); setDepartments(d); setReceivers(r); setRecorders(rec);
        } catch (err) { console.error(err); }
    };

    const updateForm = (field: string, value: string) => {
        if (field === "fiscalYear") { setForm(p => ({ ...p, [field]: value.replace(/[^0-9]/g, "") })); return; }
        if ((field === "quantity" || field === "unitPrice") && parseFloat(value) < 0) return;
        setForm(p => ({ ...p, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true); setError("");
        try {
            const res = await fetch(`/api/assets/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, imageUrls: uploadedImages }),
            });
            if (res.ok) { setEditing(false); fetchAsset(); toast.success("อัปเดตข้อมูลสำเร็จ"); }
            else { const d = await res.json(); setError(d.error || "ไม่สามารถบันทึกได้"); toast.error(d.error || "ไม่สามารถบันทึกได้"); }
        } catch { setError("เกิดข้อผิดพลาด"); toast.error("เกิดข้อผิดพลาด"); }
        finally { setSaving(false); }
    };

    const executeDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
            if (res.ok) { toast.success("ลบรายการครุภัณฑ์สำเร็จ"); router.push("/assets"); }
            else { toast.error("ไม่สามารถลบรายการได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsDeleting(false); setShowConfirmDelete(false); }
    };

    const handleAddImageUrl = () => {
        if (form.imageUrl?.trim()) { setUploadedImages(p => [...p, form.imageUrl.trim()]); updateForm("imageUrl", ""); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData(); fd.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                if (res.ok) { const data = await res.json(); setUploadedImages(p => [...p, data.url]); toast.success("อัปโหลดรูปภาพสำเร็จ"); }
                else { toast.error("อัปโหลดล้มเหลว"); }
            }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setUploading(false); }
    };

    const removeImage = (idx: number) => setUploadedImages(p => p.filter((_, i) => i !== idx));

    const handleSaveReceiver = async () => {
        if (!form.receivedBy.trim()) return;
        setIsSavingReceiver(true);
        try {
            const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.receivedBy.trim(), type: "recipient" }) });
            if (res.ok) { const nr = await res.json(); setReceivers(p => [...p, nr].sort((a, b) => a.name.localeCompare(b.name))); setShowSaveReceiverConfirm(false); toast.success("บันทึกรายชื่อสำเร็จ"); }
            else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingReceiver(false); }
    };

    const handleSaveRecorder = async () => {
        if (!form.createdBy?.trim()) return;
        setIsSavingRecorder(true);
        try {
            const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.createdBy.trim(), type: "recorder" }) });
            if (res.ok) { const nr = await res.json(); setRecorders(p => [...p, nr].sort((a, b) => a.name.localeCompare(b.name))); setShowSaveRecorderConfirm(false); toast.success("บันทึกรายชื่อผู้บันทึกสำเร็จ"); }
            else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingRecorder(false); }
    };

    const handleSaveMoneyType = async () => {
        if (!form.moneyType.trim()) return;
        setIsSavingMoneyType(true);
        try {
            const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.moneyType.trim(), type: "money_type" }) });
            if (res.ok) { const nm = await res.json(); setMoneyTypes(p => [...p, nm].sort((a, b) => a.name.localeCompare(b.name))); setShowSaveMoneyTypeConfirm(false); toast.success("บันทึกประเภทเงินสำเร็จ"); }
            else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingMoneyType(false); }
    };

    const filteredReceivers = useMemo(() => receivers.filter(r => r.name.toLowerCase().includes(receiverSearch.toLowerCase())), [receivers, receiverSearch]);
    const filteredRecorders = useMemo(() => recorders.filter(r => r.name.toLowerCase().includes(recorderSearch.toLowerCase())), [recorders, recorderSearch]);
    const filteredMoneyTypes = useMemo(() => moneyTypes.filter(m => m.name.toLowerCase().includes(moneyTypeSearch.toLowerCase())), [moneyTypes, moneyTypeSearch]);

    const formatDate = (date: string | null) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    };
    const formatTime = (date: string | null) => {
        if (!date) return "";
        return new Date(date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น.";
    };
    const formatCurrency = (val: number | null) => {
        if (val === null || val === undefined) return "—";
        return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + " ฿";
    };

    const totalValue = (parseFloat(form.quantity || "0") || 0) * (parseFloat(form.unitPrice || "0") || 0);
    const allImages = editing
        ? [...(form.imageUrl?.startsWith("http") ? [form.imageUrl] : []), ...uploadedImages]
        : [...(asset?.imageUrl ? [asset.imageUrl] : []), ...(asset?.images.map(i => i.url) || [])];

    /* ── searchable dropdown shared styles ── */
    const dropdownListCls = "absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200";
    const dropdownItemCls = "w-full text-left px-3 py-1.5 text-[13px] font-medium text-[#0f172a] rounded-lg hover:bg-indigo-100/50 hover:text-blue-600 transition-all cursor-pointer";
    const inputCls = "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-gray-400";

    const SaveChip = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
        <button type="button" 
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }} 
            disabled={disabled}
            className={cn(
                "h-10 px-4 flex items-center gap-2 rounded-xl border border-slate-200 text-xs font-bold transition-all shrink-0 shadow-sm",
                disabled 
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed opacity-50" 
                    : "bg-gray-50 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 cursor-pointer active:scale-95"
            )}>
            <Save size={12} /> บันทึก
        </button>
    );

    const renderField = (field: string, label: string, type = "text", required = false, placeholder = "", min?: string, readOnly = false) => (
        <div>
            <FieldLabel required={required}>{label}</FieldLabel>
            {editing ? (
                type === "date" ? (
                    <ThaiDateInput value={form[field] || ""} onChange={val => updateForm(field, val)} required={required} />
                ) : (
                    <input type={type} 
                        className={cn(
                            "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 text-gray-800 focus:outline-none transition-all placeholder:text-gray-400",
                            readOnly 
                                ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                                : "bg-white hover:border-blue-400 focus:border-blue-500"
                        )} 
                        min={min} value={form[field] || ""} onChange={e => !readOnly && updateForm(field, e.target.value)} 
                        placeholder={placeholder} required={required} readOnly={readOnly} />
                )
            ) : (
                <ReadonlyField label="" value={type === "date" ? formatDate(form[field] || null) : (form[field] || "")} />
            )}
        </div>
    );

    const renderSelect = (field: string, label: string, options: Category[], required = false) => {
        const value = (form[field as keyof typeof form] as string) || "";
        const isOpen = openDropdown === field;

        return (
            <div>
                <FieldLabel required={required}>{label}</FieldLabel>
                {!editing ? (
                    <ReadonlyField label="" value={value || ""} />
                ) : (
                    <div ref={isOpen ? dropdownRef : null} className="relative">
                        <button type="button" onClick={() => setOpenDropdown(isOpen ? null : field)}
                            className={cn(inputCls, "flex items-center justify-between cursor-pointer text-left", isOpen && "border-blue-500 shadow-sm")}>
                            <span className={cn(!value && "text-gray-400")}>{value || "— เลือก —"}</span>
                            <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-40", isOpen && "rotate-180 opacity-80")} />
                        </button>

                        {isOpen && (
                            <div className={cn(dropdownListCls, "p-1.5 z-100")}>
                                <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                    {options.map(o => (
                                        <button key={o.id} type="button" 
                                            className={cn(dropdownItemCls, value === o.name && "bg-blue-50 text-blue-600 font-bold")}
                                            onClick={() => { updateForm(field, o.name); setOpenDropdown(null); }}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{o.name}</span>
                                                {value === o.name && <Check size={12} />}
                                            </div>
                                        </button>
                                    ))}
                                    {options.length === 0 && <div className="px-3 py-4 text-center text-xs text-gray-400">ไม่พบข้อมูล</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /* ── loading ── */
    if (loading) return (
        <div className="min-h-screen bg-transparent -m-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลครุภัณฑ์...</p>
            </div>
        </div>
    );

    if (!asset) return (
        <div className="min-h-screen bg-transparent -m-6 flex items-center justify-center">
            <div className="text-center">
                <p className="text-slate-500 mb-4">{error || "ไม่พบครุภัณฑ์"}</p>
                <Link href="/assets" className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-sm font-medium">กลับไปรายการ</Link>
            </div>
        </div>
    );

    const shortcuts = [
        { id: "section-info", label: "ข้อมูลครุภัณฑ์", icon: <Package size={13} /> },
        { id: "section-location", label: "ตำแหน่งที่ตั้ง", icon: <MapPin size={13} /> },
        { id: "section-images", label: "รูปภาพประกอบ", icon: <ImageIcon size={13} /> },
    ];

    return (
        <div className="min-h-screen bg-slate-100 -m-6">

            {/* ══ Fixed Navbar ══════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-110 bg-[#ffffff] border-b border-[#cbd5e1] flex items-center transition-[left] duration-300 shrink-0" style={{ minHeight: "80px" }}>
                <div className="w-full px-10 flex items-center gap-4">

                    {/* ย้อนกลับ */}
                    <button type="button" onClick={() => router.back()}
                        className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-gray-50 transition-colors shrink-0 shadow-sm cursor-pointer">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>


                    {/* Title + badge */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-[22px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight truncate">{asset.name}</h1>
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0",
                                asset.assetType === "durable"
                                    ? "bg-orange-50 text-orange-600 border-orange-200"
                                    : "bg-blue-50 text-blue-600 border-blue-200"
                            )}>
                                {asset.assetType === "durable" ? "คงทน" : "ทั่วไป"}
                            </span>
                        </div>
                        <p className="text-[22px] text-[#94a3b8] font-extrabold m-0 tracking-tight truncate leading-tight">{asset.assetCode}</p>
                    </div>


                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        {editing ? (
                            <>
                                {/* ยกเลิกแก้ไข */}
                                <button type="button" onClick={() => { setEditing(false); fetchAsset(); }}
                                    className="group relative flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm active:scale-[0.97] cursor-pointer">
                                    <X size={15} className="opacity-60 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-200" />
                                    ยกเลิก
                                </button>
                                {/* บันทึก */}
                                <button type="button" onClick={handleSave} disabled={saving}
                                    className="group relative flex items-center gap-2 h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-[13px] font-bold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.97] overflow-hidden cursor-pointer">
                                    {saving ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></>
                                    ) : (
                                        <><Save size={15} /><span>บันทึกข้อมูล</span></>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* QR Code */}
                                <button type="button" onClick={() => setShowQrModal(true)}
                                    className="group flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm active:scale-[0.97] cursor-pointer">
                                    <QrCode size={15} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                    QR Code
                                </button>
                                {/* แก้ไข */}
                                <button type="button" onClick={() => setEditing(true)}
                                    className="group flex items-center gap-2 h-10 px-5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-all duration-200 shadow-sm active:scale-[0.97] cursor-pointer">
                                    <Pencil size={14} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                    แก้ไข
                                </button>
                                {/* ลบ */}
                                <button type="button" onClick={() => setShowConfirmDelete(true)}
                                    className="group flex items-center gap-2 h-10 px-5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 text-[13px] font-semibold text-red-500 hover:text-red-600 transition-all duration-200 shadow-sm active:scale-[0.97] cursor-pointer">
                                    <Trash2 size={14} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ลบ
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ══ Content ══════════════════════════════════════════════════════ */}
            <div className="w-full pl-10 pr-10 pt-6 pb-16">

                {/* ── Error ── */}
                {error && (
                    <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm shadow-sm">
                        <AlertCircle size={15} className="shrink-0" /> {error}
                    </div>
                )}

                {/* ── Status Bar (view mode) ── */}
                {!editing && (
                    <div id="section-meta" className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4 flex flex-wrap items-center gap-6 shadow-sm scroll-mt-28">
                        {[
                            { label: "หน่วยงาน", value: asset.department || "—" },
                            { label: "ปีงบประมาณ", value: asset.fiscalYear || "—" },
                            { label: "สถานะ", value: asset.status || "—" },
                            { label: "วันที่รับ", value: formatDate(asset.receivedDate) },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                {i > 0 && <div className="w-px h-6 bg-slate-200 shrink-0" />}
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                    <p className="text-[13px] font-bold text-[#0f172a] mt-0.5 leading-tight">{item.value}</p>
                                    {/* No .time property on items */}
                                </div>
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <div className="text-right">
                                <span className="text-[11px] text-gray-400 block leading-tight">อัปเดตเมื่อ</span>
                                <span className="text-[12px] text-[#0f172a] font-bold block mt-0.5">{formatDate(asset.updatedAt)}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{formatTime(asset.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Top Bar (edit mode) ── */}
                {editing && (
                    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4 flex flex-wrap items-end gap-6 shadow-sm scroll-mt-28">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <FieldLabel>ประเภทครุภัณฑ์</FieldLabel>
                                <div className="group relative">
                                    <Info size={13} className="text-gray-400 cursor-help hover:text-blue-500 transition-colors mb-1.5" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-[#0f172a] text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-60 border border-slate-700">
                                        ไม่สามารถเปลี่ยนประเภทหลังบันทึกได้
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0f172a]" />
                                    </div>
                                </div>
                            </div>
                            <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                                {[
                                    { key: "general", label: "แบบทั่วไป", active: "bg-blue-600 text-white shadow-md scale-[1.02]" },
                                    { key: "durable", label: "แบบคงทน", active: "bg-orange-600 text-white shadow-md scale-[1.02]" },
                                ].map(tab => (
                                    <div key={tab.key} className={cn(
                                        "px-5 py-2 rounded-lg text-xs font-bold transition-all",
                                        asset.assetType === tab.key ? tab.active : "text-gray-500"
                                    )}>
                                        {tab.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4 flex-1">
                            <div className="flex-1 min-w-[160px]">
                                {renderSelect("department", "หน่วยงาน", departments)}
                            </div>
                            <div>
                                <FieldLabel>ปีงบประมาณ</FieldLabel>
                                <input type="text" value={form.fiscalYear} placeholder="2568" onChange={e => updateForm("fiscalYear", e.target.value)} className={cn(inputCls, "w-24")} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">

                    {/* ══ Section 1: ข้อมูลครุภัณฑ์ ════════════════════════════════ */}
                    <div id="section-info" className="bg-white rounded-xl border border-slate-200 px-5 py-5 shadow-sm scroll-mt-28">
                        <SectionHeader
                            icon={<Package size={15} className="text-blue-500" />}
                            label="ข้อมูลครุภัณฑ์"
                            sub={asset.assetType === "general" ? "แบบทั่วไป" : "แบบคงทน"}
                            accent="bg-blue-50"
                        />

                        <div className="grid grid-cols-12 gap-3">
                            {/* row 1 */}
                            <div className="col-span-2">{renderField("receivedDate", "วันที่รับ", "date")}</div>
                            <div className="col-span-7">{renderField("name", "ชื่อครุภัณฑ์", "text", true, "ชื่อครุภัณฑ์")}</div>
                            <div className="col-span-3">{renderField("assetCode", "รหัสครุภัณฑ์", "text", true, "AMS-001")}</div>

                            {/* row 2 */}
                            <div className="col-span-2">{renderField("quantity", "จำนวน", "number", false, "1", "0")}</div>
                            <div className="col-span-2">{renderSelect("unit", "หน่วย", units)}</div>
                            <div className="col-span-4">{renderField("unitPrice", "ราคาต่อหน่วย (บาท)", "number", false, "0.00", "0")}</div>
                            <div className="col-span-4">
                                <FieldLabel>มูลค่ารวม (บาท)</FieldLabel>
                                <div className="h-10 px-3 rounded-xl border border-slate-200 bg-gray-50 flex items-center text-sm font-medium text-gray-700">
                                    {editing
                                        ? totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : formatCurrency((asset.unitPrice || 0) * (asset.quantity || 0))}
                                </div>
                            </div>

                            {/* row 3 */}
                            {/* ประเภทเงิน */}
                            <div className="col-span-3">
                                <FieldLabel>ประเภทเงิน</FieldLabel>
                                {editing ? (
                                    <div className="flex gap-1.5">
                                        <div ref={openDropdown === "moneyType" ? dropdownRef : null} className="relative flex-1">
                                            <input type="text" className={inputCls} value={form.moneyType} placeholder="พิมพ์หรือเลือก"
                                                onChange={e => { updateForm("moneyType", e.target.value); setMoneyTypeSearch(e.target.value); setOpenDropdown("moneyType"); }}
                                                onFocus={() => { setMoneyTypeSearch(form.moneyType); setOpenDropdown("moneyType"); }} />
                                            {openDropdown === "moneyType" && (moneyTypes.filter(m => m.name.toLowerCase().includes(moneyTypeSearch.toLowerCase())).length > 0 || moneyTypeSearch) && (
                                                <div className={cn(dropdownListCls, "p-1.5")}>
                                                    <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                        {moneyTypes.filter(m => m.name.toLowerCase().includes(moneyTypeSearch.toLowerCase())).map(m => (
                                                            <button key={m.id} type="button" className={cn(dropdownItemCls, form.moneyType === m.name && "bg-blue-50 text-blue-600 font-bold")}
                                                                onClick={() => { updateForm("moneyType", m.name); setOpenDropdown(null); }}>{m.name}</button>
                                                        ))}
                                                        {moneyTypes.filter(m => m.name.toLowerCase().includes(moneyTypeSearch.toLowerCase())).length === 0 && moneyTypeSearch && <div className="px-3 py-2 text-xs text-gray-400">ไม่พบประเภทเงิน</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <SaveChip onClick={() => setShowSaveMoneyTypeConfirm(true)} disabled={!form.moneyType.trim() || moneyTypes.some(m => m.name === form.moneyType.trim())} />
                                    </div>
                                ) : <ReadonlyField label="" value={asset.moneyType || ""} />}
                            </div>

                            <div className="col-span-3">{renderSelect("acquisitionMethod", "วิธีการได้มา", acquisitionMethods)}</div>
                            <div className="col-span-3">{renderSelect("location", "ใช้ประจำที่ไหน", locations)}</div>
                            <div className="col-span-3">{renderSelect("status", "สถานะ", statuses, true)}</div>

                            {/* ผู้รับของ */}
                            <div className="col-span-6">
                                <FieldLabel>ผู้รับของ</FieldLabel>
                                {editing ? (
                                    <div className="flex gap-1.5">
                                        <div ref={openDropdown === "receivedBy" ? dropdownRef : null} className="relative flex-1">
                                            <input type="text" className={inputCls} value={form.receivedBy} placeholder="ชื่อผู้รับของ"
                                                onChange={e => { updateForm("receivedBy", e.target.value); setReceiverSearch(e.target.value); setOpenDropdown("receivedBy"); }}
                                                onFocus={() => { setReceiverSearch(form.receivedBy || ""); setOpenDropdown("receivedBy"); }} />
                                            {openDropdown === "receivedBy" && (receivers.filter(r => r.name.toLowerCase().includes(receiverSearch.toLowerCase())).length > 0 || receiverSearch) && (
                                                <div className={cn(dropdownListCls, "p-1.5")}>
                                                    <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                        {receivers.filter(r => r.name.toLowerCase().includes(receiverSearch.toLowerCase())).map(r => (
                                                            <button key={r.id} type="button" className={cn(dropdownItemCls, form.receivedBy === r.name && "bg-blue-50 text-blue-600 font-bold")}
                                                                onClick={() => { updateForm("receivedBy", r.name); setOpenDropdown(null); }}>{r.name}</button>
                                                        ))}
                                                        {receivers.filter(r => r.name.toLowerCase().includes(receiverSearch.toLowerCase())).length === 0 && receiverSearch && <div className="px-3 py-2 text-xs text-gray-400">ไม่พบรายชื่อ</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <SaveChip onClick={() => setShowSaveReceiverConfirm(true)} disabled={!form.receivedBy?.trim() || receivers.some(r => r.name === form.receivedBy?.trim())} />
                                    </div>
                                ) : <ReadonlyField label="" value={asset.receivedBy || ""} />}
                            </div>

                            {/* ผู้บันทึก */}
                            <div className="col-span-6">
                                <FieldLabel>ผู้บันทึก</FieldLabel>
                                {editing ? (
                                    <div className="flex gap-1.5">
                                        <div ref={openDropdown === "createdBy" ? dropdownRef : null} className="relative flex-1">
                                            <input type="text" className={inputCls} value={form.createdBy} placeholder="ชื่อผู้บันทึก"
                                                onChange={e => { updateForm("createdBy", e.target.value); setRecorderSearch(e.target.value); setOpenDropdown("createdBy"); }}
                                                onFocus={() => { setRecorderSearch(form.createdBy || ""); setOpenDropdown("createdBy"); }} />
                                            {openDropdown === "createdBy" && (recorders.filter(r => r.name.toLowerCase().includes(recorderSearch.toLowerCase())).length > 0 || recorderSearch) && (
                                                <div className={cn(dropdownListCls, "p-1.5")}>
                                                    <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                        {recorders.filter(r => r.name.toLowerCase().includes(recorderSearch.toLowerCase())).map(r => (
                                                            <button key={r.id} type="button" className={cn(dropdownItemCls, form.createdBy === r.name && "bg-blue-50 text-blue-600 font-bold")}
                                                                onClick={() => { updateForm("createdBy", r.name); setOpenDropdown(null); }}>{r.name}</button>
                                                        ))}
                                                        {recorders.filter(r => r.name.toLowerCase().includes(recorderSearch.toLowerCase())).length === 0 && recorderSearch && <div className="px-3 py-2 text-xs text-gray-400">ไม่พบรายชื่อ</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <SaveChip onClick={() => setShowSaveRecorderConfirm(true)} disabled={!form.createdBy?.trim() || recorders.some(r => r.name === form.createdBy?.trim())} />
                                    </div>
                                ) : <ReadonlyField label="" value={asset.createdBy || ""} />}
                            </div>

                            {/* หมายเหตุ */}
                            <div className="col-span-12">
                                <FieldLabel>หมายเหตุ</FieldLabel>
                                {editing ? (
                                    <textarea rows={3}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-blue-400 transition-all placeholder:text-gray-300 resize-none"
                                        value={form.remark} onChange={e => updateForm("remark", e.target.value)} placeholder="เพิ่มหมายเหตุ..." />
                                ) : (
                                    <div className="min-h-[72px] px-3 py-2 rounded-lg border border-slate-200 bg-gray-50 text-sm text-gray-700">
                                        {asset.remark || <span className="text-gray-300">—</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ══ Section 2: ตำแหน่งที่ตั้ง ════════════════════════════════ */}
                    <div id="section-location" className="bg-white rounded-xl border border-slate-200 px-5 py-5 shadow-sm scroll-mt-28">
                        <SectionHeader
                            icon={<MapPin size={15} className="text-emerald-500" />}
                            label="ตำแหน่งที่ตั้ง"
                            sub="พิกัดและรายละเอียดสถานที่"
                            accent="bg-emerald-50"
                        />

                        <div className="grid grid-cols-12 gap-3 mb-4">
                            <div className="col-span-3">
                                <FieldLabel>ใช้ประจำที่ไหน</FieldLabel>
                                <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-100 flex items-center text-sm text-slate-500 cursor-not-allowed">
                                    {asset.location || "—"}
                                </div>
                            </div>
                            <div className="col-span-5">{renderField("locationDetail", "รายละเอียดตำแหน่ง", "text", false, "เช่น ชั้น 2 ห้อง 204")}</div>
                            <div className="col-span-2">{renderField("latitude", "ละติจูด", "number", false, "17.5371", undefined, true)}</div>
                            <div className="col-span-2">{renderField("longitude", "ลองจิจูด", "number", false, "101.7178", undefined, true)}</div>
                        </div>

                        {editing && (
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowMap(!showMap)}
                                    className="flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 text-sm font-bold text-gray-600 transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    <MapPin size={16} />
                                    {showMap ? "ซ่อนแผนที่" : "ปักหมุดบนแผนที่"}
                                </button>
                                <p className="text-[13px] text-slate-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-amber-500">💡</span>
                                    คลิกบนแผนที่เพื่อปักหมุด หรือคลิกที่ <span className="font-bold text-slate-700">สถานที่หลัก</span> เพื่อเลือกพิกัด
                                </p>
                            </div>
                        )}

                        {(asset.latitude && asset.longitude && !editing) && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                                <MapPicker 
                                    latitude={asset.latitude} 
                                    longitude={asset.longitude} 
                                    mapPinId={asset.mapPinId}
                                    readOnly={true} 
                                    zoom={18}
                                />
                            </div>
                        )}

                        {(editing && showMap) && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
                                <MapPicker
                                    height="400px"
                                    latitude={form.latitude ? parseFloat(form.latitude) : undefined}
                                    longitude={form.longitude ? parseFloat(form.longitude) : undefined}
                                    mapPinId={form.mapPinId}
                                    zoom={18}
                                    onLocationSelect={(lat: number, lng: number, mapPinId?: string | null) => {
                                        updateForm("latitude", lat.toString());
                                        updateForm("longitude", lng.toString());
                                        updateForm("mapPinId", mapPinId || "");
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ══ Section 3: รูปภาพ ════════════════════════════════════════ */}
                    <div id="section-images" className="bg-white rounded-xl border border-slate-200 px-5 py-5 shadow-sm scroll-mt-28">
                        <SectionHeader
                            icon={<ImageIcon size={15} className="text-violet-500" />}
                            label="รูปภาพประกอบ"
                            sub={editing ? "อัปโหลดหรือวางลิงก์รูปภาพ" : `${allImages.length} รูปภาพ`}
                            accent="bg-violet-50"
                        />

                        {editing ? (
                            <>
                                <div className="flex gap-2 items-end mb-1">
                                    <div className="flex-1 max-w-md">
                                        <FieldLabel>ลิงก์รูปภาพ (URL)</FieldLabel>
                                        <input type="url" className={inputCls} value={form.imageUrl} placeholder="https://example.com/image.jpg" onChange={e => updateForm("imageUrl", e.target.value)} />
                                    </div>
                                    <button type="button" onClick={handleAddImageUrl} disabled={!form.imageUrl?.trim()}
                                        className={cn(
                                            "h-10 px-4 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-gray-50 text-[12px] font-bold text-gray-500 transition-all whitespace-nowrap shadow-sm",
                                            !form.imageUrl?.trim() 
                                                ? "opacity-30 cursor-not-allowed" 
                                                : "cursor-pointer active:scale-95 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
                                        )}>
                                        <Plus size={14} /> เพิ่มจากลิงก์
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mb-4">คลิกขวาที่รูป → คัดลอกที่อยู่รูปภาพ (Copy Image Address)</p>

                                {form.imageUrl?.startsWith("http") && (
                                    <div className="mb-4">
                                        <FieldLabel>ตัวอย่างจากลิงก์</FieldLabel>
                                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-gray-50 cursor-pointer" onClick={() => setViewingIndex(0)}>
                                            <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover hover:opacity-90 transition-opacity" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                        </div>
                                    </div>
                                )}

                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer text-left mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                        <Upload size={14} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{uploading ? "กำลังอัปโหลด..." : "คลิกหรือลากไฟล์มาวางที่นี่"}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">รองรับ JPG, PNG, WEBP — เลือกหลายไฟล์ได้</p>
                                    </div>
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                            </>
                        ) : null}

                        {/* Image Grid */}
                        {allImages.length > 0 ? (
                            <div>
                                {editing && <p className="text-[11px] text-slate-400 mb-2">รูปภาพทั้งหมด ({allImages.length})</p>}
                                <div className="flex flex-wrap gap-2">
                                    {allImages.map((url, idx) => {
                                        const isUrlPreview = form.imageUrl?.startsWith("http") && idx === 0;
                                        const uploadIdx = form.imageUrl?.startsWith("http") ? idx - 1 : idx;
                                        return (
                                            <div key={idx} className="group relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-gray-50 shrink-0">
                                                <img src={url} alt={`img-${idx}`} onClick={() => setViewingIndex(idx)}
                                                    className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                                {editing && !isUrlPreview && (
                                                    <button type="button" onClick={() => removeImage(uploadIdx)}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-colors">
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            !editing && (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                    <ImageIcon size={32} className="mb-2" />
                                    <p className="text-sm">ยังไม่มีรูปภาพ</p>
                                </div>
                            )
                        )}

                        {/* Timestamps */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-3">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">สร้างเมื่อ</p>
                                <p className="text-[12px] text-[#0f172a] font-bold mt-0.5">{formatDate(asset.createdAt)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{formatTime(asset.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <ImageModal
                isOpen={viewingIndex !== null}
                onClose={() => setViewingIndex(null)}
                images={allImages}
                initialIndex={viewingIndex ?? 0}
                onDelete={editing ? (idx) => {
                    const hasUrlImg = form.imageUrl?.startsWith("http");
                    if (hasUrlImg && idx === 0) {
                        updateForm("imageUrl", "");
                    } else {
                        const uploadIdx = hasUrlImg ? idx - 1 : idx;
                        removeImage(uploadIdx);
                    }
                    if (allImages.length <= 1) setViewingIndex(null);
                } : undefined}
            />
            <QRCodeModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} asset={asset} />
            <ConfirmModal isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} onConfirm={executeDelete}
                title="ยืนยันการลบครุภัณฑ์"
                description={<>คุณแน่ใจหรือไม่ว่าต้องการลบ <strong>{asset.name}</strong>? การดำเนินการนี้ไม่สามารถย้อนกลับได้</>}
                confirmText="ลบครุภัณฑ์" cancelText="ยกเลิก" type="danger" isLoading={isDeleting} />
            <ConfirmModal isOpen={showSaveReceiverConfirm} onClose={() => setShowSaveReceiverConfirm(false)} onConfirm={handleSaveReceiver}
                title="บันทึกรายชื่อผู้รับของ" description={`คุณต้องการบันทึก "${form.receivedBy}" เป็นรายชื่อผู้รับของใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก" isLoading={isSavingReceiver} type="primary" />
            <ConfirmModal isOpen={showSaveRecorderConfirm} onClose={() => setShowSaveRecorderConfirm(false)} onConfirm={handleSaveRecorder}
                title="บันทึกรายชื่อผู้บันทึก" description={`คุณต้องการบันทึก "${form.createdBy}" เป็นรายชื่อผู้บันทึกใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก" isLoading={isSavingRecorder} type="primary" />
            <ConfirmModal isOpen={showSaveMoneyTypeConfirm} onClose={() => setShowSaveMoneyTypeConfirm(false)} onConfirm={handleSaveMoneyType}
                title="บันทึกประเภทเงิน" description={`คุณต้องการบันทึก "${form.moneyType}" เป็นประเภทเงินใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก" isLoading={isSavingMoneyType} type="primary" />
        </div>
    );
}