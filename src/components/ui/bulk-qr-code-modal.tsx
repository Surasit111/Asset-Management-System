"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
    id: string;
    assetCode: string;
    name: string;
}

interface BulkQRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
}

export const BulkQRCodeModal: React.FC<BulkQRCodeModalProps> = ({ isOpen, onClose, assets }) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (assets.length === 0) return null;

    const handlePrint = () => {
        if (!printRef.current) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const printHtml = printRef.current.innerHTML;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Bulk QR Codes</title>
                    <style>
                        @media print {
                            @page { margin: 0.5cm; size: A4; }
                            body { -webkit-print-color-adjust: exact; }
                            .no-print { display: none !important; }
                        }
                        body { 
                            font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        .print-grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        .qr-item {
                            padding: 20px;
                            border: 1px solid #f1f5f9;
                            text-align: center;
                            page-break-inside: avoid;
                            border-radius: 20px;
                            background: #fff;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .qr-box { 
                            background: #f8fafc;
                            padding: 8px;
                            border-radius: 12px;
                            margin-bottom: 12px;
                            display: inline-block;
                            border: 1px solid #f1f5f9;
                        }
                        .qr-box svg { width: 130px !important; height: 130px !important; }
                        .asset-code { 
                            font-size: 15px; 
                            font-weight: 800; 
                            margin: 0 0 2px; 
                            color: #0f172a; 
                            font-family: 'Plus Jakarta Sans', 'Noto Sans Thai', sans-serif; 
                        }
                        .asset-name { 
                            font-size: 10px; 
                            font-weight: 600; 
                            margin: 0; 
                            color: #64748b; 
                            line-height: 1.4;
                            max-width: 100%;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-grid">
                        ${printHtml}
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
                        className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-200"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-20">
                            <div>
                                <h3 className="text-xl font-bold text-[#0f172a]">พิมพ์ QR Code ทั้งหมด</h3>
                                <p className="text-sm text-slate-400 font-medium">รายการที่เลือกทั้งหมด {assets.length} รายการ</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/10"
                                >
                                    <Printer size={18} />
                                    สั่งพิมพ์ PDF
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full border border-slate-200 transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                            <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {assets.map((asset) => (
                                    <div key={asset.id} className="qr-item bg-white p-4 pb-6 border border-slate-200 rounded-xl shadow-sm text-center flex flex-col items-center">
                                        <div className="qr-box bg-[#f8fafc] p-3 rounded-lg border border-slate-100 shadow-inner mb-4">
                                            <QRCodeSVG
                                                value={`${typeof window !== "undefined" ? window.location.origin : ""}/assets/${asset.id}`}
                                                size={140}
                                                level="H"
                                                includeMargin
                                            />
                                        </div>
                                        <div className="w-full px-1">
                                            <p className="asset-code text-base font-extrabold text-[#0f172a] mb-1 leading-none tracking-tight">{asset.assetCode}</p>
                                            <p className="asset-name text-[11px] font-semibold text-slate-500 leading-relaxed wrap-break-word line-clamp-2">{asset.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
