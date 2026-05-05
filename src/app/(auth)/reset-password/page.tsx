"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";
import { Lock, ArrowLeft, Package, Eye, EyeOff } from "lucide-react";

function ResetForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
            setLoading(false);
            return;
        }

        try {
            const result = await resetPassword({
                newPassword: password,
                token,
            });

            if (result.error) {
                setError(result.error.message || "ไม่สามารถรีเซ็ตรหัสผ่านได้");
            } else {
                setSuccess(true);
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    ลิงก์ไม่ถูกต้องหรือหมดอายุ
                </p>
                <Link href="/forgot-password" className="btn btn-primary">
                    ขอลิงก์ใหม่
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[500px] bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative animate-fade-in mx-auto">
            {success ? (
                <div className="text-center space-y-6 animate-fade-in py-8">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-[#0a0a0a]">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
                        <p className="text-gray-400 text-sm leading-relaxed px-4">
                            บัญชีของคุณพร้อมใช้งานแล้ว กำลังนำคุณไปหน้าเข้าสู่ระบบ...
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium animate-shake text-center">
                            {error}
                        </div>
                    )}

                    {/* Password Field */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-[10px] uppercase tracking-widest font-bold text-[#0a0a0a] ml-1">รหัสผ่านใหม่</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="luxury-input w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0a0a0a] transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-[10px] uppercase tracking-widest font-bold text-[#0a0a0a] ml-1">ยืนยันรหัสผ่านใหม่</label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="luxury-input w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0a0a0a] transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="luxury-button-animate w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-sm font-bold tracking-wide shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                เปลี่ยนรหัสผ่าน
                                <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                            </>
                        )}
                    </button>

                    <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors no-underline"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8 px-4">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">รีเซ็ตรหัสผ่าน</h1>
                <p className="text-sm text-slate-400 font-bold whitespace-nowrap uppercase tracking-wider">กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
            </div>

            <Suspense fallback={
                <div className="w-full max-w-[500px] bg-white rounded-[40px] p-12 shadow-soft border border-gray-100 flex items-center justify-center mx-auto">
                    <div className="w-8 h-8 border-3 border-gray-100 border-t-[#0a0a0a] rounded-full animate-spin" />
                </div>
            }>
                <ResetForm />
            </Suspense>
        </div>
    );
}
