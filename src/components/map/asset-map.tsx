"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, memo, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    buildAdjustedImageStyleString,
    buildLeafletPinRingHtml,
    type ImageAdjustment,
} from "./image-adjustment";

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
.leaflet-container {
    font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif !important;
}
.custom-google-popup .leaflet-popup-content-wrapper {
    padding:0;border-radius:16px;overflow:hidden;
    box-shadow:0 8px 30px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.08);border:none;
}
.custom-google-popup .leaflet-popup-content { margin:0;width:240px!important; }
.custom-google-popup .leaflet-popup-tip-container { display:none; }
.custom-google-popup .leaflet-popup-close-button {
    top:8px;right:8px;width:24px;height:24px;
    background:rgba(0,0,0,0.4);border-radius:50%;color:#fff;
    font-size:16px;z-index:10;display:flex;align-items:center;justify-content:center;
}
.custom-div-icon,.custom-master-pin-icon{background:none!important;border:none!important;}

.pin-root {
    display: inline-flex;
    align-items: flex-end;
    gap: 6px;
    pointer-events: none;
    user-select: none;
    transform-origin: var(--pin-origin, 18px 45px);
    transform: translateX(var(--pin-offset, 0px));
    transition: filter 0.22s ease;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-font-smoothing: subpixel-antialiased;
    box-sizing: border-box;
}
.pin-root * { box-sizing: border-box; }
.pin-root:hover, .pin-root.pin-active {
    transform: translateX(var(--pin-offset, 0px)) scale(1.18);
    filter: drop-shadow(0 12px 20px rgba(0,0,0,0.25));
    z-index: 1000 !important;
}
.pin-root:active { transform: translateX(var(--pin-offset, 0px)) scale(0.95) !important; transition: transform 0.1s ease !important; }

.map-readonly .pin-root:hover,
.map-readonly .pin-root:active,
.map-readonly .pin-root.pin-active { transform: none !important; transition: none !important; }
.map-readonly .pin-root:hover:not(.pin-active) .photo-pin-body { filter: none !important; }
.map-readonly .pin-root.pin-active .photo-pin-body { filter: drop-shadow(0 8px 18px rgba(239,68,68,0.45)) !important; }
.map-readonly .leaflet-interactive,
.map-readonly .pin-root,
.map-readonly .pin-label,
.map-readonly .photo-pin-body { cursor: default !important; }

