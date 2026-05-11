"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Plus, Upload, ImageOff, Images,
    ChevronRight, Save, Loader2, Image as ImageIcon,
    Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssetItem {
    id: string;
    assetCode: string;
    name: string;
    imageUrl?: string | null;
    images?: { id: string; url: string }[];
}

interface BulkImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: AssetItem[];
    onSaved: () => void;
}

type ImageMap = Record<string, string[]>;

// ─── Helper ───────────────────────────────────────────────────────────────────
const buildInitialMap = (assets: AssetItem[]): ImageMap => {
    const map: ImageMap = {};
    assets.forEach(a => {
        const urls: string[] = [];
        if (a.imageUrl) urls.push(a.imageUrl);
        (a.images || []).forEach(img => { if (!urls.includes(img.url)) urls.push(img.url); });
        map[a.id] = urls;
    });
    return map;
};

// ─── Sub-component: Thumbnail ─────────────────────────────────────────────────
function Thumbnail({ url, onRemove, onClick }: { url: string; onRemove: () => void; onClick: () => void }) {
    return (
        <div className="group relative w-28 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 cursor-zoom-in shadow-sm transition-all"
            onClick={onClick}>
            <img src={url} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/2 transition-colors pointer-events-none" />
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 backdrop-blur-sm text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 hover:text-white shadow-sm">
                <X size={12} />
            </button>
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function BulkImageModal({ isOpen, onClose, assets, onSaved }: BulkImageModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageMap, setImageMap] = useState<ImageMap>({});
    const [originalMap, setOriginalMap] = useState<ImageMap>({});
    const [localAssets, setLocalAssets] = useState<AssetItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showUploadPanel, setShowUploadPanel] = useState(true);
    const [urlInput, setUrlInput] = useState("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    // ── init on open ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && assets.length > 0) {
            const map = buildInitialMap(assets);
            setImageMap(map);
            setOriginalMap(map);
            setLocalAssets(assets);
            setActiveId(assets[0].id);
            setShowUploadPanel(true);
            setUrlInput("");
        }
    }, [isOpen, assets]);

    // ── escape key ────────────────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (viewingUrl) setViewingUrl(null);
                else onClose();
            }
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [onClose, viewingUrl]);

    // ── derived ───────────────────────────────────────────────────────────────
    const activeAsset = localAssets.find(a => a.id === activeId) || null;
    const activeImages = activeId ? (imageMap[activeId] || []) : [];

    // ── add URL ───────────────────────────────────────────────────────────────
    const addUrlToActive = () => {
        if (!activeId || !urlInput.trim()) return;
        const url = urlInput.trim();
        if (!url.startsWith("http")) { toast.error("URL ต้องขึ้นต้นด้วย http หรือ https"); return; }
        setImageMap(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), url] }));
        setUrlInput("");
        toast.success("เพิ่มรูปภาพจาก URL สำเร็จ");
    };

    // ── upload files ──────────────────────────────────────────────────────────
    /**
     * [FIX #5] รับ targetId เป็น param แทนการอ่าน activeId จาก closure
     * ป้องกันการ upload เข้า asset เก่าเมื่อ user เปลี่ยน activeId ระหว่าง upload
     */
    const uploadFiles = useCallback(async (files: File[], targetId: string) => {
        if (!files.length || !targetId) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of files) {
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                if (res.ok) {
                    const data = await res.json();
                    uploaded.push(data.url);
                } else {
                    toast.error(`อัปโหลด ${file.name} ล้มเหลว`);
                }
                if (files.length > 1) await new Promise(r => setTimeout(r, 200));
            }
            if (uploaded.length > 0) {
                setImageMap(prev => ({
                    ...prev,
                    [targetId]: [...(prev[targetId] || []), ...uploaded],
                }));
                toast.success(`อัปโหลด ${uploaded.length} รูปสำเร็จ`);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeId) return;
        const files = Array.from(e.target.files || []);
        // [FIX #5] จับ activeId ณ เวลาที่ user เลือกไฟล์ ส่งเป็น param ตรงๆ
        uploadFiles(files, activeId);
    }, [activeId, uploadFiles]);

    // ── remove image ──────────────────────────────────────────────────────────
    const removeImage = (assetId: string, url: string) => {
        setImageMap(prev => ({
            ...prev,
            [assetId]: (prev[assetId] || []).filter(u => u !== url),
        }));
    };

    // ── drag & drop ───────────────────────────────────────────────────────────
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!activeId) return;
        // [FIX #9] แยก upload logic ออกเป็น uploadFiles แทน fake event
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (!files.length) return;
        // จับ activeId ณ เวลา drop
        const targetId = activeId;
        await uploadFiles(files, targetId);
    }, [activeId, uploadFiles]);

    // ── changed check ─────────────────────────────────────────────────────────
    const hasChanges = (assetId: string) =>
        JSON.stringify(originalMap[assetId] || []) !== JSON.stringify(imageMap[assetId] || []);

    const changedCount = localAssets.filter(a => hasChanges(a.id)).length;

    // ── save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const toSave = localAssets.filter(a => hasChanges(a.id));
        if (toSave.length === 0) { toast("ไม่มีการเปลี่ยนแปลง", { icon: "ℹ️" }); return; }
        setSaving(true);
        try {
            const savedIds = new Set(toSave.map(a => a.id));
            await Promise.all(toSave.map(a =>
                fetch(`/api/assets/${a.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageUrls: imageMap[a.id] || [] }),
                })
            ));
            toast.success(`บันทึกรูปภาพ ${toSave.length} รายการสำเร็จ`);

            const nextAssets = localAssets.filter(a => !savedIds.has(a.id));
            setLocalAssets(nextAssets);

            if (nextAssets.length > 0) {
                // [FIX #5] ตรวจสอบ activeId ก่อน ไม่ใช้ non-null assertion
                if (activeId && savedIds.has(activeId)) {
                    setActiveId(nextAssets[0].id);
                }
            } else {
                setActiveId(null);
                onClose();
            }

            onSaved();
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-130 flex items-center justify-center p-0 lg:p-4">
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-none lg:rounded-3xl border-0 lg:border border-slate-200 shadow-2xl w-full h-full lg:h-[88vh] flex flex-col overflow-hidden font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif] relative z-10"
                            style={{ maxWidth: "1200px" }}
                            onClick={e => e.stopPropagation()}>

                            {/* ── Header ── */}
                            <div className="px-4 lg:px-6 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                                    <Images size={17} className="text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-extrabold text-[#0f172a]">เพิ่มรูปภาพหลายรายการ</p>
                                    <p className="text-[12px] text-slate-400 mt-0.5">เหลือ {localAssets.length} รายการ</p>
                                </div>
                                <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* ── Body ── */}
                            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                                {/* ══ ส่วนที่ 1: รายการ ════════════════════════════════ */}
                                <div className="w-full lg:w-[400px] xl:w-[480px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto custom-scrollbar bg-slate-50/50 h-[45%] lg:h-full">
                                    <div className="px-3 py-2 border-b border-slate-200 sticky top-0 bg-white z-10">
                                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">รายการที่เลือก</p>
                                    </div>
                                    <div className="p-2 space-y-2">
                                        {localAssets.length > 0 ? localAssets.map((asset, idx) => {
                                            const imgs = imageMap[asset.id] || [];
                                            const isActive = activeId === asset.id;
                                            const changed = hasChanges(asset.id);
                                            return (
                                                <button key={asset.id} type="button"
                                                    onClick={() => { setActiveId(asset.id); setUrlInput(""); }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-4 rounded-xl text-left transition-all duration-150 group cursor-pointer",
                                                        isActive
                                                            ? "bg-violet-600 text-white shadow-md"
                                                            : "bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 text-slate-700"
                                                    )}>
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0",
                                                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn("text-[13px] font-bold truncate", isActive ? "text-white" : "text-[#0f172a]")}>
                                                            {asset.name}
                                                        </p>
                                                        <p className={cn("text-[11px] truncate mt-0.5", isActive ? "text-white/70" : "text-slate-400")}>
                                                            {asset.assetCode}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {imgs.length > 0 ? (
                                                            <span className={cn(
                                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                                isActive ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                            )}>
                                                                <ImageIcon size={9} /> {imgs.length}
                                                            </span>
                                                        ) : (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                                isActive ? "bg-white/20 text-white/80" : "bg-slate-100 text-slate-400"
                                                            )}>ไม่มีรูป</span>
                                                        )}
                                                        {changed && (
                                                            <span className={cn(
                                                                "w-2 h-2 rounded-full ring-2",
                                                                isActive ? "bg-white ring-white/20" : "bg-violet-500 ring-violet-100"
                                                            )} title="มีการเปลี่ยนแปลง" />
                                                        )}
                                                    </div>
                                                    <ChevronRight size={13} className={cn("shrink-0 opacity-40", isActive ? "text-white" : "text-slate-400")} />
                                                </button>
                                            );
                                        }) : (
                                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-5 text-slate-200">
                                                    <Images size={36} />
                                                </div>
                                                <p className="text-[15px] font-extrabold text-slate-600">จัดการเรียบร้อยแล้ว</p>
                                                <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">ทุกรายการที่คุณเลือก<br/>ได้รับการเพิ่มรูปภาพครบถ้วนแล้ว</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ══ ส่วนที่ 2: Preview ══════════════════════════════ */}
                                <div className="flex-1 flex flex-col overflow-hidden h-[55%] lg:h-full">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {activeAsset ? (
                                            <div className="pt-2 px-5 pb-0">
                                                {/* header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-[15px] font-extrabold text-[#0f172a]">{activeAsset.name}</p>
                                                        <p className="text-[12px] text-slate-400 mt-0.5">{activeAsset.assetCode}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {activeImages.length > 0 && (
                                                            <span className="text-[12px] font-semibold text-slate-400">{activeImages.length} รูปภาพ</span>
                                                        )}
                                                        {hasChanges(activeAsset.id) && (
                                                            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">มีการเปลี่ยนแปลง</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* image grid */}
                                                {activeImages.length > 0 ? (
                                                    <div className="flex flex-wrap gap-3 mb-5">
                                                        {activeImages.map((url, i) => (
                                                            <Thumbnail key={`${url}-${i}`} url={url}
                                                                onRemove={() => removeImage(activeAsset.id, url)}
                                                                onClick={() => setViewingUrl(url)} />
                                                        ))}
                                                        <button type="button"
                                                            onClick={() => setShowUploadPanel(v => !v)}
                                                            className={cn(
                                                                "w-28 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all duration-200 shrink-0 cursor-pointer",
                                                                showUploadPanel
                                                                    ? "border-violet-400 bg-violet-50 text-violet-600"
                                                                    : "border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/50 text-slate-300 hover:text-violet-400"
                                                            )}>
                                                            <Plus size={20} />
                                                            <span className="text-[10px] font-bold">เพิ่มรูป</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-2 mb-0">
                                                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                                            <ImageOff size={28} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-[14px] font-bold text-slate-500">ยังไม่มีรูปภาพ</p>
                                                        <button type="button"
                                                            onClick={() => setShowUploadPanel(v => !v)}
                                                            className={cn(
                                                                "flex items-center gap-2 h-9 px-5 rounded-xl border-2 border-dashed text-[13px] font-bold transition-all mt-2 cursor-pointer",
                                                                showUploadPanel
                                                                    ? "border-violet-400 bg-violet-50 text-violet-600"
                                                                    : "border-slate-200 text-slate-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50"
                                                            )}>
                                                            <Plus size={15} /> เพิ่มรูปภาพ
                                                        </button>
                                                    </div>
                                                )}

                                                {/* ══ Upload Panel ══ */}
                                                <div className="mt-2" style={{ display: "grid", gridTemplateRows: showUploadPanel ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
                                                    <div style={{ overflow: "hidden", minHeight: 0 }}>
                                                        <div className="border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden">
                                                            <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
                                                                        <Upload size={13} className="text-violet-500" />
                                                                    </div>
                                                                    <p className="text-[13px] font-bold text-[#0f172a]">เพิ่มรูปภาพ</p>
                                                                </div>
                                                                <button onClick={() => setShowUploadPanel(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                                                    <X size={15} />
                                                                </button>
                                                            </div>

                                                            <div className="p-3 space-y-2">
                                                                {/* URL input */}
                                                                <div>
                                                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">ลิงก์รูปภาพ (URL)</label>
                                                                    <div className="flex gap-2">
                                                                        <div className="relative flex-1">
                                                                            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                            <input type="url" value={urlInput}
                                                                                onChange={e => setUrlInput(e.target.value)}
                                                                                onKeyDown={e => { if (e.key === "Enter") addUrlToActive(); }}
                                                                                placeholder="https://example.com/image.jpg"
                                                                                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-lg border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 hover:border-violet-400 transition-all placeholder:text-gray-300" />
                                                                        </div>
                                                                        <button type="button" onClick={addUrlToActive} disabled={!urlInput.trim()}
                                                                            className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-[13px] font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                                                                            <Plus size={14} /> เพิ่ม
                                                                        </button>
                                                                    </div>
                                                                    <AnimatePresence>
                                                                        {urlInput.startsWith("http") && (
                                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                                                                className="mt-2 flex items-center gap-2 overflow-hidden">
                                                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-gray-50 shrink-0">
                                                                                    <img src={urlInput} alt="preview" className="w-full h-full object-contain"
                                                                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                                                                </div>
                                                                                <p className="text-[11px] text-slate-400 truncate flex-1">ตัวอย่าง: {urlInput}</p>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1 h-px bg-slate-200" />
                                                                    <span className="text-[11px] text-slate-400 font-semibold">หรือ</span>
                                                                    <div className="flex-1 h-px bg-slate-200" />
                                                                </div>

                                                                {/* Drop zone */}
                                                                <div
                                                                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                                                    onDragLeave={() => setDragging(false)}
                                                                    onDrop={handleDrop}
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    className={cn(
                                                                        "flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                                                                        dragging
                                                                            ? "border-violet-400 bg-violet-50/60 scale-[1.01]"
                                                                            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/30"
                                                                    )}>
                                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all", dragging ? "bg-violet-100" : "bg-slate-100")}>
                                                                        {uploading
                                                                            ? <Loader2 size={18} className="text-violet-500 animate-spin" />
                                                                            : <Upload size={18} className={dragging ? "text-violet-500" : "text-slate-400"} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[13px] font-bold text-slate-600">
                                                                            {uploading ? "กำลังอัปโหลด..." : dragging ? "วางไฟล์ที่นี่!" : "คลิกหรือลากไฟล์มาวาง"}
                                                                        </p>
                                                                        <p className="text-[11px] text-slate-400 mt-0.5">รองรับ JPG, PNG, WEBP — เลือกหลายไฟล์ได้</p>
                                                                    </div>
                                                                </div>
                                                                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                                <ImageOff size={40} className="mb-3" />
                                                <p className="text-[14px] font-semibold">เลือกรายการจากด้านซ้าย</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Footer ── */}
                            <div className="px-4 lg:px-8 py-4 lg:py-5 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                        <span>เหลือ</span>
                                        <span className="font-bold text-[#0f172a]">{localAssets.length}</span>
                                        <span>รายการรอจัดการ</span>
                                    </div>
                                    {changedCount > 0 && (
                                        <>
                                            <div className="w-px h-4 bg-slate-300" />
                                            <span className="text-[12px] font-semibold text-violet-600">เปลี่ยนแปลง {changedCount} รายการ</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button onClick={onClose}
                                        className="group flex items-center gap-2 h-10 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-all shadow-sm active:scale-[0.97] cursor-pointer">
                                        <X size={14} className="opacity-60 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-200" />
                                        ยกเลิก
                                    </button>
                                    <button onClick={handleSave} disabled={saving || changedCount === 0}
                                        className="group relative flex items-center gap-2.5 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-[13px] font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97] overflow-hidden cursor-pointer">
                                        {saving ? (
                                            <><Loader2 size={14} className="animate-spin" /><span>กำลังบันทึก...</span></>
                                        ) : (
                                            <>
                                                <Save size={14} className="transition-transform group-hover:scale-110" />
                                                <span>บันทึกทั้งหมด</span>
                                                {changedCount > 0 && (
                                                    <span className="bg-white/20 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-md">{changedCount}</span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Lightbox ── */}
            <AnimatePresence>
                {viewingUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                        onClick={() => setViewingUrl(null)}>
                        <motion.img
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={viewingUrl}
                            alt="preview"
                            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                            onClick={e => e.stopPropagation()} />
                        <button onClick={() => setViewingUrl(null)}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all border border-white/10 cursor-pointer shadow-xl backdrop-blur-sm">
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}