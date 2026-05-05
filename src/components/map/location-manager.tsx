"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Search, Plus, MapPin as MapIcon, Minus, Trash2, Edit3 } from "lucide-react";
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

async function uploadDataUrl(dataUrl: string, filename: string): Promise<string | null> {
    try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fd = new FormData();
        fd.append("file", new File([blob], filename, { type: blob.type }));
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json();
        return d.url || d.path || null;
    } catch { return null; }
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => { if (isOpen) fetchPins(); }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialEditPinId && pins.length > 0) {
            const t = pins.find(p => p.id === initialEditPinId);
            if (t) { setEditingPin(t); setActivePinId(t.id); }
        }
    }, [isOpen, initialEditPinId, pins]);

    useEffect(() => {
        setEditCardBlobUrl(null);
        setEditPinBlobUrl(null);
        setTempEditImageUrl(null);
    }, [activePinId]);

    /**
     * [FIX #5] displayPins ใช้ useMemo แทน IIFE ที่ run ทุก render
     * deps ครอบคลุมทุกตัวแปรที่ใช้จริง
     */
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
            }
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
            }
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
    if (!isOpen) return null;

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
                                if (pin) setEditingPin({ ...pin, [field]: v as unknown as number });
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
                <div key="manager-overlay" className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-8">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-[1400px] h-full max-h-[850px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-row border border-slate-200 z-10 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
                    >
                        {/* Left: Pin list */}
                        <div style={{ width: '280px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
                            <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                                    <h2 style={{ fontSize: '17px', color: '#0f172a', margin: 0, fontWeight: 800 }}>จัดการสถานที่</h2>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                        <input type="text" placeholder="ค้นหา..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            style={{ width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#f8fafc', transition: 'all 0.2s', boxSizing: 'border-box' }}
                                            className="hover:border-blue-500 focus:border-blue-600 focus:bg-white" />
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
                                                    if (activePinId === pin.id) { setActivePinId(null); setEditingPin(null); }
                                                    else {
                                                        setActivePinId(pin.id);
                                                        mapRef.current?.flyTo(pin.latitude, pin.longitude - 0.0008, 18);
                                                        setEditingPin(pin); setIsAdding(false);
                                                    }
                                                }}
                                                onDelete={() => handleDelete(pin.id, pin.name)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Map + form panel */}
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
                            <AnimatePresence>
                                {(isAdding || editingPin) && (
                                    <motion.div
                                        key="side-panel"
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                        className="absolute top-0 left-0 bottom-0 w-[440px] z-100 bg-white shadow-2xl border-right border-slate-100 flex flex-col"
                                    >
                                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                            <span className="font-extrabold text-[16px] text-slate-900">
                                                {isAdding ? 'เพิ่มสถานที่ใหม่' : 'แก้ไขสถานที่'}
                                            </span>
                                            <button
                                                onClick={() => { setIsAdding(false); setEditingPin(null); }}
                                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer border border-slate-200"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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
                                                            <div className="flex gap-3 pt-4">
                                                                <button type="button" onClick={() => setIsAdding(false)}
                                                                    className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">ยกเลิก</button>
                                                                <button type="submit" disabled={loading || uploading || generating}
                                                                    className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold text-[13px] hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
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
                                                            <div className="flex gap-3 pt-4">
                                                                <button type="button" onClick={() => setEditingPin(null)}
                                                                    className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">ยกเลิก</button>
                                                                <button onClick={handleEdit} disabled={loading || uploading || generating}
                                                                    className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold text-[13px] hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
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

                            <div className="absolute inset-0">
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

                                <div className="absolute top-6 right-6 z-1000 flex flex-col gap-3">
                                    <button onClick={onClose}
                                        className="w-11 h-11 bg-white border border-slate-200 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all cursor-pointer group"
                                        title="ปิด">
                                        <X size={22} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                                        <button onClick={() => mapRef.current?.zoomIn()} className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all cursor-pointer"><Plus size={20} /></button>
                                        <div className="h-px bg-slate-100 mx-2" />
                                        <button onClick={() => mapRef.current?.zoomOut()} className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all cursor-pointer"><Minus size={20} /></button>
                                    </div>
                                </div>

                                {(isAdding || editingPin) && (
                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-500">
                                        <motion.div
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-100 flex items-center gap-3"
                                        >
                                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.15em]">คลิกบนแผนที่เพื่อเลือกจุด</span>
                                        </motion.div>
                                    </div>
                                )}
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