"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Save, Upload, X, MapPin, Image as ImageIcon,
    Plus, AlertCircle, Package, Settings, ChevronDown, Check
} from "lucide-react";
import { toast } from "react-hot-toast";

const ImageModal = dynamic(() => import("@/components/ui/image-modal").then(mod => mod.ImageModal), { ssr: false });
const ConfirmModal = dynamic(() => import("@/components/ui/confirm-modal").then(mod => mod.ConfirmModal), { ssr: false });
const ThaiDateInput = dynamic(() => import("@/components/ui/thai-date-input").then(mod => mod.ThaiDateInput), { ssr: false });

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

interface Category {
    id: string;
    name: string;
    type: string;
}

/* ─── tiny sub-components ─────────────────────────────────────────── */

function SectionHeader({
    icon, label, sub, accent,
}: {
    icon: React.ReactNode;
    label: string;
    sub?: string;
    accent: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-6 pb-2">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", accent)}>
                {icon}
            </div>
            <div>
                <p className="text-[15px] font-bold text-gray-900 tracking-tight">{label}</p>
                {sub && <p className="text-[12px] text-slate-600 mt-0.5 font-medium">{sub}</p>}
            </div>
        </div>
    );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );
}

function FakeReadonly({ value, placeholder }: { value: string; placeholder?: string }) {
    return (
        <div className={cn(
            "h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 flex items-center text-sm cursor-not-allowed",
            value ? "text-gray-800 font-medium" : "text-slate-600 font-medium"
        )}>
            {value || placeholder || "—"}
        </div>
    );
}

/* ─── main page ───────────────────────────────────────────────────── */

