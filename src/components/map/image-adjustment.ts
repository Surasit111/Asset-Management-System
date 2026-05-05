import type { CSSProperties } from "react";

export interface ImageAdjustment {
    x: number;
    y: number;
    zoom: number;
    rotate: number;
}

export const DEFAULT_IMAGE_ADJUSTMENT: ImageAdjustment = {
    x: 50,
    y: 50,
    zoom: 1,
    rotate: 0,
};

type AdjustmentInput = Partial<ImageAdjustment> | null | undefined;

export function normalizeImageAdjustment(adj?: AdjustmentInput): ImageAdjustment {
    return {
        x: adj?.x ?? DEFAULT_IMAGE_ADJUSTMENT.x,
        y: adj?.y ?? DEFAULT_IMAGE_ADJUSTMENT.y,
        zoom: adj?.zoom ?? DEFAULT_IMAGE_ADJUSTMENT.zoom,
        rotate: adj?.rotate ?? DEFAULT_IMAGE_ADJUSTMENT.rotate,
    };
}

export function buildAdjustedImageTransform(adj?: AdjustmentInput) {
    const { x, y, zoom, rotate } = normalizeImageAdjustment(adj);
    return {
        transform: `translate(-50%, -50%) translate3d(${(x - 50) * 2}%, ${(y - 50) * 2}%, 0) rotate(${rotate}deg) scale(${zoom})`,
        transformOrigin: "center center" as const,
    };
}

export function buildAdjustedImageStyle(
    adj?: AdjustmentInput,
    extra: CSSProperties = {}
): CSSProperties {
    const { transform, transformOrigin } = buildAdjustedImageTransform(adj);
    return {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "1px",
        height: "1px",
        minWidth: "100%",
        minHeight: "100%",
        maxWidth: "none",
        maxHeight: "none",
        display: "block",
        willChange: "transform",
        transform,
        transformOrigin,
        ...extra,
    };
}

export function buildAdjustedImageStyleString(adj?: AdjustmentInput): string {
    const { transform, transformOrigin } = buildAdjustedImageTransform(adj);
    return [
        "position:absolute",
        "top:50%",
        "left:50%",
        "width:1px",
        "height:1px",
        "min-width:100%",
        "min-height:100%",
        "max-width:none !important",
        "max-height:none !important",
        "display:block",
        "will-change:transform",
        `transform:${transform}`,
        `transform-origin:${transformOrigin}`,
    ].join(";");
}

export function buildPinCircleImageStyle(
    adj?: AdjustmentInput,
    extra: CSSProperties = {}
): CSSProperties {
    const { x, y, zoom, rotate } = normalizeImageAdjustment(adj);
    return {
        position: "absolute",
        top: "50%",
        left: "50%",
        minWidth: "100%",
        minHeight: "100%",
        width: "auto",
        height: "auto",
        transform: `translate(-50%, -50%) translate3d(${(x - 50) * 2}%, ${(y - 50) * 2}%, 0) rotate(${rotate}deg) scale(${zoom})`,
        transformOrigin: "center center",
        ...extra,
    };
}

const PIN_CROP_SIZE = 192;

export function buildLeafletPinRingHtml(
    imageUrl: string,
    adj?: AdjustmentInput,
    ringSize: number = 32
): string {
    const { x, y, zoom, rotate } = normalizeImageAdjustment(adj);
    const scale = ringSize / PIN_CROP_SIZE;
    const imgTransform = `translate(-50%,-50%) translate3d(${(x - 50) * 2}%,${(y - 50) * 2}%,0) rotate(${rotate}deg) scale(${zoom})`;

    const wrapperStyle = [
        "position:absolute", "top:50%", "left:50%",
        `width:${PIN_CROP_SIZE}px`, `height:${PIN_CROP_SIZE}px`,
        `transform:translate(-50%,-50%) scale(${scale})`,
        "transform-origin:center center", "overflow:hidden",
        "border-radius:50%", "pointer-events:none",
    ].join(";");

    const imgStyle = [
        "position:absolute", "top:50%", "left:50%",
        "width:1px", "height:1px",
        "min-width:100%", "min-height:100%",
        "max-width:none", "max-height:none", "display:block",
        `transform:${imgTransform}`, "transform-origin:center center",
    ].join(";");

    return `<div style="${wrapperStyle}"><img src="${imageUrl}" alt="" draggable="false" style="${imgStyle}"></div>`;
}

// ─── loadImageFromUrl (fetch → blob, ไม่ taint canvas) ───────────────────────
async function loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise(async (resolve, reject) => {
        const img = new Image();
        const loadWithSrc = (src: string) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
            img.src = src;
        };
        if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
            loadWithSrc(imageUrl);
            return;
        }
        try {
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error(`Failed to load blob`)); };
            img.src = blobUrl;
        } catch (fetchErr) {
            console.warn("fetch failed, fallback:", fetchErr);
            loadWithSrc(imageUrl);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateCroppedImageUrl
//
// @param imageUrl    URL ต้นฉบับ
// @param adj         ImageAdjustment จาก UI
// @param outputW     ความกว้าง output canvas (px)
// @param isCircle    true = clip วงกลม
// @param outputH     ความสูง output canvas (px) — default = outputW (square)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCroppedImageUrl(
    imageUrl: string,
    adj: ImageAdjustment | undefined,
    outputW: number,
    isCircle: boolean,
    outputH: number = outputW  // ✅ default square, รับ rectangle ได้
): Promise<string> {
    const img = await loadImageFromUrl(imageUrl);
    const { x, y, zoom, rotate } = normalizeImageAdjustment(adj);

    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get canvas context");

    if (isCircle) {
        // วงกลมใช้ขนาดเล็กสุด
        const r = Math.min(outputW, outputH) / 2;
        ctx.beginPath();
        ctx.arc(outputW / 2, outputH / 2, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
    }

    // ── baseCover: scale รูปให้ cover canvas พอดี ──────────────────────────
    const baseCover = Math.max(outputW / img.naturalWidth, outputH / img.naturalHeight);
    const imgRenderedW = img.naturalWidth * baseCover;
    const imgRenderedH = img.naturalHeight * baseCover;

    // ── apply transform เหมือน CSS preview ────────────────────────────────
    ctx.translate(outputW / 2, outputH / 2);
    // translate3d(X%, Y%) — % ของ imgRendered (ตรงกับ CSS)
    ctx.translate(
        ((x - 50) * 2 / 100) * imgRenderedW,
        ((y - 50) * 2 / 100) * imgRenderedH
    );
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    ctx.drawImage(img, -imgRenderedW / 2, -imgRenderedH / 2, imgRenderedW, imgRenderedH);

    return canvas.toDataURL("image/png");
}