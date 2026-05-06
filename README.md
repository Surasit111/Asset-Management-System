# 🛡️ Asset Management System (Corporate Luxury Edition)

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

ระบบจัดการครุภัณฑ์ระดับองค์กรที่ออกแบบมาด้วยแนวคิด **"Luxury Minimal"** เน้นความพรีเมียม ใช้งานง่าย และประสิทธิภาพสูงสุด เป็นโปรเจ็กต์ที่รวมการแก้ปัญหาเชิงเทคนิคที่ซับซ้อน ทั้งระบบแผนที่อัจฉริยะและการจัดการข้อมูลขนาดใหญ่

---

## ✨ ภาพรวมของโปรเจ็กต์ (Project Showcase)

> [!TIP]
> เพื่อการนำเสนอที่ยอดเยี่ยมใน Resume แนะนำให้แคปภาพหน้าจอ (Screenshots) มาใส่แทนที่ลิงก์ด้านล่างนี้ครับ

### 📊 Modern Intelligence Dashboard
*วิเคราะห์ข้อมูลและสรุปสถิติด้วยกราฟดีไซน์พรีเมียม รองรับข้อมูลระดับ Real-time เพื่อการตัดสินใจที่แม่นยำ*
![Dashboard Showcase](https://via.placeholder.com/1200x600?text=Premium+Dashboard+Showcase+-+Add+Your+Screenshot)

### 🗺️ Smart Geospatial Tracking
*การผสานระบบแผนที่ (Leaflet) เข้ากับ React State Management เพื่อการระบุพิกัดครุภัณฑ์ที่ลื่นไหลและเสถียร*
![Map Showcase](https://via.placeholder.com/1200x600?text=Intelligent+Map+Showcase+-+Add+Your+Screenshot)

### 📥 Advanced Enterprise Excel Import
*ระบบนำเข้าข้อมูลอัจฉริยะที่ใช้ตรรกะการตรวจสอบข้อมูล (Data Validation) และการจับคู่คอลัมน์อัตโนมัติ ช่วยลดความผิดพลาดจากคน*
![Import Showcase](https://via.placeholder.com/1200x600?text=Smart+Excel+Import+Showcase+-+Add+Your+Screenshot)

---

## 🚀 ฟีเจอร์ที่น่าสนใจ (Key Technical Features)

- **🏢 Multi-Dimensional Analysis**: ระบบวิเคราะห์ครุภัณฑ์แยกตามหมวดหมู่และสถานะแบบพลวัต
- **🔍 Advanced Search Engine**: ค้นหาข้อมูลแบบละเอียดด้วย Multi-filter logic ที่ทำงานอย่างรวดเร็ว
- **📍 Smart Map Interaction**: จัดการพิกัดและรายละเอียดสถานที่แบบ Interactive ผ่าน Custom Markers
- **📦 Enterprise Bulk Actions**: ระบบจัดการข้อมูลทีละหลายรายการ (Bulk Select/Edit/Delete) พร้อม UI ที่นิ่งและแม่นยำ
- **🔐 Standard-Grade Security**: ระบบพิสูจน์ตัวตนด้วย Better-Auth รองรับสิทธิ์ผู้ใช้หลายระดับ (RBAC)
- **🧹 Auto Storage Management**: ระบบจัดการไฟล์อัจฉริยะ ลบรูปภาพที่ไม่ได้ใช้งานอัตโนมัติ เพื่อประสิทธิภาพสูงสุดของ Storage

---

## 🛠️ เทคโนโลยีและเหตุผลที่เลือกใช้ (Tech Stack & Rationale)

- **Next.js 14+ (App Router)**: เพื่อประสิทธิภาพ SSR/ISR และการจัดการ SEO ที่ยอดเยี่ยม
- **TypeScript**: เพื่อลด Runtime Error และเพิ่มคุณภาพของโค้ดในระดับองค์กร
- **Prisma ORM & PostgreSQL**: การจัดการฐานข้อมูลที่ปลอดภัยและรองรับการขยายตัว (Scalability)
- **Framer Motion & Tailwind CSS**: เพื่อสร้างประสบการณ์ผู้ใช้ (UX) ที่ลื่นไหลและดูพรีเมียมแบบ Luxury Minimal
- **Better-Auth**: มาตรฐานความปลอดภัยระดับสากลสำหรับการจัดการ Session และ Password
- **Node.js**: สภาพแวดล้อมการทำงานฝั่ง Server ที่ทรงพลัง รองรับการจัดการ API และสคริปต์ระบบอัจฉริยะ

---

## ⚙️ การติดตั้งและตั้งค่า (Quick Setup)

1. **Clone & Install**
   ```bash
   git clone https://github.com/Surasit111/Asset-Management-System.git
   npm install
   ```

2. **Database Initialization**
   ```bash
   npx prisma db push
   npx tsx scripts/setup-system.tsx # สร้าง Admin และระบบพื้นฐาน
   npx tsx scripts/seed-assets.tsx  # ข้อมูลจำลองพรีเมียม (60 รายการ ~40 ล้านบาท)
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

---

## 🔐 ข้อมูลเข้าใช้งานเริ่มต้น (Access Credentials)
- **URL**: `http://localhost:3000`
- **Email**: `admin@gmail.com` | **Password**: `password123`

---

## 📋 รายการตรวจสอบระดับมืออาชีพ (Handover & Deployment)
- [ ] เปลี่ยนรหัสผ่าน Admin ทันทีหลังเข้าใช้งาน
- [ ] ตั้งค่าคีย์ลับความปลอดภัยใน `BETTER_AUTH_SECRET`
- [ ] ตรวจสอบการตั้งค่า SMTP เพื่อระบบแจ้งเตือนที่สมบูรณ์

---

## 👨‍💻 เกี่ยวกับผู้พัฒนา (About the Developer)

**คุณสุรสิทธิ์ พิมพ์สีดา (Surasit Phimseeda)**

- 📧 Email: [surasit.phimseeda111@gmail.com](mailto:surasit.phimseeda111@gmail.com)
- 🌐 GitHub: [Surasit111](https://github.com/Surasit111)

---
*Developed with ❤️ for excellence in Asset Management.*