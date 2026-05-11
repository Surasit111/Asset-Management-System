"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
    Search, Plus, Edit3, Trash2, Layers, PlusCircle,
    Tag, DollarSign, Building, Package, MoreHorizontal,
    AlertTriangle, X, Loader2,
    Calendar, GripVertical, Info, Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

// ── Types ───────────────────────────────────────────────────────────────────
interface CategoryType {
    id: string;
    label: string;
    icon: React.ElementType;
}

interface Category {
    id: string;
    name: string;
    description?: string;
    type: string;
    isActive: boolean;
    color?: string;
    sortOrder: number;
    createdAt: string;
    createdBy?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
    status: Tag,
    acquisition_method: PlusCircle,
    money_type: DollarSign,
    department: Building,
    unit: Package,
    location: Layers,
    recipient: MoreHorizontal,
    recorder: Calendar,
};

const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }) : "-";

// ── Shared Modal Shell ───────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            {children}
        </div>
    );
}

function ModalCard({ title, onClose, children, danger }: {
    title: string; onClose: () => void; children: React.ReactNode; danger?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 border border-slate-200 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    {danger && (
                        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                            <AlertTriangle size={16} className="text-red-500" />
                        </div>
                    )}
                    <h2 className="text-[17px] font-extrabold text-slate-900 m-0">{title}</h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 cursor-pointer">
                    <X size={16} />
                </button>
            </div>
            {children}
        </motion.div>
    );
}

function ModalFooter({ saving, onCancel, onConfirm, confirmLabel }: {
    saving: boolean; onCancel: () => void; onConfirm: () => void; confirmLabel: string;
}) {
    return (
        <div className="flex justify-end gap-2 mt-5">
            <button onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-400 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                ยกเลิก
            </button>
            <button onClick={onConfirm} disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer border-none">
                {saving ? "กำลังบันทึก..." : confirmLabel}
            </button>
        </div>
    );
}

// ── Category Item Modal ──────────────────────────────────────────────────────
function CategoryModal({ initial, typeId, onSave, onClose }: {
    initial?: Category | null; typeId: string;
    onSave: (data: Partial<Category>) => Promise<void>; onClose: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [saving, setSaving] = useState(false);
    const submit = async () => {
        if (!name.trim()) { toast.error("กรุณากรอกชื่อหมวดหมู่"); return; }
        setSaving(true);
        try { await onSave({ name: name.trim(), description: description.trim(), type: typeId }); onClose(); }
        finally { setSaving(false); }
    };
    return (
        <Overlay onClose={onClose}>
            <ModalCard title={initial ? "แก้ไขรายการ" : "เพิ่มรายการหมวดหมู่"} onClose={onClose}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                            ชื่อ <span className="text-red-400">*</span>
                        </label>
                        <input autoFocus
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none hover:border-blue-600 focus:border-blue-600 transition-all"
                            placeholder="ระบุชื่อ..." value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && submit()} />
                    </div>
                </div>
                <ModalFooter saving={saving} onCancel={onClose} onConfirm={submit}
                    confirmLabel={initial ? "บันทึก" : "เพิ่มรายการ"} />
            </ModalCard>
        </Overlay>
    );
}

// ── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ category, usageCount, onConfirm, onCancel, isBulk, bulkCount }: {
    category?: Category | null; usageCount: number; onConfirm: () => void; onCancel: () => void;
    isBulk?: boolean; bulkCount?: number;
}) {
    return (
        <Overlay onClose={onCancel}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] p-6 sm:p-8 text-center flex flex-col items-center relative z-10 border border-slate-200 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
            >
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5 ring-8 ring-red-50/50">
                    <Trash2 size={28} className="text-red-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                    {isBulk ? "ยืนยันการลบหลายรายการ" : "ยืนยันการลบข้อมูล"}
                </h2>
                <p className="text-[15px] text-slate-500 mb-6 leading-relaxed">
                    {isBulk ? (
                        <>คุณกำลังจะลบรายการที่เลือกทั้งหมด <span className="font-bold text-slate-800">{bulkCount} รายการ</span></>
                    ) : (
                        <>คุณกำลังจะลบ <span className="font-bold text-slate-800">"{category?.name}"</span></>
                    )}
                    <br />การกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่?
                </p>
                {usageCount > 0 && (
                    <div className="w-full flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-100 rounded-xl mb-6 text-left">
                        <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[14px] font-bold text-red-800 m-0">ตรวจพบรายการที่ถูกใช้งาน!</p>
                            <p className="text-[13px] text-red-600 m-0 mt-0.5">
                                {isBulk ? (
                                    <>มีบางรายการที่เลือกกำลังถูกใช้งานอยู่ หากลบทิ้งอาจส่งผลต่อข้อมูลครุภัณฑ์ได้</>
                                ) : (
                                    <>มีจำนวน <span className="font-bold">{usageCount} รายการ</span> ที่ผูกอยู่กับข้อมูลนี้</>
                                )}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex w-full gap-3 mt-2">
                    <button onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl text-[14px] font-bold text-slate-500 bg-white hover:bg-slate-50 transition-all active:scale-[0.98] border border-slate-200 cursor-pointer shadow-sm">
                        ยกเลิก
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl text-[14px] font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-md active:scale-[0.98] border-none cursor-pointer">
                        ยืนยันการลบ
                    </button>
                </div>
            </motion.div>
        </Overlay>
    );
}

// ── Guidance Modal ─────────────────────────────────────────────────────────────
function MockDraggableRow({ label, idx, onDragStart, onDragEnter, onDragEnd }: {
    label: string; idx: number;
    onDragStart: (i: number) => void;
    onDragEnter: (i: number) => void;
    onDragEnd: () => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const dragCounter = useRef(0);

    return (
        <div
            draggable
            onDragStart={() => { setIsDragging(true); onDragStart(idx); }}
            onDragEnter={() => { dragCounter.current++; if (dragCounter.current === 1) { setIsOver(true); onDragEnter(idx); } }}
            onDragLeave={() => { dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setIsOver(false); } }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); dragCounter.current = 0; setIsOver(false); }}
            onDragEnd={() => { setIsDragging(false); setIsOver(false); dragCounter.current = 0; onDragEnd(); }}
            className={cn(
                "w-full bg-white border rounded-lg shadow-sm px-4 h-[52px] flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 select-none",
                isDragging ? "opacity-30 border-dashed border-slate-400" : "border-slate-200",
                isOver ? "bg-blue-50 ring-2 ring-inset ring-blue-500 shadow-md z-10" : "hover:border-slate-300"
            )}
        >
            <GripVertical size={18} className="text-slate-400" />
            <span className="text-[14px] font-semibold text-slate-700">{label}</span>
        </div>
    );
}

