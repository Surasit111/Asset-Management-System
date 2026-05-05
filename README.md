# 🛡️ Asset Management System (Corporate Luxury Edition)

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

ระบบจัดการครุภัณฑ์ระดับองค์กรที่ออกแบบมาเพื่อความพรีเมียม ใช้งานง่าย และรองรับข้อมูลขนาดใหญ่ พัฒนาด้วยเทคโนโลยีสมัยใหม่ครบวงจร

---

## ✨ ภาพรวมของโปรเจ็กต์ (Project Showcase)

> [!TIP]
> พี่สามารถนำรูปภาพที่แคปไว้มาใส่แทนที่ลิงก์ด้านล่างนี้ได้เลยครับ

### 📊 Modern Dashboard
*สรุปข้อมูลภาพรวมขององค์กรด้วยกราฟและตัวเลขสถิติที่ชัดเจน*
![Dashboard Showcase](https://via.placeholder.com/1200x600?text=Dashboard+Showcase+-+Add+Your+Screenshot+Here)

### 🗺️ Intelligent Map Integration
*ระบุพิกัดครุภัณฑ์ผ่านระบบแผนที่อัจฉริยะ รองรับการปักหมุดและนำทาง*
![Map Showcase](https://via.placeholder.com/1200x600?text=Map+Integration+Showcase+-+Add+Your+Screenshot+Here)

### 📥 Advanced Excel Import
*ระบบนำเข้าข้อมูลอัจฉริยะ จับคู่คอลัมน์อัตโนมัติ และตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก*
![Import Showcase](https://via.placeholder.com/1200x600?text=Smart+Import+Showcase+-+Add+Your+Screenshot+Here)

---

## 🚀 ฟีเจอร์หลัก (Core Features)

- **🏢 Multi-View Dashboard**: วิเคราะห์ข้อมูลครุภัณฑ์ แยกตามหมวดหมู่และสถานะ
- **🔍 Smart Searching & Filtering**: ค้นหาข้อมูลแบบละเอียด แม่นยำ และรวดเร็ว
- **📍 Geospatial Tracking**: จัดเก็บและแสดงพิกัดครุภัณฑ์ผ่านแผนที่
- **📦 Bulk Actions**: จัดการข้อมูลทีละหลายรายการด้วยแถบเครื่องมือ Luxury Minimal
- **📑 QR Code Generation**: พิมพ์ QR Code สำหรับครุภัณฑ์แต่ละชิ้นได้ทันที
- **🔐 Secure Authentication**: ระบบความปลอดภัยมาตรฐานสูง รองรับการจัดการสิทธิ์ผู้ใช้ (Admin/User)
- **🧹 Auto File Cleanup**: ระบบจัดการไฟล์อัจฉริยะ ลบรูปภาพที่ไม่ได้ใช้โดยอัตโนมัติเพื่อประหยัดพื้นที่

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### **Frontend**
- **Next.js 14+** (App Router)
- **TypeScript** (Type Safety)
- **Framer Motion** (Smooth Animations)
- **Tailwind CSS** (Modern Styling)
- **Lucide Icons** (Premium Icons)

### **Backend & Database**
- **Prisma ORM** (Database Management)
- **PostgreSQL** (Scalable Database)
- **Better-Auth** (Secure Authentication)
- **Node.js** (Server-side Logic)

---

## ⚙️ การตั้งค่าเพื่อรันโปรเจ็กต์ (Setup & Installation)

1. **Clone Repository**
   ```bash
   git clone https://github.com/Surasit111/Asset-Management-System.git
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - คัดลอกไฟล์ `.env.example` เป็น `.env`
   - กรอกข้อมูล Database URL และ SMTP สำหรับระบบอีเมล

4. **Database Initialization**
   ```bash
   # 1. สร้างโครงสร้างฐานข้อมูล
   npx prisma db push

   # 2. ตั้งค่าระบบเริ่มต้น (สร้าง Admin และหมวดหมู่พื้นฐาน) **สำคัญมาก**
   npx tsx scripts/setup-system.tsx

   # 3. ใส่ข้อมูลครุภัณฑ์ตัวอย่าง (ถ้าต้องการ)
   npx tsx scripts/seed-assets.tsx
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## ผู้พัฒนา (Author)

**[สุรสิทธิ์ พิมพ์สีดา - Surasit Phimseeda]**
- Email: surasit.phimseeda111@gmail.com
-------------------------------------------------------------------------