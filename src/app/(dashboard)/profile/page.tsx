"use client";

import { useSession } from "@/lib/auth-client";
import { User, Mail, Shield, Calendar, Edit2, Camera, Save, X, Loader2, ZoomIn, ZoomOut, Check, Trash2, RotateCcw, RotateCw } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ImageModal } from "@/components/ui/image-modal";
import { cn } from "@/lib/utils";

// ─── Image Crop Modal ───────────────────────────────────────────────────────
const CONTAINER = 400;
const CROP_R = 128; // crop circle radius in screen px (reduced by 20% from 160)

interface CropModalProps {
    src: string;
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}

const CropModal = React.memo(({ src, onConfirm, onCancel }: CropModalProps) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgDim, setImgDim] = useState({ w: 0, h: 0, base: 1 });

    const handleImgLoad = useCallback(() => {
        const img = imgRef.current!;
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const base = Math.max((CROP_R * 2) / natW, (CROP_R * 2) / natH);
        setImgDim({ w: natW * base, h: natH * base, base });
        setOffset({ x: 0, y: 0 });
    }, []);

    const clamp = useCallback((ox: number, oy: number, z: number, rot: number, dim: { w: number; h: number }) => {
        const hw = (dim.w * z) / 2;
        const hh = (dim.h * z) / 2;
        const maxLx = Math.max(0, hw - CROP_R);
        const maxLy = Math.max(0, hh - CROP_R);

        const rad = (rot * Math.PI) / 180;
        const c = Math.cos(rad), s = Math.sin(rad);
        const lx = ox * c + oy * s;
        const ly = -ox * s + oy * c;

        const cx = Math.min(maxLx, Math.max(-maxLx, lx));
        const cy = Math.min(maxLy, Math.max(-maxLy, ly));

        return { x: cx * c - cy * s, y: cx * s + cy * c };
    }, []);

    const onMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
        e.preventDefault();
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy, zoom, rotation, imgDim));
    }, [dragging, zoom, rotation, imgDim, clamp]);

    const onMouseUp = useCallback(() => setDragging(false), []);

    useEffect(() => {
        if (dragging) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [dragging, onMouseMove, onMouseUp]);

    const handleZoom = useCallback((newZoom: number) => {
        const z = Math.min(4, Math.max(1, newZoom));
        setZoom(z);
        setOffset(prev => clamp(prev.x, prev.y, z, rotation, imgDim));
    }, [rotation, imgDim, clamp]);

    const handleSliderRotate = useCallback((newRot: number) => {
        setRotation(newRot);
        setOffset(prev => clamp(prev.x, prev.y, zoom, newRot, imgDim));
    }, [zoom, imgDim, clamp]);

    const handleConfirm = async () => {
        const img = imgRef.current;
        if (!img || (imgDim.w === 0)) return;
        setProcessing(true);

        const OUTPUT = 320;
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext("2d")!;
        const s = (OUTPUT / 2) / CROP_R;
        const totalScale = imgDim.base * zoom * s;

        ctx.translate(OUTPUT / 2 + offset.x * s, OUTPUT / 2 + offset.y * s);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img,
            -img.naturalWidth / 2 * totalScale,
            -img.naturalHeight / 2 * totalScale,
            img.naturalWidth * totalScale,
            img.naturalHeight * totalScale
        );

        canvas.toBlob(b => {
            setProcessing(false);
            if (b) onConfirm(b);
        }, "image/png");
    };

    const imgLoaded = imgDim.w > 0;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "1rem"
            }}
            onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{
                    background: "#fff", borderRadius: "1.5rem",
                    padding: "2rem", display: "flex", flexDirection: "column",
                    gap: "1.5rem", alignItems: "center",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "460px",
                    position: "relative"
                }}
            >
                {/* Close Button (Absolute positioned for visibility) */}
                <button 
                    onClick={onCancel} 
                    style={{ 
                        position: "absolute", top: "1rem", right: "1rem",
                        width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                        background: "#f1f5f9", border: "1.5px solid #e2e8f0", 
                        color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.2s", zIndex: 50
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.transform = "scale(1.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                    <X size={20} strokeWidth={3} />
                </button>

                {/* Header */}
                <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                    <h2 style={{ fontWeight: 800, fontSize: "1.125rem", color: "#0f172a", margin: 0 }}>ครอบตัดรูปโปรไฟล์</h2>
                </div>

                {/* Crop Canvas */}
                <div
                    style={{
                        width: "100%", aspectRatio: "1/1",
                        borderRadius: "1rem", position: "relative",
                        overflow: "hidden", background: "#f8fafc",
                        cursor: dragging ? "grabbing" : "grab", flexShrink: 0,
                        userSelect: "none", border: "1px solid #e2e8f0"
                    }}
                    onMouseDown={onMouseDown}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt="crop"
                        onLoad={handleImgLoad}
                        draggable={false}
                        style={{
                            position: "absolute",
                            top: "50%", left: "50%",
                            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                            transformOrigin: "center",
                            width: imgLoaded ? imgDim.w : "auto",
                            height: imgLoaded ? imgDim.h : "auto",
                            pointerEvents: "none",
                            display: "block",
                            objectFit: "fill",
                        }}
                    />

                    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox={`0 0 ${CONTAINER} ${CONTAINER}`}>
                        <defs>
                            <mask id="crop-mask-profile">
                                <rect width={CONTAINER} height={CONTAINER} fill="white" />
                                <circle cx={CONTAINER / 2} cy={CONTAINER / 2} r={CROP_R} fill="black" />
                            </mask>
                        </defs>
                        <rect width={CONTAINER} height={CONTAINER} fill="rgba(0,0,0,0.5)" mask="url(#crop-mask-profile)" />
                        <circle cx={CONTAINER / 2} cy={CONTAINER / 2} r={CROP_R} fill="none" stroke="white" strokeWidth="2" />
                    </svg>
                </div>

                {/* Zoom Slider */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <ZoomOut size={18} className="text-slate-400" />
                    <input
                        type="range" min={100} max={400} value={Math.round(zoom * 100)}
                        onChange={e => handleZoom(Number(e.target.value) / 100)}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <ZoomIn size={18} className="text-slate-400" />
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b", minWidth: "2.5rem", textAlign: "right" }}>
                        {Math.round(zoom * 100)}%
                    </span>
                </div>

                {/* Rotate Controls - Removed -90/+90 as requested */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b", flexShrink: 0 }}>หมุน</span>
                    <button
                        onClick={() => { const nr = (rotation - 90 + 360) % 360; setRotation(nr); setOffset(prev => clamp(prev.x, prev.y, zoom, nr, imgDim)); }}
                        className="btn" style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="หมุนซ้าย 90°"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <input
                        type="range" min={0} max={360} value={rotation}
                        onChange={e => handleSliderRotate(Number(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                        onClick={() => { const nr = (rotation + 90) % 360; setRotation(nr); setOffset(prev => clamp(prev.x, prev.y, zoom, nr, imgDim)); }}
                        className="btn" style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="หมุนขวา 90°"
                    >
                        <RotateCw size={18} />
                    </button>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b", minWidth: "2.5rem", textAlign: "right" }}>
                        {rotation}°
                    </span>
                </div>

                {/* Actions */}
                <div style={{ width: "100%", display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <button
                        onClick={onCancel}
                        className="btn"
                        style={{
                            flex: 1, padding: "0.875rem", borderRadius: "1rem",
                            fontWeight: 700, cursor: "pointer", fontSize: "0.9375rem",
                            background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b"
                        }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={processing || !imgLoaded}
                        className="btn"
                        style={{
                            flex: 1, padding: "0.875rem", borderRadius: "1rem",
                            fontWeight: 700, cursor: "pointer", fontSize: "0.9375rem",
                            background: processing ? "#94a3b8" : "#2563eb", border: "none", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
                        }}
                    >
                        {processing && <Loader2 size={18} className="animate-spin" />}
                        ยืนยัน
                    </button>
                </div>
            </motion.div>
        </div>
    );
});


const getAvatarColor = (name: string): string => {
    const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500",
        "bg-amber-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
    ];
    let hash = 0;
    const cleanName = name || "User";
    for (let i = 0; i < cleanName.length; i++) hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function ProfilePage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [fullImage, setFullImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [showImageMenu, setShowImageMenu] = useState(false);
    const [viewImageModal, setViewImageModal] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const originalFileRef = useRef<File | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowImageMenu(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name);
            setImage(session.user.image || null);
            setFullImage((session.user as any).fullImage || session.user.image || null);
        }
    }, [session]);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

    // File selected → open crop modal
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        originalFileRef.current = file;
        const url = URL.createObjectURL(file);
        setCropSrc(url);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // After crop confirmed → upload cropped blob
    const handleCropConfirm = async (blob: Blob) => {
        setCropSrc(null);
        setUploading(true);
        try {
            // 1. Upload Cropped
            const formData = new FormData();
            formData.append("file", new File([blob], "profile.png", { type: "image/png" }));

            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const data = await uploadRes.json();
            const newImageUrl = data.url;

            // 2. Upload Original if exists
            let fullImageUrl = newImageUrl;
            if (originalFileRef.current) {
                const fullFormData = new FormData();
                fullFormData.append("file", originalFileRef.current);
                const fullUploadRes = await fetch("/api/upload", { method: "POST", body: fullFormData });
                if (fullUploadRes.ok) {
                    const fullData = await fullUploadRes.json();
                    fullImageUrl = fullData.url;
                }
            }

            // 3. Update Profile
            const updateRes = await fetch("/api/user", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: newImageUrl,
                    fullImage: fullImageUrl
                }),
            });
            if (!updateRes.ok) throw new Error("Update profile failed");

            setImage(newImageUrl);
            setFullImage(fullImageUrl);
            router.refresh();
            window.location.reload();
        } catch (err) {
            console.error("Profile image update error:", err);
            alert("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
            originalFileRef.current = null;
        }
    };

    const handleClearImage = () => {
        setShowImageMenu(false);
        setShowConfirmClear(true);
    };

    const doClearImage = async () => {
        setShowConfirmClear(false);
        setUploading(true);
        try {
            const res = await fetch("/api/user", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: "", fullImage: "" }),
            });
            if (res.ok) {
                setImage(null);
                setFullImage(null);
                router.refresh();
                window.location.reload();
            } else {
                const data = await res.json();
                alert("ไม่สามารถล้างรูปภาพได้: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Clear image error:", err);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/user", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                setIsEditing(false);
                router.refresh();
                window.location.reload();
            } else {
                alert("บันทึกข้อมูลไม่สำเร็จ");
            }
        } catch (err) {
            console.error("Update error:", err);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    if (!session?.user) {
        return (
            <div className="flex flex-col items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-[14px] font-bold text-slate-400">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .profile-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 0.5rem;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    background: #fff;
                    outline: none;
                    transition: border-color 0.15s;
                    box-shadow: none;
                }
                @media (min-width: 640px) {
                    .profile-input { font-size: 1.5rem; }
                }
                .profile-input:focus { border-color: #2563eb; box-shadow: none; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* ── shared button effects ── */
                .btn { transition: background 0.15s, filter 0.15s, transform 0.1s; }
                .btn:active { transform: scale(0.94) !important; }

                /* ghost (white bg, border) */
                .btn-ghost { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
                .btn-ghost:hover { background: #f1f5f9; }
                .btn-ghost:active { background: #e2e8f0; }

                /* edit (transparent, border) */
                .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); }
                .btn-outline:hover { background: #f1f5f9; }
                .btn-outline:active { background: #e2e8f0; }

                /* primary blue */
                .btn-primary { background: #2563eb; border: none; color: #fff; }
                .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
                .btn-primary:active:not(:disabled) { background: #1e40af; }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

                /* icon-circle (X close button) */
                .btn-icon-circle {
                    width: 2rem; height: 2rem; border-radius: 50%;
                    background: #f1f5f9; border: none; color: #64748b;
                    display: flex; align-items: center; justify-content: center;
                }
                .btn-icon-circle:hover { background: #e2e8f0; }
                .btn-icon-circle:active { background: #cbd5e1; }

                /* icon-only (zoom/icon buttons, no bg) */
                .btn-icon { background: none; border: none; color: #475569; padding: 0.25rem; }
                .btn-icon:hover { color: #1e293b; }
                .btn-icon:active { opacity: 0.6; }

                /* rotate buttons */
                .btn-rotate { background: #fff; border: 1px solid #e2e8f0; color: #475569;
                              font-size: 0.8rem; font-weight: 500;
                              padding: 0.375rem 0.75rem; border-radius: 0.5rem; }
                .btn-rotate:hover { background: #f1f5f9; }
                .btn-rotate:active { background: #e2e8f0; }

                .menu-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.625rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #475569;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: all 0.15s;
                    text-align: left;
                }
                .menu-item:hover { background: #f1f5f9; color: #1e293b; }
                .menu-item-blue { color: #1e293b; }
                .menu-item-blue:hover { background: #eff6ff; color: #2563eb; }
                .menu-item.text-red-500 { color: #ef4444; }
                .menu-item.text-red-500:hover { background: #fef2f2; color: #dc2626; }
            `}</style>

            <AnimatePresence>
                {cropSrc && (
                    <CropModal
                        src={cropSrc}
                        onConfirm={handleCropConfirm}
                        onCancel={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc); }}
                    />
                )}
            </AnimatePresence>

            <div className="animate-fade-in" style={{ maxWidth: "700px", margin: "0 auto" }}>
                <main className="px-0 sm:px-4 lg:px-0 pt-0 sm:pt-8 pb-10">
                    <motion.div
                        layout
                        className="bg-white sm:rounded-2xl sm:border border-slate-200 overflow-visible sm:shadow-[0_0_40px_rgba(0,0,0,0.06)]"
                        style={{
                            padding: "1.5rem sm:padding-2rem", // We'll handle this with tailwind-ish thinking or manual
                        }}
                    >
                        <div className="px-5 sm:px-8 py-8 sm:py-10">
                        {/* Header: Avatar + Name */}
                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center text-center sm:text-left mb-8 sm:mb-12">
                            {/* Avatar */}
                            <div style={{ position: "relative" }} className="avatar-wrapper shrink-0" ref={menuRef}>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowImageMenu(!showImageMenu)}
                                className={cn(
                                    "rounded-full flex items-center justify-center overflow-hidden",
                                    !image && getAvatarColor(name || "U")
                                )}
                                style={{
                                    width: "7rem", height: "7rem", // Larger avatar for better impact
                                    position: "relative",
                                    border: "3px solid #f1f5f9",
                                    cursor: "pointer",
                                    color: "white",
                                    fontSize: "2.5rem",
                                    fontWeight: 700,
                                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)"
                                }}
                            >
                                {image ? (
                                    <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <span>{(name || "U").charAt(0).toUpperCase()}</span>
                                )}
                                {/* Hover overlay */}
                                <div
                                    className="avatar-overlay"
                                    style={{
                                        position: "absolute", inset: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        opacity: uploading ? 1 : 0,
                                        transition: "opacity 0.2s",
                                        pointerEvents: "none"
                                    }}
                                >
                                    {uploading && (
                                        <div className="spinner" style={{
                                            width: "1.5rem", height: "1.5rem",
                                            borderColor: "rgba(0,0,0,0.2)", borderRightColor: "#2563eb",
                                            background: "rgba(255,255,255,0.8)",
                                            borderRadius: "50%", padding: "4px",
                                            boxSizing: "content-box"
                                        }} />
                                    )}
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {showImageMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        style={{
                                            position: "absolute",
                                            top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "0.75rem",
                                            background: "white", borderRadius: "1rem",
                                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                                            border: "1px solid #e2e8f0",
                                            padding: "0.5rem", zIndex: 100, minWidth: "180px"
                                        }}
                                    >
                                        <button
                                            onClick={(e) => {
                                                if (!image) return;
                                                e.stopPropagation();
                                                setViewImageModal(true);
                                                setShowImageMenu(false);
                                            }}
                                            className={cn("menu-item menu-item-blue", !image && "opacity-40")}
                                            style={{ cursor: !image ? "not-allowed" : "pointer" }}
                                        >
                                            <ZoomIn size={16} /> ดูรูปโปรไฟล์
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setShowImageMenu(false); }}
                                            className="menu-item menu-item-blue"
                                        >
                                            <Camera size={16} /> อัปโหลดรูปโปรไฟล์
                                        </button>
                                        <div style={{ height: "1px", background: "#f1f5f9", margin: "0.25rem 0.5rem" }} />
                                        <button
                                            onClick={(e) => {
                                                if (!image) return;
                                                e.stopPropagation();
                                                handleClearImage();
                                            }}
                                            className={cn("menu-item text-red-500", !image && "opacity-40")}
                                            style={{ cursor: !image ? "not-allowed" : "pointer" }}
                                        >
                                            <Trash2 size={16} /> ล้างรูปโปรไฟล์
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                                accept="image/*"
                            />
                        </div>

                        {/* Name & Actions */}
                                <div className="flex-1 w-full">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                                        <div className="w-full">
                                            {isEditing ? (
                                                <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="profile-input"
                                            placeholder="ใส่ชื่อของคุณ"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setIsEditing(false); setName(session.user.name); } }}
                                        />
                                            ) : (
                                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 m-0 tracking-tight">
                                                    {name}
                                                </h1>
                                            )}
                                        </div>

                                        {!isEditing ? (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="btn btn-outline shrink-0"
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                                    padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                                                    fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                                                    border: "1.5px solid #e2e8f0"
                                                }}
                                            >
                                                <Edit2 size={16} />
                                                แก้ไขชื่อ
                                            </button>
                                        ) : (
                                            <div style={{ display: "flex", gap: "0.5rem" }} className="shrink-0">
                                                <button
                                                    onClick={() => { setIsEditing(false); setName(session.user.name); }}
                                                    disabled={saving}
                                                    className="btn btn-ghost"
                                                    style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                >
                                                    <X size={20} />
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="btn btn-primary"
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: "0.5rem",
                                                        padding: "0.625rem 1.5rem", borderRadius: "0.75rem",
                                                        fontWeight: 700, cursor: "pointer", fontSize: "0.875rem"
                                                    }}
                                                >
                                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    บันทึก
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Rows */}
                            <div className="flex flex-col gap-1 mt-4 sm:mt-0">
                                {[
                                    { icon: <Mail size={19} />, label: "อีเมล", value: session.user.email },
                                    { icon: <Shield size={19} />, label: "บทบาท", value: (session.user as any).role || "User" },
                                    {
                                        icon: <Calendar size={19} />, label: "วันที่สมัคร",
                                        value: session.user.createdAt ? formatDate(session.user.createdAt.toString()) : "-"
                                    },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center gap-4 py-4 sm:py-5 border-t border-slate-100 last:border-b last:sm:border-b-0">
                                        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-50">
                                            {row.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{row.label}</p>
                                            <p className="text-[15px] sm:text-[16px] font-bold text-slate-700 truncate">{row.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>

            {viewImageModal && (
                <ImageModal
                    isOpen={viewImageModal}
                    onClose={() => setViewImageModal(false)}
                    images={[(fullImage || image || "")]}
                    initialIndex={0}
                />
            )}

            {/* Confirm Clear Image Modal */}
            {showConfirmClear && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 500,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "1rem",
                    }}
                    onClick={() => setShowConfirmClear(false)}
                >
                    <div
                        style={{
                            background: "white", borderRadius: "1rem",
                            padding: "2rem", maxWidth: "360px", width: "100%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            textAlign: "center",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                            <Trash2 size={24} color="#ef4444" />
                        </div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>ล้างรูปโปรไฟล์?</h3>
                        <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                            รูปโปรไฟล์จะถูกลบออกและใช้รูปเริ่มต้นแทน
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button
                                onClick={() => setShowConfirmClear(false)}
                                className="btn btn-ghost"
                                style={{ flex: 1, padding: "0.625rem", borderRadius: "0.625rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={doClearImage}
                                className="btn"
                                style={{ flex: 1, padding: "0.625rem", borderRadius: "0.625rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", background: "#ef4444", color: "white", border: "none" }}
                            >
                                ล้างรูป
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
