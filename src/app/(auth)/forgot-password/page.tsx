"use client";

import { useState } from "react";
import Link from "next/link";
import { forgetPassword } from "@/lib/auth-client";
import { Mail, ArrowLeft, Package } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await forgetPassword({
                email,
                redirectTo: "/reset-password",
            });

            if (result.error) {
                setError(result.error.message || "ไม่สามารถส่งอีเมลได้");
            } else {
                setSent(true);
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[480px] bg-white rounded-[40px] pt-8 pb-10 px-10 md:pt-10 md:pb-12 md:px-12 shadow-xl border border-slate-200 relative animate-fade-in mx-auto">

            {/* Header */}
            <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">ลืมรหัสผ่านใช่ไหม?</h1>
                <p className="text-sm text-slate-400 font-medium px-2">
                    ระบุอีเมลที่คุณใช้ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
                </p>
            </div>

            {sent ? (
                <div className="text-center space-y-6 animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">ตรวจสอบอีเมลของคุณ</h2>
                        <div className="text-slate-400 text-sm leading-relaxed space-y-2 px-2">
                            <p>เราได้ส่งคำแนะนำการกู้คืนรหัสผ่านไปยังอีเมล</p>
                            <p className="text-slate-900 font-bold text-base truncate" title={email}>
                                {email}
                            </p>
                            <p>เรียบร้อยแล้ว โปรดตรวจสอบที่อีเมลของคุณ</p>
                        </div>
                    </div>
                    <Link
                        href="/login"
                        className="luxury-button-animate inline-flex w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-bold tracking-wide items-center justify-center gap-2 mt-4 hover:bg-blue-700 shadow-lg shadow-blue-100 no-underline transition-all"
                    >
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium animate-shake text-center">
                            {error}
                        </div>
                    )}

                    {/* Email Field */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">อีเมลที่ลงทะเบียนไว้</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="email"
                                type="email"
                                placeholder="yourname@prestige.com"
                                className="luxury-input w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="luxury-button-animate w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-bold tracking-wide shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed hover:bg-blue-700 transition-all active:scale-[0.98]"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                ส่งลิงก์รีเซ็ตรหัสผ่าน
                                <Mail className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
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
