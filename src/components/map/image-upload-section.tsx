"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, RefreshCw } from "lucide-react";
import { PIN_CROP_SIZE, CARD_CROP_W, CARD_CROP_H } from "./map-crop-modal";

// ─── constants ───────────────────────────────────────────────
const CONT_W = 392;

// ─── InlineCropEditor ────────────────────────────────────────
interface EditorProps {
    src: string;
    mode: "card" | "pin";
    confirmedBlob: string | null | undefined;
    onBlob: (url: string | null) => void;
}

function InlineCropEditor({ src, mode, confirmedBlob, onBlob }: EditorProps) {
    const contW = 380;
    const contH = 380;

    const cardMaskW = contW * 0.85;
    const cardMaskH = Math.round(cardMaskW * CARD_CROP_H / CARD_CROP_W);
    const cardMaskX = (contW - cardMaskW) / 2;
    const cardMaskY = (contH - cardMaskH) / 2;

    const containerRef = useRef<HTMLDivElement>(null);
    const cropR = (contW / 2) * 0.64;

    // ── display frame size (พื้นที่ crop จริงที่ user เห็น) ────
    // pin: วงกลม diameter = cropR * 2
    // card: สี่เหลี่ยม = cardMaskW × cardMaskH
    const displayFW = mode === "pin" ? cropR * 2 : cardMaskW;
    const displayFH = mode === "pin" ? cropR * 2 : cardMaskH;

    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [imgDim, setImgDim] = useState({ w: 0, h: 0, base: 1 });
    const [showEditor, setShowEditor] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [localSrc, setLocalSrc] = useState(src);

    useEffect(() => {
        if (!src) return;
        if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/_next/") || src.startsWith("/")) {
            setLocalSrc(src);
            return;
        }
        setLocalSrc(`/api/proxy-image?url=${encodeURIComponent(src)}`);
    }, [src]);

    const imgRef = useRef<HTMLImageElement>(null);
    const dragging = useRef(false);
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
    const zoomRef = useRef(zoom);
    const rotRef = useRef(rotation);
    const imgDimRef = useRef(imgDim);
    const offsetRef = useRef(offset);
    const minZoomRef = useRef(1);

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { rotRef.current = rotation; }, [rotation]);
    useEffect(() => { imgDimRef.current = imgDim; }, [imgDim]);
    useEffect(() => { offsetRef.current = offset; }, [offset]);

    // ── clamp ──────────────────────────────────────────────────
    const clamp = useCallback((ox: number, oy: number, z: number, rot: number,
        dim: { w: number; h: number }) => {
        const hw = (dim.w * z) / 2, hh = (dim.h * z) / 2;
        const hfw = mode === "pin" ? cropR : cardMaskW / 2;
        const hfh = mode === "pin" ? cropR : cardMaskH / 2;
        const maxLx = Math.max(0, hw - hfw), maxLy = Math.max(0, hh - hfh);
        const rad = (rot * Math.PI) / 180;
        const c = Math.cos(rad), s = Math.sin(rad);
        const lx = ox * c + oy * s, ly = -ox * s + oy * c;
        const cx = Math.min(maxLx, Math.max(-maxLx, lx));
        const cy = Math.min(maxLy, Math.max(-maxLy, ly));
        return { x: cx * c - cy * s, y: cx * s + cy * c };
    }, [contW, contH, cropR, cardMaskW, cardMaskH, mode]);

    const handleLoad = useCallback(() => {
        const img = imgRef.current!;
        const natW = img.naturalWidth, natH = img.naturalHeight;
        const base = Math.max(displayFW / natW, displayFH / natH);
        const dim = { w: natW * base, h: natH * base, base };
        const minZ = Math.max(displayFW / dim.w, displayFH / dim.h, 1);
        minZoomRef.current = minZ;
        setImgDim(dim); imgDimRef.current = dim;
        setZoom(minZ); zoomRef.current = minZ;
        setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 };
    }, [displayFW, displayFH]);

    useEffect(() => {
        const img = imgRef.current;
        if (img && img.naturalWidth > 0) handleLoad();
    }, [handleLoad]);

    // ── drag — window listeners ────────────────────────────────
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };

        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const dx = ev.clientX - dragStart.current.mx;
            const dy = ev.clientY - dragStart.current.my;
            const clamped = clamp(dragStart.current.ox + dx, dragStart.current.oy + dy,
                zoomRef.current, rotRef.current, imgDimRef.current);
            setOffset(clamped); offsetRef.current = clamped;
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [clamp]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];
        dragging.current = true;
        dragStart.current = { mx: t.clientX, my: t.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };

        const onMove = (ev: TouchEvent) => {
            if (!dragging.current) return;
            const t2 = ev.touches[0];
            const clamped = clamp(
                dragStart.current.ox + t2.clientX - dragStart.current.mx,
                dragStart.current.oy + t2.clientY - dragStart.current.my,
                zoomRef.current, rotRef.current, imgDimRef.current);
            setOffset(clamped); offsetRef.current = clamped;
        };
        const onEnd = () => {
            dragging.current = false;
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onEnd);
        };
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
    }, [clamp]);

    const handleZoom = (z: number) => {
        const minZ = minZoomRef.current;
        const nz = Math.min(4, Math.max(minZ, z));
        setZoom(nz); zoomRef.current = nz;
        const clamped = clamp(offsetRef.current.x, offsetRef.current.y, nz, rotRef.current, imgDimRef.current);
        setOffset(clamped); offsetRef.current = clamped;
    };

    const handleRotate = (delta: number) => {
        const nr = ((rotation + delta) % 360 + 360) % 360;
        setRotation(nr); rotRef.current = nr;
        const clamped = clamp(offsetRef.current.x, offsetRef.current.y, zoomRef.current, nr, imgDimRef.current);
        setOffset(clamped); offsetRef.current = clamped;
    };

    const handleSliderRot = (v: number) => {
        setRotation(v); rotRef.current = v;
        const clamped = clamp(offsetRef.current.x, offsetRef.current.y, zoomRef.current, v, imgDimRef.current);
        setOffset(clamped); offsetRef.current = clamped;
    };

    // ── canvas export ──────────────────────────────────────────
    // CSS บนหน้าจอ: ภาพอยู่ที่ center ของ container + offset
    //   → scale(zoom) uniform, transformOrigin: center
    //   → สิ่งที่ user เห็นใน frame = ส่วนกลางของภาพ ขนาด displayFW × displayFH
    //
    // Canvas: ต้องการ "ถ่าย" เฉพาะส่วนใน frame นั้น แล้วขยายให้พอดี output
    //   sx = outW / displayFW  → 1 display-px = กี่ output-px ในแกน X
    //   sy = outH / displayFH  → 1 display-px = กี่ output-px ในแกน Y
    //
    //   totalScale: scale รวมสำหรับ drawImage (uniform, ตาม CSS)
    //     = base × zoom × sx
    //     (ใช้ sx เพราะ pin square → sx===sy, card → sx เป็น scale หลักแกน X)
    //
    //   translate offset: แปลงจาก display space → output canvas space แยก X/Y
    //     offset.x * sx, offset.y * sy
    const handleConfirm = () => {
        const img = imgRef.current;
        if (!img || imgDimRef.current.w === 0) return;
        setProcessing(true);

        const outW = mode === "pin" ? PIN_CROP_SIZE : CARD_CROP_W;
        const outH = mode === "pin" ? PIN_CROP_SIZE : CARD_CROP_H;
        const canvas = document.createElement("canvas");
        canvas.width = outW; canvas.height = outH;
        const ctx = canvas.getContext("2d")!;

        if (mode === "pin") {
            ctx.beginPath();
            ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
            ctx.closePath(); ctx.clip();
        }

        const sx = outW / displayFW;
        const sy = outH / displayFH;

        const dim = imgDimRef.current;
        const totalScale = dim.base * zoomRef.current * sx;

        ctx.translate(
            outW / 2 + offsetRef.current.x * sx,
            outH / 2 + offsetRef.current.y * sy
        );
        ctx.rotate((rotRef.current * Math.PI) / 180);
        ctx.drawImage(img,
            -img.naturalWidth / 2 * totalScale,
            -img.naturalHeight / 2 * totalScale,
            img.naturalWidth * totalScale,
            img.naturalHeight * totalScale
        );

        const dataUrl = canvas.toDataURL("image/png");
        setProcessing(false);
        onBlob(dataUrl);
        setShowEditor(false);
    };

    const imgLoaded = imgDim.w > 0;
    const label = mode === "pin" ? "หมุด (วงกลม)" : "การ์ด (สี่เหลี่ยม)";

    // ── Preview ────────────────────────────────────────────────
    if (!showEditor) return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 5 }}>
                    {confirmedBlob ? (
                        <><CheckCircle2 size={13} color="#22c55e" /> ครอบตัด{label}แล้ว</>
                    ) : (
                        <><Upload size={13} color="#2563eb" /> อัปโหลดรูปภาพแล้ว</>
                    )}
                </span>
                <button type="button" onClick={() => setShowEditor(true)}
                    style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <RefreshCw size={11} /> {confirmedBlob ? "แก้ไข" : "ครอบตัดรูป"}
                </button>
            </div>
            <div style={{
                position: "relative", borderRadius: mode === "pin" ? "50%" : 10, overflow: "hidden",
                width: mode === "pin" ? 140 : "100%",
                height: mode === "pin" ? 140 : Math.round(CONT_W * CARD_CROP_H / CARD_CROP_W),
                background: "#f8fafc", border: "2px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
            }}>
                <img src={confirmedBlob || src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
        </div>
    );

    // ── Editor ─────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>ครอบตัด{label}</span>
                {confirmedBlob && (
                    <button type="button" onClick={() => setShowEditor(false)} className="active:scale-95"
                        style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}>
                        ยกเลิก
                    </button>
                )}
            </div>

            {/* Crop canvas */}
            <div ref={containerRef}
                style={{
                    width: "100%", maxWidth: contW, height: contH, position: "relative", borderRadius: 12,
                    overflow: "hidden", background: "#f1f5f9", cursor: "grab", userSelect: "none", flexShrink: 0
                }}
                onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>

                <img ref={imgRef} src={localSrc} alt="" onLoad={handleLoad} draggable={false} crossOrigin="anonymous"
                    style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: "center",
                        width: imgLoaded ? imgDim.w : "auto",
                        height: imgLoaded ? imgDim.h : "auto",
                        maxWidth: "none", maxHeight: "none",
                        pointerEvents: "none", display: "block", objectFit: "fill"
                    }}
                />

                <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={contW} height={contH}>
                    <defs>
                        <mask id={`lm-mask-${mode}`}>
                            <rect width={contW} height={contH} fill="white" />
                            {mode === "pin" && <circle cx={contW / 2} cy={contH / 2} r={cropR} fill="black" />}
                            {mode === "card" && <rect x={cardMaskX} y={cardMaskY} width={cardMaskW} height={cardMaskH} rx={4} fill="black" />}
                        </mask>
                    </defs>
                    <rect width={contW} height={contH} fill="rgba(0,0,0,0.3)" mask={`url(#lm-mask-${mode})`} />
                    {mode === "pin"
                        ? <circle cx={contW / 2} cy={contH / 2} r={cropR - 1} fill="none" stroke="white" strokeWidth="2.5" />
                        : <rect x={cardMaskX} y={cardMaskY} width={cardMaskW} height={cardMaskH} rx={4} fill="none" stroke="white" strokeWidth="1.5" />
                    }
                </svg>

                <div style={{
                    position: "absolute", top: 8, left: 8, padding: "2px 10px",
                    background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)",
                    borderRadius: 999, fontSize: 10, fontWeight: 700, color: "#1e40af", pointerEvents: "none"
                }}>
                    {label}
                </div>
            </div>

            {/* Controls */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button type="button" onClick={() => handleZoom(zoom - 0.1)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 2 }}><ZoomOut size={14} /></button>
                    <input type="range" min={Math.round(minZoomRef.current * 100)} max={400} value={Math.round(zoom * 100)}
                        onChange={e => handleZoom(Number(e.target.value) / 100)}
                        style={{ flex: 1, accentColor: "#2563eb" }} />
                    <button type="button" onClick={() => handleZoom(zoom + 0.1)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 2 }}><ZoomIn size={14} /></button>
                    <span style={{ fontSize: 10, color: "#9ca3af", width: 36, textAlign: "right" }}>{Math.round(zoom * 100)}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <RotateCcw size={12} color="#9ca3af" style={{ flexShrink: 0 }} />
                    <button type="button" onClick={() => handleRotate(-90)}
                        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer", color: "#6b7280" }}>−90°</button>
                    <input type="range" min={0} max={360} value={rotation}
                        onChange={e => handleSliderRot(Number(e.target.value))}
                        style={{ flex: 1, accentColor: "#2563eb" }} />
                    <button type="button" onClick={() => handleRotate(90)}
                        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer", color: "#6b7280" }}>+90°</button>
                    <span style={{ fontSize: 10, color: "#9ca3af", width: 36, textAlign: "right" }}>{rotation}°</span>
                </div>
            </div>

            <button type="button" onClick={handleConfirm} disabled={processing || !imgLoaded}
                className="active:scale-95"
                style={{
                    width: "100%", height: 36, borderRadius: 8, border: "none", background: "#22c55e",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: (processing || !imgLoaded) ? 0.6 : 1, transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!processing) (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#22c55e"; }}>
                {processing && <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
                {processing ? "กำลังประมวลผล..." : "ยืนยัน"}
            </button>
        </div>
    );
}

// ─── ImageUploadSection ───────────────────────────────────────
interface ImageUploadSectionProps {
    rawUrl: string | null;
    uploading: boolean;
    onClear: () => void;
    onFileChange: (files: FileList) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    cardBlobUrl: string | null;
    pinBlobUrl: string | null;
    initialCardUrl?: string | null;
    initialPinUrl?: string | null;
    onCardBlob: (url: string | null) => void;
    onPinBlob: (url: string | null) => void;
}

export function ImageUploadSection({
    rawUrl, uploading, onClear, onFileChange, fileInputRef,
    cardBlobUrl, pinBlobUrl, initialCardUrl, initialPinUrl, onCardBlob, onPinBlob,
}: ImageUploadSectionProps) {

    const getSafeUrl = (url: unknown): string | null => {
        if (!url || typeof url !== 'string') return null;
        if (url.trim() === '' || url === 'undefined' || url === 'null') return null;
        if (url.startsWith('{')) {
            try {
                const parsed = JSON.parse(url);
                return parsed.url || parsed.path || (parsed.images && parsed.images[0]) || null;
            } catch { return url; }
        }
        return url;
    };

    const safeUrl = getSafeUrl(rawUrl);

    if (!safeUrl) return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginLeft: 2 }}>รูปภาพสถานที่</label>
            <div onClick={() => fileInputRef.current?.click()}
                style={{
                    width: "100%", height: 96, border: "2px dashed #e5e7eb", borderRadius: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, color: "#9ca3af", cursor: "pointer", transition: "all 0.15s", background: "#fafafa"
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#2563eb"; el.style.color = "#2563eb"; el.style.background = "#eff6ff"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#e5e7eb"; el.style.color = "#9ca3af"; el.style.background = "#fafafa"; }}>
                {uploading ? (
                    <>
                        <div style={{ width: 22, height: 22, border: "2.5px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>กำลังอัปโหลด...</span>
                    </>
                ) : (
                    <>
                        <div style={{ width: 36, height: 36, background: "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Upload size={16} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>คลิกเพื่ออัปโหลดรูปภาพ</span>
                        <span style={{ fontSize: 9, color: "#d1d5db" }}>JPG, PNG หรือ WEBP</span>
                    </>
                )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files) onFileChange(e.target.files); e.target.value = ""; }} />
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginLeft: 2 }}>รูปภาพสถานที่</label>
                <button type="button" onClick={() => { onClear(); onCardBlob(null); onPinBlob(null); }}
                    style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    <X size={11} /> เปลี่ยนรูป
                </button>
            </div>

            <InlineCropEditor src={safeUrl} mode="card" confirmedBlob={cardBlobUrl || initialCardUrl} onBlob={onCardBlob} />
            <div style={{ height: 1, background: "#f3f4f6" }} />
            <InlineCropEditor src={safeUrl} mode="pin" confirmedBlob={pinBlobUrl || initialPinUrl} onBlob={onPinBlob} />

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files) onFileChange(e.target.files); e.target.value = ""; }} />
        </div>
    );
}