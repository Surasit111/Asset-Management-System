"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

const AssetMap = dynamic(() => import("./asset-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
            กำลังโหลดแผนที่พรีเมียม...
        </div>
    ),
});

export interface MapPickerProps {
    latitude?: number | string;
    longitude?: number | string;
    mapPinId?: string | null;
    height?: number | string;
    readOnly?: boolean;
    zoom?: number;
    onLocationSelect?: (lat: number, lng: number, mapPinId?: string | null, name?: string) => void;
}

export default function MapPicker({
    latitude,
    longitude,
    mapPinId,
    height = "400px",
    readOnly = false,
    zoom,
    onLocationSelect,
}: MapPickerProps) {
    const [masterPins, setMasterPins] = useState<any[]>([]);

    // [FIX #6] AbortController ref ป้องกัน setState หลัง unmount
    const fetchAbortRef = useRef<AbortController | null>(null);

    const lat = typeof latitude === 'string' ? parseFloat(latitude) : (typeof latitude === 'number' ? latitude : 0);
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : (typeof longitude === 'number' ? longitude : 0);

    useEffect(() => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        const fetchPins = async () => {
            try {
                const res = await fetch("/api/map-pins", { signal: controller.signal });
                if (res.ok) setMasterPins(await res.json());
            } catch (err) {
                if ((err as Error)?.name !== "AbortError") console.error("Failed to fetch map pins:", err);
            }
        };
        fetchPins();

        return () => { controller.abort(); };
    }, []);

    const handlePinClick = (pinId: string | null, name?: string) => {
        if (readOnly) return;
        if (!pinId) {
            if (onLocationSelect) onLocationSelect(0, 0, null, undefined);
            return;
        }
        const pin = masterPins.find((p: any) => p.id === pinId);
        if (pin && onLocationSelect) {
            onLocationSelect(pin.latitude, pin.longitude, pinId, name || pin.name);
        }
    };

    return (
        <div style={{
            height,
            borderRadius: "0",
            border: "none",
            overflow: "hidden",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
            position: 'relative'
        }}>
            <AssetMap
                assets={[]}
                masterPins={masterPins}
                onMapClick={() => { /* disabled: user must select from existing master pins */ }}
                onPinClick={handlePinClick}
                forcedActivePinId={mapPinId}
                selectionCoords={(lat && lng && !mapPinId) ? { lat, lng } : null}
                initialMapState={(lat && lng) ? { lat, lng, zoom: zoom || 16 } : undefined}
                readOnly={readOnly}
            />
        </div>
    );
}