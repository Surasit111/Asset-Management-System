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
| **📥 นำเข้าข้อมูล Excel** | อ่านไฟล์ Excel แล้วแมปคอลัมน์อัตโนมัติ ตรวจสอบข้อมูลก่อนบันทึกจริง พร้อมบันทึกประวัติการนำเข้าทุกครั้ง |
| **📤 ส่งออกรายงาน Excel** | กรองข้อมูลตามปีงบประมาณ ประเภท หรือหน่วยงาน แล้วดาวน์โหลดเป็นไฟล์ Excel พร้อม Styling และเลือกรูปแบบวันที่ได้ |
| **🗺️ แผนที่ระบุตำแหน่ง** | ปักหมุดครุภัณฑ์บนแผนที่ Interactive แต่ละหมุดมีชื่ออาคาร รูปภาพ และรายการครุภัณฑ์ในพื้นที่นั้น |
| **🔍 ค้นหาและกรองข้อมูล** | กรองได้หลายเงื่อนไขพร้อมกัน ผลลัพธ์แสดงทันทีโดยไม่ต้องโหลดหน้าใหม่ |
| **☑️ เลือกหลายรายการพร้อมกัน** | เลือกหลายรายการแล้วลบ สร้าง QR Code หรือดูรูปภาพรวมได้ในคลิกเดียว |
| **🖼️ จัดการรูปภาพกลุ่ม** | ปุ่มสำหรับเปิดดู และจัดการรูปภาพของหลายรายการพร้อมกัน (Bulk Image Modal) |
| **📍 ระบุพิกัดกลุ่ม** | ปุ่มสำหรับระบุตำแหน่งแผนที่ให้หลายรายการในคราวเดียว (Bulk Map Modal) |
| **🔒 ระบบสิทธิ์ผู้ใช้ (RBAC)** | แยก Admin / User ชัดเจน พร้อมระบบลืมรหัสผ่านผ่าน Email |
| **🏷️ สร้าง QR Code** | สร้าง QR Code รายเดียวหรือหลายรายการ ดาวน์โหลดหรือพิมพ์ได้ทันที |
| **🗂️ จัดการหมวดหมู่** | เพิ่ม แก้ไข ลบหมวดหมู่และประเภทหมวดหมู่ได้แบบยืดหยุ่น |
| **👥 จัดการผู้ใช้งาน** | Admin เพิ่มผู้ใช้ ตั้งสิทธิ์ และระงับบัญชีได้จากหน้าเดียว |
| **🖼️ แกลเลอรีรูปภาพ** | อัปโหลด ดู และลบรูปภาพของแต่ละครุภัณฑ์ พร้อม Modal Viewer เต็มจอ |
| **🧹 ล้างรูปภาพอัตโนมัติ** | ลบรูปภาพที่ไม่มีรายการครุภัณฑ์อ้างอิงแล้วออกโดยอัตโนมัติ |


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
| **Framer Motion** | 12.x | Animation library — ใช้ทำ staggered reveal และ micro-interactions ให้ UI รู้สึก responsive |
| **Leaflet.js** | 1.9.x | Lightweight map library ไม่มี API cost ต่างจาก Google Maps |

---

## 👤 User Roles & Permissions

| สิทธิ์ | Admin | User |
|---|:---:|:---:|
| ดูรายการครุภัณฑ์ | ✅ | ✅ |
| เพิ่ม / แก้ไขครุภัณฑ์ | ✅ | ✅ |
| ลบครุภัณฑ์ (รายเดียว / Bulk) | ✅ | ✅ |
| นำเข้า Excel | ✅ | ✅ |
| ส่งออก Excel | ✅ | ✅ |
| จัดการแผนที่และ Map Pins | ✅ | ✅ |
| สร้าง QR Code | ✅ | ✅ |
| จัดการหมวดหมู่ (Categories) | ✅ | ❌ |
| จัดการผู้ใช้ (Users) | ✅ | ❌ |
| ระงับ / ยกเลิกระงับบัญชี | ✅ | ❌ |

---

## ⚙️ Prerequisites

- **Node.js** ≥ 20.x (LTS แนะนำ)
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
| `BETTER_AUTH_SECRET` | `s3cr3t_key_min_32_chars_here!!` | Random string ≥32 ตัวอักษร สำหรับ session signing — สร้างได้ด้วย `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL ที่ Better Auth ใช้สร้าง link ในอีเมล reset password — ต้องตรงกับ domain จริงใน production |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL ที่ Better Auth client ใช้ระบุว่า API อยู่ที่ไหน — ต้องตรงกับ domain จริงใน production |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = SSL) |
| `SMTP_USER` | `your-email@gmail.com` | อีเมลผู้ส่ง |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | App Password จาก Google — ต้องเปิด 2-Step Verification ก่อน จึงจะสร้าง App Password ได้ |
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