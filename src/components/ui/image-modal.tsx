"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Save, Copy, RotateCw, Scan, Expand, Shrink, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ImageModalProps {
    isOpen: boolean; onClose: () => void;
    images: string[]; initialIndex: number;
    onDelete?: (index: number) => void;
}

const ZOOM_PRESETS = [400, 300, 200, 100, 75, 50, 25, 10];
const MIN_ZOOM = 0.1;
const EDGE_PX = 120;

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0,
        opacity: 0,
        scale: 0.95
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? "100%" : direction > 0 ? "-100%" : 0,
        opacity: 0,
        scale: 0.95
    })
};

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, images, initialIndex, onDelete }) => {
    const [idx, setIdx] = useState(initialIndex);
    const [direction, setDirection] = useState(0);
    const [zoom, setZoomRaw] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [immersive, setImmersive] = useState(false);
    const [showBar, setShowBar] = useState(false);
    const [showZoomDrop, setShowZoomDrop] = useState(false);
    const [zoomInput, setZoomInput] = useState("100");
    const [mouseX, setMouseX] = useState(-1);
    const [isMobile, setIsMobile] = useState(false);
    const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const touchStart = useRef({ x: 0, y: 0 });

    const imgRef = useRef<HTMLImageElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const panStart = useRef({ x: 0, y: 0 });
    const firstBarShow = useRef(true);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const clampZoom = (v: number) => Math.min(Math.max(v, MIN_ZOOM), 4);

    const setZoom = useCallback((v: number) => {
        const c = clampZoom(v);
        setZoomRaw(c);
        setZoomInput(String(Math.round(c * 100)));
        if (c <= 1) setPan({ x: 0, y: 0 });
    }, []);

    const getMaxPan = useCallback(() => {
        if (!imgRef.current || !areaRef.current) return { maxX: 0, maxY: 0 };
        return {
            maxX: Math.max(0, (imgRef.current.offsetWidth * zoom - areaRef.current.clientWidth) / 2),
            maxY: Math.max(0, (imgRef.current.offsetHeight * zoom - areaRef.current.clientHeight) / 2),
        };
    }, [zoom]);

    const clampPan = useCallback((x: number, y: number) => {
        const { maxX, maxY } = getMaxPan();
        return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    }, [getMaxPan]);

    const canPan = () => { const { maxX, maxY } = getMaxPan(); return maxX > 0 || maxY > 0; };

    useEffect(() => { setPan(p => clampPan(p.x, p.y)); }, [zoom, clampPan]);

    useEffect(() => {
        if (isOpen) {
            setIdx(initialIndex); setZoom(1); setRotation(0);
            setPan({ x: 0, y: 0 }); setImmersive(false); setShowBar(false);
            firstBarShow.current = true;
            
            const updateWidth = () => {
                // Use window.innerWidth as the absolute source for a full-screen fixed modal
                setWidth(window.innerWidth);
            };
            
            updateWidth();
            // Ensure we update on mount and resize
            window.addEventListener("resize", updateWidth);
            return () => window.removeEventListener("resize", updateWidth);
        }
    }, [isOpen, initialIndex, setZoom]);

    const go = useCallback((delta: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDirection(delta);
        setIdx(p => { const n = p + delta; if (n < 0) return images.length - 1; if (n >= images.length) return 0; return n; });
        setZoom(1); setRotation(0); setPan({ x: 0, y: 0 });
    }, [images.length, setZoom]);

    const handleDownload = useCallback(async () => {
        try {
            const url = images[idx];
            const blob = await fetch(url).then(r => r.blob());
            const fname = fileName(url);

            // Try to use the modern File System Access API for a true "Save As" dialog
            if ('showSaveFilePicker' in window) {
                try {
                    let mime = blob.type;
                    let ext = "jpg";
                    let desc = "JPEG Image";

                    if (mime === "image/png") { ext = "png"; desc = "PNG Image"; }
                    else if (mime === "image/webp") { ext = "webp"; desc = "WebP Image"; }
                    else if (mime === "image/gif") { ext = "gif"; desc = "GIF Image"; }
                    else { mime = "image/jpeg"; ext = "jpg"; desc = "JPEG Image"; }

                    let suggestedName = fname;
                    if (!suggestedName.includes('.')) {
                        suggestedName += `.${ext}`;
                    } else if (!suggestedName.toLowerCase().endsWith(`.${ext}`)) {
                        suggestedName = suggestedName.substring(0, suggestedName.lastIndexOf('.')) + `.${ext}`;
                    }

                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName,
                        startIn: 'pictures',
                        types: [{
                            description: desc,
                            accept: { [mime]: [`.${ext}`] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    toast.success("บันทึกรูปภาพสำเร็จ");
                    return;
                } catch (err: any) {
                    // Ignore if user cancelled the save prompt
                    if (err.name !== 'AbortError') throw err;
                    return;
                }
            }

            // Fallback for browsers that don't support showSaveFilePicker (e.g. Firefox, Safari)
            // This will depend on the browser's download setting (might download directly or show prompt)
            const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fname });
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
            toast.success("บันทึกรูปภาพสำเร็จ");
        } catch { toast.error("ไม่สามารถบันทึกได้"); }
    }, [idx, images]);

    const handleCopy = useCallback(async () => {
        try {
            const url = images[idx];
            // Draw to canvas and export as PNG (browsers only support image/png for ClipboardItem)
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("โหลดรูปภาพไม่ได้"));
                img.src = url;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const pngBlob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(b => b ? resolve(b) : reject(new Error("แปลงรูปไม่ได้")), "image/png")
            );
            await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
            toast.success("คัดลอกรูปภาพแล้ว");
        } catch {
            // Fallback: copy URL as text
            try { await navigator.clipboard.writeText(images[idx]); toast.success("คัดลอกลิงก์แล้ว"); }
            catch { toast.error("คัดลอกไม่ได้"); }
        }
    }, [idx, images]);

    const handleDelete = useCallback(() => {
        if (!onDelete) return;
        onDelete(idx);
        if (images.length <= 1) { onClose(); return; }
        if (idx >= images.length - 1) setIdx(images.length - 2);
    }, [idx, images.length, onDelete, onClose]);

    const handleAreaMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setPan(clampPan(e.clientX - panStart.current.x, e.clientY - panStart.current.y));
        }
        setMouseX(e.clientX);
    }, [isPanning, clampPan]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!canPan()) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.preventDefault();
    }, [pan, canPan]);

    const stopPan = () => setIsPanning(false);

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        setZoom(zoom + (e.deltaY > 0 ? -0.1 : 0.1));
    }, [zoom, setZoom]);

    useEffect(() => {
        if (isOpen) {
            setIdx(initialIndex);
            setZoomRaw(1);
            setRotation(0);
            setPan({ x: 0, y: 0 });
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (isOpen) {
            setIdx(initialIndex);
            setZoomRaw(1);
            setRotation(0);
            setPan({ x: 0, y: 0 });
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") go(-1);
            else if (e.key === "ArrowRight") go(1);
            else if (e.key === "Escape") { if (immersive) { setImmersive(false); setShowBar(false); } else onClose(); }
            else if (e.key === "+" || e.key === "=") setZoom(zoom + 0.25);
            else if (e.key === "-") setZoom(Math.max(MIN_ZOOM, zoom - 0.25));
        };
        window.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = "unset"; window.removeEventListener("keydown", onKey); };
    }, [isOpen, go, onClose, zoom, setZoom, immersive]);

    useEffect(() => {
        if (!showZoomDrop) return;
        const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowZoomDrop(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [showZoomDrop]);

    if (!isOpen || images.length === 0) return null;

    const zoomPct = Math.round(zoom * 100);
    const w = typeof window !== "undefined" ? window.innerWidth : 1920;
    const showLeft = images.length > 1 && (!immersive || (mouseX >= 0 && mouseX < EDGE_PX));
    const showRight = images.length > 1 && (!immersive || (mouseX >= 0 && mouseX > w - EDGE_PX));

    const commitZoom = () => { const v = parseInt(zoomInput); if (!isNaN(v)) setZoom(Math.max(MIN_ZOOM, v / 100)); else setZoomInput(String(zoomPct)); setShowZoomDrop(false); };

    const topBarContent = (
        <div className="flex items-center h-12 px-2 sm:px-4 shrink-0 w-full" onClick={e => e.stopPropagation()}>
            <div className="flex-1" />
            <div className="flex-1" />
            <div className="flex-1 flex items-center justify-end gap-0.5 sm:gap-1">
                {!isMobile && onDelete && <TBtn icon={<Trash2 size={17} />} tooltip="นำรูปออก" onClick={handleDelete} />}
                {!isMobile && <TBtn icon={<Copy size={17} />} tooltip="คัดลอก" onClick={handleCopy} />}
                <TBtn icon={<Save size={17} />} tooltip="บันทึกเป็น" onClick={handleDownload} />
                <div className="w-px h-6 bg-white/20 mx-1 sm:mx-1.5" />
                {!isMobile && (
                    <TBtn icon={immersive ? <Shrink size={18} /> : <Expand size={18} />}
                        tooltip={immersive ? "ออกจากเต็มจอ" : "เต็มจอ"}
                        onClick={() => { setImmersive(!immersive); setShowBar(true); }} />
                )}
                <button onClick={e => { e.stopPropagation(); onClose(); }} title="ปิด (ESC)"
                    className="w-10 h-10 flex items-center justify-center rounded-md text-white hover:bg-red-500 transition-all cursor-pointer font-bold">
                    <X size={22} />
                </button>
            </div>
        </div>
    );

    const bottomBarContent = (
        <div className="flex items-center h-14 px-4 shrink-0 backdrop-blur-md w-full" 
            style={{ background: "#111111" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {!isMobile && (
                    <>
                        <Hint kbd="ESC" label="ปิด" />
                        {images.length > 1 && <Hint kbd="← →" label="เลื่อน" />}
                    </>
                )}
                <div className={cn("flex items-center gap-1.5 shrink-0 bg-transparent", isMobile && "w-full justify-center")}>
                    <span className="text-[15px] font-bold tabular-nums text-white drop-shadow-sm">{idx + 1}</span>
                    <span className="text-white font-bold text-[14px] mx-0.5 opacity-40">/</span>
                    <span className="text-[15px] font-bold tabular-nums text-white drop-shadow-sm">{images.length}</span>
                </div>
            </div>
            {!isMobile && (
                <div className="flex items-center gap-1 flex-1 justify-end">
                    <BBtn icon={<Scan size={16} />} tooltip="พอดีหน้าจอ" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
                    <BBtn icon={<RotateCw size={15} />} tooltip="หมุนขวา 90°" onClick={() => setRotation(p => p + 90)} />
                    <div className="w-px h-5 bg-white/10 mx-1.5" />
                    <div ref={dropRef} className="relative">
                        <div className="flex items-center h-8 rounded-md bg-white/10 border border-white/12 overflow-hidden cursor-pointer"
                            onClick={() => setShowZoomDrop(v => !v)}>
                            <input type="text" value={zoomInput}
                                onChange={e => setZoomInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") commitZoom(); e.stopPropagation(); }}
                                onBlur={commitZoom}
                                onClick={e => { e.stopPropagation(); setShowZoomDrop(false); }}
                                className="w-12 bg-transparent text-[13px] text-white font-bold text-right outline-none px-2 tabular-nums cursor-text" />
                            <span className="text-[12px] text-white font-bold pr-1.5">%</span>
                            <div className="w-px h-5 bg-white/20" />
                            <span className="text-white font-bold text-[10px] px-2">▲</span>
                        </div>
                        <AnimatePresence>
                            {showZoomDrop && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute bottom-full mb-1.5 left-0 min-w-[96px] rounded-xl bg-[#1e1e1e]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden py-1 z-50"
                                    onClick={e => e.stopPropagation()}>
                                    {ZOOM_PRESETS.map(p => (
                                        <button key={p} onClick={() => { setZoom(p / 100); setShowZoomDrop(false); }}
                                            className={`w-full text-right px-4 py-2 text-[14px] font-bold transition-all cursor-pointer ${Math.abs(zoomPct - p) < 3 ? "text-white bg-white/15" : "text-white hover:bg-white/8"}`}>
                                            {p}%
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-1 mx-2">
                        <BBtn icon={<ZoomOut size={15} />} tooltip="ย่อ" onClick={() => setZoom(zoom - 0.1)} />
                        <input type="range" className="zoom-slider w-28 mx-1"
                            min={10} max={400} step={5} value={zoomPct}
                            onChange={e => setZoom(parseInt(e.target.value) / 100)}
                            onClick={e => e.stopPropagation()} />
                        <BBtn icon={<ZoomIn size={15} />} tooltip="ขยาย" onClick={() => setZoom(zoom + 0.1)} />
                    </div>

                    <span className="text-[12px] text-white font-bold w-10 text-right tabular-nums">{zoomPct}%</span>
                </div>
            )}
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && images.length > 0 && (
                <div className="fixed inset-0 z-9999 select-none overflow-hidden bg-black/80 backdrop-blur-xl">
                    {/* Backdrop for closing */}
                    <div className="absolute inset-0 z-0" onClick={onClose} />

                    {/* Image Area (Back Layer) */}
                    <div ref={areaRef}
                        className={cn(
                            "absolute z-10 flex items-center justify-center touch-none overflow-hidden transition-all duration-500 ease-in-out",
                            immersive ? "inset-0 bg-black" : "top-12 bottom-14 left-0 right-0 p-4"
                        )}
                        style={{ cursor: canPan() ? (isPanning ? "grabbing" : "grab") : "default" }}
                        onMouseDown={onMouseDown}
                        onMouseMove={handleAreaMouseMove}
                        onMouseUp={stopPan}
                        onMouseLeave={() => { stopPan(); setMouseX(-1); }}
                        onWheel={onWheel}
                    >
                        {images.length > 1 && !isMobile && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showLeft ? 1 : 0, pointerEvents: showLeft ? "auto" : "none" }}
                                onClick={e => go(-1, e)}
                                className={cn(
                                    "absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer shadow-2xl active:scale-95",
                                    isMobile ? "left-4 w-10 h-10" : "left-12 w-14 h-14"
                                )}
                            >
                                <ChevronLeft size={isMobile ? 24 : 32} />
                            </motion.button>
                        )}

                        {images.length > 1 && !isMobile && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showRight ? 1 : 0, pointerEvents: showRight ? "auto" : "none" }}
                                onClick={e => go(1, e)}
                                className={cn(
                                    "absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer shadow-2xl active:scale-95",
                                    isMobile ? "right-4 w-10 h-10" : "right-12 w-14 h-14"
                                )}
                            >
                                <ChevronRight size={isMobile ? 24 : 32} />
                            </motion.button>
                        )}

                        <div className="absolute inset-0 overflow-hidden">
                            <motion.div
                                className="flex h-full"
                                style={{ x: -idx * width }}
                                animate={{ x: -idx * width }}
                                transition={{ type: "spring", stiffness: 200, damping: 28 }}
                                drag={zoom <= 1 && images.length > 1 ? "x" : false}
                                dragConstraints={{
                                    left: -(images.length - 1) * width,
                                    right: 0
                                }}
                                dragElastic={0.6}
                                onDragEnd={(e, info) => {
                                    const threshold = width * 0.2;
                                    const velocity = info.velocity.x;
                                    const offset = info.offset.x;

                                    if (offset < -threshold || velocity < -500) {
                                        if (idx < images.length - 1) go(1);
                                    } else if (offset > threshold || velocity > 500) {
                                        if (idx > 0) go(-1);
                                    }
                                }}
                            >
                                {images.map((img, i) => (
                                    <div key={i} className="h-full shrink-0 flex items-center justify-center px-4 sm:px-12" style={{ width }}>
                                        <img
                                            ref={i === idx ? imgRef : null}
                                            src={img}
                                            alt={`รูปภาพที่ ${i + 1}`}
                                            className="max-h-full max-w-full object-contain shadow-2xl pointer-events-none"
                                            style={i === idx ? {
                                                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                                transition: isPanning ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
                                                userSelect: "none",
                                            } : {}}
                                            draggable={false}
                                        />
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>

                    {/* Top Bar (Overlay) */}
                    <div
                        className="absolute top-0 inset-x-0 h-12 z-50"
                        onMouseEnter={immersive ? () => setShowBar(true) : undefined}
                        onMouseLeave={immersive ? () => setShowBar(false) : undefined}
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: immersive && !showBar ? 0 : 1 }}
                            transition={{ duration: showBar ? 0 : 0.15 }}
                            className="w-full h-full"
                            style={{ pointerEvents: immersive && !showBar ? "none" : "auto" }}
                        >
                            <div className={cn("absolute inset-0 transition-all duration-300", immersive ? "backdrop-blur-md" : "bg-[#111111]")} 
                                style={{ 
                                    background: immersive 
                                        ? "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)"
                                        : "#111111" 
                                }}>
                                {topBarContent}
                            </div>
                        </motion.div>
                    </div>

                    {/* Bottom Bar (Overlay) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: immersive ? 0 : 1 }}
                        transition={{ duration: immersive ? 0.2 : 0 }}
                        className="absolute bottom-0 inset-x-0 z-50 h-14"
                    >
                        <div className="absolute inset-0">
                            {bottomBarContent}
                        </div>
                    </motion.div>

                    <style>{`
                        .kbd-h{padding:2px 6px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;font-size:11px;font-family:'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif;font-weight:bold;}
                        .zoom-slider {
                            -webkit-appearance: none;
                            height: 4px;
                            background: rgba(255,255,255,0.2);
                            border-radius: 2px;
                            outline: none;
                        }
                        .zoom-slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            width: 14px;
                            height: 14px;
                            background: white;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 0 10px rgba(0,0,0,0.3);
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>
    );
};

function Hint({ kbd, label }: { kbd: string; label: string }) {
    return (
        <div className="flex items-center gap-2 text-white text-[11px] uppercase tracking-wider font-bold">
            <span className="kbd-h">{kbd}</span><span>{label}</span>
        </div>
    );
}
function TBtn({ icon, tooltip, onClick }: { icon: React.ReactNode; tooltip: string; onClick: () => void }) {
    return (
        <button onClick={e => { e.stopPropagation(); onClick(); }} title={tooltip}
            className={`w-10 h-10 flex items-center justify-center rounded-md transition-all cursor-pointer text-white font-bold hover:bg-white/15`}>
            {icon}
        </button>
    );
}
function BBtn({ icon, tooltip, onClick }: { icon: React.ReactNode; tooltip: string; onClick: () => void }) {
    return (
        <button onClick={e => { e.stopPropagation(); onClick(); }} title={tooltip}
            className="w-9 h-9 flex items-center justify-center rounded-md text-white font-bold hover:bg-white/15 transition-all cursor-pointer">
            {icon}
        </button>
    );
}
function fileName(url: string): string {
    try {
        // Extract the last part of the path (the filename)
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1].split('?')[0]; // Remove query parameters
        const decoded = decodeURIComponent(lastPart);
        return decoded || "image";
    } catch {
        return "image";
    }
}
