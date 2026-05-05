"use client";
import React, { useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Output sizes
export const PIN_CROP_SIZE = 192;
export const CARD_CROP_W   = 480;
export const CARD_CROP_H   = 270;

// Display container width (fixed)
const CONT_W = 380;

interface CropModalProps {
    src: string;
    mode: "card" | "pin";
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}

export function MapCropModal({ src, mode, onConfirm, onCancel }: CropModalProps) {
    // Display container dims (unchanged — DO NOT modify contW/cropR or export will distort)
    const contW = CONT_W;  // always 380
    const contH = CONT_W;  // Always square container to allow seeing "bleed" area above/below card
    // svgR is visual only: 64% of half-width (to match profile page UI: 128/200)
    const svgR  = mode === "pin" ? (contW / 2) * 0.64 : 0;
    
    // Card mask dims (85% width)
    const cardMaskW = contW * 0.85;
    const cardMaskH = Math.round(cardMaskW * CARD_CROP_H / CARD_CROP_W);
    const cardMaskX = (contW - cardMaskW) / 2;
    const cardMaskY = (contH - cardMaskH) / 2;

    // cropR for clamping: define the radius for pin mode or half-dims for card
    const cropR = mode === "pin" ? svgR : 0; 

    const [zoom, setZoom]         = useState(1);
    const [offset, setOffset]     = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
    const imgRef    = useRef<HTMLImageElement>(null);
    const [imgDim,  setImgDim]    = useState({ w: 0, h: 0, base: 1 });

    // On load: compute base cover scale — same as profile page
    const handleLoad = () => {
        const img = imgRef.current!;
        const natW = img.naturalWidth, natH = img.naturalHeight;
        // Cover the crop area (same as profile page — prevents "squeezing" look for long images)
        const targetW = mode === "pin" ? svgR * 2 : cardMaskW;
        const targetH = mode === "pin" ? svgR * 2 : cardMaskH;
        const base = Math.max(targetW / natW, targetH / natH);
        setImgDim({ w: natW * base, h: natH * base, base });
        setOffset({ x: 0, y: 0 });
    };

    // Clamp: rotate → clamp in local space → rotate back (same as profile)
    const clamp = useCallback((ox: number, oy: number, z: number, rot: number, dim: { w: number; h: number }) => {
        const hw = (dim.w * z) / 2;
        const hh = (dim.h * z) / 2;
        const hfw = mode === "pin" ? cropR : cardMaskW / 2; // half frame width
        const hfh = mode === "pin" ? cropR : cardMaskH / 2; // half frame height
        const maxLx = Math.max(0, hw - hfw);
        const maxLy = Math.max(0, hh - hfh);
        const rad = (rot * Math.PI) / 180;
        const c = Math.cos(rad), s = Math.sin(rad);
        const lx = ox * c + oy * s;
        const ly = -ox * s + oy * c;
        const cx = Math.min(maxLx, Math.max(-maxLx, lx));
        const cy = Math.min(maxLy, Math.max(-maxLy, ly));
        return { x: cx * c - cy * s, y: cx * s + cy * c };
    }, [contW, contH]);

    const onMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
        e.preventDefault();
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy, zoom, rotation, imgDim));
    };
    const onMouseUp = () => setDragging(false);

    const handleZoom = (z: number) => {
        const nz = Math.min(4, Math.max(1, z));
        setZoom(nz);
        setOffset(prev => clamp(prev.x, prev.y, nz, rotation, imgDim));
    };
    const handleRotate = (deg: number) => {
        const nr = ((rotation + deg) % 360 + 360) % 360;
        setRotation(nr);
        setOffset(prev => clamp(prev.x, prev.y, zoom, nr, imgDim));
    };
    const handleSliderRot = (v: number) => {
        setRotation(v);
        setOffset(prev => clamp(prev.x, prev.y, zoom, v, imgDim));
    };

    // Canvas export — replicate CSS transform exactly (same math as profile page)
    const handleConfirm = () => {
        const img = imgRef.current;
        if (!img || !imgDim.base) return;
        setProcessing(true);
        const outW = mode === "pin" ? PIN_CROP_SIZE : CARD_CROP_W;
        const outH = mode === "pin" ? PIN_CROP_SIZE : CARD_CROP_H;
        const canvas = document.createElement("canvas");
        canvas.width = outW; canvas.height = outH;
        const ctx = canvas.getContext("2d")!;

        if (mode === "pin") {
            ctx.beginPath();
            ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
        }

        // Scale from display circle → output circle
        // svgR * 2 is the width the user sees. outW is the target width.
        const s = mode === "pin" ? (outW / (svgR * 2)) : (outW / cardMaskW);
        const totalScale = imgDim.base * zoom * s;
        ctx.translate(outW / 2 + offset.x * s, outH / 2 + offset.y * s);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img,
            -img.naturalWidth  / 2 * totalScale,
            -img.naturalHeight / 2 * totalScale,
             img.naturalWidth      * totalScale,
             img.naturalHeight     * totalScale
        );
        canvas.toBlob(b => { setProcessing(false); if (b) onConfirm(b); }, "image/png");
    };

    const imgLoaded = imgDim.w > 0;
    const label = mode === "pin" ? "ครอบตัดหมุด (วงกลม)" : "ครอบตัดการ์ด (สี่เหลี่ยม)";

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
            <div style={{ background: "#fff", borderRadius: "1.25rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: `${contW + 80}px` }}>

                {/* Header */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", position: "relative", marginBottom: "4px" }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif' }}>{label}</span>
                    </div>
                    <button onClick={onCancel} style={{ position: "absolute", right: 0, width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", transition: "all 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}>
                        <X size={16} />
                    </button>
                </div>

                {/* Crop canvas */}
                <div style={{ width: contW, height: contH, borderRadius: "0.75rem", position: "relative", overflow: "hidden", background: "#f8fafc", cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
                    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

                    <img ref={imgRef} src={src} alt="" onLoad={handleLoad} draggable={false}
                        style={{ position: "absolute", top: "50%", left: "50%",
                            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                            transformOrigin: "center",
                            width: imgLoaded ? imgDim.w : "auto",
                            height: imgLoaded ? imgDim.h : "auto",
                            maxWidth: "none",
                            maxHeight: "none",
                            pointerEvents: "none", display: "block",
                            objectFit: "fill" }} />

                    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={contW} height={contH}>
                        <defs>
                            <mask id="lm-crop-mask">
                                <rect width={contW} height={contH} fill="white" />
                                {mode === "pin" && <circle cx={contW / 2} cy={contH / 2} r={cropR} fill="black" />}
                                {mode === "card" && <rect x={cardMaskX} y={cardMaskY} width={cardMaskW} height={cardMaskH} rx={4} fill="black" />}
                            </mask>
                        </defs>
                        <rect width={contW} height={contH} fill="rgba(0,0,0,0.3)" mask="url(#lm-crop-mask)" />
                        {mode === "pin" 
                            ? <circle cx={contW / 2} cy={contH / 2} r={cropR - 1} fill="none" stroke="white" strokeWidth="2.5" />
                            : <rect x={cardMaskX} y={cardMaskY} width={cardMaskW} height={cardMaskH} rx={4} fill="none" stroke="white" strokeWidth="1.5" />
                        }
                    </svg>
                </div>

                {/* Zoom */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button onClick={() => handleZoom(zoom - 0.1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "0.25rem" }}><ZoomOut size={18} /></button>
                    <input type="range" min={100} max={400} value={Math.round(zoom * 100)} onChange={e => handleZoom(Number(e.target.value) / 100)} style={{ flex: 1, accentColor: "#2563eb" }} />
                    <button onClick={() => handleZoom(zoom + 0.1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "0.25rem" }}><ZoomIn size={18} /></button>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", width: "3rem", textAlign: "right" }}>{Math.round(zoom * 100)}%</span>
                </div>

                {/* Rotate */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <RotateCcw size={16} style={{ color: "#64748b", flexShrink: 0 }} />
                    <button onClick={() => handleRotate(-90)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", fontSize: "0.8rem", cursor: "pointer", color: "#475569" }}>−90°</button>
                    <input type="range" min={0} max={360} value={rotation} onChange={e => handleSliderRot(Number(e.target.value))} style={{ flex: 1, accentColor: "#2563eb" }} />
                    <button onClick={() => handleRotate(90)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", fontSize: "0.8rem", cursor: "pointer", color: "#475569" }}>+90°</button>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", width: "3rem", textAlign: "right" }}>{rotation}°</span>
                </div>

                {/* Actions */}
                <div style={{ width: "100%", display: "flex", gap: "0.75rem", marginTop: "4px" }}>
                    <button onClick={onCancel} style={{ flex: 1, height: "42px", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", background: "#fff", border: "1px solid #e2e8f0", color: "#475569", transition: "all 0.2s", fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif' }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>ยกเลิก</button>
                    <button onClick={handleConfirm} disabled={processing || !imgLoaded}
                        style={{ flex: 1, height: "42px", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", background: "#2563eb", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: (processing || !imgLoaded) ? 0.6 : 1, transition: "all 0.2s", boxShadow: "0 4px 12px rgba(37,99,235,0.25)", fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif' }}
                        onMouseEnter={e => { if (!processing) (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
                        onMouseLeave={e => { if (!processing) (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}>
                        {processing && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
                        ยืนยันการครอบตัด
                    </button>
                </div>
            </div>
        </div>
    );
}
