# 🛡️ Asset Management System

> ระบบบริหารและติดตามครุภัณฑ์สำหรับองค์กร — นำเข้าข้อมูลจาก Excel จำนวนมาก ระบุตำแหน่งบนแผนที่แบบ Interactive สร้าง QR Code ประจำรายการ และควบคุมสิทธิ์การเข้าถึงหลายระดับ (RBAC) ในระบบเดียวกัน

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.4.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

🔗 **[Live Demo](https://your-demo-url.vercel.app)**

---

## ✨ Key Features

| Feature | รายละเอียด |
|---|---|
| **📊 Smart Excel Import** | จับคู่คอลัมน์อัตโนมัติ + Data Validation ตรวจสอบข้อมูลก่อน insert จริง พร้อม Import History |
| **📤 Excel & PDF Export** | Export ข้อมูลครุภัณฑ์เป็น Excel (styled) หรือ PDF พร้อมตาราง ใช้ jsPDF + html2canvas |
| **🗺️ Geospatial Tracking** | Leaflet.js — ระบุพิกัดครุภัณฑ์ผ่าน Custom Map Pins แต่ละ Pin มีรูปและข้อมูลอาคาร |
| **🔍 Multi-filter Search** | Client-side filtering ลด API calls ผลลัพธ์ทันทีโดยไม่ต้อง reload |
| **☑️ Bulk Actions** | Select / แก้ไขรูป / ระบุพิกัด / สร้าง QR Code ทีละหลายรายการพร้อม UI ที่ stable |
| **🔒 RBAC Auth** | Better-Auth — Admin / User พร้อมระบบ Forgot Password ผ่าน Email (SMTP) |
| **🏷️ QR Code Generator** | สร้าง QR Code รายบุคคลหรือ Bulk — พิมพ์หรือดาวน์โหลดได้ทันที |
| **🗂️ Categories Management** | จัดการหมวดหมู่และประเภทหมวดหมู่ (CategoryType) ได้แบบ Dynamic |
| **👥 User Management** | Admin จัดการผู้ใช้ ตั้งค่าสิทธิ์ ระงับบัญชี พร้อม Audit trail |
| **🖼️ Image Gallery** | อัปโหลด / ดู / ลบรูปของแต่ละครุภัณฑ์ พร้อม Luxury Modal Viewer |
| **🧹 Auto Storage Cleanup** | ลบ orphan images อัตโนมัติ ป้องกัน Storage บวมเมื่อเวลาผ่านไป |

---

## 🖼️ Screenshots

> เพิ่ม Screenshots หรือ GIF ของระบบที่นี่ เพื่อให้ผู้อ่าน README เห็นภาพรวมได้ทันที

<!-- ตัวอย่าง:
![Dashboard](./docs/screenshots/dashboard.png)
![Map View](./docs/screenshots/map.png)
![Excel Import](./docs/screenshots/import.png)
![QR Code](./docs/screenshots/qrcode.png)
-->

---

## 🛠️ Tech Stack & Rationale

| Technology | Version | เหตุผลที่เลือก |
|---|---|---|
| **Next.js** (App Router) | 16.1.6 | SSR/ISR ทำให้ load ครั้งแรกเร็ว รองรับ Route Handler สำหรับ API |
| **React** | 19.2.3 | Server Components + Actions ลด client bundle ได้มาก |
| **TypeScript** | 5.9.3 | ป้องกัน runtime error ในโค้ดระดับ enterprise ที่มีหลาย type |
| **Prisma ORM** | 7.4.0 | Type-safe query + migration tracking ขยายตัวได้ง่ายในอนาคต |
| **PostgreSQL** | 16 | Relational DB รองรับข้อมูลซับซ้อน query หนัก และ relation หลายระดับ |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS เวอร์ชันใหม่ เร็วกว่าเดิมและ config น้อยลงมาก |
| **Better-Auth** | 1.4.x | Session management + password hashing + RBAC มาตรฐานสากล |
| **Framer Motion** | 12.x | Staggered reveal + micro-interactions สร้าง UX แบบ Luxury Minimal |
| **Leaflet.js** | 1.9.x | Lightweight map library ไม่มี API cost ต่างจาก Google Maps |
| **TanStack Table** | 8.x | Headless table — sorting, filtering, pagination ควบคุม UI ได้เต็มที่ |
| **React Hook Form + Zod** | latest | Form validation แบบ schema-driven ลด boilerplate และ runtime error |
| **xlsx / xlsx-js-style** | latest | อ่านและเขียนไฟล์ Excel พร้อม styling เช่น header สี background |
| **jsPDF + html2canvas** | latest | Render DOM เป็น PDF สำหรับออกรายงานครุภัณฑ์ |
| **qrcode / qrcode.react** | latest | สร้าง QR Code จาก assetCode เพื่อใช้ติดป้ายครุภัณฑ์ |
| **Nodemailer** | 8.x | ส่ง Email สำหรับ Forgot Password ผ่าน SMTP (Gmail / custom) |
| **Recharts** | 3.x | Dashboard charts — สถิติมูลค่าและจำนวนครุภัณฑ์ตามหมวดหมู่ |
| **Luxon / date-fns** | latest | จัดการวันที่ภาษาไทย (พ.ศ.) และ fiscal year ได้อย่างถูกต้อง |

---

## 👤 User Roles & Permissions

| สิทธิ์ | Admin | User |
|---|:---:|:---:|
| ดูรายการครุภัณฑ์ | ✅ | ✅ |
| เพิ่ม / แก้ไขครุภัณฑ์ | ✅ | ✅ |
| ลบครุภัณฑ์ (รายเดียว / Bulk) | ✅ | ✅ |
| นำเข้า Excel | ✅ | ✅ |
| ส่งออก Excel / PDF | ✅ | ✅ |
| จัดการแผนที่และ Map Pins | ✅ | ✅ |
| สร้าง QR Code | ✅ | ✅ |
| จัดการหมวดหมู่ (Categories) | ✅ | ❌ |
| จัดการผู้ใช้ (Users) | ✅ | ❌ |
| ระงับ / ยกเลิกระงับบัญชี | ✅ | ❌ |

---

## ⚙️ Prerequisites

- **Node.js** 24.11.0 หรือสูงกว่า
- **PostgreSQL** 14 หรือสูงกว่า (local หรือ Docker หรือ Supabase)
- **npm** หรือ **pnpm**
- SMTP credentials — สำหรับระบบ Forgot Password (Gmail App Password รองรับ)

---

## 🚀 Quick Setup

### 1. Clone & Install

```bash
git clone https://github.com/Surasit111/Asset-Management-System.git
cd Asset-Management-System
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

แก้ไขค่าใน `.env` ให้ตรงกับเครื่องของคุณ

| Variable | ตัวอย่าง | คำอธิบาย |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/asset_db?schema=public` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Random string ≥32 ตัวอักษร สำหรับ session signing |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL ของแอป |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL สำหรับ client-side (ใช้ใน QR Code และ link) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = SSL) |
| `SMTP_USER` | `your-email@gmail.com` | อีเมลผู้ส่ง |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | App Password จาก Google 2FA |
| `ADMIN_EMAIL` | `admin@example.com` | อีเมล Admin เริ่มต้น (ใช้ใน setup script) |
| `ADMIN_PASSWORD` | `ChangeMe123!` | รหัสผ่าน Admin เริ่มต้น — **เปลี่ยนทันทีหลัง login** |

> **Gmail App Password:** ไปที่ Google Account → Security → 2-Step Verification → App passwords → สร้าง password สำหรับ "Mail"

### 3. Initialize Database

```bash
# Push schema ไปยัง database
npx prisma db push

# สร้าง Admin account (credentials จะแสดงใน console)
npx tsx scripts/setup-system.tsx

# (Optional) โหลดข้อมูลจำลอง 60 รายการ (~40 ล้านบาท) สำหรับ demo
npx tsx scripts/seed-assets.tsx
```

> **หมายเหตุ:** Credentials ของ Admin จะแสดงใน console หลัง `setup-system.tsx` สำเร็จ — **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก**

### 4. Start Development Server

```bash
npm run dev
# → http://localhost:3000
```

---

## 👨‍💻 About the Developer

**คุณสุรสิทธิ์ พิมพ์สีดา (Surasit Phimseeda)**

- 📧 [surasit.phimseeda111@gmail.com](mailto:surasit.phimseeda111@gmail.com)
- 🐙 [github.com/Surasit111](https://github.com/Surasit111)

---

## 📄 License

This project is proprietary software. All rights reserved.

---

*Developed with ❤️ for excellence in Asset Management.*