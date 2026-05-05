"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { use } from "react";

interface Asset {
    id: string;
    assetCode: string;
    name: string;
    assetType: string;
    location: string | null;
}

export default function QRCodePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/assets/${id}`)
            .then((r) => r.json())
            .then((data) => {
                setAsset(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const svg = document.querySelector("#qr-code svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            ctx?.drawImage(img, 0, 0, 512, 512);

            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `QR-${asset?.assetCode || "asset"}.png`;
            link.href = pngUrl;
            link.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    if (loading) {
        return (
            <div style={{ padding: "3rem", textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
        );
    }

    if (!asset) {
        return (
            <div style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: "var(--text-muted)" }}>ไม่พบครุภัณฑ์</p>
            </div>
        );
    }

    const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/assets/${id}`;

    return (
        <div className="animate-fade-in">
            {/* Header (hidden on print) */}
            <div
                className="no-print"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                }}
            >
                <Link href={`/assets/${id}`} className="btn btn-icon btn-ghost">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        QR Code
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        {asset.name} ({asset.assetCode})
                    </p>
                </div>
            </div>

            {/* Actions (hidden on print) */}
            <div
                className="no-print"
                style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                }}
            >
                <button className="btn btn-primary" onClick={handlePrint}>
                    <Printer size={16} />
                    พิมพ์
                </button>
                <button className="btn btn-secondary" onClick={handleDownload}>
                    <Download size={16} />
                    ดาวน์โหลด PNG
                </button>
            </div>

            {/* QR Card */}
            <div
                className="card"
                style={{
                    maxWidth: "24rem",
                    margin: "0 auto",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        background: "linear-gradient(135deg, #1e40af, #2563eb)",
                        color: "white",
                        padding: "1rem",
                        borderRadius: "var(--radius-lg)",
                        marginBottom: "1.5rem",
                    }}
                >
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>ระบบครุภัณฑ์</h2>
                    <p style={{ fontSize: "0.75rem", opacity: 0.8 }}>Asset Management System</p>
                </div>

                <div
                    id="qr-code"
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "1.5rem",
                    }}
                >
                    <QRCodeSVG
                        value={qrValue}
                        size={200}
                        level="H"
                        includeMargin
                        style={{
                            border: "2px solid var(--border-color)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.5rem",
                        }}
                    />
                </div>

                <div>
                    <p
                        style={{
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            fontFamily: "'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif",
                            color: "var(--text-primary)",
                            marginBottom: "0.25rem",
                        }}
                    >
                        {asset.assetCode}
                    </p>
                    <p
                        style={{
                            fontSize: "1rem",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            marginBottom: "0.25rem",
                        }}
                    >
                        {asset.name}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {asset.assetType === "durable" ? "แบบคงทน" : "แบบทั่วไป"}
                        {asset.location && ` • ${asset.location}`}
                    </p>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
        </div>
    );
}