export default function NewAssetPageV2() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [assetType, setAssetType] = useState<"general" | "durable">("general");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showMap, setShowMap] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [viewingIndex, setViewingIndex] = useState<number | null>(null);

    // categories
    const [statuses, setStatuses] = useState<Category[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<Category[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Category[]>([]);
    const [units, setUnits] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Category[]>([]);
    const [receivers, setReceivers] = useState<Category[]>([]);
    const [recorders, setRecorders] = useState<Category[]>([]);

    // receiver dropdown
    const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);
    const [receiverSearch, setReceiverSearch] = useState("");
    const receiverDropdownRef = useRef<HTMLDivElement>(null);
    const [showSaveReceiverConfirm, setShowSaveReceiverConfirm] = useState(false);
    const [isSavingReceiver, setIsSavingReceiver] = useState(false);

    // recorder dropdown
    const [showRecorderDropdown, setShowRecorderDropdown] = useState(false);
    const [recorderSearch, setRecorderSearch] = useState("");
    const recorderDropdownRef = useRef<HTMLDivElement>(null);
    const [showSaveRecorderConfirm, setShowSaveRecorderConfirm] = useState(false);
    const [isSavingRecorder, setIsSavingRecorder] = useState(false);

    // moneyType dropdown
    const [showMoneyTypeDropdown, setShowMoneyTypeDropdown] = useState(false);
    const [moneyTypeSearch, setMoneyTypeSearch] = useState("");
    const moneyTypeDropdownRef = useRef<HTMLDivElement>(null);
    const [showSaveMoneyTypeConfirm, setShowSaveMoneyTypeConfirm] = useState(false);
    const [isSavingMoneyType, setIsSavingMoneyType] = useState(false);

    const [form, setForm] = useState({
        assetCode: "",
        name: "",
        description: "",
        status: "",
        receivedDate: "",
        fiscalYear: "",
        acquisitionMethod: "",
        quantity: "1",
        unit: "",
        unitPrice: "",
        moneyType: "",
        department: "",
        receivedBy: "",
        createdBy: "",
        remark: "",
        location: "",
        latitude: "",
        longitude: "",
        locationDetail: "",
        imageUrl: "",
        mapPinId: "",
    });

    const allImages = [
        ...(form.imageUrl && form.imageUrl.startsWith("http") ? [form.imageUrl] : []),
        ...uploadedImages,
    ];

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            const [s, a, m, l, u, d, r, rec] = await Promise.all([
                fetch("/api/categories?type=status").then((r) => r.json()),
                fetch("/api/categories?type=acquisition_method").then((r) => r.json()),
                fetch("/api/categories?type=money_type").then((r) => r.json()),
                fetch("/api/categories?type=location").then((r) => r.json()),
                fetch("/api/categories?type=unit").then((r) => r.json()),
                fetch("/api/categories?type=department").then((r) => r.json()),
                fetch("/api/categories?type=recipient").then((r) => r.json()),
                fetch("/api/categories?type=recorder").then((r) => r.json()),
            ]);
            setStatuses(s); setAcquisitionMethods(a); setMoneyTypes(m);
            setLocations(l); setUnits(u); setDepartments(d); setReceivers(r); setRecorders(rec);
        } catch (err) { console.error(err); }
    };

    const updateForm = (field: string, value: string) => {
        if ((field === "quantity" || field === "unitPrice") && parseFloat(value) < 0) return;
        if (field === "fiscalYear") {
            setForm((p) => ({ ...p, [field]: value.replace(/[^0-9]/g, "") }));
            return;
        }
        setForm((p) => ({ ...p, [field]: value }));
    };

    const handleAddImageUrl = () => {
        if (form.imageUrl?.trim()) {
            setUploadedImages((p) => [...p, form.imageUrl.trim()]);
            updateForm("imageUrl", "");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                if (files.length > 1) await new Promise((r) => setTimeout(r, 300));
                if (res.ok) {
                    const data = await res.json();
                    setUploadedImages((p) => [...p, data.url]);
                    toast.success("อัปโหลดรูปภาพสำเร็จ");
                } else {
                    const err = await res.json().catch(() => ({}));
                    toast.error(err.error || "อัปโหลดล้มเหลว");
                }
            }
        } catch (err: unknown) {
            toast.error((err instanceof Error ? err.message : String(err)) || "เกิดข้อผิดพลาด");
        } finally { setUploading(false); }
    };

    const removeImage = (idx: number) =>
        setUploadedImages((p) => p.filter((_, i) => i !== idx));

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (receiverDropdownRef.current && !receiverDropdownRef.current.contains(e.target as Node))
                setShowReceiverDropdown(false);
            if (recorderDropdownRef.current && !recorderDropdownRef.current.contains(e.target as Node))
                setShowRecorderDropdown(false);
            if (moneyTypeDropdownRef.current && !moneyTypeDropdownRef.current.contains(e.target as Node))
                setShowMoneyTypeDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSaveReceiver = async () => {
        if (!form.receivedBy.trim()) return;
        setIsSavingReceiver(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.receivedBy.trim(), type: "recipient" }),
            });
            if (res.ok) {
                const nr = await res.json();
                setReceivers((p) => [...p, nr].sort((a, b) => a.name.localeCompare(b.name)));
                setShowSaveReceiverConfirm(false);
                toast.success("บันทึกรายชื่อสำเร็จ");
            } else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingReceiver(false); }
    };

    const handleSaveMoneyType = async () => {
        if (!form.moneyType.trim()) return;
        setIsSavingMoneyType(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.moneyType.trim(), type: "money_type" }),
            });
            if (res.ok) {
                const nm = await res.json();
                setMoneyTypes((p) => [...p, nm].sort((a, b) => a.name.localeCompare(b.name)));
                setShowSaveMoneyTypeConfirm(false);
                toast.success("บันทึกประเภทเงินสำเร็จ");
            } else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingMoneyType(false); }
    };

    const handleSaveRecorder = async () => {
        if (!form.createdBy.trim()) return;
        setIsSavingRecorder(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.createdBy.trim(), type: "recorder" }),
            });
            if (res.ok) {
                const nr = await res.json();
                setRecorders((p) => [...p, nr].sort((a, b) => a.name.localeCompare(b.name)));
                setShowSaveRecorderConfirm(false);
                toast.success("บันทึกรายชื่อผู้บันทึกสำเร็จ");
            } else { toast.error((await res.json()).error || "ไม่สามารถบันทึกได้"); }
        } catch { toast.error("เกิดข้อผิดพลาด"); }
        finally { setIsSavingRecorder(false); }
    };

    const filteredReceivers = receivers.filter((r) =>
        r.name.toLowerCase().includes(receiverSearch.toLowerCase()));
    const filteredRecorders = recorders.filter((r) =>
        r.name.toLowerCase().includes(recorderSearch.toLowerCase()));
    const filteredMoneyTypes = moneyTypes.filter((m) =>
        m.name.toLowerCase().includes(moneyTypeSearch.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.assetCode.trim() || !form.name.trim()) {
            setError("กรุณากรอกรหัสครุภัณฑ์และชื่อ");
            toast.error("กรุณากรอกรหัสครุภัณฑ์และชื่อ");
            return;
        }
        setLoading(true); setError("");
        try {
            const res = await fetch("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, assetType, imageUrls: uploadedImages }),
            });
            if (res.ok) { toast.success("เพิ่มครุภัณฑ์ใหม่สำเร็จ"); router.push("/assets"); }
            else { const d = await res.json(); setError(d.error || "ไม่สามารถบันทึกได้"); toast.error(d.error || "ไม่สามารถบันทึกได้"); }
        } catch { setError("เกิดข้อผิดพลาด"); toast.error("เกิดข้อผิดพลาด"); }
        finally { setLoading(false); }
    };

    /* ── shared field renderers ── */
    const inputCls = "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-slate-500 font-medium";
    const selectCls = "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M2%204L6%208L10%204%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_10px_center] bg-no-repeat focus:outline-none focus:border-blue-500 hover:border-blue-400 transition-all";

    const renderInput = (
        field: string, label: string, type = "text",
        required = false, placeholder = "", min?: string, readOnly = false
    ) => (
        <div>
            <FieldLabel required={required}>{label}</FieldLabel>
            {type === "date" ? (
                <ThaiDateInput
                    value={form[field as keyof typeof form] as string}
                    onChange={(val) => updateForm(field, val)}
                    required={required}
                />
            ) : (
                <input
                    type={type} className={cn(
                        "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 text-gray-800 focus:outline-none transition-all",
                        readOnly
                            ? "bg-slate-100 text-slate-600 cursor-not-allowed placeholder:text-slate-600 font-medium"
                            : "bg-white hover:border-blue-400 focus:border-blue-500 placeholder:text-slate-500 font-medium"
                    )} min={min}
                    value={form[field as keyof typeof form] as string}
                    onChange={(e) => !readOnly && updateForm(field, e.target.value)}
                    placeholder={placeholder} required={required} readOnly={readOnly}
                />
            )}
        </div>
    );

    function SaveChip({ onClick, disabled, label = "บันทึก" }: { onClick: () => void; disabled: boolean; label?: string }) {
        return (
            <button
                type="button"
                onMouseDown={(e) => {
                    e.preventDefault(); // Prevent focus loss if needed
                    onClick();
                }}
                disabled={disabled}
                className={cn(
                    "flex items-center gap-1.5 px-4 h-10 rounded-xl border border-slate-200 text-[12px] font-bold transition-all shadow-sm",
                    disabled
                        ? "bg-gray-50 text-gray-300 cursor-not-allowed opacity-50"
                        : "bg-gray-50 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer active:scale-95"
                )}
            >
                <Save size={12} />
                {label}
            </button>
        );
    }

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderSelect = (field: string, label: string, options: Category[], required = false) => {
        const value = (form[field as keyof typeof form] as string) || "";
        const isOpen = openDropdown === field;

        return (
            <div>
                <FieldLabel required={required}>{label}</FieldLabel>
                <div ref={isOpen ? dropdownRef : null} className="relative">
                    <button
                        type="button"
                        onClick={() => setOpenDropdown(isOpen ? null : field)}
                        className={cn(
                            inputCls,
                            "flex items-center justify-between cursor-pointer text-left",
                            isOpen && "border-blue-500 shadow-sm"
                        )}
                    >
                        <span className={cn(!value ? "text-slate-600 font-medium" : "text-gray-800 font-medium")}>{value || "— เลือก —"}</span>
                        <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-40", isOpen && "rotate-180 opacity-80")} />
                    </button>

                    {isOpen && (
                        <div className={cn(dropdownListCls, "p-1.5 z-100")}>
                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                {options.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        className={cn(
                                            dropdownItemCls,
                                            value === o.name ? "bg-blue-50 text-blue-600 font-bold" : "hover:bg-indigo-100/50 hover:text-blue-600 text-[#0f172a]"
                                        )}
                                        onClick={() => {
                                            updateForm(field, o.name);
                                            setOpenDropdown(null);
                                        }}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span>{o.name}</span>
                                            {value === o.name && <Check size={12} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0);

    /* ── searchable dropdown shared styles ── */
    const dropdownListCls = "absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200";
    const dropdownItemCls = "w-full text-left px-3 py-1.5 text-[13px] font-medium text-[#0f172a] rounded-lg hover:bg-indigo-100/50 hover:text-blue-600 transition-all cursor-pointer";

    const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Detect manual scroll to clear active shortcut
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollTimeoutRef.current) {
                setActiveShortcut(null);
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    const scrollToSection = (id: string) => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        setActiveShortcut(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            scrollTimeoutRef.current = setTimeout(() => {
                scrollTimeoutRef.current = null;
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 -m-6">

            <header className="sticky top-0 z-110 bg-[#ffffff] border-b border-[#cbd5e1] flex items-center transition-[left] duration-300 shrink-0" style={{ minHeight: "80px" }}>
                <div className="w-full px-10 flex items-center gap-4">

                    <Link
                        href="/assets"
                        aria-label="ย้อนกลับไปหน้ารายการครุภัณฑ์"
                        title="ย้อนกลับ"
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-500 transition-all duration-300 shrink-0 shadow-sm cursor-pointer"
                    >
                        <ArrowLeft size={20} className="text-gray-600 hover:text-blue-600" />
                    </Link>

                    <div className="shrink-0">
                        <h1 className="text-[26px] font-extrabold text-[#0f172a] tracking-tight m-0">เพิ่มครุภัณฑ์ใหม่</h1>
                    </div>

                    <div className="w-px h-8 bg-slate-200 shrink-0 mx-4" />

                    <div className="flex-1 flex justify-center items-center px-4">
                        <div className="flex items-center gap-1.5 p-1.5">
                            {[
                                { id: "section-start", label: "ข้อมูลเริ่มต้น", icon: <Settings size={13} /> },
                                { id: "section-basic", label: "ข้อมูลพื้นฐาน", icon: <Package size={13} /> },
                                { id: "section-location", label: "ตำแหน่งที่ตั้ง", icon: <MapPin size={13} /> },
                                { id: "section-images", label: "รูปภาพประกอบ", icon: <ImageIcon size={13} /> },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => scrollToSection(item.id)}
                                    className={cn(
                                        "group flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-300 border cursor-pointer active:scale-95",
                                        activeShortcut === item.id
                                            ? "bg-white text-blue-600 border-blue-600 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-600 hover:text-blue-600"
                                    )}
                                >
                                    <span className={cn(
                                        "transition-transform duration-300 group-hover:scale-110",
                                        activeShortcut === item.id ? "opacity-100" : "opacity-70"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="transition-all duration-300">
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-slate-200 shrink-0 mx-2" />

                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-2.5 shrink-0">

                        {/* ยกเลิก */}
                        <Link
                            href="/assets"
                            className="group relative flex items-center gap-2 h-10 px-5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm active:scale-[0.97]"
                        >
                            <X size={15} className="opacity-60 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-200" />
                            ยกเลิก
                        </Link>

                        {/* บันทึก */}
                        <button
                            form="asset-form"
                            type="submit"
                            disabled={loading}
                            className="group relative flex items-center gap-2.5 h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white text-[13px] font-bold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.97] overflow-hidden cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>กำลังบันทึก...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={16} className="shrink-0" />
                                    <span>บันทึกครุภัณฑ์</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* ══ Content ══════════════════════════════════════════════════════ */}
            <div className="w-full pl-10 pr-10 pt-6 pb-16">

                {/* ── Top bar: type + dept + year ── */}
                <div id="section-start" className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4 flex flex-wrap items-end gap-6 scroll-mt-28">
                    <div>
                        <FieldLabel>ประเภทครุภัณฑ์</FieldLabel>
                        <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                            {[
                                { key: "general" as const, label: "แบบทั่วไป", active: "bg-blue-600 text-white shadow-md scale-[1.02]" },
                                { key: "durable" as const, label: "แบบคงทน", active: "bg-orange-600 text-white shadow-md scale-[1.02]" },
                            ].map((tab) => (
                                <button
                                    key={tab.key} type="button"
                                    onClick={() => setAssetType(tab.key)}
                                    className={cn(
                                        "px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        assetType === tab.key ? tab.active : "text-slate-600 hover:text-blue-600 font-semibold"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 flex-1">
                        <div className="flex-1 min-w-[160px]">
                            {renderSelect("department", "หน่วยงาน", departments)}
                        </div>
                        <div>
                            <FieldLabel>ปีงบประมาณ</FieldLabel>
                            <input
                                type="text" value={form.fiscalYear} placeholder="2568"
                                onChange={(e) => updateForm("fiscalYear", e.target.value)}
                                className={cn(inputCls, "w-24")}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm shadow-sm">
                        <AlertCircle size={15} className="shrink-0" /> {error}
                    </div>
                )}

                {/* ── Form — id="asset-form" เพื่อให้ปุ่มใน navbar submit ได้ ── */}
                <form id="asset-form" onSubmit={handleSubmit} className="space-y-4">

                    {/* ── Section 1: ข้อมูลพื้นฐาน ── */}
                    <div id="section-basic" className="bg-white rounded-xl border border-slate-200 px-5 py-5 scroll-mt-28">
                        <SectionHeader
                            icon={<Package size={15} className="text-blue-500" />}
                            label="ข้อมูลพื้นฐาน"
                            sub={assetType === "general" ? "แบบทั่วไป" : "แบบคงทน"}
                            accent="bg-blue-50"
                        />

                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-2">{renderInput("receivedDate", "วันที่รับ", "date")}</div>
                            <div className="col-span-7">{renderInput("name", "ชื่อครุภัณฑ์", "text", true, "เช่น คอมพิวเตอร์เดสก์ท็อป")}</div>
                            <div className="col-span-3">{renderInput("assetCode", "รหัสครุภัณฑ์", "text", true, "AMS-001")}</div>

                            <div className="col-span-2">{renderInput("quantity", "จำนวน", "number", false, "1", "0")}</div>
                            <div className="col-span-2">{renderSelect("unit", "หน่วย", units)}</div>
                            <div className="col-span-4">{renderInput("unitPrice", "ราคาต่อหน่วย (บาท)", "number", false, "0.00", "0")}</div>
                            <div className="col-span-4">
                                <FieldLabel>มูลค่ารวม (บาท)</FieldLabel>
                                <div className="h-9 px-3 rounded-lg border border-slate-200 bg-gray-50 flex items-center text-sm font-medium text-gray-700">
                                    {totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* ประเภทเงิน */}
                            <div className="col-span-3">
                                <FieldLabel>ประเภทเงิน</FieldLabel>
                                <div className="flex gap-1.5">
                                    <div ref={moneyTypeDropdownRef} className="relative flex-1">
                                        <input
                                            type="text" className={inputCls}
                                            value={form.moneyType} placeholder="พิมพ์หรือเลือก"
                                            onChange={(e) => { updateForm("moneyType", e.target.value); setMoneyTypeSearch(e.target.value); setShowMoneyTypeDropdown(true); }}
                                            onFocus={() => { setMoneyTypeSearch(form.moneyType); setShowMoneyTypeDropdown(true); }}
                                        />
                                        {showMoneyTypeDropdown && (filteredMoneyTypes.length > 0 || moneyTypeSearch) && (
                                            <div className={cn(dropdownListCls, "p-1.5")}>
                                                <div className="flex flex-col gap-1">
                                                    {filteredMoneyTypes.map((m) => (
                                                        <button key={m.id} type="button" className={cn(dropdownItemCls, form.moneyType === m.name && "bg-blue-50 text-blue-600 font-bold")}
                                                            onClick={() => { updateForm("moneyType", m.name); setShowMoneyTypeDropdown(false); }}>
                                                            <div className="flex items-center justify-between w-full">
                                                                <span>{m.name}</span>
                                                                {form.moneyType === m.name && <Check size={12} />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {!filteredMoneyTypes.length && moneyTypeSearch && (
                                                    <div className="px-3 py-2 text-xs text-gray-400">ไม่พบประเภทเงิน</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <SaveChip
                                        onClick={() => setShowSaveMoneyTypeConfirm(true)}
                                        disabled={!form.moneyType.trim() || moneyTypes.some((m) => m.name === form.moneyType.trim())}
                                    />
                                </div>
                            </div>

                            <div className="col-span-3">{renderSelect("acquisitionMethod", "วิธีการได้มา", acquisitionMethods)}</div>
                            <div className="col-span-3">{renderSelect("location", "ใช้ประจำที่ไหน", locations)}</div>

                            <div className="col-span-3">
                                {renderSelect("status", "สถานะ", statuses, true)}
                            </div>

                            {/* ผู้รับของ */}
                            <div className="col-span-6">
                                <FieldLabel>ผู้รับของ</FieldLabel>
                                <div className="flex gap-1.5">
                                    <div ref={receiverDropdownRef} className="relative flex-1">
                                        <input
                                            type="text" className={inputCls}
                                            value={form.receivedBy}
                                            placeholder="ชื่อผู้รับของ"
                                            onChange={(e) => { updateForm("receivedBy", e.target.value); setReceiverSearch(e.target.value); setShowReceiverDropdown(true); }}
                                            onFocus={() => { setReceiverSearch(form.receivedBy); setShowReceiverDropdown(true); }}
                                        />
                                        {showReceiverDropdown && (filteredReceivers.length > 0 || receiverSearch) && (
                                            <div className={cn(dropdownListCls, "p-1.5")}>
                                                <div className="flex flex-col gap-1">
                                                    {filteredReceivers.map((r) => (
                                                        <button key={r.id} type="button" className={cn(dropdownItemCls, form.receivedBy === r.name && "bg-blue-50 text-blue-600 font-bold")}
                                                            onClick={() => { updateForm("receivedBy", r.name); setShowReceiverDropdown(false); }}>
                                                            <div className="flex items-center justify-between w-full">
                                                                <span>{r.name}</span>
                                                                {form.receivedBy === r.name && <Check size={12} />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {!filteredReceivers.length && receiverSearch && (
                                                    <div className="px-3 py-2 text-xs text-gray-400">ไม่พบรายชื่อ</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <SaveChip
                                        onClick={() => setShowSaveReceiverConfirm(true)}
                                        disabled={!form.receivedBy.trim() || receivers.some((r) => r.name === form.receivedBy.trim())}
                                    />
                                </div>
                            </div>

                            {/* ผู้บันทึก */}
                            <div className="col-span-6">
                                <FieldLabel>ผู้บันทึก</FieldLabel>
                                <div className="flex gap-1.5">
                                    <div ref={recorderDropdownRef} className="relative flex-1">
                                        <input
                                            type="text" className={inputCls}
                                            value={form.createdBy}
                                            placeholder="ชื่อผู้บันทึก"
                                            onChange={(e) => { updateForm("createdBy", e.target.value); setRecorderSearch(e.target.value); setShowRecorderDropdown(true); }}
                                            onFocus={() => { setRecorderSearch(form.createdBy); setShowRecorderDropdown(true); }}
                                        />
                                        {showRecorderDropdown && (filteredRecorders.length > 0 || recorderSearch) && (
                                            <div className={cn(dropdownListCls, "p-1.5")}>
                                                <div className="flex flex-col gap-1">
                                                    {filteredRecorders.map((r) => (
                                                        <button key={r.id} type="button" className={cn(dropdownItemCls, form.createdBy === r.name && "bg-blue-50 text-blue-600 font-bold")}
                                                            onClick={() => { updateForm("createdBy", r.name); setShowRecorderDropdown(false); }}>
                                                            <div className="flex items-center justify-between w-full">
                                                                <span>{r.name}</span>
                                                                {form.createdBy === r.name && <Check size={12} />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {!filteredRecorders.length && recorderSearch && (
                                                    <div className="px-3 py-2 text-xs text-gray-400">ไม่พบรายชื่อ</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <SaveChip
                                        onClick={() => setShowSaveRecorderConfirm(true)}
                                        disabled={!form.createdBy.trim() || recorders.some((r) => r.name === form.createdBy.trim())}
                                    />
                                </div>
                            </div>

                            {/* หมายเหตุ */}
                            <div className="col-span-12">
                                <FieldLabel>หมายเหตุ</FieldLabel>
                                <textarea
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-blue-400 transition-all placeholder:text-gray-300 resize-none"
                                    value={form.remark}
                                    onChange={(e) => updateForm("remark", e.target.value)}
                                    placeholder="เพิ่มหมายเหตุ..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: ตำแหน่งที่ตั้ง ── */}
                    <div id="section-location" className="bg-white rounded-xl border border-slate-200 px-5 py-5 scroll-mt-28">
                        <SectionHeader
                            icon={<MapPin size={15} className="text-emerald-500" />}
                            label="ตำแหน่งที่ตั้ง"
                            sub="พิกัดและรายละเอียดสถานที่"
                            accent="bg-emerald-50"
                        />

                        <div className="grid grid-cols-12 gap-3 mb-4">
                            <div className="col-span-3">
                                <FieldLabel>ใช้ประจำที่ไหน</FieldLabel>
                                <FakeReadonly value={form.location} placeholder="— เลือกจากข้อมูลพื้นฐาน —" />
                            </div>
                            <div className="col-span-5">
                                {renderInput("locationDetail", "รายละเอียดตำแหน่ง", "text", false, "เช่น ชั้น 2 ห้อง 204")}
                            </div>
                            <div className="col-span-2">
                                {renderInput("latitude", "ละติจูด", "number", false, "17.5371", undefined, true)}
                            </div>
                            <div className="col-span-2">
                                {renderInput("longitude", "ลองจิจูด", "number", false, "101.7178", undefined, true)}
                            </div>
                        </div>

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

                        {showMap && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
                                <MapPicker
                                    height="500px"
                                    latitude={form.latitude ? parseFloat(form.latitude) : undefined}
                                    longitude={form.longitude ? parseFloat(form.longitude) : undefined}
                                    onLocationSelect={(lat: number, lng: number, mapPinId?: string | null) => {
                                        updateForm("latitude", lat.toString());
                                        updateForm("longitude", lng.toString());
                                        updateForm("mapPinId", mapPinId || "");
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Section 3: รูปภาพ ── */}
                    <div id="section-images" className="bg-white rounded-xl border border-slate-200 px-5 py-5 scroll-mt-28">
                        <SectionHeader
                            icon={<ImageIcon size={15} className="text-violet-500" />}
                            label="รูปภาพประกอบ"
                            sub="อัปโหลดหรือวางลิงก์รูปภาพ"
                            accent="bg-violet-50"
                        />

                        <div className="flex gap-2 items-end mb-1">
                            <div className="flex-1 max-w-md">
                                {renderInput("imageUrl", "ลิงก์รูปภาพ (URL)", "url", false, "https://example.com/image.jpg")}
                            </div>
                            <button
                                type="button" onClick={handleAddImageUrl}
                                disabled={!form.imageUrl?.trim()}
                                className={cn(
                                    "h-10 px-4 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-gray-50 text-[12px] font-bold text-gray-500 transition-all whitespace-nowrap shadow-sm",
                                    !form.imageUrl?.trim()
                                        ? "opacity-30 cursor-not-allowed"
                                        : "cursor-pointer active:scale-95 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
                                )}
                            >
                                <Plus size={14} /> เพิ่มจากลิงก์
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-600 mb-4 font-medium">
                            คลิกขวาที่รูป → คัดลอกที่อยู่รูปภาพ (Copy Image Address)
                        </p>

                        {form.imageUrl?.startsWith("http") && (
                            <div className="mb-4">
                                <FieldLabel>ตัวอย่างจากลิงก์</FieldLabel>
                                <div
                                    className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-gray-50 cursor-pointer"
                                    onClick={() => setViewingIndex(0)}
                                >
                                    <img
                                        src={form.imageUrl} alt="preview"
                                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Upload size={14} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{uploading ? "กำลังอัปโหลด..." : "คลิกหรือลากไฟล์มาวางที่นี่"}</p>
                                <p className="text-[11px] text-slate-600 mt-0.5 font-medium">รองรับ JPG, PNG, WEBP — เลือกหลายไฟล์ได้</p>
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

                        {allImages.length > 0 && (
                            <div className="mt-4">
                                <p className="text-[11px] text-slate-600 mb-2 font-medium">รูปภาพที่เลือก ({allImages.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {allImages.map((url, idx) => {
                                        const isUrlPreview = form.imageUrl?.startsWith("http") && idx === 0;
                                        const uploadIdx = form.imageUrl?.startsWith("http") ? idx - 1 : idx;
                                        return (
                                            <div key={idx} className="group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-gray-50 shrink-0">
                                                <img
                                                    src={url} alt={`img-${idx}`}
                                                    onClick={() => setViewingIndex(idx)}
                                                    className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                                {!isUrlPreview && (
                                                    <button
                                                        type="button" onClick={() => removeImage(uploadIdx)}
                                                        aria-label="ลบรูปภาพประกอบ"
                                                        title="ลบรูปภาพ"
                                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                </form>
            </div>

            {/* ── Modals ── */}
            <ConfirmModal
                isOpen={showSaveReceiverConfirm}
                onClose={() => setShowSaveReceiverConfirm(false)}
                onConfirm={handleSaveReceiver}
                title="บันทึกรายชื่อผู้รับของ"
                description={`คุณต้องการบันทึก "${form.receivedBy}" เป็นรายชื่อผู้รับของใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก"
                isLoading={isSavingReceiver}
                type="primary"
            />
            <ConfirmModal
                isOpen={showSaveRecorderConfirm}
                onClose={() => setShowSaveRecorderConfirm(false)}
                onConfirm={handleSaveRecorder}
                title="บันทึกรายชื่อผู้บันทึก"
                description={`คุณต้องการบันทึก "${form.createdBy}" เป็นรายชื่อผู้บันทึกใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก"
                isLoading={isSavingRecorder}
                type="primary"
            />
            <ConfirmModal
                isOpen={showSaveMoneyTypeConfirm}
                onClose={() => setShowSaveMoneyTypeConfirm(false)}
                onConfirm={handleSaveMoneyType}
                title="บันทึกประเภทเงิน"
                description={`คุณต้องการบันทึก "${form.moneyType}" เป็นประเภทเงินใหม่หรือไม่?`}
                confirmText="บันทึกข้อมูล" cancelText="ยกเลิก"
                isLoading={isSavingMoneyType}
                type="primary"
            />
            <ImageModal
                isOpen={viewingIndex !== null}
                onClose={() => setViewingIndex(null)}
                images={allImages}
                initialIndex={viewingIndex ?? 0}
                onDelete={async (deletedIdx) => {
                    const hasUrlPreview = form.imageUrl?.startsWith("http");
                    if (hasUrlPreview && deletedIdx === 0) {
                        updateForm("imageUrl", "");
                    } else {
                        const uploadIdx = hasUrlPreview ? deletedIdx - 1 : deletedIdx;
                        removeImage(uploadIdx);
                    }
                }}
            />
        </div>
    );
}