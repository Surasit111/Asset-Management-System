"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Eye, EyeOff, LogIn, Package } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[500px] bg-white rounded-[40px] p-10 md:p-14 shadow-xl border border-slate-200 relative animate-fade-in mx-auto">

            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mb-3">ระบบครุภัณฑ์</h1>
                <p className="text-sm text-slate-400 font-medium whitespace-nowrap">กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบบริหารจัดการ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium animate-shake text-center">
                        {error}
                    </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                    <label htmlFor="email" className="text-[11px] uppercase tracking-widest font-bold text-slate-900 ml-1">อีเมล</label>
                    <div className="relative">
                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="email"
                            id="email"
                            placeholder="example@prestige.com"
                            className="luxury-input w-full pl-11 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label htmlFor="password" className="text-[11px] uppercase tracking-widest font-bold text-slate-900">รหัสผ่าน</label>
                        <Link href="/forgot-password" title="ลืมรหัสผ่าน?" className="text-[11px] text-slate-400 hover:text-blue-600 transition-colors font-bold uppercase tracking-tight">ลืมรหัสผ่าน?</Link>
                    </div>
                    <div className="relative">
                        <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder="••••••••"
                            className="luxury-input w-full pl-11 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 bg-transparent border-none cursor-pointer"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Login Button */}
                <button
                    disabled={loading}
                    className="luxury-button-animate w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-bold tracking-wide mt-4 relative overflow-hidden group border-none cursor-pointer shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        {!loading && <LogIn className="w-4 h-4" />}
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </form>

            {/* Footer Actions */}
            <div className="mt-10 text-center">
                <p className="text-sm text-slate-400 font-medium">
                    ยังไม่มีบัญชีผู้ใช้งาน?
                    <Link href="/register" title="ลงทะเบียน" className="text-slate-900 font-black hover:text-blue-600 hover:underline underline-offset-4 ml-1.5 transition-colors">ลงทะเบียน</Link>
                </p>
            </div>
        </div>
    );
}