.photo-pin-body {
    pointer-events: auto; cursor: pointer; display: flex; flex-direction: column;
    align-items: center; flex-shrink: 0; position: relative;
}
.photo-pin-ring {
    width: 36px; height: 36px; border-radius: 50%; border: 2px solid white;
    box-shadow: 0 3px 10px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08);
    overflow: hidden; background: #e5e7eb; position: relative; box-sizing: border-box;
}
.photo-pin-ring .pin-fallback-icon { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#ffffff; }
.photo-pin-ring .pin-cropped-img { width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; }
.photo-pin-spike {
    width:0; height:0;
    border-left: 7px solid transparent; border-right: 7px solid transparent;
    border-top: 9px solid white; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.18));
    transition: border-color 0.2s ease; margin-top: -1px; flex-shrink: 0;
}
.pin-root.pin-active .photo-pin-ring {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239,68,68,0.35), 0 3px 10px rgba(0,0,0,0.25) !important;
}
.pin-root.pin-active .photo-pin-spike { border-top-color: #ef4444 !important; }

.pin-count-badge {
    position: absolute; top: -4px; right: -6px;
    background: #1a73e8; color: #ffffff;
    font-size: 9px; font-weight: 800; font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif;
    min-width: 16px; height: 16px; border-radius: 8px; border: 2px solid white;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px; line-height: 1; box-shadow: 0 1px 5px rgba(0,0,0,0.3);
    pointer-events: none; transition: background 0.18s ease, color 0.18s ease; z-index: 10;
}
.pin-root.pin-active .pin-count-badge { background: #ef4444 !important; color: #ffffff !important; }

.pin-label {
    pointer-events: auto; cursor: pointer; line-height: 1.1; white-space: normal;
    transition: none;
}

.pop-carousel-btn{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;border:none;cursor:pointer;font-size:18px;font-weight:bold;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;z-index:5;line-height:1;}
.pop-carousel-wrap:hover .pop-carousel-btn{opacity:1;}
.pop-carousel-btn:hover{background:rgba(0,0,0,0.7)!important;}
.leaflet-control-zoom { display: none !important; }
`;

function injectCarouselScript() {
    if (document.getElementById('popup-carousel-js')) return;
    const s = document.createElement('script');
    s.id = 'popup-carousel-js';
    s.textContent = `
        window._amPopCI = {};
        window._amPopNav = function(id, dir, e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            var track = document.getElementById(id);
            if (!track) return;
            var count = track.children.length;
            var idx = ((window._amPopCI[id] || 0) + dir + count) % count;
            window._amPopCI[id] = idx;
            track.style.transform = 'translateX(-' + (idx * 240) + 'px)';
        };
    `;
    document.head.appendChild(s);
}

// ─── Asset dot ────────────────────────────────────────────────────────────────
const assetDotIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="width:10px;height:10px;background:#1c2333;border:2px solid #d4a843;border-radius:50%;box-shadow:0 0 6px rgba(212,168,67,0.3);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
});

// ─── Master Pin Icon ──────────────────────────────────────────────────────────
function buildMasterPinIcon(
    name: string, count: number, isActive: boolean,
    imageUrl?: string | null, adj?: ImageAdjustment,
    pinImageUrl?: string | null, readOnly: boolean = false,
    side: 'left' | 'right' = 'right'
) {
    const activeClass = isActive ? ' pin-active' : '';
    const readOnlyClass = readOnly ? ' pin-readonly' : '';
    const isWarning = name.includes('กรุณา');
    const labelColor = isWarning ? '#ef4444' : (isActive ? '#dc2626' : '#1e293b');
    const labelWeight = (isWarning || isActive) ? '900' : '800';

    const getSafe = (u: unknown) => {
        if (!u || typeof u !== 'string' || u.trim() === '' || u.startsWith('{')) return null;
        return u;
    };

    const safePinUrl = getSafe(pinImageUrl);
    const safeImgUrl = getSafe(imageUrl);

    let ringContent: string;
    if (safePinUrl) {
        ringContent = `<img src="${safePinUrl}" alt="" draggable="false" width="36" height="36" class="pin-cropped-img">`;
    } else if (safeImgUrl) {
        ringContent = buildLeafletPinRingHtml(safeImgUrl, adj, 32);
    } else {
        ringContent = `<div class="pin-fallback-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"></path>
              <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              <path d="M9 7h1"></path><path d="M9 11h1"></path><path d="M9 15h1"></path>
              <path d="M14 7h1"></path><path d="M14 11h1"></path><path d="M14 15h1"></path>
            </svg>
           </div>`;
    }

    const badgeHtml = count > 0
        ? `<div class="pin-count-badge">${count > 99 ? '99+' : count}</div>` : '';

    const pinBodyHtml = `
      <div class="photo-pin-body">
        <div class="photo-pin-ring">${ringContent}</div>
        ${badgeHtml}
        <div class="photo-pin-spike"></div>
      </div>`;

    const words = name.trim().split(/\s+/);
    const safeName = words.map(w => `<span style="white-space:nowrap;">${w}</span>`).join(' ');
    const labelMarginBottom = words.length > 1 ? '0px' : '18px';

    const labelHtml = `
      <div class="pin-label" style="margin-bottom:${labelMarginBottom};">
        <span style="color:${labelColor};font-size:13px;font-weight:${labelWeight};
                     text-shadow:-1px -1px 0 rgba(255,255,255,0.95),1px -1px 0 rgba(255,255,255,0.95),-1px 1px 0 rgba(255,255,255,0.95),1px 1px 0 rgba(255,255,255,0.95);
                     font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif !important;">${safeName}</span>
      </div>`;

    const flexDir = side === 'left' ? 'row-reverse' : 'row';
    const pinOffset = side === 'left' ? 'calc(-100% + 36px)' : '0px';
    const pinOrigin = side === 'left' ? 'calc(100% - 18px) 45px' : '18px 45px';

    return L.divIcon({
        className: "custom-master-pin-icon",
        html: `<div class="pin-root${activeClass}${readOnlyClass}" style="flex-direction:${flexDir};--pin-offset:${pinOffset};--pin-origin:${pinOrigin};">${pinBodyHtml}${labelHtml}</div>`,
        iconSize: [36, 45],
        iconAnchor: [18, 45],
    });
}


// ─── Popup HTML ───────────────────────────────────────────────────────────────
function buildPopup(pin: MasterPin): string {
    const imgs = pin.images && pin.images.length > 0 ? pin.images
        : (pin.imageUrl ? [pin.imageUrl] : []);

    let imgHtml: string;
    if (imgs.length === 0) {
        imgHtml = `<div style="width:100%;height:70px;background:#f9fafb;display:flex;align-items:center;justify-content:center;color:#d1d5db;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
            </svg></div>`;
    } else if (imgs.length === 1) {
        imgHtml = `
        <div style="width:240px;height:135px;overflow:hidden;background:#f1f5f9;position:relative;">
            <img src="${imgs[0]}" alt="" style="${buildAdjustedImageStyleString(pin.cardAdjustment)}">
            <div style="position:absolute;top:10px;left:10px;width:36px;height:36px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;background:white;z-index:10;">
                ${pin.pinImageUrl
                ? `<img src="${pin.pinImageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
                : buildLeafletPinRingHtml(imgs[0], pin.pinAdjustment, 32)}
            </div>
        </div>`;
    } else {
        const trackId = `pt-${pin.id.slice(-8)}`;
        imgHtml = `
        <div class="pop-carousel-wrap" style="position:relative;width:240px;height:135px;overflow:hidden;">
            <div id="${trackId}" style="display:flex;transition:transform 0.3s ease;width:${imgs.length * 240}px;height:135px;">
                ${imgs.map(u => `<div style="width:240px;height:135px;flex-shrink:0;background:url('${u}') center/cover no-repeat;"></div>`).join('')}
            </div>
            <button type="button" class="pop-carousel-btn" style="left:7px;" onclick="_amPopNav('${trackId}',-1,event)">&#8249;</button>
            <button type="button" class="pop-carousel-btn" style="right:7px;" onclick="_amPopNav('${trackId}',1,event)">&#8250;</button>
        </div>`;
    }

    return `<div style="font-family:'Plus Jakarta Sans','Noto Sans Thai',sans-serif;width:240px;overflow:hidden;border-radius:16px;">
        ${imgHtml}
        <div style="padding:14px 16px;">
            <div style="font-size:16px;font-weight:800;color:#111827;line-height:1.3;margin-bottom:5px;">${pin.name}</div>
            <div style="font-size:12px;color:#9ca3af;font-weight:600;">${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}</div>
        </div>
    </div>`;
}

function buildAssetPopup(asset: MapAsset): string {
    const imgs = asset.images && asset.images.length > 0
        ? asset.images.map(img => img.url)
        : (asset.imageUrl ? [asset.imageUrl] : []);

    let imgHtml = '';
    if (imgs.length > 0) {
        if (imgs.length === 1) {
            imgHtml = `<div style="width:240px;height:135px;background:url('${imgs[0]}') center/cover no-repeat;"></div>`;
        } else {
            const trackId = `aset-${asset.id.slice(-8)}`;
            imgHtml = `
            <div class="pop-carousel-wrap" style="position:relative;width:240px;height:135px;overflow:hidden;">
                <div id="${trackId}" style="display:flex;transition:transform 0.3s ease;width:${imgs.length * 240}px;height:135px;">
                    ${imgs.map(u => `<div style="width:240px;height:135px;flex-shrink:0;background:url('${u}') center/cover no-repeat;"></div>`).join('')}
                </div>
                <button type="button" class="pop-carousel-btn" style="left:7px;" onclick="_amPopNav('${trackId}',-1,event)">&#8249;</button>
                <button type="button" class="pop-carousel-btn" style="right:7px;" onclick="_amPopNav('${trackId}',1,event)">&#8250;</button>
            </div>`;
        }
    }

    return `<div style="font-family:'Plus Jakarta Sans','Noto Sans Thai',sans-serif;width:${imgs.length > 0 ? '240px' : '200px'};overflow:hidden;border-radius:12px;">
        ${imgHtml}
        <div style="padding:12px 14px;">
            <div style="font-size:14px;font-weight:700;color:#111827;line-height:1.3;margin-bottom:2px;">${asset.name}</div>
            <div style="font-size:11px;color:#9ca3af;margin-bottom:6px;">${asset.assetCode}</div>
            ${asset.status ? `<div style="font-size:12px;margin-bottom:2px;color:#4b5563;"><strong>สถานะ:</strong> ${asset.status}</div>` : ''}
            ${asset.location ? `<div style="font-size:12px;margin-bottom:6px;color:#4b5563;"><strong>สถานที่:</strong> ${asset.location}</div>` : ''}
            <a href="/assets/${asset.id}" onclick="window.dispatchEvent(new Event('am_saveMapState'))" style="display:inline-block;margin-top:4px;font-size:12px;color:#2563eb;font-weight:600;text-decoration:none;">ดูรายละเอียด →</a>
        </div>
    </div>`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MapAsset {
    id: string;
    assetCode: string;
    name: string;
    status: string | null;
    location: string | null;
    latitude: number;
    longitude: number;
    images?: { url: string }[];
    imageUrl?: string | null;
}

interface MasterPin {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description?: string | null;
    imageUrl?: string | null;
    images?: string[];
    cardAdjustment?: ImageAdjustment;
    pinAdjustment?: ImageAdjustment;
    pinImageUrl?: string | null;
    cardImageUrl?: string | null;
    type: string;
}

interface AssetMapProps {
    assets: MapAsset[];
    masterPins?: MasterPin[];
    onPinClick?: (pinId: string | null, name?: string, lat?: number, lng?: number) => void;
    pinAssetCounts?: Record<string, number>;
    onMapClick?: (lat: number, lng: number) => void;
    onSelectLocation?: (lat: number, lng: number, mapPinId?: string, name?: string) => void;
    cursorStyle?: string;
    forcedActivePinId?: string | null;
    initialMapState?: { lat: number; lng: number; zoom: number };
    selectionCoords?: { lat: number; lng: number } | null;
    readOnly?: boolean;
}

// [FIX #5] เพิ่ม jumpTo เข้าไปใน interface ให้ตรงกับ useImperativeHandle
export interface AssetMapHandle {
    flyTo: (lat: number, lng: number, zoom?: number) => void;
    jumpTo: (lat: number, lng: number, zoom?: number) => void;
    zoomTo: (lat: number, lng: number, zoom?: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setActivePinExternal: (pinId: string | null) => void;
    invalidateSize: () => void;
    getMapState: () => { lat: number; lng: number; zoom: number } | null;
}

type BoundsRect = {
    left: number; right: number; top: number; bottom: number;
};

const DEFAULT_CENTER: L.LatLngTuple = [17.5377, 101.7199];
const DEFAULT_ZOOM = 16;
const LABEL_HIDE_ZOOM = 13;

const AssetMap = forwardRef<AssetMapHandle, AssetMapProps>(
    ({ assets, masterPins = [], onPinClick, pinAssetCounts = {}, onMapClick, onSelectLocation, forcedActivePinId, initialMapState, readOnly = false }, ref) => {
        const mapRef = useRef<L.Map | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const markersLayerRef = useRef<L.LayerGroup | null>(null);
        const pinEntriesRef = useRef<Array<{ marker: L.Marker; pin: MasterPin; isActive: boolean }>>([]);
        const activePinIdRef = useRef<string | null>(null);
        // Persists the side each pin's label has been assigned — once flipped, stays flipped
        const decidedSidesRef = useRef<Record<string, 'left' | 'right'>>({});

        const latestProps = useRef({ assets, masterPins, onPinClick, pinAssetCounts, onMapClick, onSelectLocation, forcedActivePinId, initialMapState, readOnly });
        useEffect(() => {
            latestProps.current = { assets, masterPins, onPinClick, pinAssetCounts, onMapClick, onSelectLocation, forcedActivePinId, initialMapState, readOnly };
        }, [assets, masterPins, onPinClick, pinAssetCounts, onMapClick, onSelectLocation, forcedActivePinId, initialMapState, readOnly]);

        // Pre-calculate the best "stable" side for each pin to avoid flickering between zoom 18-20
        // Use a cluster-based alternating logic for maximum stability
        const preferredSides = useMemo(() => {
            const sides: Record<string, 'left' | 'right'> = {};
            const sorted = [...masterPins].sort((a, b) => a.longitude - b.longitude);

            for (let i = 0; i < sorted.length; i++) {
                const p = sorted[i];
                if (sides[p.id]) continue;

                // Find neighbors in a very small cluster (~80-100m)
                const neighbors = sorted.filter(n =>
                    n.id !== p.id &&
                    Math.abs(n.latitude - p.latitude) < 0.0008 &&
                    Math.abs(n.longitude - p.longitude) < 0.0008
                );

                if (neighbors.length > 0) {
                    // It's a dense area. Assign alternating sides to everyone in this cluster
                    const cluster = [p, ...neighbors].sort((a, b) => a.longitude - b.longitude);
                    cluster.forEach((cp, idx) => {
                        // Alternate: 0=left, 1=right, 2=left...
                        sides[cp.id] = (idx % 2 === 0) ? 'left' : 'right';
                    });
                } else {
                    // Isolated pin: default to right
                    sides[p.id] = 'right';
                }
            }
            return sides;
        }, [masterPins]);

        // Reset decided sides whenever pin layout changes
        useEffect(() => {
            decidedSidesRef.current = {};
        }, [masterPins]);

        const refreshLabels = () => {
            const map = mapRef.current;
            if (!map) return;
            const zoom = map.getZoom();
            if (zoom < LABEL_HIDE_ZOOM) {
                pinEntriesRef.current.forEach(entry => {
                    const lbl = entry.marker.getElement()?.querySelector<HTMLElement>('.pin-label');
                    if (lbl) { lbl.style.opacity = '0'; lbl.style.pointerEvents = 'none'; }
                });
                return;
            }
            const LABEL_EST_W = 160, LABEL_EST_H = 24;
            const rects = pinEntriesRef.current.map(entry => {
                const pt = map.latLngToContainerPoint(L.latLng(entry.pin.latitude, entry.pin.longitude));
                return {
                    entry,
                    pinRect: { left: pt.x - 18, right: pt.x + 18, top: pt.y - 45, bottom: pt.y },
                    labelRectRight: { left: pt.x + 24, right: pt.x + 24 + LABEL_EST_W, top: pt.y - 8 - LABEL_EST_H, bottom: pt.y - 8 },
                    labelRectLeft: { left: pt.x - 24 - LABEL_EST_W, right: pt.x - 24, top: pt.y - 8 - LABEL_EST_H, bottom: pt.y - 8 },
                    visible: true,
                    side: 'right' as 'right' | 'left'
                };
            });
            const intersect = (r1: BoundsRect, r2: BoundsRect) =>
                !(r2.left >= r1.right || r2.right <= r1.left || r2.top >= r1.bottom || r2.bottom <= r1.top);

            for (let i = 0; i < rects.length; i++) {
                const r = rects[i];
                const pinId = r.entry.pin.id;
                const pref = preferredSides[pinId] || 'right';
                const other: 'left' | 'right' = pref === 'right' ? 'left' : 'right';
                // Use the permanently decided side if already flipped, otherwise use preferred
                const current = decidedSidesRef.current[pinId] ?? pref;
                const alt: 'left' | 'right' = current === 'right' ? 'left' : 'right';

                const sideOk = (side: 'left' | 'right') => {
                    const rect = side === 'right' ? r.labelRectRight : r.labelRectLeft;
                    for (let j = 0; j < rects.length; j++) {
                        if (i === j) continue;
                        if (intersect(rect, rects[j].pinRect)) return false;
                        if (j < i && rects[j].visible) {
                            const otherLblRect = rects[j].side === 'right' ? rects[j].labelRectRight : rects[j].labelRectLeft;
                            if (intersect(rect, otherLblRect)) return false;
                        }
                    }
                    return true;
                };

                if (r.entry.isActive) {
                    r.visible = true;
                    r.side = current;
                    continue;
                }

                // If the current decided side is clear → stay on it
                if (sideOk(current)) {
                    r.side = current;
                    r.visible = true;
                } else if (sideOk(alt)) {
                    // Current side is blocked → flip permanently to the other side
                    decidedSidesRef.current[pinId] = alt;
                    r.side = alt;
                    r.visible = true;
                } else {
                    // Both sides blocked → hide, keep current decided side
                    r.side = current;
                    r.visible = false;
                }
            }
            rects.forEach(({ entry, visible, side }) => {
                const el = entry.marker.getElement();
                const root = el?.querySelector<HTMLElement>('.pin-root');
                const lbl = el?.querySelector<HTMLElement>('.pin-label');

                if (root) {
                    root.style.flexDirection = side === 'left' ? 'row-reverse' : 'row';
                    // Set CSS variables for warp and origin
                    root.style.setProperty('--pin-offset', side === 'left' ? 'calc(-100% + 36px)' : '0px');
                    root.style.setProperty('--pin-origin', side === 'left' ? 'calc(100% - 18px) 45px' : '18px 45px');
                }

                if (lbl) {
                    lbl.style.opacity = visible ? '1' : '0';
                    lbl.style.pointerEvents = visible ? 'auto' : 'none';
                    const span = lbl.querySelector<HTMLElement>('span');
                    if (span) {
                        span.style.textAlign = side === 'left' ? 'right' : 'left';
                        span.style.display = 'inline-block';
                    }
                }
            });
        };

        const setActivePin = (pinId: string | null) => {
            pinEntriesRef.current.forEach(entry => {
                const isActive = entry.pin.id === pinId;
                if (entry.isActive === isActive) return;
                entry.isActive = isActive;
                const el = entry.marker.getElement();
                const root = el?.querySelector<HTMLElement>('.pin-root');
                if (root) {
                    root.classList.toggle('pin-active', isActive);
                    const span = root.querySelector<HTMLElement>('.pin-label span');
                    if (span) span.style.color = isActive ? '#dc2626' : '#1e293b';
                }
            });
            activePinIdRef.current = pinId;
            refreshLabels();
        };

        useImperativeHandle(ref, () => ({
            flyTo: (lat, lng, zoom = 12) => {
                mapRef.current?.flyTo([lat, lng + 0.0003], zoom, { duration: 1.5, easeLinearity: 0.25 });
            },
            jumpTo: (lat, lng, zoom = 18) => {
                mapRef.current?.setView([lat, lng + 0.0008], zoom, { animate: false });
            },
            zoomTo: (lat, lng, zoom = 18) => {
                mapRef.current?.setZoomAround([lat, lng + 0.0008], zoom, { animate: true });
            },
            zoomIn: () => { mapRef.current?.zoomIn(); },
            zoomOut: () => { mapRef.current?.zoomOut(); },
            setActivePinExternal: (pinId) => { setActivePin(pinId); },
            invalidateSize: () => { mapRef.current?.invalidateSize({ animate: false, pan: false }); },
            getMapState: () => {
                const map = mapRef.current;
                if (!map) return null;
                const center = map.getCenter();
                return { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
            }
        }));

        const syncMarkers = () => {
            const map = mapRef.current;
            const layer = markersLayerRef.current;
            if (!map || !layer) return;

            pinEntriesRef.current.forEach(({ marker }) => marker.off());
            layer.clearLayers();
            pinEntriesRef.current = [];

            masterPins.forEach(pin => {
                const count = pinAssetCounts[pin.id] ?? 0;
                const isForced = forcedActivePinId === pin.id;
                const isActive = isForced || activePinIdRef.current === pin.id;
                const imgUrl = pin.images?.[0] || pin.imageUrl || null;
                const stableSide = preferredSides[pin.id] || 'right';

                const icon = buildMasterPinIcon(pin.name, count, isActive, imgUrl, pin.pinAdjustment, pin.pinImageUrl ?? null, readOnly, stableSide);
                const m = L.marker([pin.latitude, pin.longitude], { icon, zIndexOffset: isForced ? 2000 : 1000 }).addTo(layer);
                const entry = { marker: m, pin, isActive };
                pinEntriesRef.current.push(entry);

                m.on('click', (e: L.LeafletMouseEvent) => {
                    const { onPinClick: cb, readOnly: ro } = latestProps.current;
                    if (ro) return;
                    L.DomEvent.stopPropagation(e);
                    if (activePinIdRef.current === pin.id) {
                        setActivePin(null);
                        if (cb) cb(null);
                        if (latestProps.current.onSelectLocation) latestProps.current.onSelectLocation(0, 0, undefined, undefined);
                    } else {
                        setActivePin(pin.id);
                        if (cb) cb(pin.id, pin.name, pin.latitude, pin.longitude);
                        if (latestProps.current.onSelectLocation) latestProps.current.onSelectLocation(pin.latitude, pin.longitude, pin.id, pin.name);
                    }
                });
            });
            refreshLabels();
        };

        const [mapReady, setMapReady] = useState(false);

        useEffect(() => {
            if (!containerRef.current || mapRef.current) return;
            if ((containerRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

            const existingStyle = document.getElementById('am-styles-v5');
            if (existingStyle) existingStyle.remove();
            const s = document.createElement('style');
            s.id = 'am-styles-v5';
            s.textContent = STYLES;
            document.head.appendChild(s);
            injectCarouselScript();

            const center = initialMapState ? [initialMapState.lat, initialMapState.lng] : DEFAULT_CENTER;
            const zoom = initialMapState ? initialMapState.zoom : DEFAULT_ZOOM;

            const map = L.map(containerRef.current, {
                dragging: !readOnly, scrollWheelZoom: !readOnly, touchZoom: !readOnly,
                doubleClickZoom: false, boxZoom: !readOnly, keyboard: !readOnly, zoomAnimation: true,
            }).setView(center as L.LatLngExpression, zoom);

            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                crossOrigin: true,
                maxZoom: 20,
                maxNativeZoom: 18,
                // @ts-ignore – fetchpriority is not in Leaflet types but is a valid browser hint
                fetchpriority: "high",
            }).addTo(map);

            map.on('dblclick', (e: L.LeafletMouseEvent) => { L.DomEvent.stopPropagation(e); });
            map.on('click', (e: L.LeafletMouseEvent) => {
                const { onMapClick: cb, onSelectLocation: slcb, readOnly: ro } = latestProps.current;
                if (ro) return;
                if (cb) cb(e.latlng.lat, e.latlng.lng);
                if (slcb) slcb(e.latlng.lat, e.latlng.lng, undefined, undefined);
            });

            const markersLayer = L.layerGroup().addTo(map);
            markersLayerRef.current = markersLayer;
            mapRef.current = map;

            const handleUpdate = () => refreshLabels();
            map.on('moveend', handleUpdate);
            map.on('zoomend', handleUpdate);

            map.whenReady(() => { map.invalidateSize(); setMapReady(true); });
            setTimeout(() => { if (mapRef.current) { mapRef.current.invalidateSize(); setMapReady(true); } }, 500);

            return () => {
                map.off('moveend', handleUpdate);
                map.off('zoomend', handleUpdate);
                pinEntriesRef.current.forEach(({ marker }) => marker.off());
                map.remove();
                mapRef.current = null;
                setMapReady(false);
            };
        }, []);

        useEffect(() => { setActivePin(forcedActivePinId || null); }, [forcedActivePinId]);
        useEffect(() => {
            if (mapReady && mapRef.current && markersLayerRef.current) syncMarkers();
        }, [assets, masterPins, pinAssetCounts, forcedActivePinId, readOnly, mapReady]);

        return (
            <div
                ref={containerRef}
                className={readOnly ? 'map-readonly' : ''}
                style={{ height: "100%", width: "100%", borderRadius: "0px !important", overflow: "hidden" }}
            />
        );
    }
);

// [FIX #12] เพิ่ม displayName
AssetMap.displayName = "AssetMap";
export default AssetMap;