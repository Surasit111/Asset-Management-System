"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Search, Plus, Edit3, Trash2, ChevronLeft, ChevronRight,
    X, User as UserIcon, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Loader2,
    ChevronDown, Check, Calendar
} from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ImageModal } from "@/components/ui/image-modal";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    phoneNumber?: string;
    lastLogin?: string;
    image?: string;
    fullImage?: string;
    createdAt: string;
    createdByName?: string | null;
}

interface UserCounts {
    allCount: number;
    adminCount: number;
    userCount: number;
    suspendedCount: number;
}

type SortConfig = { key: string; direction: "asc" | "desc" } | null;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getAvatarColor = (name: string): string => {
    const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500",
        "bg-amber-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const formatDate = (dateStr: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString("th-TH", {
            day: "numeric", month: "short", year: "numeric",
        });
    } catch {
        return "-";
    }
};

const STATUS_STYLES: Record<string, { border: string; bg: string; color: string; dot: string; label: string }> = {
    active: { border: "#6ee7b7", bg: "#f0fdf4", color: "#059669", dot: "#10b981", label: "ปกติ" },
    suspended: { border: "#fca5a5", bg: "#fff5f5", color: "#dc2626", dot: "#ef4444", label: "ระงับ" },
    default: { border: "#e2e8f0", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1", label: "—" },
};

const getStatusStyle = (status: string) => STATUS_STYLES[status] ?? STATUS_STYLES.default;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const RowIndex = ({
    page, index, total, sortConfig,
}: {
    page: number; index: number; total: number; sortConfig: SortConfig;
}) => {
    const pos = (page - 1) * PAGE_SIZE + index;
    const num = sortConfig?.direction === "desc"
        ? total - pos
        : pos + 1;
    return (
        <span className="text-[13px] text-slate-500 font-medium">{num}</span>
    );
};

const SortIcon = ({ field, sortConfig }: { field: string; sortConfig: SortConfig }) => {
    if (sortConfig?.key !== field)
        return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 shrink-0 group-hover:text-blue-500 transition-colors" />;
    return sortConfig.direction === "asc"
        ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        : <ArrowDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
};

const StatusBadge = React.memo(({ status }: { status: string }) => {
    const s = getStatusStyle(status);
    return (
        <div className="flex items-center gap-1.5">
            <span style={{ background: s.dot }} className="w-1.5 h-1.5 rounded-full shrink-0" />
            <span style={{ color: s.color }} className="text-[12.5px] font-bold whitespace-nowrap">
                {s.label}
            </span>
        </div>
    );
});

const UserRow = React.memo(({
    user, index, page, total, sortConfig, firstAdminId, hoveredRow, setHoveredRow,
    onViewImage, onEdit, onDelete, canEdit, canDelete
}: {
    user: User; index: number; page: number; total: number; sortConfig: SortConfig;
    firstAdminId: string | null; hoveredRow: string | null; setHoveredRow: (id: string | null) => void;
    onViewImage: (url: string) => void; onEdit: (user: User) => void; onDelete: (id: string, name: string) => void;
    canEdit: (user: User) => boolean; canDelete: (user: User) => boolean;
}) => {
    return (
        <div
            onMouseEnter={() => setHoveredRow(user.id)}
            onMouseLeave={() => setHoveredRow(null)}
            className="flex flex-col sm:grid sm:grid-cols-[6%_30%_15%_14%_12%_14%_9%] items-start sm:items-center gap-3 sm:gap-0 px-4 sm:px-0 py-4 sm:h-[64px] transition-colors duration-150 hover:bg-slate-100/80 group border-b border-slate-100 sm:border-none relative"
        >
            {/* Desktop Index */}
            <div className="hidden sm:block text-center px-4">
                <RowIndex page={page} index={index} total={total} sortConfig={sortConfig} />
            </div>

            {/* Main Info (Avatar + Name) */}
            <div className="w-full sm:w-auto px-0 sm:px-4 flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer"
                        onClick={() => (user.fullImage || user.image) && onViewImage(user.fullImage || user.image || "")}
                    >
                        {user.image
                            ? <img src={user.image} alt={user.name}
                                className={`w-full h-full object-cover transition-transform duration-500 ${hoveredRow === user.id ? "scale-110" : "scale-100"}`} />
                            : <div className={`w-full h-full flex items-center justify-center text-[13px] font-bold text-white ${getAvatarColor(user.name)}`}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        }
                    </div>
                    <div className="min-w-0">
                        <p className="text-[14.5px] sm:text-[13.5px] font-bold text-slate-900 m-0 truncate group-hover:text-blue-600 transition-colors">{user.name}</p>
                        <p className="text-[12px] sm:text-[11.5px] text-slate-400 mt-0.5 truncate">{user.email}</p>
                    </div>
                </div>

                {/* Mobile Actions */}
                <div className="flex sm:hidden items-center gap-1 shrink-0">
                    {canEdit(user) && (
                        <button onClick={() => onEdit(user)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-all border-none bg-transparent">
                            <Edit3 size={17} />
                        </button>
                    )}
                    {canDelete(user) && (
                        <button onClick={() => onDelete(user.id, user.name)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all border-none bg-transparent">
                            <Trash2 size={17} />
                        </button>
                    )}
                </div>
            </div>

            {/* Phone (Hidden on Mobile) */}
            <div className="hidden sm:block px-4">
                <span className="text-[13px] text-slate-500 font-medium">{user.phoneNumber || "—"}</span>
            </div>

            {/* Role & Status (Side by side on mobile) */}
            <div className="w-full sm:w-auto px-0 sm:px-4 flex items-center justify-between sm:justify-center gap-3">
                <div className="flex sm:hidden items-center gap-2">
                    <span className="text-[12px] text-slate-400 font-medium">บทบาท:</span>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-[12px] font-bold border ${user.role === "admin"
                    ? (user.id === firstAdminId ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50/50 text-rose-600 border-rose-200")
                    : "bg-blue-50/50 text-blue-600 border-blue-200"
                    }`}>
                    {user.role === "admin"
                        ? (user.id === firstAdminId ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลระบบ")
                        : "ผู้ใช้งาน"}
                </span>
                
                <div className="sm:hidden ml-auto">
                    <StatusBadge status={user.status} />
                </div>
            </div>

            {/* Status (Desktop only) */}
            <div className="hidden sm:block px-4">
                <StatusBadge status={user.status} />
            </div>

            {/* Created At (Hidden on Mobile) */}
            <div className="hidden sm:block px-4">
                <span className="text-[12.5px] text-slate-500 font-medium">{formatDate(user.createdAt)}</span>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex px-4 justify-end gap-1">
                {canEdit(user) && (
                    <button onClick={() => onEdit(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer border-none bg-transparent"
                        title="แก้ไข">
                        <Edit3 size={15} />
                    </button>
                )}
                {canDelete(user) && (
                    <button onClick={() => onDelete(user.id, user.name)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all cursor-pointer border-none bg-transparent"
                        title="ลบ">
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            {/* Phone & Date Footer (Mobile) */}
            <div className="flex sm:hidden items-center justify-between w-full mt-1 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={13} />
                    <span className="text-[12px] font-medium">{formatDate(user.createdAt)}</span>
                </div>
                {user.phoneNumber && (
                    <span className="text-[12px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{user.phoneNumber}</span>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.user.id === next.user.id &&
        prev.user.name === next.user.name &&
        prev.user.email === next.user.email &&
        prev.user.role === next.user.role &&
        prev.user.status === next.user.status &&
        prev.hoveredRow === next.hoveredRow &&
        prev.index === next.index &&
        prev.page === next.page &&
        prev.total === next.total
    );
});

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function UserManagementPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<UserCounts>({ allCount: 0, adminCount: 0, userCount: 0, suspendedCount: 0 });
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: "", email: "", password: "", role: "user", phoneNumber: "", status: "active",
    });
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [firstAdminId, setFirstAdminId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeModalDropdown, setActiveModalDropdown] = useState<string | null>(null);
    const [viewImage, setViewImage] = useState<string | null>(null);

    const isFirstMount = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const roleDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // ── Scroll Lock ────────────────────────────
    useEffect(() => {
        const isModalOpen = showAddModal || showEditModal || showConfirm || !!viewImage;
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [showAddModal, showEditModal, showConfirm, !!viewImage]);

    // ── Click Outside Dropdowns ────────────────
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (activeModalDropdown === "role" && roleDropdownRef.current && !roleDropdownRef.current.contains(target)) {
                setActiveModalDropdown(null);
            }
            if (activeModalDropdown === "status" && statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
                setActiveModalDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeModalDropdown]);

    // ── Fetch ──────────────────────────────────
    const fetchUsers = useCallback(async (opts: {
        p: number;
        s: string;
        tab: string;
        sort: SortConfig;
        showSkeleton?: boolean;
    }) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (opts.showSkeleton !== false) setLoading(true);
        setError(false);

        try {
            const params = new URLSearchParams({ page: opts.p.toString(), limit: PAGE_SIZE.toString(), search: opts.s });
            if (opts.tab === "admin") params.append("role", "admin");
            if (opts.tab === "user") params.append("role", "user");
            if (opts.tab === "suspended") params.append("status", "suspended");
            if (opts.sort) {
                params.append("sort", opts.sort.key);
                params.append("order", opts.sort.direction);
            }

            const res = await fetch(`/api/users?${params.toString()}`, { signal: controller.signal });
            if (!res.ok) throw new Error("fetch failed");
            const data = await res.json();

            if (!controller.signal.aborted) {
                setUsers(data.users ?? []);
                setTotal(data.total ?? 0);
                setTotalPages(data.totalPages ?? 1);
                setCounts({
                    allCount: data.allCount ?? 0,
                    adminCount: data.adminCount ?? 0,
                    userCount: data.userCount ?? 0,
                    suspendedCount: data.suspendedCount ?? 0,
                });
                setCurrentUserId(data.currentUserId ?? null);
                setFirstAdminId(data.firstAdminId ?? null);
                setLoading(false);
            }
        } catch (e: unknown) {
            if ((e as Error)?.name === "AbortError") return;
            console.error(e);
            if (!controller.signal.aborted) {
                setError(true);
                setLoading(false);
            }
        }
    }, []);

    // ── Effect: Auth check + initial fetch ────
    useEffect(() => {
        if (sessionPending) return;
        if (session && session.user.role !== "admin") {
            // Session loaded and user is NOT admin → redirect
            router.push("/dashboard");
            return;
        }
        if (!session) return; // Still loading or not available yet
        if (isFirstMount.current) {
            isFirstMount.current = false;
            fetchUsers({ p: 1, s: "", tab: "all", sort: null });
        }
    }, [sessionPending, session?.user?.id, session?.user?.role, router, fetchUsers]);

    // ── Effect: Re-fetch on filter/page change ─
    useEffect(() => {
        if (isFirstMount.current) return; // wait for initial fetch
        const delay = search !== "" ? 400 : 0;
        const t = setTimeout(() =>
            fetchUsers({ p: page, s: search, tab: activeTab, sort: sortConfig }),
            delay);
        return () => clearTimeout(t);
    }, [page, search, activeTab, sortConfig, fetchUsers]);

    // ── CRUD ───────────────────────────────────
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                toast.success("สร้างผู้ใช้งานสำเร็จ");
                setShowAddModal(false);
                setFormData({ name: "", email: "", password: "", role: "user", phoneNumber: "", status: "active" });
                fetchUsers({ p: page, s: search, tab: activeTab, sort: sortConfig });
            } else {
                const err = await res.json();
                toast.error(err.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                toast.success("แก้ไขข้อมูลสำเร็จ");
                setShowEditModal(false);
                setSelectedUser(null);
                fetchUsers({ p: page, s: search, tab: activeTab, sort: sortConfig });
            } else {
                toast.error("เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const requestDelete = (id: string, name: string) => {
        setConfirmAction({ id, name });
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!confirmAction) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/users/${confirmAction.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("ลบผู้ใช้สำเร็จ");
                setShowConfirm(false);
                setConfirmAction(null);
                const itemsOnPage = users.length;
                const newPage = itemsOnPage === 1 && page > 1 ? page - 1 : page;
                setPage(newPage);
                fetchUsers({ p: newPage, s: search, tab: activeTab, sort: sortConfig });
            } else {
                const d = await res.json();
                toast.error(d.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsDeleting(false);
        }
    };

    const openEdit = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name, email: user.email, password: "",
            role: user.role, phoneNumber: user.phoneNumber || "",
            status: user.status || "active",
        });
        setShowEditModal(true);
    };

    const closeModal = () => {
        if (isSaving) return;
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedUser(null);
        setShowPassword(false);
        setIsSaving(false);
        setActiveModalDropdown(null);
    };

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === "desc" ? { key, direction: "asc" } : null;
            }
            return { key, direction: "desc" };
        });
        setPage(1);
    };

    // ── Permissions ────────────────────────────
    const isFirstAdmin = currentUserId === firstAdminId;

    const canEdit = (target: User): boolean => {
        if (isFirstAdmin) return true;
        if (target.id === firstAdminId) return false;
        if (target.role === "admin") return false;
        if (target.id === currentUserId) return true;
        return true;
    };

    const canDelete = (target: User): boolean => {
        if (target.id === currentUserId) return false;
        if (isFirstAdmin) return true;
        if (target.id === firstAdminId) return false;
        if (target.role === "admin") return false;
        return true;
    };

    const canChangeRoleOrStatus = (target: User | null): boolean => {
        if (!target) return true;
        if (target.id === currentUserId) return false;
        if (isFirstAdmin) return true;
        if (target.role === "admin") return false;
        return true;
    };

    const buildPageNumbers = (): (number | "dots")[] => {
        const result: (number | "dots")[] = [];
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                result.push(p);
            } else if (p === page - 2 || p === page + 2) {
                result.push("dots");
            }
        }
        return result;
    };

    // ── Tabs ───────────────────────────────────
    const tabs = [
        { id: "all", label: "ทั้งหมด", count: counts.allCount },
        { id: "admin", label: "ผู้ดูแลระบบ", count: counts.adminCount },
        { id: "user", label: "ผู้ใช้งานทั่วไป", count: counts.userCount },
        { id: "suspended", label: "ระงับการใช้งาน", count: counts.suspendedCount },
    ];

    const thClass = (field: string) =>
        `px-4 py-3.5 text-sm font-bold text-[#334155] cursor-pointer hover:bg-gray-100 hover:text-blue-500 group transition-colors select-none`;


    // Render
    // ─────────────────────────────────────────
    if (sessionPending) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-100 min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== "admin") {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="min-h-screen bg-white sm:bg-slate-100 lg:-m-6">

            <main className="px-0 pt-0 pb-0 sm:pt-8 sm:pb-5 sm:px-6 lg:px-10 h-screen sm:h-[calc(100vh-52px)] w-full flex flex-col">
                <div className="flex flex-col bg-white sm:rounded-xl sm:border border-slate-200 overflow-hidden h-full sm:shadow-[0_0_40px_rgba(0,0,0,0.06)]">
                    {/* ── Card Header ── */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 shrink-0 bg-slate-50/30">
                        <h1 className="text-xl sm:text-[22px] font-extrabold text-[#0f172a] tracking-tight m-0 leading-tight">จัดการผู้ใช้</h1>
                    </div>

                    {/* ── Controls ── */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 shrink-0 bg-white">
                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 scrollbar-hide">
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setPage(1); }}
                                        className={cn(
                                            "px-3 sm:px-3.5 py-1.5 rounded-full sm:rounded-lg text-[12px] sm:text-[12.5px] font-bold cursor-pointer whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border group shrink-0",
                                            isActive
                                                ? "bg-blue-600 sm:bg-blue-50 border-blue-600 text-white sm:text-blue-600 shadow-sm"
                                                : "bg-white border-slate-200 sm:border-slate-400 text-slate-500 hover:bg-slate-50 hover:border-blue-600 hover:text-blue-600"
                                        )}
                                    >
                                        {tab.label}
                                        <span className={cn(
                                            "text-[10px] sm:text-[11px] font-bold min-w-5 text-center inline-block transition-colors",
                                            isActive ? "text-white/80 sm:text-blue-600/70" : "text-slate-400 group-hover:text-blue-600/70"
                                        )}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="relative flex-1 sm:flex-initial">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[13px] outline-none w-full sm:w-48 hover:border-blue-600 focus:border-blue-600 transition-all text-slate-900"
                                    type="text"
                                    placeholder="ค้นหา..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <button
                                className="group flex items-center gap-1.5 px-4 sm:px-6 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-[0.98] cursor-pointer shrink-0 border-none"
                                onClick={() => {
                                    setFormData({ name: "", email: "", password: "", role: "user", phoneNumber: "", status: "active" });
                                    setShowAddModal(true);
                                }}
                            >
                                <Plus size={15} className="group-hover:scale-110 transition-transform duration-200 text-white" />
                                <span className="hidden xs:inline">เพิ่มผู้ใช้</span>
                                <span className="inline xs:hidden">เพิ่ม</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20">
                        {/* Desktop Header */}
                        <div className="hidden sm:grid sm:grid-cols-[6%_30%_15%_14%_12%_14%_9%] items-center bg-[#fafafa] border-b border-slate-200 text-[13.5px] font-bold text-[#475569] h-[52px] shrink-0 sticky top-0 z-10">
                            <div className="text-center px-4">ลำดับ</div>
                            <div onClick={() => handleSort("name")} className="px-4 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group">
                                ชื่อผู้ใช้งาน <SortIcon field="name" sortConfig={sortConfig} />
                            </div>
                            <div onClick={() => handleSort("phoneNumber")} className="px-4 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group">
                                เบอร์โทร <SortIcon field="phoneNumber" sortConfig={sortConfig} />
                            </div>
                            <div onClick={() => handleSort("role")} className="px-4 flex items-center justify-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group">
                                บทบาท <SortIcon field="role" sortConfig={sortConfig} />
                            </div>
                            <div onClick={() => handleSort("status")} className="px-4 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group">
                                สถานะ <SortIcon field="status" sortConfig={sortConfig} />
                            </div>
                            <div onClick={() => handleSort("createdAt")} className="px-4 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors group">
                                วันที่เพิ่ม <SortIcon field="createdAt" sortConfig={sortConfig} />
                            </div>
                            <div className="text-right px-4">จัดการ</div>
                        </div>

                        <div className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                [...Array(PAGE_SIZE)].map((_, i) => (
                                    <div key={i} className="animate-pulse h-[84px] sm:h-[64px] flex flex-col sm:grid sm:grid-cols-[6%_30%_15%_14%_12%_14%_9%] items-start sm:items-center px-4 sm:px-0 py-4 sm:py-0 border-b border-slate-50 sm:border-none">
                                        <div className="hidden sm:block h-4 w-6 bg-slate-100 rounded mx-auto" />
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full shrink-0 bg-slate-100" />
                                            <div className="min-w-0 flex-1">
                                                <div className="h-4 w-32 bg-slate-100 rounded" />
                                                <div className="h-3 w-40 bg-slate-100 rounded mt-2" />
                                            </div>
                                        </div>
                                        <div className="hidden sm:block h-4 w-24 bg-slate-100 rounded mx-4" />
                                        <div className="h-6 w-20 bg-slate-100 rounded-full sm:mx-4 mt-2 sm:mt-0" />
                                        <div className="hidden sm:block h-6 w-16 bg-slate-100 rounded-full mx-4" />
                                        <div className="hidden sm:block h-4 w-20 bg-slate-100 rounded mx-4" />
                                        <div className="hidden sm:flex justify-end gap-1 px-4">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg" />
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg" />
                                        </div>
                                    </div>
                                ))
                            ) : error ? (
                                <div className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center ring-8 ring-red-50/50">
                                            <AlertTriangle size={28} className="text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-slate-800 m-0">โหลดข้อมูลไม่สำเร็จ</p>
                                            <p className="text-[13px] text-slate-400 mt-1.5">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</p>
                                        </div>
                                        <button
                                            onClick={() => fetchUsers({ p: page, s: search, tab: activeTab, sort: sortConfig })}
                                            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer border-none"
                                        >
                                            ลองอีกครั้ง
                                        </button>
                                    </div>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center ring-8 ring-slate-50/50">
                                            <UserIcon size={28} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-slate-800 m-0">ไม่พบข้อมูลผู้ใช้</p>
                                            <p className="text-[13px] text-slate-400 mt-1.5">ลองปรับเงื่อนไขการค้นหาหรือเลือกแท็บอื่น</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {users.map((user, index) => (
                                        <UserRow
                                            key={user.id}
                                            user={user}
                                            index={index}
                                            page={page}
                                            total={total}
                                            sortConfig={sortConfig}
                                            firstAdminId={firstAdminId}
                                            hoveredRow={hoveredRow}
                                            setHoveredRow={setHoveredRow}
                                            onViewImage={setViewImage}
                                            onEdit={openEdit}
                                            onDelete={requestDelete}
                                            canEdit={canEdit}
                                            canDelete={canDelete}
                                        />
                                    ))}
                                    {/* Spacer for desktop only */}
                                    {users.length < PAGE_SIZE && [...Array(PAGE_SIZE - users.length)].map((_, i) => (
                                        <div key={`empty-${i}`} className="hidden sm:block h-[64px] border-none pointer-events-none select-none" />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between bg-white border-t border-slate-200 gap-3 sm:gap-4">
                        <span className="text-[11px] sm:text-xs text-slate-400 font-medium order-2 sm:order-1">
                            แสดง{" "}
                            <span className="text-[12px] sm:text-[13.5px] font-medium text-slate-500 mx-0.5">
                                {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
                            </span>{" "}
                            จากทั้งหมด{" "}
                            <span className="text-[12px] sm:text-[13.5px] font-medium text-slate-500 mx-0.5">{total}</span>{" "}
                            รายการ
                        </span>

                        <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className={`h-8 px-2 sm:px-3 rounded-full border border-slate-200 flex items-center gap-1 text-[11px] sm:text-[12px] font-bold transition-colors ${page <= 1 ? "bg-[#f8fafc] text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    }`}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">ย้อนกลับ</span>
                            </button>

                            <div className="flex items-center gap-1">
                                {buildPageNumbers().map((p, i) =>
                                    p === "dots" ? (
                                        <span key={`dots-${i}`} className="text-slate-300 text-[12px] px-1 flex items-center">...</span>
                                    ) : (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer border",
                                                p === page
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                                                    : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || totalPages === 0}
                                className={`h-8 px-2 sm:px-3 rounded-full border border-slate-200 flex items-center gap-1 text-[11px] sm:text-[12px] font-bold transition-colors ${(page >= totalPages || totalPages === 0) ? "bg-[#f8fafc] text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    }`}
                            >
                                <span className="hidden xs:inline">ถัดไป</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Modal เพิ่ม / แก้ไข ── */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-3xl w-full max-w-[520px] shadow-2xl relative z-10 border border-slate-200 font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
                        >
                            <div className="px-7 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-3xl">
                                <h2 className="text-[17px] font-extrabold text-slate-900 m-0">
                                    {showAddModal ? "เพิ่มผู้ใช้ใหม่" : "แก้ไขข้อมูลผู้ใช้"}
                                </h2>
                                <button onClick={closeModal} disabled={isSaving}
                                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 cursor-pointer disabled:opacity-40">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="px-7 pt-6 pb-10">
                                <form onSubmit={showAddModal ? handleAdd : handleEdit}>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-4">ข้อมูลส่วนตัว</p>
                                    <div className="grid grid-cols-2 gap-3.5 mb-6">
                                        <div className="col-span-2">
                                            <label className="block text-[12px] font-bold text-slate-600 mb-2">ชื่อ-นามสกุล</label>
                                            <input className={cn(
                                                "w-full px-3.5 py-2.5 border rounded-xl text-[13px] outline-none text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                (showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId)
                                                    ? "bg-slate-100 border-slate-300"
                                                    : "bg-slate-50 border-slate-300 hover:border-blue-600 focus:border-blue-600"
                                            )}
                                                type="text" placeholder="กรอกชื่อและนามสกุล" value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })} required
                                                disabled={showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-600 mb-2">อีเมล</label>
                                            <input className={cn(
                                                "w-full px-3.5 py-2.5 border rounded-xl text-[13px] outline-none text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                (showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId)
                                                    ? "bg-slate-100 border-slate-300"
                                                    : "bg-slate-50 border-slate-300 hover:border-blue-600 focus:border-blue-600"
                                            )}
                                                type="email" placeholder="name@example.com" value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })} required
                                                disabled={showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-600 mb-2">เบอร์โทรศัพท์</label>
                                            <input className={cn(
                                                "w-full px-3.5 py-2.5 border rounded-xl text-[13px] outline-none text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                (showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId)
                                                    ? "bg-slate-100 border-slate-300"
                                                    : "bg-slate-50 border-slate-300 hover:border-blue-600 focus:border-blue-600"
                                            )}
                                                type="tel" placeholder="0xx-xxx-xxxx" value={formData.phoneNumber}
                                                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                                                disabled={showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId}
                                            />
                                        </div>
                                        <div className="col-span-2 relative">
                                            <label className="block text-[12px] font-bold text-slate-600 mb-2">รหัสผ่าน {showEditModal && "(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)"}</label>
                                            <div className="relative">
                                                <input className={cn(
                                                    "w-full px-3.5 py-2.5 border rounded-xl text-[13px] outline-none text-slate-900 transition-all pr-10 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    (showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId)
                                                        ? "bg-slate-100 border-slate-300"
                                                        : "bg-slate-50 border-slate-300 hover:border-blue-600 focus:border-blue-600"
                                                )}
                                                    type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required={showAddModal}
                                                    disabled={showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId}
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer disabled:opacity-0"
                                                    disabled={showEditModal && selectedUser?.id === firstAdminId && currentUserId !== firstAdminId}>
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 pt-5 mb-6">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-4">การตั้งค่าบัญชี</p>
                                        <div className="grid grid-cols-2 gap-3.5">
                                            <div>
                                                <label className="block text-[12px] font-bold text-slate-600 mb-2">บทบาท</label>
                                                <div className="relative" ref={roleDropdownRef}>
                                                    <button
                                                        type="button"
                                                        disabled={!canChangeRoleOrStatus(selectedUser) && showEditModal}
                                                        onClick={() => setActiveModalDropdown(activeModalDropdown === "role" ? null : "role")}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-[13px] font-bold outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                                                            activeModalDropdown === "role"
                                                                ? "border-blue-600 text-blue-600"
                                                                : "border-slate-300 text-slate-700",
                                                            (!canChangeRoleOrStatus(selectedUser) && showEditModal) ? "" : "hover:border-blue-600 hover:text-blue-600 cursor-pointer"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "truncate",
                                                            (!canChangeRoleOrStatus(selectedUser) && showEditModal) ? "text-slate-400" : "text-blue-700"
                                                        )}>{formData.role === "admin"
                                                            ? (selectedUser?.id === firstAdminId ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลระบบ")
                                                            : "ผู้ใช้งานทั่วไป"}</span>
                                                        <ChevronDown size={14} className={cn(
                                                            "transition-transform duration-200",
                                                            (!canChangeRoleOrStatus(selectedUser) && showEditModal) ? "text-slate-300" : (activeModalDropdown === "role" ? "text-blue-600" : "text-slate-400"),
                                                            activeModalDropdown === "role" && "rotate-180"
                                                        )} />
                                                    </button>

                                                    {activeModalDropdown === "role" && (
                                                        <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-gray-100 rounded-xl z-60 p-1.5 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
                                                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                                {[
                                                                    { value: "user", label: "ผู้ใช้งานทั่วไป" },
                                                                    { value: "admin", label: "ผู้ดูแลระบบ" }
                                                                ].map((r) => {
                                                                    const isDisabled = r.value === "admin" && !isFirstAdmin;
                                                                    return (
                                                                        <div key={r.value} className="flex flex-col gap-0.5">
                                                                            <button
                                                                                type="button"
                                                                                disabled={isDisabled}
                                                                                className={cn(
                                                                                    "w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all",
                                                                                    isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer",
                                                                                    !isDisabled && (formData.role === r.value
                                                                                        ? "bg-blue-50 text-blue-600 font-bold"
                                                                                        : "text-[#0f172a] hover:bg-indigo-100/50 hover:text-blue-600")
                                                                                )}
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, role: r.value });
                                                                                    setActiveModalDropdown(null);
                                                                                }}
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    {r.label}
                                                                                    {formData.role === r.value && <Check size={12} className="text-blue-600" strokeWidth={2.5} />}
                                                                                </div>
                                                                            </button>
                                                                            {isDisabled && (
                                                                                <p className="text-[10px] text-red-500 font-bold m-0 px-3 pb-1">
                                                                                    * เฉพาะผู้ดูแลระบบสูงสุด
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <label className="block text-[12px] font-bold text-slate-600">สถานะ</label>
                                                    {showAddModal && (
                                                        <span className="text-[10px] text-red-500 font-bold">* ไม่สามารถเปลี่ยนแปลงได้ขณะเพิ่มผู้ใช้งาน</span>
                                                    )}
                                                </div>
                                                <div className="relative" ref={statusDropdownRef}>
                                                    <button
                                                        type="button"
                                                        disabled={showAddModal || (!canChangeRoleOrStatus(selectedUser) && showEditModal)}
                                                        onClick={() => setActiveModalDropdown(activeModalDropdown === "status" ? null : "status")}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-[13px] font-bold outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                                                            activeModalDropdown === "status"
                                                                ? "border-blue-600 text-blue-600"
                                                                : "border-slate-300 text-slate-700",
                                                            (showAddModal || (!canChangeRoleOrStatus(selectedUser) && showEditModal)) ? "" : "hover:border-blue-600 hover:text-blue-600 cursor-pointer"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "truncate",
                                                            (showAddModal || (!canChangeRoleOrStatus(selectedUser) && showEditModal)) ? "text-slate-400" : "text-blue-700"
                                                        )}>{formData.status === "active" ? "ปกติ" : "ระงับ"}</span>
                                                        <ChevronDown size={14} className={cn(
                                                            "transition-transform duration-200",
                                                            (showAddModal || (!canChangeRoleOrStatus(selectedUser) && showEditModal)) ? "text-slate-300" : (activeModalDropdown === "status" ? "text-blue-600" : "text-slate-400"),
                                                            activeModalDropdown === "status" && "rotate-180"
                                                        )} />
                                                    </button>

                                                    {activeModalDropdown === "status" && (
                                                        <div className="absolute top-[calc(100%+0.35rem)] left-0 right-0 bg-white border border-gray-100 rounded-xl z-60 p-1.5 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
                                                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                                {[
                                                                    { value: "active", label: "ปกติ" },
                                                                    { value: "suspended", label: "ระงับ" }
                                                                ].map((s) => (
                                                                    <button
                                                                        key={s.value}
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                                                                            formData.status === s.value
                                                                                ? "bg-blue-50 text-blue-600 font-bold"
                                                                                : "text-[#0f172a] hover:bg-indigo-100/50 hover:text-blue-600"
                                                                        )}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, status: s.value });
                                                                            setActiveModalDropdown(null);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            {s.label}
                                                                            {formData.status === s.value && <Check size={12} className="text-blue-600" strokeWidth={2.5} />}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-8">
                                        <button type="button" onClick={closeModal} disabled={isSaving}
                                            className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm">
                                            ยกเลิก
                                        </button>
                                        <button type="submit" disabled={isSaving}
                                            className="px-8 py-2.5 rounded-xl text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    กำลังบันทึก...
                                                </>
                                            ) : (
                                                showAddModal ? "สร้างบัญชี" : "บันทึกการแก้ไข"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Modal ยืนยันการลบ ── */}
            <AnimatePresence>
                {showConfirm && confirmAction && (
                    <div className="fixed inset-0 z-350 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setShowConfirm(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-3xl w-full max-w-[400px] p-6 shadow-2xl relative z-10 border border-slate-200 text-center font-['Plus_Jakarta_Sans','Noto_Sans_Thai',sans-serif]"
                        >
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50/50">
                                <Trash2 className="text-red-500 w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบผู้ใช้?</h3>
                            <p className="text-[13px] text-slate-500 mb-6 leading-relaxed px-4">
                                คุณกำลังจะลบผู้ใช้ <span className="font-bold text-slate-700">"{confirmAction.name}"</span> บัญชีนี้จะไม่สามารถกู้คืนได้ และข้อมูลที่เกี่ยวข้องจะถูกลบออก
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowConfirm(false)} disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 bg-white hover:bg-slate-50 transition-all active:scale-95 cursor-pointer border border-slate-200 disabled:opacity-50 shadow-sm">
                                    ยกเลิก
                                </button>
                                <button onClick={executeDelete} disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-red-500 disabled:opacity-70">
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            กำลังลบ...
                                        </>
                                    ) : "ยืนยันการลบ"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Modal */}
            <ImageModal isOpen={!!viewImage} onClose={() => setViewImage(null)} images={viewImage ? [viewImage] : []} initialIndex={0} />
        </div>
    );
}
