"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Eye, EyeOff, UserPlus, Package, Phone, Mail } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
            const result = await signUp.email({
                email,
                password,
                name,
                phoneNumber: phone,
            } as any);

            if (result.error) {
                setError(result.error.message || "ไม่สามารถลงทะเบียนได้");
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
        <div className="w-full max-w-[500px] bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-200 relative animate-fade-in mx-auto">

            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">สร้างบัญชีผู้ใช้</h1>
                <p className="text-sm text-slate-400 font-medium whitespace-nowrap px-4">สร้างบัญชีใหม่เพื่อใช้งานระบบ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium animate-shake text-center">
                        {error}
                    </div>
                )}

                {/* Name Field */}
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">ชื่อ-นามสกุล</label>
                    <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            id="name"
                            type="text"
                            placeholder="กรอกชื่อ-นามสกุล"
                            className="luxury-input w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">อีเมล</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            id="email"
                            type="email"
                            placeholder="example@prestige.com"
                            className="luxury-input w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">เบอร์โทรศัพท์</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            id="phone"
                            type="tel"
                            placeholder="08x-xxx-xxxx"
                            className="luxury-input w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            required
                        />
                    </div>
                </div>

                {/* Password Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label htmlFor="password" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">รหัสผ่าน</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="luxury-input w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                    <div className="space-y-1.5">
                        <label htmlFor="confirmPassword" className="text-[10px] uppercase tracking-widest font-bold text-slate-900 ml-1">ยืนยันรหัสผ่าน</label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="luxury-input w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 bg-transparent border-none cursor-pointer"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Register Button */}
                <button
                    disabled={loading}
                    className="luxury-button-animate w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-bold tracking-wide mt-4 relative overflow-hidden group border-none cursor-pointer shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชีผู้ใช้งาน"}
                        {!loading && <UserPlus className="w-4 h-4" />}
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </form>

            {/* Login Link */}
            <div className="mt-8 text-center">
                <p className="text-sm text-slate-400 font-medium">
                    มีบัญชีอยู่แล้ว?
                    <Link href="/login" title="เข้าสู่ระบบ" className="text-slate-900 font-black hover:text-blue-600 hover:underline underline-offset-4 ml-1.5 transition-colors">เข้าสู่ระบบที่นี่</Link>
                </p>
            </div>
        </div>
    );
}
