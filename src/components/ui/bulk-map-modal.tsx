"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
    X, MapPin, Check, Loader2, Save,
    MapPinOff, ChevronRight, ChevronDown, Search, CheckSquare, Square, Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";

const cn = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

const MapPicker = dynamic(() => import("@/components/map/map-picker"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-[13px] font-medium">กำลังโหลดแผนที่...</p>
            </div>
        </div>
    ),
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssetItem {
    id: string;
    assetCode: string;
    name: string;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    mapPinId?: string | null;
    department?: string | null;
}

interface BulkMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

interface SelectedPin {
    lat: number;
    lng: number;
    mapPinId?: string;
    name?: string;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function BulkMapModal({ isOpen, onClose, onSaved }: BulkMapModalProps) {

    const [assets, setAssets] = useState<AssetItem[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pin, setPin] = useState<SelectedPin | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

    const locationDropdownRef = useRef<HTMLDivElement>(null);
    // [FIX #6] AbortController ref สำหรับ fetchAssets
    const fetchAbortRef = useRef<AbortController | null>(null);

    // ── fetch assets without coords ───────────────────────────────────────────
    /**
     * [FIX #6] เพิ่ม AbortController ป้องกัน setState หลัง unmount
     */
    const fetchAssets = useCallback(async () => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        setLoadingAssets(true);
        try {
            const res = await fetch("/api/assets?limit=1000&qualityFilter=noCoords", {
                signal: controller.signal,
            });
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
            setLoadingAssets(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAssets();
            setSelectedIds(new Set());
            setPin(null);
            setSearch("");
            setSelectedLocation(null);
            setIsLocationDropdownOpen(false);
        }
        // cleanup เมื่อปิด modal
        return () => { fetchAbortRef.current?.abort(); };
    }, [isOpen, fetchAssets]);

    // ── outside click (location dropdown) ────────────────────────────────────
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node))
                setIsLocationDropdownOpen(false);
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    // ── escape key ────────────────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [onClose]);

    // ── filtered assets ───────────────────────────────────────────────────────
    const filtered = assets.filter(a => {
        const matchesSearch = !search.trim() ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
            (a.location || "").toLowerCase().includes(search.toLowerCase());
        const matchesLocation = !selectedLocation || a.location === selectedLocation;
        return matchesSearch && matchesLocation;
    });

    const uniqueLocations = Array.from(new Set(assets.map(a => a.location).filter(Boolean))) as string[];

    // ── select helpers ────────────────────────────────────────────────────────
    const toggleOne = (id: string) => setSelectedIds(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const selectAll = () => setSelectedIds(new Set(filtered.map(a => a.id)));
    const deselectAll = () => setSelectedIds(new Set());
    const allSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));

    // ── save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!pin) { toast.error("กรุณาปักหมุดบนแผนที่ก่อน"); return; }
        if (selectedIds.size === 0) { toast.error("กรุณาเลือกรายการที่ต้องการปักหมุด"); return; }
        setSaving(true);
        try {
            const savedIds = new Set(selectedIds);
            await Promise.all([...savedIds].map(id =>
                fetch(`/api/assets/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: pin.lat,
                        longitude: pin.lng,
                        mapPinId: pin.mapPinId || null,
                    }),
                })
            ));
            toast.success(`ปักหมุด ${savedIds.size} รายการสำเร็จ`);
            setAssets(prev => prev.filter(a => !savedIds.has(a.id)));
            setSelectedIds(new Set());
            setPin(null);
            onSaved();
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full flex flex-col overflow-hidden relative z-10 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
                        style={{ maxWidth: "1200px", height: "88vh" }}
                        onClick={e => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="px-8 py-5 border-b border-slate-200 flex items-center gap-3 shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
                                <MapPin size={17} className="text-yellow-500" />
                            </div>
                            <div className="flex-1 flex items-center gap-4">
                                <div className="flex flex-col">
                                    <p className="text-[15px] font-extrabold text-[#0f172a]">ปักหมุดตำแหน่งบนแผนที่</p>
                                    <p className="text-[12px] text-slate-400 mt-0.5">รายการที่ยังไม่มีพิกัด {assets.length} รายการ</p>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                                <X size={18} />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="flex flex-1 overflow-hidden">

                            {/* ══ ซ้าย: รายการ ═════════════════════════════════════ */}
                            <div className="w-[500px] shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/20">

                                {/* Search + Filter */}
                                <div className="px-3 pt-4 pb-3 space-y-3 shrink-0 border-b border-slate-100 bg-white">
                                    <div className="flex items-center gap-2">
                                        {/* Location dropdown */}
                                        {uniqueLocations.length > 0 && (
                                            <div className="relative w-[210px] shrink-0" ref={locationDropdownRef}>
                                                <button type="button"
                                                    onClick={() => setIsLocationDropdownOpen(v => !v)}
                                                    className={cn(
                                                        "w-full h-10 pl-9 pr-3 text-[13px] font-semibold rounded-xl border transition-all flex items-center justify-between cursor-pointer shadow-sm",
                                                        isLocationDropdownOpen
                                                            ? "border-yellow-400 bg-white ring-4 ring-yellow-100"
                                                            : "border-slate-200 bg-white hover:border-yellow-300 text-slate-600"
                                                    )}>
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Filter size={13} className={cn("transition-colors", isLocationDropdownOpen && "text-yellow-500")} />
                                                    </div>
                                                    <span className="truncate mr-1">{selectedLocation || "ทุกสถานที่"}</span>
                                                    <ChevronDown size={12} className={cn("transition-transform duration-300 opacity-40 shrink-0", isLocationDropdownOpen && "rotate-180 opacity-100 text-yellow-500")} />
                                                </button>

                                                {isLocationDropdownOpen && (
                                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar px-1.5">
                                                            <button
                                                                onClick={() => { setSelectedLocation(null); setIsLocationDropdownOpen(false); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 text-[13px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer",
                                                                    !selectedLocation ? "bg-yellow-50 text-yellow-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                                                                )}>
                                                                <span>ทั้งหมด</span>
                                                                {!selectedLocation && <Check size={13} className="text-yellow-500" />}
                                                            </button>
                                                            <div className="h-px bg-slate-50 my-1 mx-2" />
                                                            {uniqueLocations.sort().map(loc => (
                                                                <button key={loc}
                                                                    onClick={() => { setSelectedLocation(loc); setIsLocationDropdownOpen(false); }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2.5 text-[14px] font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer",
                                                                        selectedLocation === loc ? "bg-yellow-50 text-yellow-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                                                                    )}>
                                                                    <span className="truncate">{loc}</span>
                                                                    {selectedLocation === loc && <Check size={14} className="text-yellow-500" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Search */}
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                                placeholder="ค้นหารหัส, ชื่อ..."
                                                className="w-full h-10 pl-9 pr-3 text-[13px] rounded-xl border border-slate-200 bg-white text-gray-800 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 hover:border-yellow-300 transition-all placeholder:text-gray-400 shadow-sm"
                                                style={{ fontFamily: "inherit" }} />
                                        </div>
                                    </div>

                                    {/* Select all row */}
                                    <div className="flex items-center justify-between px-1">
                                        <button type="button" onClick={allSelected ? deselectAll : selectAll}
                                            className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-yellow-600 transition-colors cursor-pointer border-none bg-transparent p-0"
                                            style={{ fontFamily: "inherit" }}>
                                            {allSelected
                                                ? <><CheckSquare size={13} className="text-yellow-500" /> ยกเลิกทั้งหมด</>
                                                : <><Square size={13} /> เลือกทั้งหมด ({filtered.length})</>}
                                        </button>
                                        {selectedIds.size > 0 && (
                                            <span className="text-[12px] font-bold text-yellow-600">
                                                เลือก {selectedIds.size} จาก {assets.length} รายการ
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                    {loadingAssets ? (
                                        [...Array(6)].map((_, i) => (
                                            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                                        ))
                                    ) : filtered.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-5 text-slate-200">
                                                <MapPinOff size={36} />
                                            </div>
                                            <p className="text-[15px] font-extrabold text-slate-600">
                                                {search ? "ไม่พบรายการ" : "ปักหมุดครบถ้วนแล้ว"}
                                            </p>
                                            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">
                                                {search 
                                                    ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง" 
                                                    : "ทุกรายการในระบบ\nได้รับการปักหมุดพิกัดครบแล้ว"}
                                            </p>
                                        </div>
                                    ) : filtered.map(asset => {
                                        const isSelected = selectedIds.has(asset.id);
                                        return (
                                            <button key={asset.id} type="button"
                                                onClick={() => toggleOne(asset.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-4 rounded-xl text-left transition-all duration-150 cursor-pointer",
                                                    isSelected
                                                        ? "bg-yellow-500 text-white shadow-md"
                                                        : "bg-white border border-slate-200 hover:border-yellow-300 hover:bg-yellow-50/40 text-slate-700"
                                                )}>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all",
                                                    isSelected ? "bg-white/20 border-white/40" : "border-slate-300 hover:border-yellow-400"
                                                )}>
                                                    {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-[13px] font-bold truncate", isSelected ? "text-white" : "text-[#0f172a]")}>
                                                        {asset.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn("text-[11px] font-mono truncate", isSelected ? "text-white/70" : "text-slate-400")}>
                                                            {asset.assetCode}
                                                        </span>
                                                        {asset.location && (
                                                            <>
                                                                <span className={cn("text-[10px]", isSelected ? "text-white/40" : "text-slate-300")}>·</span>
                                                                <span className={cn("text-[11px] truncate flex items-center gap-0.5", isSelected ? "text-white/70" : "text-slate-400")}>
                                                                    <MapPin size={9} className="shrink-0" />
                                                                    {asset.location}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={13} className={cn("shrink-0 opacity-40", isSelected ? "text-white" : "text-slate-400")} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ══ ขวา: แผนที่ ══════════════════════════════════════ */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 relative overflow-hidden" style={{ borderRadius: 0 }}>
                                    {/* [FIX #14] ย้าย leaflet style ออกจาก dangerouslySetInnerHTML */}
                                    <style>{`.leaflet-container { border-radius: 0 !important; }`}</style>

                                    {/* Floating pin info */}
                                    <AnimatePresence>
                                        {pin && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -20, x: "-50%" }}
                                                animate={{ opacity: 1, y: 12, x: "-50%" }}
                                                exit={{ opacity: 0, y: -20, x: "-50%" }}
                                                className="absolute left-1/2 z-1000 w-fit min-w-[320px] max-w-[90%]"
                                            >
                                                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-yellow-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-b-2 border-b-yellow-400/30">
                                                    <div className="w-9 h-9 rounded-xl bg-yellow-500 flex items-center justify-center shrink-0 shadow-md shadow-yellow-200/50">
                                                        <Check size={18} className="text-white" strokeWidth={3} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] font-bold text-slate-800 truncate">
                                                            {pin.name || "ปักหมุดตำแหน่งใหม่"}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">ตำแหน่งที่เลือกเพื่อปักหมุด</p>
                                                    </div>
                                                    <button type="button" onClick={() => setPin(null)}
                                                        className="group flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-yellow-50 hover:border-yellow-200 text-[12px] font-bold text-slate-500 hover:text-yellow-600 transition-all cursor-pointer ml-2">
                                                        <X size={13} className="opacity-60 group-hover:rotate-90 transition-transform" /> ล้าง
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <MapPicker
                                        height="100%"
                                        latitude={pin?.lat}
                                        longitude={pin?.lng}
                                        mapPinId={pin?.mapPinId || null}
                                        onLocationSelect={(lat: number, lng: number, mapPinId?: string | null, name?: string) => {
                                            if (!lat || !lng) setPin(null);
                                            else setPin({ lat, lng, mapPinId: mapPinId || undefined, name });
                                        }}
                                    />

                                    {/* Overlay: ยังไม่เลือกรายการ */}
                                    {selectedIds.size === 0 && !pin && (
                                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xl px-6 py-5 flex flex-col items-center gap-2 max-w-xs text-center">
                                                <div className="w-12 h-12 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center mb-1">
                                                    <MapPinOff size={22} className="text-yellow-400" />
                                                </div>
                                                <p className="text-[14px] font-bold text-[#0f172a]">เลือกรายการก่อน</p>
                                                <p className="text-[12px] text-slate-400">เลือกรายการจากด้านซ้าย แล้วคลิกบนแผนที่เพื่อปักหมุด</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Overlay: เลือกแล้วแต่ยังไม่ปักหมุด */}
                                    {selectedIds.size > 0 && !pin && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full border border-yellow-200 shadow-lg px-5 py-2.5 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                                <p className="text-[13px] font-semibold text-yellow-700">
                                                    เลือก {selectedIds.size} รายการแล้ว — คลิกบนแผนที่เพื่อปักหมุด
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-8 py-5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="flex-1" />
                            <div className="flex items-center gap-2.5">
                                <button onClick={onClose}
                                    className="group flex items-center gap-2 h-10 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-all shadow-sm active:scale-[0.97] cursor-pointer">
                                    <X size={14} className="opacity-60 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-200" />
                                    ยกเลิก
                                </button>
                                <button onClick={handleSave}
                                    disabled={saving || !pin || selectedIds.size === 0}
                                    className="group relative flex items-center gap-2.5 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-[13px] font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97] overflow-hidden cursor-pointer">
                                    {saving ? (
                                        <><Loader2 size={14} className="animate-spin" /><span>กำลังบันทึก...</span></>
                                    ) : (
                                        <>
                                            <Save size={14} className="transition-transform group-hover:scale-110" />
                                            <span>ปักหมุด {selectedIds.size > 0 ? selectedIds.size : ""} รายการ</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}