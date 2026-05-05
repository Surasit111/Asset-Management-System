"use client";

import React, { useEffect } from "react";
import { X, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ConfirmModalType = "danger" | "warning" | "info" | "success" | "primary";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmModalType;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก",
    type = "danger",
    isLoading = false,
}) => {
    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isLoading) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    const getIcon = () => {
        switch (type) {
            case "danger":
                return <AlertTriangle size={24} className="text-red-500" />;
            case "warning":
                return <AlertCircle size={24} className="text-amber-500" />;
            case "success":
                return <CheckCircle2 size={24} className="text-emerald-500" />;
            case "primary":
                return <CheckCircle2 size={24} className="text-blue-600" />;
            case "info":
            default:
                return <Info size={24} className="text-blue-500" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case "danger": return "bg-red-100";
            case "warning": return "bg-amber-100";
            case "success": return "bg-emerald-100";
            case "primary": return "bg-blue-50";
            case "info":
            default: return "bg-blue-100";
        }
    };

    const getConfirmButtonStyle = () => {
        switch (type) {
            case "danger":
                return "bg-red-600 hover:bg-red-700 text-white shadow-sm";
            case "warning":
                return "bg-amber-500 hover:bg-amber-600 text-white shadow-sm";
            case "success":
                return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm";
            case "primary":
                return "bg-blue-600 hover:bg-blue-500 text-white shadow-md";
            case "info":
            default:
                return "bg-blue-600 hover:bg-blue-700 text-white shadow-sm";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-250 flex items-center justify-center isolate">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => !isLoading && onClose()}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                        }}
                        className="relative w-[90%] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 p-6 border border-slate-200"
                    >
                        {/* Close Button (Top right) */}
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start text-center sm:text-left mt-2">
                            {/* Icon */}
                            <div className={`p-3 rounded-full shrink-0 ${getIconBg()}`}>
                                {getIcon()}
                            </div>

                            {/* Text content */}
                            <div className="flex-1 mt-1">
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
                                    {title}
                                </h3>
                                <div className="text-sm text-gray-500 leading-relaxed">
                                    {description}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 w-full">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center min-w-[100px] ${getConfirmButtonStyle()} disabled:opacity-50 cursor-pointer`}
                            >
                                {isLoading ? (
                                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                    confirmText
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
