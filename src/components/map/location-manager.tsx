"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Search, Plus, MapPin as MapIcon, Minus, Trash2, Edit3, List } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUploadSection } from "./image-upload-section";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const AssetMap = dynamic(() => import("./asset-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
            <MapIcon className="w-8 h-8 text-slate-300" />
        </div>
    ),
});

interface MapPin {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description: string | null;
    imageUrl: string | null;
    images: string[];
    pinImageUrl?: string | null;
    cardImageUrl?: string | null;
    type: string;
}

interface LocationManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onPinUpdated: () => void;
    initialEditPinId?: string | null;
}

function dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
    const blob = dataURLtoBlob(dataUrl);
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: "image/png" }));
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) {
        throw new Error(d.error || `อัปโหลดไฟล์ล้มเหลว (${r.status})`);
    }
    const finalUrl = d.url || d.path || null;
    if (!finalUrl) throw new Error("ไม่ได้รับ URL รูปภาพจากการอัปโหลด");
    return finalUrl;
}

const PinListCard = React.memo(({ pin, isActive, onClick, onDelete }: {
    pin: MapPin; isActive: boolean; onClick: () => void; onDelete: () => void;
}) => {
    const getSafeUrl = (url: unknown): string | null => {
        if (!url || typeof url !== 'string') return null;
        if (url.startsWith('{')) {
            try {
                const parsed = JSON.parse(url);
                return parsed.url || parsed.path || (parsed.images && parsed.images[0]) || null;
            } catch { return url; }
        }
        return url;
    };

    let imgs: string[] = [];
    const safeImageUrl = getSafeUrl(pin.imageUrl);
    if ((pin.images?.length ?? 0) > 0) imgs = pin.images || [];
    else if (safeImageUrl) {
        if (safeImageUrl.startsWith('[')) { try { imgs = JSON.parse(safeImageUrl); } catch { imgs = [safeImageUrl]; } }
        else imgs = [safeImageUrl];
    }
    const thumbUrl = imgs[0] || getSafeUrl(pin.cardImageUrl) || null;

    return (
        <div onClick={onClick} className="pin-card-light"
            style={{
                position: 'relative', borderRadius: '12px', overflow: 'hidden',
                border: '2px solid', borderColor: isActive ? '#2563eb' : '#e5e7eb',
                boxShadow: isActive
                    ? '0 10px 25px -5px rgba(37,99,235,0.25), 0 8px 10px -6px rgba(37,99,235,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'scale(0.98)' : 'translateY(0)', background: '#fff',
            }}
            onMouseEnter={e => {
                if (!isActive) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#2563eb';
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                }
            }}
        >
            <div style={{ height: 107, position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
                {getSafeUrl(pin.cardImageUrl) ? (
                    <img src={getSafeUrl(pin.cardImageUrl)!} alt={pin.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : thumbUrl ? (
                    <img src={thumbUrl} alt={pin.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <MapIcon size={24} className="text-slate-200" />
                    </div>
                )}

                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%)',
                    pointerEvents: 'none'
                }} />

                {thumbUrl && (
                    <div style={{
                        position: 'absolute', top: 10, left: 10, width: 42, height: 42,
                        borderRadius: '50%', border: '2px solid white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 10, background: 'white'
                    }}>
                        <img src={pin.pinImageUrl || thumbUrl} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}

                <div style={{
                    position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? '#2563eb' : '#64748b', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 10, transition: 'all 0.2s'
                }}>
                    <Edit3 size={12} strokeWidth={2.5} />
                </div>

                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 44, zIndex: 15 }}>
                    <p style={{
                        color: '#fff', fontSize: '12px', fontWeight: 800, lineHeight: 1.4, margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.6)', whiteSpace: 'normal', wordBreak: 'break-word',
                        fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif'
                    }}>
                        {pin.name}
                    </p>
                </div>

                <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20 }} onClick={e => e.stopPropagation()}>
                    <button onClick={onDelete}
                        style={{
                            width: 28, height: 28, borderRadius: '8px', border: 'none',
                            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.9)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
});

PinListCard.displayName = "PinListCard";

import { cn } from "@/lib/utils";

