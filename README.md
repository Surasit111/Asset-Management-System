# 🛡️ Asset Management System

> ระบบจัดการครุภัณฑ์ระดับองค์กร ออกแบบด้วยแนวคิด **Luxury Minimal** รองรับการนำเข้าข้อมูล Excel จำนวนมาก การระบุพิกัดผ่านแผนที่แบบ Interactive และระบบสิทธิ์ผู้ใช้หลายระดับ (RBAC)

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.4.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

🔗 **[Live Demo](https://your-demo-url.vercel.app)** &nbsp;·&nbsp; 🎬 **[Video Walkthrough](https://youtube.com/your-video)**

---

## ✨ Key Features

| Feature | รายละเอียด |
|---|---|
| **Smart Excel Import** | จับคู่คอลัมน์อัตโนมัติ + Data Validation ช่วยลด human error ก่อน insert จริง |
| **Geospatial Tracking** | Leaflet + React State — ระบุพิกัดครุภัณฑ์ผ่าน Custom Markers แบบลื่นไหล |
| **Multi-filter Search** | Client-side filtering ลด API calls ผลลัพธ์ทันทีโดยไม่ต้อง reload |
| **Bulk Actions** | Select / Edit / Delete ทีละหลายรายการพร้อม UI ที่ stable ไม่กระตุก |
| **RBAC Auth** | Better-Auth รองรับสิทธิ์หลายระดับ — Admin / Editor / Viewer |
| **Auto Storage Cleanup** | ลบ orphan images อัตโนมัติ ป้องกัน Storage บวมเมื่อเวลาผ่านไป |

---

## 🖼️ Screenshots

> เพิ่ม Screenshots หรือ GIF ของระบบที่นี่

<!-- ตัวอย่าง:
![Dashboard](./docs/screenshots/dashboard.png)
![Map View](./docs/screenshots/map.png)
![Excel Import](./docs/screenshots/import.png)
-->

---

## 🛠️ Tech Stack & Rationale

| Technology | Version | เหตุผลที่เลือก |
|---|---|---|
| **Next.js** (App Router) | 16.1.6 | SSR/ISR ทำให้ load ครั้งแรกเร็ว รองรับ SEO สำหรับ internal report |
| **React** | 19.2.3 | Server Components + Actions ลด client bundle ได้มาก |
| **TypeScript** | 5.9.3 | ป้องกัน runtime error ในโค้ดระดับ enterprise ที่มีหลาย type |
| **Prisma ORM** | 7.4.0 | Type-safe query + migration tracking ขยายตัวได้ง่ายในอนาคต |
| **PostgreSQL** | 16 | Relational DB ที่รองรับข้อมูลซับซ้อนและ query หนักได้ดี |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS ใหม่ล่าสุด เร็วกว่าเดิมและ config น้อยลงมาก |
| **Better-Auth** | latest | Session management + password hashing มาตรฐานสากล ไม่ต้อง reinvent |
| **Framer Motion** | latest | Staggered reveal + micro-interactions สร้าง UX แบบ Luxury Minimal |
| **Leaflet.js** | latest | Lightweight map library ไม่มี API cost ต่างจาก Google Maps |

---

## ⚙️ Prerequisites

ตรวจสอบให้แน่ใจว่ามีสิ่งต่อไปนี้ก่อนติดตั้ง

- **Node.js** 24.11.0 หรือสูงกว่า
- **PostgreSQL** 14.0 หรือสูงกว่า (local หรือ Docker)
- **npm** หรือ **pnpm**
- SMTP credentials (optional — สำหรับระบบ email notification)

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
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/asset_db` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | `your-random-32-char-string` | Random string ≥32 ตัวอักษร สำหรับ session signing |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL ของแอป |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP host (optional) |
| `SMTP_PORT` | `587` | SMTP port (optional) |

### 3. Initialize Database

```bash
# Push schema ไปยัง database
npx prisma db push

# สร้าง Admin account (credentials จะแสดงใน console)
npx tsx scripts/setup-system.tsx

# โหลดข้อมูลจำลอง 60 รายการ (~40 ล้านบาท)
npx tsx scripts/seed-assets.tsx
```

> **หมายเหตุ:** Credentials ของ Admin จะแสดงใน console หลังรัน `setup-system.tsx` สำเร็จ — **เปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก**

### 4. Start Development Server

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router (pages & layouts)
│   ├── (auth)/           # Auth routes — login, register
│   ├── (dashboard)/      # Protected routes — assets, map, reports
│   └── api/              # API Route Handlers
├── components/
│   ├── ui/               # Reusable UI components
│   ├── map/              # Leaflet map components
│   └── import/           # Excel import wizard
├── lib/
│   ├── auth.ts           # Better-Auth configuration
│   ├── prisma.ts         # Prisma client singleton
│   └── utils.ts          # Shared utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── scripts/
    ├── setup-system.tsx  # Admin account setup
    └── seed-assets.tsx   # Demo data seeder
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

อย่าลืมตั้งค่า Environment Variables ทั้งหมดใน Vercel Dashboard ก่อน deploy

### Deployment Checklist

- [ ] เปลี่ยนรหัสผ่าน Admin ทันทีหลัง login ครั้งแรก
- [ ] ตั้งค่า `BETTER_AUTH_SECRET` เป็น string แบบสุ่ม ≥32 ตัวอักษรใน production
- [ ] ตั้งค่า SMTP หากต้องการ email notification (reset password / alerts)
- [ ] ตั้งค่า CORS / Allowed Origins ใน production environment
- [ ] ตรวจสอบ Database connection ว่า production DB แยกจาก dev DB

---

## 👨‍💻 About the Developer

**คุณสุรสิทธิ์ พิมพ์สีดา (Surasit Phimseeda)**

- 📧 [surasit.phimseeda111@gmail.com](mailto:surasit.phimseeda111@gmail.com)
- 🐙 [github.com/Surasit111](https://github.com/Surasit111)

---

*Developed with ❤️ for excellence in Asset Management.*