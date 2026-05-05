"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Move, ZoomIn, RotateCcw, Upload } from "lucide-react";
import { CARD_CROP_W, CARD_CROP_H } from "./map-crop-modal";
import type { ImageAdjustment } from "./image-adjustment";

// ── Rectangle-aware clamp (correct for non-90° rotation) ──────────────────
// When image rotated by `rot`, the crop frame appears as a rotated rect in
// image-local space.  Its local-x extent = Fx*|cos|+Fy*|sin|, y = Fx*|sin|+Fy*|cos|
function rectClamp(
    ox: number, oy: number, z: number, rot: number,
    natW: number, natH: number, base: number,
    Fx: number, Fy: number          // half-frame display dimensions
) {
    const rad = (rot * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const ac = Math.abs(c), as = Math.abs(s);
    const rW = natW * base * z;
    const rH = natH * base * z;
    const maxLx = Math.max(0, rW / 2 - (Fx * ac + Fy * as));
    const maxLy = Math.max(0, rH / 2 - (Fx * as + Fy * ac));
    const lx =  ox * c + oy * s;
    const ly = -ox * s + oy * c;
    const cx = Math.min(maxLx, Math.max(-maxLx, lx));
    const cy = Math.min(maxLy, Math.max(-maxLy, ly));
    return { x: cx * c - cy * s, y: cx * s + cy * c };
}

// ── Minimum zoom so the image COVERS the rectangle frame at angle `rot` ────
function calcMinZoom(natW: number, natH: number, base: number, Fx: number, Fy: number, rot: number) {
    const rad = (rot * Math.PI) / 180;
    const ac = Math.abs(Math.cos(rad)), as = Math.abs(Math.sin(rad));
    const needW = 2 * (Fx * ac + Fy * as);
    const needH = 2 * (Fx * as + Fy * ac);
    const z1 = natW * base > 0 ? needW / (natW * base) : 1;
    const z2 = natH * base > 0 ? needH / (natH * base) : 1;
    return Math.max(1, z1, z2);
}

// ── Convert saved ImageAdjustment (%-based) → pixel offset ────────────────
// adj.x/y are % where 50 = center. offset = ((x-50)/50) * (rW/2)
function adjToPixelOffset(adj: ImageAdjustment, natW: number, natH: number, base: number) {
    const rW = natW * base * adj.zoom;
    const rH = natH * base * adj.zoom;
    const ox = ((adj.x - 50) / 50) * (rW / 2);
    const oy = ((adj.y - 50) / 50) * (rH / 2);
    return { ox, oy };
}

interface Props {
    imageUrl: string | null;
    uploading: boolean;
    onClear: () => void;
    onFileChange: (files: FileList) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    adj: ImageAdjustment;
    onAdjChange: (adj: ImageAdjustment) => void;
}

const DISP_PAD = 16;
const CONT_H = 360;

export const CardCropSection: React.FC<Props> = ({
    imageUrl, uploading, onClear, onFileChange, fileInputRef, adj, onAdjChange,
}) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const imgRef  = useRef<HTMLImageElement>(null);
    const natRef  = useRef({ w: 0, h: 0, base: 1 });
    const dragging = useRef(false);
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
    const [contW, setContW] = useState(316);
    const [st, setSt] = useState({ zoom: 1, ox: 0, oy: 0, rot: 0 });
    const stRef = useRef(st);
    // Mutable ref so handleImgLoad always sees the latest adj (avoids stale closure)
    const adjRef = useRef(adj);
    useEffect(() => { adjRef.current = adj; }, [adj]);

    // Frame display half-dims
    const Fw = (contW - DISP_PAD * 2) / 2;
    const Fh = Fw * CARD_CROP_H / CARD_CROP_W;

    // Measure container
    useEffect(() => {
        const el = outerRef.current; if (!el) return;
        const ro = new ResizeObserver(() => setContW(el.offsetWidth));
        ro.observe(el); setContW(el.offsetWidth);
        return () => ro.disconnect();
    }, []);

    // Apply transform to DOM directly
    const applyTransform = useCallback((s: typeof st) => {
        const img = imgRef.current; if (!img) return;
        img.style.transform = `translate(calc(-50% + ${s.ox}px), calc(-50% + ${s.oy}px)) scale(${s.zoom}) rotate(${s.rot}deg)`;
        img.style.transformOrigin = "center center";
    }, []);

    // Rebase when contW changes — preserve current state (don't reset)
    useEffect(() => {
        const img = imgRef.current;
        const { w, h } = natRef.current;
        if (!w || !h || !img) return;
        const base = Math.max((Fw * 2) / w, (Fh * 2) / h);
        natRef.current.base = base;
        img.style.width  = `${w * base}px`;
        img.style.height = `${h * base}px`;
        const s = stRef.current;
        const minZ = calcMinZoom(w, h, base, Fw, Fh, s.rot);
        const newZ = Math.max(minZ, s.zoom);
        const clamped = rectClamp(s.ox, s.oy, newZ, s.rot, w, h, base, Fw, Fh);
        const ns = { ...s, zoom: newZ, ox: clamped.x, oy: clamped.y };
        setSt(ns); stRef.current = ns; applyTransform(ns);
        commitAdj(ns, w, h, base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contW]);

    const commitAdj = useCallback((s: typeof st, w: number, h: number, base: number) => {
        const rW = w * base * s.zoom;
        const rH = h * base * s.zoom;
        const x = 50 + (rW > 0 ? (s.ox / rW) * 50 : 0);
        const y = 50 + (rH > 0 ? (s.oy / rH) * 50 : 0);
        onAdjChange({ x, y, zoom: s.zoom, rotate: s.rot });
    }, [onAdjChange]);

    // ── Image load: restore from adj prop (saved crop) ────────────────────
    const handleImgLoad = useCallback(() => {
        const img = imgRef.current; if (!img) return;
        const w = img.naturalWidth, h = img.naturalHeight;
        const base = Math.max((Fw * 2) / w, (Fh * 2) / h);
        natRef.current = { w, h, base };
        img.style.width  = `${w * base}px`;
        img.style.height = `${h * base}px`;

        // ── Restore from saved adj (use adjRef for latest value) ──────────
        const savedAdj = adjRef.current;  // ✅ always latest, no stale closure
        const zoom = Math.max(1, savedAdj.zoom ?? 1);
        const rot  = savedAdj.rotate ?? 0;
        const minZ = calcMinZoom(w, h, base, Fw, Fh, rot);
        const finalZoom = Math.max(minZ, zoom);
        const { ox: rawOx, oy: rawOy } = adjToPixelOffset({ ...savedAdj, zoom: finalZoom }, w, h, base);
        const clamped = rectClamp(rawOx, rawOy, finalZoom, rot, w, h, base, Fw, Fh);

        const ns = { zoom: finalZoom, ox: clamped.x, oy: clamped.y, rot };
        setSt(ns); stRef.current = ns; applyTransform(ns);
        // Do NOT call commitAdj here — the adj is already known and correct
    }, [Fw, Fh, applyTransform]);  // adjRef is a ref, no need in deps

    useEffect(() => { applyTransform(st); }, [st, applyTransform]);

    const doUpdate = useCallback((ns: typeof st) => {
        const { w, h, base } = natRef.current;
        const minZ = calcMinZoom(w, h, base, Fw, Fh, ns.rot);
        const z = Math.max(minZ, ns.zoom);
        const clamped = rectClamp(ns.ox, ns.oy, z, ns.rot, w, h, base, Fw, Fh);
        const final = { ...ns, zoom: z, ox: clamped.x, oy: clamped.y };
        setSt(final); stRef.current = final; applyTransform(final);
        return final;
    }, [Fw, Fh, applyTransform]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); dragging.current = true;
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: stRef.current.ox, oy: stRef.current.oy };
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const dx = ev.clientX - dragStart.current.mx;
            const dy = ev.clientY - dragStart.current.my;
            const { w, h, base } = natRef.current;
            const s = stRef.current;
            const clamped = rectClamp(dragStart.current.ox + dx, dragStart.current.oy + dy, s.zoom, s.rot, w, h, base, Fw, Fh);
            const ns = { ...s, ox: clamped.x, oy: clamped.y };
            setSt(ns); stRef.current = ns; applyTransform(ns);
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            const { w, h, base } = natRef.current;
            commitAdj(stRef.current, w, h, base);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [Fw, Fh, applyTransform, commitAdj]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const t0 = e.touches[0]; dragging.current = true;
        dragStart.current = { mx: t0.clientX, my: t0.clientY, ox: stRef.current.ox, oy: stRef.current.oy };
        const onMove = (ev: TouchEvent) => {
            if (!dragging.current) return;
            const t = ev.touches[0];
            const dx = t.clientX - dragStart.current.mx, dy = t.clientY - dragStart.current.my;
            const { w, h, base } = natRef.current; const s = stRef.current;
            const clamped = rectClamp(dragStart.current.ox + dx, dragStart.current.oy + dy, s.zoom, s.rot, w, h, base, Fw, Fh);
            const ns = { ...s, ox: clamped.x, oy: clamped.y };
            setSt(ns); stRef.current = ns; applyTransform(ns);
        };
        const onEnd = () => {
            dragging.current = false;
            window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd);
            const { w, h, base } = natRef.current; commitAdj(stRef.current, w, h, base);
        };
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
    }, [Fw, Fh, applyTransform, commitAdj]);

    const handleZoom = (z: number) => {
        const { w, h, base } = natRef.current;
        const minZ = calcMinZoom(w, h, base, Fw, Fh, stRef.current.rot);
        const final = doUpdate({ ...stRef.current, zoom: Math.max(minZ, Math.min(4, z)) });
        commitAdj(final, w, h, base);
    };
    const handleRotate = (deg: number) => {
        const newRot = ((deg % 360) + 360) % 360;
        const { w, h, base } = natRef.current;
        const final = doUpdate({ ...stRef.current, rot: newRot });
        commitAdj(final, w, h, base);
    };

    // SVG geometry
    const svgFW = Fw * 2, svgFH = Fh * 2;
    const svgFX = DISP_PAD;
    const svgFY = Math.round((CONT_H - svgFH) / 2);
    const maskId = "card-rect-mask";
    const minZ = natRef.current.base ? calcMinZoom(natRef.current.w, natRef.current.h, natRef.current.base, Fw, Fh, st.rot) : 1;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {imageUrl ? (
                <>
                    {/* Crop canvas */}
                    <div ref={outerRef}
                        style={{ position: "relative", width: "100%", height: CONT_H, borderRadius: "14px", overflow: "hidden", background: "#f1f5f9", cursor: "grab", userSelect: "none" }}
                        onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>

                        <img ref={imgRef} src={imageUrl} alt="" onLoad={handleImgLoad} draggable={false}
                            style={{ position: "absolute", top: "50%", left: "50%", maxWidth: "none", maxHeight: "none", display: "block", pointerEvents: "none", userSelect: "none", willChange: "transform" }} />

                        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }} width={contW} height={CONT_H}>
                            <defs>
                                <mask id={maskId}>
                                    <rect x={0} y={0} width={contW} height={CONT_H} fill="white" />
                                    <rect x={svgFX} y={svgFY} width={svgFW} height={svgFH} rx={8} fill="black" />
                                </mask>
                            </defs>
                            <rect x={0} y={0} width={contW} height={CONT_H} fill="rgba(0,0,0,0.3)" mask={`url(#${maskId})`} />
                            <rect x={svgFX} y={svgFY} width={svgFW} height={svgFH} rx={8} fill="none" stroke="white" strokeWidth="2" />
                        </svg>

                        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 20, padding: "3px 10px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", borderRadius: "999px", fontSize: "10px", fontWeight: 700, color: "#1e40af", border: "1px solid rgba(37,99,235,0.15)", display: "flex", alignItems: "center", gap: "6px", pointerEvents: "none" }}>
                            <Move size={10} /> มุมมองการ์ด (ผืนผ้า)
                        </div>
                        <button type="button" onClick={onClear}
                            style={{ position: "absolute", top: 8, right: 8, zIndex: 20, width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
                            <X size={13} />
                        </button>
                    </div>

                    {/* Controls */}
                    <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <ZoomIn size={11} style={{ color: "#2563eb" }} /> ขยาย: {st.zoom.toFixed(1)}x
                                </span>
                                <button type="button" onClick={() => handleZoom(1)} style={{ fontSize: "10px", color: "#2563eb", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>คืนค่า</button>
                            </div>
                            <input type="range" min={Math.round(minZ * 100)} max={400} value={Math.round(st.zoom * 100)}
                                onChange={e => handleZoom(Number(e.target.value) / 100)}
                                style={{ width: "100%", accentColor: "#2563eb", outline: "none", border: "none", background: "none", cursor: "pointer" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <RotateCcw size={11} style={{ color: "#2563eb" }} /> หมุน: {st.rot}°
                                </span>
                                <button type="button" onClick={() => handleRotate(0)} style={{ fontSize: "10px", color: "#2563eb", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>คืนค่า</button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button type="button" onClick={() => handleRotate(st.rot - 90)}
                                    style={{ width: 30, height: 30, borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "13px", color: "#6b7280", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}>↺</button>
                                <input type="range" min={0} max={360} step={1} value={st.rot}
                                    onChange={e => handleRotate(parseInt(e.target.value))}
                                    style={{ flex: 1, accentColor: "#2563eb", outline: "none", border: "none", background: "none", cursor: "pointer" }} />
                                <button type="button" onClick={() => handleRotate(st.rot + 90)}
                                    style={{ width: 30, height: 30, borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "13px", color: "#6b7280", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}>↻</button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div onClick={() => fileInputRef.current?.click()}
                    style={{ width: "100%", height: "110px", border: "2px dashed #e5e7eb", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#9ca3af", cursor: "pointer", transition: "all 0.15s", background: "#fafafa" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2563eb"; (e.currentTarget as HTMLElement).style.color = "#2563eb"; (e.currentTarget as HTMLElement).style.background = "#eff6ff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}>
                    {uploading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: 24, height: 24, border: "2.5px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            <span style={{ fontSize: "11px", fontWeight: 700 }}>กำลังอัปโหลด...</span>
                        </div>
                    ) : (
                        <>
                            <div style={{ width: 38, height: 38, background: "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Upload size={18} />
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: 700 }}>คลิกเพื่ออัปโหลดรูปภาพ</span>
                            <span style={{ fontSize: "9px", color: "#d1d5db" }}>JPG, PNG หรือ WEBP</span>
                        </>
                    )}
                </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files) onFileChange(e.target.files); e.target.value = ""; }} />
        </div>
    );
};