export function LocationManager({ isOpen, onClose, onPinUpdated, initialEditPinId }: LocationManagerProps) {
    const [pins, setPins] = useState<MapPin[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingPin, setEditingPin] = useState<MapPin | null>(null);
    const [formData, setFormData] = useState({ name: "", latitude: "17.5371", longitude: "101.7178" });
    const [imageUrl, setImageUrl] = useState<string>("");
    const [addCardBlobUrl, setAddCardBlobUrl] = useState<string | null>(null);
    const [addPinBlobUrl, setAddPinBlobUrl] = useState<string | null>(null);
    const [editCardBlobUrl, setEditCardBlobUrl] = useState<string | null>(null);
    const [editPinBlobUrl, setEditPinBlobUrl] = useState<string | null>(null);
    const [tempEditImageUrl, setTempEditImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [isMobile, setIsMobile] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 1023px)");
        setIsMobile(mql.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchPins();
    }, []);

    const hasInitialFit = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            hasInitialFit.current = false;
            return;
        }

        if (isOpen) {
            fetchPins();
        }

        if (isOpen && pins.length > 0 && !hasInitialFit.current) {
            // Handle initial state setting if a specific pin is targeted
            if (initialEditPinId && !activePinId) {
                const t = pins.find(p => p.id === initialEditPinId);
                if (t) {
                    setEditingPin(t);
                    setActivePinId(t.id);
                    if (isMobile) setMobileView('map');
                }
            }

            const timer = setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                    
                    if (initialEditPinId) {
                        const t = pins.find(p => p.id === initialEditPinId);
                        if (t) {
                            mapRef.current.flyTo(t.latitude, t.longitude, 19);
                            hasInitialFit.current = true;
                        }
                    } else if (mobileView === 'map' || !isMobile) {
                        mapRef.current.fitBounds(isMobile ? 30 : 60);
                        hasInitialFit.current = true;
                    }
                }
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [isOpen, mobileView, pins.length, initialEditPinId, isMobile, activePinId]);

    useEffect(() => {
        setEditCardBlobUrl(null);
        setEditPinBlobUrl(null);
        setTempEditImageUrl(null);
    }, [activePinId]);

    const displayPins = useMemo(() => {
        let currentPins = [...pins];

        if (isAdding && formData.latitude && formData.longitude) {
            const tempPin: MapPin = {
                id: 'temp-pin',
                name: formData.name.trim() || 'กรุณากรอกชื่อสถานที่',
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                description: null,
                imageUrl: imageUrl || null,
                images: imageUrl ? [imageUrl] : [],
                type: 'master'
            };
            currentPins.push(tempPin);
        }

        if (editingPin) {
            currentPins = currentPins.map(p =>
                p.id === editingPin.id ? {
                    ...p,
                    name: editingPin.name.trim() || 'กรุณากรอกชื่อสถานที่',
                    latitude: typeof editingPin.latitude === 'string' ? parseFloat(editingPin.latitude as unknown as string) : editingPin.latitude,
                    longitude: typeof editingPin.longitude === 'string' ? parseFloat(editingPin.longitude as unknown as string) : editingPin.longitude,
                    imageUrl: editingPin.images?.[0] || editingPin.imageUrl || null,
                } : p
            );
        }

        return currentPins;
    }, [pins, isAdding, formData.latitude, formData.longitude, formData.name, imageUrl, editingPin]);

    const fetchPins = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/map-pins");
            if (r.ok) setPins(await r.json());
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadFile = async (files: FileList): Promise<string | null> => {
        if (!files.length) return null;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", files[0]);
            const r = await fetch("/api/upload", { method: "POST", body: fd });
            const d = await r.json();
            return d.url || d.path || null;
        } finally {
            setUploading(false);
        }
    };

    const handleAddImageUpload = async (files: FileList) => {
        const url = await uploadFile(files);
        if (url) { setImageUrl(url); setAddCardBlobUrl(null); setAddPinBlobUrl(null); }
    };

    const handleEditImageUpload = async (files: FileList) => {
        const url = await uploadFile(files);
        if (url) { setTempEditImageUrl(url); setEditCardBlobUrl(null); setEditPinBlobUrl(null); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setGenerating(true);
        try {
            const [pinImageUrl, cardImageUrl] = await Promise.all([
                addPinBlobUrl ? uploadDataUrl(addPinBlobUrl, "pin-crop.png") : Promise.resolve(null),
                addCardBlobUrl ? uploadDataUrl(addCardBlobUrl, "card-crop.png") : Promise.resolve(null),
            ]);
            const res = await fetch("/api/map-pins", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    images: imageUrl ? [imageUrl] : [],
                    pinImageUrl, cardImageUrl,
                }),
            });
            if (res.ok) {
                toast.success('บันทึกสำเร็จ');
                setIsAdding(false);
                setFormData({ name: "", latitude: "17.5371", longitude: "101.7178" });
                setImageUrl(""); setAddCardBlobUrl(null); setAddPinBlobUrl(null);
                await fetchPins();
                onPinUpdated();
            } else {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || `บันทึกข้อมูลล้มเหลว (${res.status})`);
            }
        } catch (error: any) {
            console.error("Create pin error:", error);
            toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกสถานที่');
        } finally {
            setLoading(false); setGenerating(false);
        }
    };

    const handleEdit = async () => {
        if (!editingPin) return;
        setLoading(true); setGenerating(true);
        try {
            const [pinImageUrl, cardImageUrl] = await Promise.all([
                editPinBlobUrl ? uploadDataUrl(editPinBlobUrl, "pin-crop.png") : Promise.resolve(editingPin.pinImageUrl ?? null),
                editCardBlobUrl ? uploadDataUrl(editCardBlobUrl, "card-crop.png") : Promise.resolve(editingPin.cardImageUrl ?? null),
            ]);
            const res = await fetch(`/api/map-pins/${editingPin.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editingPin.name, latitude: editingPin.latitude, longitude: editingPin.longitude,
                    images: tempEditImageUrl ? [tempEditImageUrl] : editingPin.images,
                    pinImageUrl, cardImageUrl,
                }),
            });
            if (res.ok) {
                toast.success('แก้ไขสำเร็จ');
                setEditingPin(null); setEditCardBlobUrl(null); setEditPinBlobUrl(null); setTempEditImageUrl(null);
                await fetchPins();
                onPinUpdated();
            } else {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || `อัปเดตข้อมูลล้มเหลว (${res.status})`);
            }
        } catch (error: any) {
            console.error("Edit pin error:", error);
            toast.error(error.message || 'เกิดข้อผิดพลาดในการแก้ไขสถานที่');
        } finally {
            setLoading(false); setGenerating(false);
        }
    };

    const handleDelete = (id: string, name: string) => setDeleteTarget({ id, name });

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/map-pins/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('ลบสถานที่สำเร็จ');
                if (activePinId === deleteTarget.id) { setActivePinId(null); setEditingPin(null); }
                setDeleteTarget(null);
                await fetchPins();
                onPinUpdated();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err?.message || 'ลบไม่สำเร็จ');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredPins = pins.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!isOpen || !mounted) return null;

    const formFields = (pin?: MapPin | null) => (
        <>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">ชื่อสถานที่</label>
                <input type="text"
                    value={pin ? pin.name : formData.name}
                    onChange={e => pin ? setEditingPin({ ...pin, name: e.target.value }) : setFormData({ ...formData, name: e.target.value })}
                    required={!pin} autoFocus={!pin}
                    placeholder="กรุณากรอกชื่อสถานที่"
                    className="w-full px-4 h-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none hover:border-blue-400 transition-all"
                    style={{ fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif' }}
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {(['latitude', 'longitude'] as const).map(field => (
                    <div key={field} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">{field}</label>
                        <input type="number" step="0.000001"
                            value={pin ? (field === 'latitude' ? pin.latitude : pin.longitude) : (field === 'latitude' ? formData.latitude : formData.longitude)}
                            onChange={e => {
                                const v = e.target.value;
                                const numV = v === "" ? 0 : parseFloat(v);
                                if (pin) setEditingPin({ ...pin, [field]: numV });
                                else setFormData({ ...formData, [field]: v });
                            }}
                            className="w-full px-4 h-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-600 focus:outline-none hover:border-blue-400 transition-all"
                            style={{ fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif' }}
                        />
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div key="manager-overlay" className="fixed inset-0 z-100 flex items-stretch lg:items-center justify-center p-0 lg:p-8">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full lg:max-w-[1400px] h-full lg:max-h-[850px] bg-white lg:rounded-[32px] shadow-2xl overflow-hidden flex flex-col border lg:border-slate-200 z-10 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
                    >
                        {isMobile && (
                            <div className="bg-white border-b border-slate-100 p-2 shrink-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <h2 className="text-[14px] font-black text-slate-900 tracking-tight">จัดการสถานที่</h2>
                                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex bg-slate-100 p-0.5 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => { setMobileView('list'); setIsAdding(false); setEditingPin(null); setActivePinId(null); }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${mobileView === 'list' && !isAdding && !editingPin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        รายชื่อสถานที่
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobileView('map')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${mobileView === 'map' || isAdding || editingPin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        แผนที่จุดปักหมุด
                                    </button>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="ค้นหา..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-[12px] outline-none focus:bg-white focus:border-blue-400 transition-all" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const mapState = mapRef.current?.getMapState();
                                            const lat = mapState?.lat.toFixed(6) || '17.5371';
                                            const lng = mapState?.lng.toFixed(6) || '101.7178';
                                            setIsAdding(true); setEditingPin(null); setActivePinId(null);
                                            setFormData({ name: '', latitude: lat, longitude: lng });
                                            setImageUrl(''); setAddCardBlobUrl(null); setAddPinBlobUrl(null);
                                            setMobileView('map');
                                        }}
                                        className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                            <div className={cn(
                                "flex flex-col bg-white shrink-0 h-full border-r border-slate-100 w-full lg:w-[280px]",
                                (isMobile && (isAdding || editingPin || mobileView === 'map')) ? 'hidden' : 'flex'
                            )}>
                                {!isMobile && (
                                    <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                                        <div className="flex items-center justify-between mb-3.5">
                                            <h2 className="text-[17px] text-slate-900 font-extrabold m-0">จัดการสถานที่</h2>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 relative">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input type="text" placeholder="ค้นหา..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full h-9 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none transition-all hover:border-blue-500 focus:border-blue-600 focus:bg-white" />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (isAdding) { setIsAdding(false); } else {
                                                        const mapState = mapRef.current?.getMapState();
                                                        const lat = mapState?.lat.toFixed(6) || '17.5371';
                                                        const lng = mapState?.lng.toFixed(6) || '101.7178';
                                                        setIsAdding(true); setEditingPin(null); setActivePinId(null);
                                                        setFormData({ name: '', latitude: lat, longitude: lng });
                                                        setImageUrl(''); setAddCardBlobUrl(null); setAddPinBlobUrl(null);
                                                    }
                                                }}
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-md ${isAdding ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                                            >
                                                {isAdding ? <X size={18} /> : <Plus size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                                    {loading && filteredPins.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                                            <span className="text-[12px] font-bold text-slate-400">กำลังโหลด...</span>
                                        </div>
                                    ) : filteredPins.length === 0 ? (
                                        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                                            <MapIcon size={32} className="mx-auto mb-3 text-slate-200" />
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>ไม่พบสถานที่</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {filteredPins.map((pin, idx) => (
                                                <PinListCard key={pin.id || `filter-${idx}`} pin={pin} isActive={activePinId === pin.id}
                                                    onClick={() => {
                                                        if (activePinId === pin.id) {
                                                            setActivePinId(null);
                                                            setEditingPin(null);
                                                        } else {
                                                            setActivePinId(pin.id);
                                                            const lat = Number(pin.latitude);
                                                            const lng = Number(pin.longitude);

                                                            if (isFinite(lat) && isFinite(lng)) {
                                                                if (isMobile) {
                                                                    setMobileView('map');
                                                                    // Mobile: Contextual offset based on label side
                                                                    setTimeout(() => {
                                                                        mapRef.current?.invalidateSize();
                                                                        const side = mapRef.current?.getPinSide(pin.id) || 'right';
                                                                        // If label is right, offset pin to left (lng+)
                                                                        // If label is left, offset pin to right (lng-)
                                                                        const lngOffset = side === 'right' ? 0.0001 : -0.0001;
                                                                        mapRef.current?.flyTo(lat, lng + lngOffset, 20);
                                                                    }, 150);
                                                                } else {
                                                                    // Desktop: Offset longitude to center pin relative to sidebar
                                                                    mapRef.current?.flyTo(lat, lng - 0.0005, 20);
                                                                }
                                                            }
                                                            setEditingPin(pin);
                                                            setIsAdding(false);
                                                        }
                                                    }}
                                                    onDelete={() => handleDelete(pin.id, pin.name)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className={cn(
                                    "flex-1 relative overflow-hidden bg-slate-50 flex flex-col h-full w-full",
                                    (isMobile && !isAdding && !editingPin && mobileView === 'list') ? 'hidden' : 'flex'
                                )}
                            >
                                <div
                                    style={{
                                        position: (isMobile && (isAdding || editingPin)) ? 'relative' : 'absolute',
                                        inset: (isMobile && (isAdding || editingPin)) ? 'auto' : 0,
                                        height: (isMobile && (isAdding || editingPin)) ? '45%' : '100%',
                                        width: '100%',
                                        zIndex: 10,
                                        order: isMobile ? 1 : 2
                                    }}
                                >
                                    <style>{`
                                        .leaflet-container { cursor: default !important; }
                                        .leaflet-interactive { cursor: pointer !important; }
                                    `}</style>
                                    <AssetMap ref={mapRef} assets={[]} masterPins={displayPins as any} pinAssetCounts={{}}
                                        onPinClick={id => {
                                            if (!id || activePinId === id) { setActivePinId(null); setEditingPin(null); setIsAdding(false); }
                                            else {
                                                setActivePinId(id);
                                                const pin = pins.find((p: MapPin) => p.id === id);
                                                if (pin) { setEditingPin(pin); setIsAdding(false); }
                                            }
                                        }}
                                        onMapClick={(lat, lng) => {
                                            if (isAdding) setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
                                            else if (editingPin) setEditingPin(prev => prev ? { ...prev, latitude: lat, longitude: lng } : null);
                                        }}
                                        forcedActivePinId={isAdding ? 'temp-pin' : editingPin ? editingPin.id : activePinId}
                                    />

                                    {/* CONTROLS FOR MODAL MAP (Desktop only) */}
                                    {!isMobile && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '16px',
                                            top: '16px',
                                            display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 50,
                                        }}>
                                            <button 
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-lg active:scale-95 transition-all cursor-pointer hover:text-red-600 hover:border-red-100"
                                                onClick={onClose}
                                                aria-label="ปิดหน้าต่าง"
                                                title="ปิดหน้าต่าง"
                                            >
                                                <X size={20} />
                                            </button>
                                            <button 
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-lg active:scale-95 transition-all cursor-pointer hover:text-blue-600 hover:border-blue-200"
                                                onClick={() => mapRef.current?.zoomIn()}
                                                aria-label="ขยายแผนที่"
                                                title="ขยายแผนที่"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            <button 
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-lg active:scale-95 transition-all cursor-pointer hover:text-blue-600 hover:border-blue-200"
                                                onClick={() => mapRef.current?.zoomOut()}
                                                aria-label="ย่อแผนที่"
                                                title="ย่อแผนที่"
                                            >
                                                <Minus size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {(isAdding || editingPin) && (
                                        <motion.div
                                            key="side-panel"
                                            initial={isMobile ? { y: "100%", opacity: 0 } : { x: -20, opacity: 0 }}
                                            animate={{ y: 0, x: 0, opacity: 1 }}
                                            exit={isMobile ? { y: "100%", opacity: 0 } : { x: -20, opacity: 0 }}
                                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                            style={{ order: isMobile ? 2 : 1 }}
                                            className={cn(
                                                "bg-white shadow-2xl flex flex-col z-100",
                                                isMobile
                                                    ? "relative h-[55%] w-full border-t border-slate-200"
                                                    : "absolute top-0 left-0 bottom-0 w-[440px] border-r border-slate-100"
                                            )}
                                        >
                                            <div className="px-4 py-3 lg:px-6 lg:py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                                                <span className="font-extrabold text-[14px] lg:text-[16px] text-slate-900">
                                                    {isAdding ? 'เพิ่มสถานที่ใหม่' : 'แก้ไขสถานที่'}
                                                </span>
                                                <button
                                                    onClick={() => { setIsAdding(false); setEditingPin(null); setActivePinId(null); }}
                                                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer border border-slate-200"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={isAdding ? 'adding' : editingPin?.id || 'empty'}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {isAdding ? (
                                                            <form onSubmit={handleCreate} className="space-y-6">
                                                                {formFields()}
                                                                <ImageUploadSection
                                                                    rawUrl={imageUrl || null}
                                                                    uploading={uploading}
                                                                    onClear={() => { setImageUrl(''); setAddCardBlobUrl(null); setAddPinBlobUrl(null); }}
                                                                    onFileChange={handleAddImageUpload}
                                                                    fileInputRef={fileInputRef}
                                                                    cardBlobUrl={addCardBlobUrl}
                                                                    pinBlobUrl={addPinBlobUrl}
                                                                    onCardBlob={setAddCardBlobUrl}
                                                                    onPinBlob={setAddPinBlobUrl}
                                                                />
                                                                <div className="flex gap-3 pt-2">
                                                                    <button type="button" onClick={() => setIsAdding(false)}
                                                                        className="flex-1 h-10 lg:h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[12px] lg:text-[13px] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">ยกเลิก</button>
                                                                    <button type="submit" disabled={loading || uploading || generating}
                                                                        className="flex-1 h-10 lg:h-11 rounded-xl bg-blue-600 text-white font-bold text-[12px] lg:text-[13px] hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                                                        {generating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                                                        {generating ? 'กำลังบันทึก...' : 'บันทึกสถานที่'}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : editingPin ? (
                                                            <div className="space-y-6">
                                                                {formFields(editingPin)}
                                                                <ImageUploadSection
                                                                    rawUrl={tempEditImageUrl || (editingPin.images?.[0] || editingPin.imageUrl || null)}
                                                                    uploading={uploading}
                                                                    onClear={() => {
                                                                        if (tempEditImageUrl) setTempEditImageUrl(null);
                                                                        else {
                                                                            setEditingPin({ ...editingPin, images: [], imageUrl: null, pinImageUrl: null, cardImageUrl: null });
                                                                            setEditCardBlobUrl(null); setEditPinBlobUrl(null);
                                                                        }
                                                                    }}
                                                                    onFileChange={handleEditImageUpload}
                                                                    fileInputRef={editFileInputRef}
                                                                    cardBlobUrl={editCardBlobUrl}
                                                                    pinBlobUrl={editPinBlobUrl}
                                                                    initialCardUrl={tempEditImageUrl ? null : editingPin.cardImageUrl}
                                                                    initialPinUrl={tempEditImageUrl ? null : editingPin.pinImageUrl}
                                                                    onCardBlob={setEditCardBlobUrl}
                                                                    onPinBlob={setEditPinBlobUrl}
                                                                />
                                                                <div className="flex gap-3 pt-2">
                                                                    <button type="button" onClick={() => setEditingPin(null)}
                                                                        className="flex-1 h-10 lg:h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[12px] lg:text-[13px] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">ยกเลิก</button>
                                                                    <button onClick={handleEdit} disabled={loading || uploading || generating}
                                                                        className="flex-1 h-10 lg:h-11 rounded-xl bg-blue-600 text-white font-bold text-[12px] lg:text-[13px] hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                                                        {generating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                                                        {generating ? 'กำลังบันทึก...' : 'อัปเดตข้อมูล'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </motion.div>
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <ConfirmModal
                key="delete-confirm-modal"
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={executeDelete}
                title="ลบสถานที่"
                description={
                    deleteTarget
                        ? <>คุณต้องการลบสถานที่ <strong>{deleteTarget.name}</strong> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</>
                        : ""
                }
                confirmText="ยืนยันการลบ"
                type="danger"
                isLoading={isDeleting}
            />
        </AnimatePresence>
    );
}