function GuidanceModal({ onClose }: { onClose: () => void }) {
    const [mockItems, setMockItems] = useState([
        { id: 1, label: "รายการที่ 1 (ตัวอย่าง)" },
        { id: 2, label: "รายการที่ 2 (ตัวอย่าง)" },
        { id: 3, label: "รายการที่ 3 (ตัวอย่าง)" },
    ]);
    const dragIdx = useRef(-1);
    const enterIdx = useRef(-1);

    const handleDragEnd = () => {
        if (dragIdx.current !== -1 && enterIdx.current !== -1 && dragIdx.current !== enterIdx.current) {
            const arr = [...mockItems];
            const [moved] = arr.splice(dragIdx.current, 1);
            arr.splice(enterIdx.current, 0, moved);
            setMockItems(arr);
        }
        dragIdx.current = -1; enterIdx.current = -1;
    };

    return (
        <Overlay onClose={onClose}>
            <ModalCard title="คำแนะนำการจัดเรียงลำดับ" onClose={onClose}>
                <div className="space-y-5">
                    <p className="text-[14px] text-slate-600 leading-relaxed m-0">
                        คุณสามารถเปลี่ยนลำดับได้ง่ายๆ โดย <strong className="text-slate-800">คลิกค้างที่รายการ</strong> แล้วลากไปตำแหน่งที่ต้องการ
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-2.5">
                        {mockItems.map((item, idx) => (
                            <MockDraggableRow key={item.id} label={item.label} idx={idx}
                                onDragStart={i => { dragIdx.current = i; }}
                                onDragEnter={i => { enterIdx.current = i; }}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                    <div className="flex justify-end pt-2">
                        <button onClick={onClose}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-md active:scale-[0.98] cursor-pointer border-none">
                            เข้าใจแล้ว
                        </button>
                    </div>
                </div>
            </ModalCard>
        </Overlay>
    );
}

// ── Draggable Row ────────────────────────────────────────────────────────────
const DraggableRow = React.memo(({ cat, idx, usageCount, isSelected, isOverOverride, onSelect, onEdit, onDelete, onToggle, onDragStart, onDragEnter, onDragEnd }: {
    cat: Category; idx: number; usageCount: number; isSelected: boolean; isOverOverride?: boolean;
    onSelect: (id: string) => void; onEdit: () => void; onDelete: () => void; onToggle: () => void;
    onDragStart: (i: number) => void;
    onDragEnter: (i: number) => void;
    onDragEnd: () => void;
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const dragCounter = useRef(0);

    const onTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const row = target?.closest("[data-idx]");
        if (row) {
            const idxAttr = row.getAttribute("data-idx");
            if (idxAttr) {
                const targetIdx = parseInt(idxAttr);
                onDragEnter(targetIdx);
            }
        }
    };

    return (
        <div
            draggable
            data-idx={idx}
            onDragStart={() => { setIsDragging(true); onDragStart(idx); }}
            onDragEnter={() => { dragCounter.current++; if (dragCounter.current === 1) { setIsOver(true); onDragEnter(idx); } }}
            onDragLeave={() => { dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setIsOver(false); } }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); dragCounter.current = 0; setIsOver(false); }}
            onDragEnd={() => { setIsDragging(false); setIsOver(false); dragCounter.current = 0; onDragEnd(); }}
            onTouchStart={() => { onDragStart(idx); }}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { onDragEnd(); }}
            className={cn(
                "flex flex-col sm:grid items-start sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-4 sm:h-[52px] transition-all duration-200 select-none relative shrink-0",
                "sm:grid-cols-[40px_28px_1fr_80px_100px_120px_80px]",
                isDragging ? "opacity-30 bg-slate-50 rounded-xl" : "",
                (isOver || isOverOverride) ? "bg-blue-50/80 ring-2 ring-inset ring-blue-500 shadow-md z-10 rounded-xl" : "hover:bg-slate-100/80",
                !cat.isActive && !isDragging && !isOver && "opacity-50"
            )}
        >
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-center mb-2 sm:mb-0">
                <div className="flex items-center gap-3 sm:hidden">
                    <div className="flex justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 transition-colors p-2 -ml-2 touch-none select-none">
                        <GripVertical size={20} strokeWidth={2.5} />
                    </div>
                    <div onClick={e => { e.stopPropagation(); onSelect(cat.id); }}
                        className={cn(
                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
                            isSelected ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-300 hover:border-blue-400"
                        )}>
                        {isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                    </div>
                </div>

                <div className="hidden sm:flex justify-center">
                    <div onClick={e => { e.stopPropagation(); onSelect(cat.id); }}
                        className={cn(
                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
                            isSelected ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-300 hover:border-blue-400"
                        )}>
                        {isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                    </div>
                </div>

                <div className="flex sm:hidden items-center gap-1">
                    <button onClick={onEdit}
                        className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border-none bg-transparent">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={onDelete}
                        className={cn("p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent",
                            usageCount > 0 ? "text-amber-600 hover:text-amber-800 hover:bg-amber-100" : "text-slate-600 hover:text-red-600 hover:bg-red-100")}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="hidden sm:flex justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 transition-colors touch-none select-none">
                <GripVertical size={18} strokeWidth={2.5} />
            </div>

            <div className="min-w-0 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-2.5">
                    <p className="text-[15px] sm:text-[15px] font-bold sm:font-semibold text-slate-700 m-0 truncate">{cat.name}</p>
                    <div className="flex sm:hidden items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            usageCount > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200")}>
                            {usageCount} ใช้งาน
                        </span>
                        <button onClick={onToggle}
                            className={cn(
                                "relative flex items-center p-1 rounded-full transition-colors duration-300 cursor-pointer w-[38px] h-[20px] shrink-0 border-none shadow-sm",
                                cat.isActive !== false ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300 hover:bg-slate-400"
                            )}>
                            <div className={cn(
                                "absolute left-1 w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out",
                                cat.isActive !== false ? "translate-x-[18px]" : "translate-x-0"
                            )} />
                        </button>
                    </div>
                </div>
                {cat.description && <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">{cat.description}</p>}
                
                <div className="flex sm:hidden items-center gap-3 mt-2 pt-2 border-t border-slate-100 w-full">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[12px] font-medium text-slate-500">{fmtDate(cat.createdAt)}</span>
                    </div>
                </div>
            </div>

            <div className="hidden sm:flex justify-center">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                    usageCount > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200")}>
                    {usageCount}
                </span>
            </div>
            
            <div className="hidden sm:flex justify-center">
                <button onClick={onToggle}
                    className={cn(
                        "relative flex items-center p-1 rounded-full transition-colors duration-300 cursor-pointer w-[44px] h-[24px] shrink-0 border-none shadow-sm",
                        cat.isActive !== false ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300 hover:bg-slate-400"
                    )}>
                    <div className={cn(
                        "absolute left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out",
                        cat.isActive !== false ? "translate-x-[20px]" : "translate-x-0"
                    )} />
                </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-600">{fmtDate(cat.createdAt)}</span>
            </div>

            <div className="hidden sm:flex items-center justify-end gap-1">
                <button onClick={onEdit}
                    className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border-none bg-transparent">
                    <Edit3 size={16} />
                </button>
                <button onClick={onDelete}
                    className={cn("p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent",
                        usageCount > 0 ? "text-amber-600 hover:text-amber-800 hover:bg-amber-100" : "text-slate-600 hover:text-red-600 hover:bg-red-100")}>
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.cat.id === next.cat.id &&
        prev.cat.name === next.cat.name &&
        prev.cat.isActive === next.cat.isActive &&
        prev.usageCount === next.usageCount &&
        prev.isSelected === next.isSelected &&
        prev.isOverOverride === next.isOverOverride &&
        prev.idx === next.idx
    );
});

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function CategoriesPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const router = useRouter();

    const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [typesLoaded, setTypesLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState("");
    const [search, setSearch] = useState("");
    const [usageCount, setUsageCount] = useState<Record<string, number>>({});
    const [dragOverIdx, setDragOverIdx] = useState<number>(-1);

    const [showAddItem, setShowAddItem] = useState(false);
    const [showGuidance, setShowGuidance] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [isBulkDelete, setIsBulkDelete] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const dragIdx = useRef<number>(-1);
    const enterIdx = useRef<number>(-1);

    // ── Auth Check ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (sessionPending) return;
        if (!session || session.user.role !== "admin") {
            router.push("/dashboard");
        }
    }, [session, sessionPending, router]);

    // ── Load types ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetch("/api/category-types")
            .then(r => r.ok ? r.json() : [])
            .then((data: { typeKey: string; label: string }[]) => {
                if (data.length > 0) {
                    const mappedTypes = data.map(d => ({
                        id: d.typeKey,
                        label: d.label,
                        icon: ICON_MAP[d.typeKey] || Tag,
                    }));
                    setCategoryTypes(mappedTypes);
                    setActiveTab(mappedTypes[0].id);
                }
                setTypesLoaded(true);
            })
            .catch(() => setTypesLoaded(true));
    }, []);

    const fetchAll = useCallback(async () => {
        if (categoryTypes.length === 0) { setLoading(false); return; }
        setLoading(true);
        try {
            const results = await Promise.all(
                categoryTypes.map(type =>
                    fetch(`/api/categories?type=${type.id}`)
                        .then(r => r.ok ? r.json() : [])
                        .catch(() => [] as Category[])
                )
            );
            const all: Category[] = results.flat();
            setCategories(all);

            try {
                const usageRes = await fetch("/api/categories/usage-count");
                if (usageRes.ok) {
                    const usageData: Record<string, number> = await usageRes.json();
                    setUsageCount(usageData);
                }
            } catch { }
        } catch {
            toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, [categoryTypes]);

    useEffect(() => {
        if (typesLoaded) fetchAll();
    }, [fetchAll, typesLoaded]);

    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        categoryTypes.forEach(t => { c[t.id] = categories.filter(x => x.type === t.id).length; });
        return c;
    }, [categories, categoryTypes]);

    const filtered = useMemo(() =>
        categories
            .filter(c => c.type === activeTab && c.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        [categories, activeTab, search]
    );

    // ── CRUD ───────────────────────────────────────────────────────────────
    const handleSaveItem = async (data: Partial<Category>) => {
        if (editTarget) {
            const res = await fetch(`/api/categories/${editTarget.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error();
            toast.success("แก้ไขสำเร็จ");
        } else {
            const res = await fetch("/api/categories", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, sortOrder: filtered.length }),
            });
            if (!res.ok) throw new Error();
            toast.success("เพิ่มรายการสำเร็จ");
        }
        await fetchAll();
    };

    const handleDelete = async () => {
        if (isBulkDelete) {
            try {
                await Promise.all(selectedIds.map(id => fetch(`/api/categories/${id}`, { method: "DELETE" })));
                setCategories(prev => prev.filter(c => !selectedIds.includes(c.id)));
                setSelectedIds([]);
                toast.success("ลบรายการที่เลือกทั้งหมดเรียบร้อยแล้ว");
            } catch { toast.error("เกิดข้อผิดพลาดในการลบบางรายการ"); }
            finally { setIsBulkDelete(false); }
            return;
        }

        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
            toast.success("ลบสำเร็จ");
        } catch { toast.error("ไม่สามารถลบได้"); }
        finally { setDeleteTarget(null); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(c => c.id));
        }
    };

    const handleToggle = async (cat: Category) => {
        try {
            const res = await fetch(`/api/categories/${cat.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            if (!res.ok) throw new Error();
            setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
            toast.success(cat.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน");
        } catch { toast.error("ไม่สามารถเปลี่ยนสถานะได้"); }
    };

    // ── Drag & Drop ────────────────────────────────────────────────────────
    const handleDragEnd = useCallback(() => {
        const from = dragIdx.current;
        const to = enterIdx.current;
        setDragOverIdx(-1);
        if (from === -1 || to === -1 || from === to) return;
        const reordered = [...filtered];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        const updated = reordered.map((c, i) => ({ ...c, sortOrder: i }));
        setCategories(prev => [...prev.filter(c => c.type !== activeTab), ...updated]);
        updated.forEach(c => {
            fetch(`/api/categories/${c.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sortOrder: c.sortOrder }),
            }).catch(() => { });
        });
        dragIdx.current = -1;
        enterIdx.current = -1;
    }, [filtered, activeTab]);

    // ── Render ─────────────────────────────────────────────────────────────
    if (sessionPending) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-100 min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== "admin") {
        return null;
    }

    return (
        <>
            <AnimatePresence>
                {(showAddItem || editTarget) && (
                    <CategoryModal initial={editTarget} typeId={activeTab} onSave={handleSaveItem}
                        onClose={() => { setShowAddItem(false); setEditTarget(null); }} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(deleteTarget || isBulkDelete) && (
                    <DeleteModal
                        category={deleteTarget}
                        usageCount={isBulkDelete ? selectedIds.reduce((acc, id) => acc + (usageCount[id] || 0), 0) : (usageCount[deleteTarget?.id || ""] ?? 0)}
                        onConfirm={handleDelete}
                        onCancel={() => { setDeleteTarget(null); setIsBulkDelete(false); }}
                        isBulk={isBulkDelete}
                        bulkCount={selectedIds.length}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGuidance && <GuidanceModal onClose={() => setShowGuidance(false)} />}
            </AnimatePresence>

            <div className="min-h-screen bg-white sm:bg-slate-100 lg:-m-6">
                <main className="px-0 pt-0 pb-0 sm:pt-8 sm:pb-5 sm:px-6 lg:px-10 h-screen sm:h-[calc(100vh-52px)] w-full">
                    <div className="flex flex-col bg-white sm:rounded-xl sm:border border-slate-200 overflow-hidden h-full sm:shadow-[0_0_40px_rgba(0,0,0,0.06)]">
                        
                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 shrink-0 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden h-auto sm:h-[76px] gap-4">
                            <h1 className="text-xl sm:text-[22px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight shrink-0">จัดการหมวดหมู่</h1>

                            <div className="absolute top-0 right-0 bottom-0 left-0 sm:left-[259.3px] pointer-events-none">
                                <AnimatePresence>
                                    {selectedIds.length > 0 && (
                                        <motion.div
                                            initial={{ y: -80, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -80, opacity: 0 }}
                                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                            className="absolute inset-0 z-50 flex items-center justify-between sm:justify-start gap-4 px-4 sm:px-6 py-2 bg-white border-l border-slate-200 pointer-events-auto shadow-[inset_0_-2px_10px_rgba(37,99,235,0.03)]"
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                                        <Check size={18} className="text-blue-600" strokeWidth={3} />
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[15px] sm:text-[17px] font-bold text-slate-900 m-0 leading-tight truncate">จัดการกลุ่ม</p>
                                                    <p className="text-[11px] sm:text-[13px] text-blue-600 font-bold m-0 mt-0.5 animate-pulse">
                                                        เลือก {selectedIds.length} รายการ
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                                <button onClick={() => setSelectedIds([])} className="px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer border border-slate-200 bg-white">ยกเลิก</button>
                                                <button onClick={() => setIsBulkDelete(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-[12px] sm:text-[13px] font-bold rounded-lg transition-all cursor-pointer border-none shadow-lg shadow-red-500/20 active:scale-95">
                                                    <Trash2 size={14} />
                                                    <span className="hidden xs:inline">ลบที่เลือก</span>
                                                    <span className="inline xs:hidden">ลบ</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-stretch flex-1 min-h-0">
                            <aside className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col overflow-hidden h-auto lg:h-full bg-slate-50/30">
                                <div className="hidden lg:flex items-center gap-3 px-5 border-b-[1.5px] border-slate-200 shrink-0 h-[76px]">
                                    <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Layers size={18} className="text-slate-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-[19px] font-bold text-slate-900 m-0 truncate">ประเภททั้งหมด</h2>
                                        <p className="text-[13px] text-slate-500 m-0 mt-0.5">{categoryTypes.length} ประเภท</p>
                                    </div>
                                </div>
                                <div className="flex lg:flex-col gap-px px-4 sm:px-5 lg:px-2.5 py-3 lg:py-2 overflow-x-auto lg:overflow-y-auto flex-1 custom-scrollbar scrollbar-hide">
                                    {categoryTypes.map(type => {
                                        const Icon = type.icon;
                                        const isActive = activeTab === type.id;
                                        return (
                                            <div key={type.id} onClick={() => setActiveTab(type.id)} className={cn("px-4 lg:px-3 h-[38px] lg:h-[44px] shrink-0 rounded-full lg:rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer whitespace-nowrap lg:whitespace-normal border", isActive ? "bg-blue-600 lg:bg-blue-50 border-blue-600 text-white lg:text-blue-600 shadow-sm" : "text-slate-600 bg-white lg:bg-transparent hover:bg-slate-50 border-slate-200 lg:border-transparent lg:hover:border-slate-300 hover:text-slate-900")}>
                                                <div className="flex items-center gap-2.5 lg:gap-3 flex-1 min-w-0 lg:px-1">
                                                    <Icon size={14} className={cn("shrink-0", isActive ? "text-white lg:text-blue-600" : "text-slate-400 group-hover:text-slate-700")} />
                                                    <span className="text-[13px] lg:text-[14px] font-bold lg:font-semibold">{type.label}</span>
                                                </div>
                                                <div className="hidden lg:flex items-center gap-1 ml-1 shrink-0">
                                                    <span className={cn("text-xs font-bold px-1 py-0.5 min-w-[20px] text-center bg-transparent transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700")}>{counts[type.id] ?? 0}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </aside>

                            <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full bg-white relative">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 border-b-[1.5px] border-slate-200 shrink-0 h-auto sm:h-[76px] gap-4">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {(() => {
                                            const cur = categoryTypes.find(t => t.id === activeTab);
                                            const Icon = cur?.icon;
                                            return Icon ? (
                                                <>
                                                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 rounded-lg flex items-center justify-center"><Icon size={16} className="text-slate-600" /></div>
                                                    <div className="flex flex-col items-start gap-0.5 sm:gap-1 flex-1">
                                                        <h2 className="text-[17px] sm:text-[19px] font-bold text-slate-900 m-0 leading-none">{cur?.label}</h2>
                                                        <p className="text-[12px] sm:text-[13px] text-slate-500 m-0 leading-none mt-1">{filtered.length} รายการ</p>
                                                    </div>
                                                    <button onClick={() => setShowGuidance(true)} className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-blue-200 hover:border-blue-300 shadow-sm active:scale-95">
                                                        <Info size={14} className="text-blue-500 group-hover:text-blue-700" />
                                                        <span className="hidden sm:inline">คำแนะนำ</span>
                                                    </button>
                                                </>
                                            ) : null;
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:flex-initial">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[13px] outline-none w-full sm:w-48 hover:border-blue-600 focus:border-blue-600 transition-all disabled:opacity-50 text-slate-900" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} disabled={categoryTypes.length === 0} />
                                        </div>
                                        <button onClick={() => { setEditTarget(null); setShowAddItem(true); }} disabled={categoryTypes.length === 0} className={cn("group flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 whitespace-nowrap border-none", categoryTypes.length === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-[0.98] cursor-pointer")}>
                                            <Plus size={15} />เพิ่ม
                                        </button>
                                    </div>
                                </div>

                                <div className="hidden sm:grid items-center gap-4 px-5 py-3.5 bg-[#fafafa] border-b-[1.5px] border-slate-200 text-[14px] font-bold text-slate-700 sm:grid-cols-[40px_28px_1fr_80px_100px_120px_80px] h-[52px]">
                                    <div className="flex justify-center">
                                        <div onClick={toggleSelectAll} className={cn("w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer", selectedIds.length > 0 && selectedIds.length === filtered.length ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-300 hover:border-blue-400")}>
                                            {selectedIds.length > 0 && selectedIds.length === filtered.length && <Check size={14} strokeWidth={4} className="text-white" />}
                                            {selectedIds.length > 0 && selectedIds.length < filtered.length && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
                                        </div>
                                    </div>
                                    <div /><div>ชื่อ</div><div className="text-center">ใช้งาน</div><div className="text-center">สถานะ</div><div>สร้างเมื่อ</div><div className="text-end">จัดการ</div>
                                </div>

                                <div className="divide-y divide-slate-200 overflow-y-auto custom-scrollbar flex-1">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => <div key={i} className="h-14 px-5 animate-pulse bg-slate-50/60" />)
                                    ) : categoryTypes.length === 0 ? (
                                        <div className="py-20 text-center"><div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3"><Layers size={20} className="text-slate-300" /></div><p className="text-sm font-bold text-slate-400 m-0">กรุณาติดต่อผู้ดูแลระบบเพื่อสร้าง "ประเภทหมวดหมู่"</p></div>
                                    ) : filtered.length === 0 ? (
                                        <div className="py-20 text-center"><div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3"><PlusCircle size={20} className="text-slate-300" /></div><p className="text-sm font-bold text-slate-400 m-0">ยังไม่มีรายการในหมวดหมู่นี้</p></div>
                                    ) : (
                                        filtered.map((cat, idx) => (
                                            <DraggableRow
                                                key={cat.id} cat={cat} idx={idx}
                                                usageCount={usageCount[cat.id] ?? 0}
                                                isSelected={selectedIds.includes(cat.id)}
                                                isOverOverride={dragOverIdx === idx}
                                                onSelect={toggleSelect}
                                                onEdit={() => setEditTarget(cat)}
                                                onDelete={() => setDeleteTarget(cat)}
                                                onToggle={() => handleToggle(cat)}
                                                onDragStart={i => { dragIdx.current = i; }}
                                                onDragEnter={i => { enterIdx.current = i; setDragOverIdx(i); }}
                                                onDragEnd={handleDragEnd}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}