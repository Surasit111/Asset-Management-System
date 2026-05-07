"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
    MapPin as MapIcon,
    Box,
    Plus,
    Minus,
    ChevronRight,
    X,
    MapPin,
    Settings,
    Check,
    ChevronDown,
} from "lucide-react";

const LocationManager = dynamic(
    () => import("@/components/map/location-manager").then((mod) => mod.LocationManager),
    { ssr: false }
);

import { AssetMapHandle } from "@/components/map/asset-map";
import { type ImageAdjustment } from "@/components/map/image-adjustment";
import { cn } from "@/lib/utils";

const AssetMap = dynamic(() => import("@/components/map/asset-map"), {
    ssr: false,
    loading: () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#ffffff' }}>
            <div style={{
                width: '32px', height: '32px',
                border: '3px solid #f3f4f6', borderTopColor: '#3b82f6',
                borderRadius: '50%', animation: 'map-spin 1s linear infinite'
            }}>
                <style>{`@keyframes map-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    ),
});

interface MapAsset {
    id: string;
    assetCode: string;
    name: string;
    status: string | null;
    location: string | null;
    latitude: number;
    longitude: number;
    assetType: string;
    fiscalYear: string | null;
    receivedDate: string | null;
    acquisitionMethod: string | null;
    moneyType: string | null;
    mapPinId: string | null;
    unitPrice: number | null;
    quantity: number;
    unit: string | null;
    department: string | null;
    images?: { url: string }[];
}

interface Category {
    id: string;
    name: string;
    type: string;
}

interface MasterPin {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    imageUrl?: string | null;
    images?: string[];
    cardAdjustment?: ImageAdjustment;
    pinAdjustment?: ImageAdjustment;
    pinImageUrl?: string | null;
    cardImageUrl?: string | null;
    type: string;
}

const THAI_MONTHS = [
    { value: "1", label: "มกราคม" }, { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" }, { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" }, { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" }, { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" }, { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" }, { value: "12", label: "ธันวาคม" },
];

const DEFAULT_FILTERS = {
    assetType: "all",
    fiscalYear: "all",
    startMonth: "all",
    endMonth: "all",
    status: "all",
    acquisitionMethod: "all",
    moneyType: "all",
    department: "all",
};

// [FIX #7] ลบ ITEMS_PER_PAGE ที่ชนกับ totalPages dead code ออก
// ใช้ค่าตรงๆ ใน sidebarTotalPages แทน
const SIDEBAR_ITEMS_PER_PAGE = 10;

function PillButton({ label, isActive, onClick }: {
    label: string; isActive: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'relative', padding: '7px 16px', borderRadius: '8px',
                border: isActive ? '1px solid #2563eb' : '1px solid transparent',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2563eb'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
            onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
            {label}
        </button>
    );
}

const PinCard = memo(({ pin, assetCount, isActive, onClick }: {
    pin: MasterPin; assetCount: number; isActive: boolean; onClick: () => void;
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

    const thumbUrl = pin.images?.[0] || getSafeUrl(pin.imageUrl) || null;

    return (
        <div
            onClick={onClick}
            className="pin-card-light"
            style={{
                position: 'relative', height: 107, borderRadius: '12px', overflow: 'hidden',
                border: '2px solid', borderColor: isActive ? '#2563eb' : '#e5e7eb',
                boxShadow: isActive
                    ? '0 10px 25px -5px rgba(37,99,235,0.25), 0 8px 10px -6px rgba(37,99,235,0.2)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'scale(0.98)' : 'translateY(0)', background: '#fff',
            }}
            onMouseEnter={e => {
                if (!isActive) {
                    const t = e.currentTarget as HTMLElement;
                    t.style.transform = 'translateY(-4px)';
                    t.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
                    t.style.borderColor = '#2563eb';
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    const t = e.currentTarget as HTMLElement;
                    t.style.transform = 'translateY(0)';
                    t.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    t.style.borderColor = '#e5e7eb';
                }
            }}
        >
            <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
                {getSafeUrl(pin.cardImageUrl) ? (
                    <Image src={getSafeUrl(pin.cardImageUrl)!} alt={pin.name} fill sizes="(max-width: 768px) 100vw, 300px"
                        style={{ objectFit: 'cover', display: 'block' }} unoptimized />
                ) : thumbUrl ? (
                    <Image src={thumbUrl} alt={pin.name} fill sizes="(max-width: 768px) 100vw, 300px"
                        style={{ objectFit: 'cover', display: 'block' }} unoptimized />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapIcon size={24} style={{ opacity: 0.1, color: '#0f172a' }} />
                    </div>
                )}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'rgba(255,255,255,0.95)',
                    color: assetCount > 0 ? '#2563eb' : '#475569',
                    fontSize: '10px', padding: '4px 8px', borderRadius: '6px', fontWeight: '700',
                    zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                    {assetCount} รายการ
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, zIndex: 15 }}>
                    <p style={{
                        color: '#ffffff', fontSize: '12px', fontWeight: '800', lineHeight: 1.3, margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.6)', whiteSpace: 'normal', wordBreak: 'break-word',
                    }} title={pin.name}>
                        {pin.name}
                    </p>
                </div>
            </div>
        </div>
    );
}, (prev, next) => (
    prev.isActive === next.isActive &&
    prev.assetCount === next.assetCount &&
    prev.pin.id === next.pin.id &&
    prev.pin.name === next.pin.name &&
    prev.pin.cardImageUrl === next.pin.cardImageUrl
));

PinCard.displayName = "PinCard";

export default function MapPage() {
    const [assets, setAssets] = useState<MapAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [acquisitionMethods, setAcquisitionMethods] = useState<string[]>([]);
    const [moneyTypes, setMoneyTypes] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [fiscalYears, setFiscalYears] = useState<string[]>([]);
    const [masterPins, setMasterPins] = useState<MasterPin[]>([]);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [panelPinId, setPanelPinId] = useState<string | null>(null);
    const [sidebarPage, setSidebarPage] = useState(1);
    const [panelOpen, setPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pins' | 'filters'>('pins');

    const [showLocationManager, setShowLocationManager] = useState(false);
    const [editingPinId, setEditingPinId] = useState<string | null>(null);
    const mapRef = useRef<AssetMapHandle>(null);
    const [mounted, setMounted] = useState(false);

    // [FIX #1] AbortController refs สำหรับทุก fetch
    const assetsAbortRef = useRef<AbortController | null>(null);
    const categoriesAbortRef = useRef<AbortController | null>(null);
    const pinsAbortRef = useRef<AbortController | null>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!showLocationManager && mounted) {
            const timer = setTimeout(() => { mapRef.current?.invalidateSize(); }, 50);
            return () => clearTimeout(timer);
        }
    }, [showLocationManager, mounted]);

    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [initialMapState, setInitialMapState] = useState<{ lat: number; lng: number; zoom: number } | undefined>();
    const [isRestored, setIsRestored] = useState(false);

    useEffect(() => {
        try {
            const savedStr = sessionStorage.getItem('map_savedState');
            if (savedStr) {
                const saved = JSON.parse(savedStr);
                // panelOpen / panelPinId / selectedPinId ตั้งใจไม่ restore → clean start
                if (saved.filters !== undefined) setFilters(saved.filters);
                if (saved.mapState) setInitialMapState(saved.mapState);
            }
        } catch { /* ignore */ }
        setIsRestored(true);
    }, []);

    const saveMapState = useCallback(() => {
        const mapState = mapRef.current?.getMapState();
        // [FIX #8] บันทึกเฉพาะสิ่งที่ restore จริงๆ (ไม่รวม panelOpen/panelPinId)
        const stateToSave = { activeTab, filters, mapState };
        sessionStorage.setItem('map_savedState', JSON.stringify(stateToSave));
    }, [activeTab, filters]);

    useEffect(() => {
        const handler = () => saveMapState();
        window.addEventListener('am_saveMapState', handler);
        return () => window.removeEventListener('am_saveMapState', handler);
    }, [saveMapState]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setOpenDropdown(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── fetch assets ──────────────────────────────────────────────────────────
    /**
     * [FIX #1] AbortController + cleanup
     * [FIX #2] รวม fetch assets เดียวแล้วใช้ข้อมูลทั้งคู่ (assets + categories)
     */
    const fetchData = useCallback(async () => {
        // Cancel request เก่า
        assetsAbortRef.current?.abort();
        categoriesAbortRef.current?.abort();

        const assetCtrl = new AbortController();
        const catCtrl = new AbortController();
        assetsAbortRef.current = assetCtrl;
        categoriesAbortRef.current = catCtrl;

        try {
            // [FIX #2] fetch asset 1 ครั้ง ใช้ทั้ง asset list และ category values
            const [sArr, aArr, mArr, dArr, assetData] = await Promise.all([
                fetch("/api/categories?type=status", { signal: catCtrl.signal }).then(r => r.json()),
                fetch("/api/categories?type=acquisition_method", { signal: catCtrl.signal }).then(r => r.json()),
                fetch("/api/categories?type=money_type", { signal: catCtrl.signal }).then(r => r.json()),
                fetch("/api/categories?type=department", { signal: catCtrl.signal }).then(r => r.json()),
                fetch("/api/assets?limit=5000", { signal: assetCtrl.signal }).then(r => r.ok ? r.json() : { assets: [] }),
            ]);

            const allAssets: MapAsset[] = assetData.assets || [];

            // Set pinned assets
            setAssets(allAssets.filter(a => a.latitude && a.longitude));

            // Set fiscal years from real data
            const years = [...new Set(allAssets.map(a => a.fiscalYear).filter(Boolean))] as string[];
            setFiscalYears(years.sort().reverse());

            // Set category dropdowns (merged with real values)
            const getMerged = (catArr: { name: string }[], field: keyof MapAsset) => {
                const names = catArr.map(c => c.name);
                const existing = allAssets.map(a => a[field] as string).filter(Boolean);
                return [...new Set([...names, ...existing])].sort();
            };
            setStatuses(getMerged(sArr, "status"));
            setAcquisitionMethods(getMerged(aArr, "acquisitionMethod"));
            setMoneyTypes(getMerged(mArr, "moneyType"));
            setDepartments(getMerged(dArr, "department"));
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── fetch master pins ─────────────────────────────────────────────────────
    const fetchMasterPins = useCallback(async () => {
        pinsAbortRef.current?.abort();
        const controller = new AbortController();
        pinsAbortRef.current = controller;
        try {
            const res = await fetch("/api/map-pins", { signal: controller.signal });
            if (res.ok) setMasterPins(await res.json());
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") console.error(err);
        }
    }, []);

    // [FIX #1] Initial fetch + cleanup
    useEffect(() => {
        fetchData();
        fetchMasterPins();
        return () => {
            assetsAbortRef.current?.abort();
            categoriesAbortRef.current?.abort();
            pinsAbortRef.current?.abort();
        };
    }, [fetchData, fetchMasterPins]);

    // ── filter / sort ─────────────────────────────────────────────────────────
    const renderSelect = (
        field: string, label: string,
        options: { id: string | number; name: string }[],
        placeholder: string, currentVal: string,
        side: 'top' | 'bottom' = 'bottom'
    ) => {
        const isOpen = openDropdown === field;
        return (
            <div className="flex flex-col gap-1.5">
                {label && <span className="label-tag-light">{label}</span>}
                <div ref={isOpen ? dropdownRef : null} className="relative">
                    <button type="button"
                        onClick={() => setOpenDropdown(isOpen ? null : field)}
                        className={cn(
                            "w-full h-9 px-3 text-[11px] font-bold rounded-lg border bg-white text-gray-800 flex items-center justify-between cursor-pointer transition-all shadow-sm",
                            isOpen ? "border-blue-600 text-blue-600 shadow-md" : "border-slate-200 hover:border-blue-400 hover:text-blue-600",
                            currentVal !== "all" && "border-blue-600 text-blue-600"
                        )}
                    >
                        <span className="truncate">{options.find(o => String(o.id) === currentVal)?.name || placeholder}</span>
                        <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-40", isOpen && "rotate-180 opacity-80")} />
                    </button>

                    {isOpen && (
                        <div className={cn(
                            "absolute left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-100 max-h-60 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar",
                            side === 'top' ? "top-auto bottom-[calc(100%+0.25rem)] origin-bottom" : "bottom-auto top-[calc(100%+0.25rem)] origin-top"
                        )}>
                            <div className="flex flex-col gap-1">
                                {options.map(o => (
                                    <button key={o.id} type="button"
                                        className={cn(
                                            "w-full text-left px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between",
                                            currentVal === String(o.id)
                                                ? "bg-blue-50 text-blue-600 font-bold"
                                                : "text-[#0f172a] hover:bg-indigo-100/50 hover:text-blue-600"
                                        )}
                                        onClick={() => { updateFilter(field as keyof typeof filters, String(o.id)); setOpenDropdown(null); }}
                                    >
                                        <span>{o.name}</span>
                                        {currentVal === String(o.id) && <Check size={12} strokeWidth={3} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const updateFilter = (field: keyof typeof filters, value: string) =>
        setFilters(prev => ({ ...prev, [field]: value }));
    const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

    const filtered = useMemo(() => {
        return assets.filter(asset => {
            if (filters.assetType !== "all" && asset.assetType !== filters.assetType) return false;
            if (filters.fiscalYear !== "all" && asset.fiscalYear !== filters.fiscalYear) return false;
            if (filters.status !== "all" && asset.status !== filters.status) return false;
            if (filters.acquisitionMethod !== "all" && asset.acquisitionMethod !== filters.acquisitionMethod) return false;
            if (filters.moneyType !== "all" && asset.moneyType !== filters.moneyType) return false;
            if (filters.department !== "all" && asset.department !== filters.department) return false;
            if (filters.startMonth !== "all" || filters.endMonth !== "all") {
                if (!asset.receivedDate) return false;
                const month = new Date(asset.receivedDate).getMonth() + 1;
                if (filters.startMonth !== "all" && month < parseInt(filters.startMonth)) return false;
                if (filters.endMonth !== "all" && month > parseInt(filters.endMonth)) return false;
            }
            return true;
        });
    }, [assets, filters]);

    const pinAssetCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filtered.forEach(a => {
            if (a.mapPinId) counts[a.mapPinId] = (counts[a.mapPinId] || 0) + 1;
        });
        return counts;
    }, [filtered]);

    const selectedPin = useMemo(
        () => masterPins.find(p => p.id === panelPinId) || null,
        [masterPins, panelPinId]
    );

    const sidebarAssets = useMemo(() => {
        if (!panelPinId) return [];
        return filtered.filter(a => a.mapPinId === panelPinId);
    }, [filtered, panelPinId]);

    const paginatedSidebarAssets = useMemo(() => {
        const start = (sidebarPage - 1) * SIDEBAR_ITEMS_PER_PAGE;
        return sidebarAssets.slice(start, start + SIDEBAR_ITEMS_PER_PAGE);
    }, [sidebarAssets, sidebarPage]);

    const sidebarTotalPages = Math.max(1, Math.ceil(sidebarAssets.length / SIDEBAR_ITEMS_PER_PAGE));

    useEffect(() => { setSidebarPage(1); }, [panelPinId]);

    const SLIDE_DURATION = 250;

    const closeSidebar = useCallback(() => {
        setPanelOpen(false);
        setTimeout(() => {
            setPanelPinId(null);
            mapRef.current?.invalidateSize();
        }, SLIDE_DURATION);
    }, []);

    const handlePinClick = useCallback((pinId: string | null) => {
        // [FIX #3] รับ null แทน empty string — type-safe
        if (!pinId) {
            closeSidebar();
            setSelectedPinId(null);
            mapRef.current?.setActivePinExternal(null);
            return;
        }
        setSelectedPinId(pinId);
        setPanelPinId(pinId);
        if (!panelOpen) setPanelOpen(true);
        mapRef.current?.setActivePinExternal(pinId);
    }, [panelOpen, closeSidebar]);

    const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

    // ── sidebar pagination builder ─────────────────────────────────────────────
    const buildSidebarPages = (): (number | "dots")[] => {
        const pages: (number | "dots")[] = [];
        const total = sidebarTotalPages;
        const current = sidebarPage;
        const neighbors = 2;

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > neighbors + 2) pages.push("dots");
            const start = Math.max(2, current - neighbors);
            const end = Math.min(total - 1, current + neighbors);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (current < total - (neighbors + 1)) pages.push("dots");
            if (!pages.includes(total)) pages.push(total);
        }
        return pages;
    };

    return (
        <div style={{
            position: 'relative', height: '100vh', margin: '-1.5rem',
            background: '#f1f5f9', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif'
        }}>
            <style>{`
                .map-sidebar-light { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
                .map-sidebar-light::-webkit-scrollbar { width: 3px; }
                .map-sidebar-light::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

                .pin-card-light {
                    background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;
                    overflow: hidden; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; text-align: left;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative;
                }
                .pin-card-light:hover { border-color: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.12); transform: scale(1.02); }

                .asset-card-sidebar {
                    background: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;
                    padding: 12px 16px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; gap: 16px;
                    text-decoration: none; cursor: pointer;
                }
                .asset-card-sidebar:hover {
                    border-color: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.1); transform: scale(1.02);
                }
                .asset-card-sidebar:hover .asset-code-text { color: #2563eb !important; }
                .asset-card-sidebar:hover .asset-name-text { color: #2563eb !important; }

                .ctrl-btn {
                    width: 40px; height: 40px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.92); border: 1px solid #e5e7eb;
                    color: #6b7280; cursor: pointer; transition: all 0.2s;
                    backdrop-filter: blur(12px); box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .ctrl-btn:hover { border-color: #2563eb; color: #2563eb; background: #f9fafb; }

                .divider-light { height: 1px; background: #f3f4f6; }

                @keyframes fade-in-content { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-content {
                    animation: fade-in-content 0.25s ease-out forwards;
                    display: flex; flex-direction: column; flex: 1; min-height: 0;
                }

                .sidebar-asset-panel {
                    position: absolute; top: 0; right: 0; bottom: 0; width: 380px;
                    background: #ffffff; border-left: 1px solid #e5e7eb;
                    display: flex; flex-direction: column; z-index: 20;
                    opacity: 0; pointer-events: none; transform: translateY(10px);
                    transition: opacity 0.25s ease, transform 0.25s ease;
                    overflow: hidden;
                }
                .sidebar-asset-panel.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

                .leaflet-marker-pane { z-index: 10000 !important; }
                .leaflet-tooltip-pane { z-index: 10001 !important; }

                .label-tag-light {
                    display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
                    color: #9ca3af; margin-bottom: 6px;
                }

                .scan-line {
                    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
                        rgba(212,168,67,0.008) 2px, rgba(212,168,67,0.008) 4px);
                    pointer-events: none; z-index: 1;
                }
                .leaflet-control-zoom { display: none !important; }

                .pagination-num-btn {
                    width: 28px; height: 28px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    border: none; cursor: pointer; font-size: 10.5px; font-weight: 600;
                    transition: all 0.2s; background: transparent; color: #64748b;
                }
                .pagination-num-btn:hover:not(.active) { background: #f1f5f9; }
                .pagination-num-btn.active {
                    background: #2563eb; color: #ffffff; box-shadow: 0 2px 4px rgba(37,99,235,0.2);
                }
            `}</style>

            {/* ── HEADER ── */}
            <header style={{
                height: '80px', background: '#ffffff', borderBottom: '1px solid #cbd5e1',
                display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px',
                flexShrink: 0, zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#111827', fontSize: '15px', fontWeight: '800' }}>แผนที่ครุภัณฑ์</span>
                </div>
                <div style={{ height: '28px', width: '1px', background: '#e5e7eb' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 500 }}>สถานที่</span>
                        <span style={{ color: '#111827', fontSize: '16px', fontWeight: '800' }}>{masterPins.length}</span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>แห่ง</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 500 }}>ครุภัณฑ์ทั้งหมด</span>
                        <span style={{ color: '#111827', fontSize: '16px', fontWeight: '800' }}>{loading ? '···' : filtered.length}</span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>รายการ</span>
                    </div>
                </div>
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => { setEditingPinId(null); setShowLocationManager(true); }}
                    className="active:scale-95"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 20px', borderRadius: '8px',
                        background: '#2563eb', border: '1px solid #2563eb', color: '#ffffff',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                    <Settings size={14} />จัดการสถานที่
                </button>
            </header>

            {/* ── BODY ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* LEFT PANEL */}
                <aside style={{ width: '264px', background: '#ffffff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 20 }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '4px', borderRadius: '12px' }}>
                            <PillButton label="สถานที่ปักหมุด" isActive={activeTab === 'pins'} onClick={() => setActiveTab('pins')} />
                            <PillButton label="ตัวกรองข้อมูล" isActive={activeTab === 'filters'} onClick={() => setActiveTab('filters')} />
                        </div>
                    </div>

                    <div className="map-sidebar-light" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {/* TAB: สถานที่ปักหมุด */}
                        <div style={{ display: activeTab === 'pins' ? 'flex' : 'none', flexDirection: 'column', gap: '8px' }}>
                            {masterPins.length === 0 ? (
                                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                                    <MapIcon size={28} style={{ margin: '0 auto 10px', opacity: 0.25, display: 'block', color: '#0f172a' }} />
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>ยังไม่มีสถานที่ปักหมุด</p>
                                </div>
                            ) : masterPins.map((pin, idx) => (
                                <PinCard
                                    key={pin.id || `pin-${idx}`}
                                    pin={pin}
                                    assetCount={pinAssetCounts[pin.id] ?? 0}
                                    isActive={selectedPinId === pin.id}
                                    onClick={() => {
                                        if (selectedPinId === pin.id) {
                                            mapRef.current?.setActivePinExternal(null);
                                            // [FIX #3] ส่ง null แทน empty string
                                            handlePinClick(null);
                                        } else {
                                            mapRef.current?.flyTo(pin.latitude, pin.longitude, 20);
                                            mapRef.current?.setActivePinExternal(pin.id);
                                            handlePinClick(pin.id);
                                        }
                                    }}
                                />
                            ))}
                        </div>

                        {/* TAB: ตัวกรองข้อมูล */}
                        <div className="map-sidebar-light" style={{ display: activeTab === 'filters' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
                            {renderSelect(
                                "department", "หน่วยงาน",
                                [{ id: "all", name: "ทุกหน่วยงาน" }, ...departments.map(d => ({ id: d, name: d }))],
                                "ทุกหน่วยงาน", filters.department
                            )}

                            <div>
                                <span className="label-tag-light">ประเภทครุภัณฑ์</span>
                                <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl h-10 items-center gap-1 w-full">
                                    {[
                                        { value: 'all', label: 'ทั้งหมด' },
                                        { value: 'general', label: 'แบบทั่วไป' },
                                        { value: 'durable', label: 'แบบคงทน' }
                                    ].map(opt => {
                                        const active = filters.assetType === opt.value;
                                        const tabColor = opt.value === "all" ? "#0f172a" : opt.value === "general" ? "#2563eb" : "#f97316";
                                        return (
                                            <button key={opt.value} type="button"
                                                onClick={() => updateFilter('assetType', opt.value)}
                                                className="relative flex-1 rounded-lg border-none cursor-pointer text-[13px] font-bold transition-all duration-200 flex items-center justify-center h-8"
                                                style={{ background: active ? tabColor : "transparent", color: active ? "#fff" : "#94a3b8" }}
                                                onMouseEnter={e => { if (!active) e.currentTarget.style.color = tabColor; }}
                                                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#94a3b8"; }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="divider-light" />

                            {renderSelect(
                                "fiscalYear", "ปีงบประมาณ",
                                [{ id: "all", name: "ทุกปีงบประมาณ" }, ...fiscalYears.map(y => ({ id: y, name: y }))],
                                "ทุกปีงบประมาณ", filters.fiscalYear
                            )}

                            <div className="flex flex-col gap-1.5">
                                <span className="label-tag-light">ช่วงเดือน</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {renderSelect("startMonth", "", [{ id: "all", name: "เริ่มต้น" }, ...THAI_MONTHS.map(m => ({ id: m.value, name: m.label }))], "เริ่มต้น", filters.startMonth)}
                                    {renderSelect("endMonth", "", [{ id: "all", name: "สิ้นสุด" }, ...THAI_MONTHS.map(m => ({ id: m.value, name: m.label }))], "สิ้นสุด", filters.endMonth)}
                                </div>
                            </div>

                            <div className="divider-light" />

                            <div className="grid grid-cols-2 gap-2">
                                {renderSelect("status", "สถานะ", [{ id: "all", name: "ทุกสถานะ" }, ...statuses.map(s => ({ id: s, name: s }))], "ทุกสถานะ", filters.status, 'top')}
                                {renderSelect("acquisitionMethod", "วิธีการได้มา", [{ id: "all", name: "ทุกวิธีการ" }, ...acquisitionMethods.map(a => ({ id: a, name: a }))], "ทุกวิธีการ", filters.acquisitionMethod, 'top')}
                            </div>

                            {renderSelect("moneyType", "ประเภทเงิน", [{ id: "all", name: "ทุกประเภทเงิน" }, ...moneyTypes.map(m => ({ id: m, name: m }))], "ทุกประเภทเงิน", filters.moneyType, 'top')}

                            <div className="divider-light" />
                            <button onClick={handleClearFilters} className="active:scale-95"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    padding: '8px 12px', borderRadius: '12px', width: '100%',
                                    background: hasActiveFilters ? '#fff1f2' : '#f9fafb',
                                    border: `1px solid ${hasActiveFilters ? '#fecdd3' : '#e5e7eb'}`,
                                    color: hasActiveFilters ? '#f43f5e' : '#9ca3af',
                                    fontSize: '12px', fontWeight: '600',
                                    cursor: hasActiveFilters ? 'pointer' : 'default',
                                    fontFamily: "var(--font-plus-jakarta), var(--font-noto-sans-thai), sans-serif",
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { if (hasActiveFilters) (e.currentTarget as HTMLElement).style.background = '#ffe4e6'; }}
                                onMouseLeave={e => { if (hasActiveFilters) (e.currentTarget as HTMLElement).style.background = '#fff1f2'; }}
                            >
                                <X size={12} /> ล้างตัวกรองทั้งหมด
                            </button>
                        </div>
                    </div>
                </aside>

                {/* MAP AREA */}
                <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <div className="scan-line" />

                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(corner => {
                        const [v, h] = corner.split('-') as ['top' | 'bottom', 'left' | 'right'];
                        return (
                            <div key={corner} style={{
                                position: 'absolute', [v]: '12px', [h]: '12px', width: '18px', height: '18px',
                                borderTop: v === 'top' ? '1px solid rgba(212,168,67,0.3)' : 'none',
                                borderBottom: v === 'bottom' ? '1px solid rgba(212,168,67,0.3)' : 'none',
                                borderLeft: h === 'left' ? '1px solid rgba(212,168,67,0.3)' : 'none',
                                borderRight: h === 'right' ? '1px solid rgba(212,168,67,0.3)' : 'none',
                                zIndex: 10, pointerEvents: 'none',
                            }} />
                        );
                    })}

                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 0,
                        visibility: showLocationManager ? 'hidden' : 'visible',
                        pointerEvents: showLocationManager ? 'none' : 'auto'
                    }}>
                        <AssetMap
                            ref={mapRef}
                            assets={filtered}
                            masterPins={masterPins}
                            pinAssetCounts={pinAssetCounts}
                            onPinClick={handlePinClick}
                            forcedActivePinId={selectedPinId}
                            initialMapState={initialMapState}
                        />
                    </div>

                    <div style={{
                        position: 'absolute', right: panelOpen ? '392px' : '14px', top: '14px',
                        display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 50,
                        transition: `right ${SLIDE_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
                    }}>
                        <button className="ctrl-btn" aria-label="ขยายแผนที่" title="ขยายแผนที่" onClick={() => mapRef.current?.zoomIn()}><Plus size={15} /></button>
                        <button className="ctrl-btn" aria-label="ย่อแผนที่" title="ย่อแผนที่" onClick={() => mapRef.current?.zoomOut()}><Minus size={15} /></button>
                    </div>

                    {/* ASSET DETAIL SIDEBAR */}
                    <div className={`sidebar-asset-panel${panelOpen ? ' open' : ''}`}>
                        {panelPinId && selectedPin && (
                            <div key={panelPinId} className="animate-fade-in-content">
                                <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #f1f5f9', background: '#f9fafb', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h2 style={{ color: '#111827', fontSize: '14px', fontWeight: '800', lineHeight: 1.4, margin: '0 0 4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                {selectedPin.name}
                                            </h2>
                                            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600' }}>
                                                พบครุภัณฑ์ {sidebarAssets.length} รายการ
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { closeSidebar(); setSelectedPinId(null); mapRef.current?.setActivePinExternal(null); }}
                                            style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="map-sidebar-light" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {sidebarAssets.length === 0 ? (
                                        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                                            <Box size={28} style={{ margin: '0 auto 10px', opacity: 0.15, color: '#0f172a', display: 'block' }} />
                                            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600 }}>ไม่มีครุภัณฑ์</p>
                                            <p style={{ color: '#d1d5db', fontSize: '10px', marginTop: '4px' }}>อาจถูกซ่อนโดยตัวกรอง</p>
                                        </div>
                                    ) : (
                                        paginatedSidebarAssets.map((asset, idx) => (
                                            <a key={asset.id || `asset-${idx}`} href={`/assets/${asset.id}`}
                                                onClick={() => window.dispatchEvent(new Event('am_saveMapState'))}
                                                className="asset-card-sidebar">
                                                <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {asset.images?.[0] ? (
                                                        <Image src={asset.images[0].url} alt={asset.name} fill sizes="72px" style={{ objectFit: 'cover' }} unoptimized />
                                                    ) : (
                                                        <Box size={24} style={{ opacity: 0.2, color: '#64748b' }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div className="asset-code-text" style={{ color: '#111827', fontSize: '15px', fontWeight: '700', marginBottom: '2px', transition: 'color 0.2s' }}>{asset.assetCode}</div>
                                                    <div className="asset-name-text" style={{
                                                        color: '#475569', fontSize: '13px', fontWeight: '500', marginBottom: '4px', lineHeight: 1.3,
                                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden', wordBreak: 'break-word', transition: 'color 0.2s'
                                                    }}>{asset.name}</div>
                                                    {asset.location && (
                                                        <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <MapPin size={12} style={{ flexShrink: 0, opacity: 0.7 }} /> {asset.location}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '500', background: asset.assetType === 'durable' ? '#fff7ed' : '#eff6ff', color: asset.assetType === 'durable' ? '#f97316' : '#2563eb' }}>
                                                            {asset.assetType === 'durable' ? 'คงทน' : 'ทั่วไป'}
                                                        </span>
                                                        {asset.fiscalYear && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '500', background: '#f8fafc', color: '#64748b' }}>{asset.fiscalYear}</span>}
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '500', background: '#f8fafc', color: '#64748b' }}>{asset.status || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>

                                {sidebarAssets.length > 0 && (
                                    <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <button disabled={sidebarPage === 1} onClick={() => setSidebarPage(p => Math.max(1, p - 1))}
                                                style={{ height: '30px', padding: '0 12px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', background: sidebarPage === 1 ? '#f8fafc' : '#ffffff', color: sidebarPage === 1 ? '#cbd5e1' : '#64748b', cursor: sidebarPage === 1 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700' }}>
                                                <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                                                <span>ย้อนกลับ</span>
                                            </button>

                                            {/* [FIX #3] buildSidebarPages type-safe (number | "dots")[] */}
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {buildSidebarPages().map((p, idx) =>
                                                    p === "dots" ? (
                                                        <span key={`dots-${idx}`} style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: '11px' }}>...</span>
                                                    ) : (
                                                        <button key={p} onClick={() => setSidebarPage(p)}
                                                            className={cn("pagination-num-btn", p === sidebarPage && "active")}>
                                                            {p}
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            <button disabled={sidebarPage === sidebarTotalPages} onClick={() => setSidebarPage(p => Math.min(sidebarTotalPages, p + 1))}
                                                style={{ height: '30px', padding: '0 12px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', background: sidebarPage === sidebarTotalPages ? '#f8fafc' : '#ffffff', color: sidebarPage === sidebarTotalPages ? '#cbd5e1' : '#64748b', cursor: sidebarPage === sidebarTotalPages ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700' }}>
                                                <span>ถัดไป</span>
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                                            แสดง {((sidebarPage - 1) * SIDEBAR_ITEMS_PER_PAGE) + 1}–{Math.min(sidebarPage * SIDEBAR_ITEMS_PER_PAGE, sidebarAssets.length)} จากทั้งหมด {sidebarAssets.length} รายการ
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <LocationManager
                isOpen={showLocationManager}
                onClose={() => { setShowLocationManager(false); setEditingPinId(null); }}
                onPinUpdated={fetchMasterPins}
                initialEditPinId={editingPinId}
            />
        </div>
    );
}