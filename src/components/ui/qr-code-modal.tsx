"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
    id: string;
    assetCode: string;
    name: string;
    assetType: string;
    location: string | null;
}

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, asset }) => {
    const qrRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!asset) return null;

    const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}`;

    const handlePrint = () => {
        if (!qrRef.current) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const qrHtml = qrRef.current.innerHTML;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Code - ${asset.assetCode}</title>
                    <style>
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0; 
                            font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif;
                            background: white;
                        }
                        .print-container {
                            width: 320px;
                            padding: 32px;
                            text-align: center;
                            border: 1px solid #eee;
                            border-radius: 24px;
                        }
                        .qr-box { margin-bottom: 24px; }
                        .qr-box svg { width: 200px !important; height: 200px !important; }
                        .asset-code { font-size: 20px; font-weight: 700; font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif; margin: 0 0 4px; color: #0f172a; }
                        .asset-name { font-size: 16px; font-weight: 600; margin: 0; color: #334155; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="qr-box">
                            ${qrHtml}
                        </div>
                        <p class="asset-code">${asset.assetCode}</p>
                        <p class="asset-name">${asset.name}</p>
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownload = () => {
        const svg = qrRef.current?.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = 1024;
            canvas.height = 1024;
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, 1024, 1024);
            }

            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `QR-${asset.assetCode}.png`;
            link.href = pngUrl;
            link.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-[#0f172a]">QR Code</h3>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full border border-slate-200 transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 mb-8">
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all cursor-pointer"
                                >
                                    <Printer size={16} />
                                    สั่งพิมพ์ PDF
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-[#0f172a] rounded-lg text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    <Download size={16} />
                                    ดาวน์โหลด
                                </button>
                            </div>

                            {/* QR Card Preview */}
                            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-8 text-center shadow-inner">
                                <div ref={qrRef} className="flex justify-center mb-6">
                                    <QRCodeSVG
                                        value={qrValue}
                                        size={180}
                                        level="H"
                                        includeMargin
                                        className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm"
                                    />
                                </div>

                                <div>
                                    <p className="text-lg font-bold text-[#0f172a] mb-1 leading-none">{asset.assetCode}</p>
                                    <p className="text-sm font-semibold text-slate-500 truncate max-w-full px-2">{asset.name}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
