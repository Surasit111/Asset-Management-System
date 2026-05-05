import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("─── Seeding Admin User ───");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "password123";

    try {
        await auth.api.signUpEmail({
            body: {
                email: adminEmail,
                password: adminPassword,
                name: "Admin System",
            }
        });

        await prisma.user.update({
            where: { email: adminEmail },
            data: { role: "admin" }
        });

        console.log(`✓ Admin User created: ${adminEmail}`);
    } catch (e: any) {
        if (e.message?.includes("already exists")) {
            console.log(`! Admin User ${adminEmail} already exists`);
        } else {
            console.log(`! Note: Admin creation might have skipped or already exists: ${e.message}`);
        }
    }

    console.log("\n─── Seeding Categories ───");
    const categories = [
        // สถานะ
        { name: "ใช้งานได้", type: "status", color: "green" },
        { name: "ชำรุด", type: "status", color: "red" },
        { name: "เสื่อมสภาพ", type: "status", color: "yellow" },
        { name: "สูญหาย", type: "status", color: "orange" },
        { name: "ไม่จำเป็นต้องใช้ในราชการ", type: "status", color: "gray" },

        // หน่วยงาน
        { name: "ฝ่ายไอที", type: "department" },
        { name: "ฝ่ายพัสดุ", type: "department" },
        { name: "ฝ่ายบัญชี", type: "department" },
        { name: "ฝ่ายบริหาร", type: "department" },
        { name: "ฝ่ายซ่อมบำรุง", type: "department" },

        // ประเภทเงิน
        { name: "งบประมาณแผ่นดิน", type: "money_type" },
        { name: "เงินรายได้", type: "money_type" },
        { name: "เงินบริจาค", type: "money_type" },

        // วิธีการได้มา
        { name: "ตกลงราคา", type: "acquisition_method" },
        { name: "เฉพาะเจาะจง", type: "acquisition_method" },
        { name: "คัดเลือก", type: "acquisition_method" },
        { name: "e-market", type: "acquisition_method" },
        { name: "บริจาค", type: "acquisition_method" },

        // หน่วยนับ
        { name: "เครื่อง", type: "unit" },
        { name: "ชุด", type: "unit" },
        { name: "ตัว", type: "unit" },
        { name: "อัน", type: "unit" },
        { name: "โหล", type: "unit" },
        { name: "กล่อง", type: "unit" },

        // ใช้ประจำที่ไหน
        { name: "ห้องทำงาน ชั้น 1", type: "location" },
        { name: "ห้องทำงาน ชั้น 2", type: "location" },
        { name: "ห้องประชุมใหญ่", type: "location" },
        { name: "ห้องประชุมเล็ก", type: "location" },
        { name: "ห้องพักเจ้าหน้าที่", type: "location" },
        { name: "ห้องคอมพิวเตอร์", type: "location" },
        { name: "ห้องเก็บพัสดุ", type: "location" },
        { name: "โกดังสินค้า", type: "location" },
        { name: "บริเวณทางเข้าอาคาร", type: "location" },
        { name: "ลานจอดรถ", type: "location" },

        // ผู้รับของ
        { name: "นายสุรสิทธิ์ พิมพ์สีดา", type: "recipient" },
        { name: "นางสาวสมหญิง ใจดี", type: "recipient" },
        { name: "นายวิชัย มั่นคง", type: "recipient" },

        // ผู้บันทึก
        { name: "นายสุรสิทธิ์ พิมพ์สีดา", type: "recorder" },
        { name: "นางสาวสมหญิง ใจดี", type: "recorder" },
        { name: "นายวิชัย มั่นคง", type: "recorder" },
    ];

    for (const cat of categories) {
        try {
            await prisma.category.upsert({
                where: { name_type: { name: cat.name, type: cat.type } },
                update: {},
                create: cat
            });
            console.log(`✓ Category: ${cat.name} (${cat.type})`);
        } catch (e) {
            console.log(`× Category ${cat.name} already exists or error`);
        }
    }

    console.log("\n─── Seeding Category Types ───");
    const categoryTypes = [
        { typeKey: "status",              label: "สถานะ" },
        { typeKey: "department",          label: "หน่วยงาน" },
        { typeKey: "money_type",          label: "ประเภทเงิน" },
        { typeKey: "acquisition_method",  label: "วิธีการได้มา" },
        { typeKey: "unit",                label: "หน่วยนับ" },
        { typeKey: "location",            label: "ใช้ประจำที่ไหน" },
        { typeKey: "recipient",           label: "ผู้รับของ" },
        { typeKey: "recorder",            label: "ผู้บันทึก" },
    ];

    for (const ct of categoryTypes) {
        try {
            await prisma.categoryType.upsert({
                where: { typeKey: ct.typeKey },
                update: { label: ct.label },
                create: ct,
            });
            console.log(`✓ CategoryType: ${ct.label} (${ct.typeKey})`);
        } catch (e: any) {
            if (e?.code === 'P2002') {
                try {
                    await prisma.categoryType.update({
                        where: { label: ct.label },
                        data: { typeKey: ct.typeKey },
                    });
                    console.log(`↺ CategoryType updated typeKey: ${ct.label} -> ${ct.typeKey}`);
                } catch (e2: any) {
                    console.log(`× CategoryType ${ct.typeKey} still failed:`, e2?.message);
                }
            } else {
                console.log(`× CategoryType ${ct.typeKey} error:`, e?.message);
            }
        }
    }

    console.log("\n─── Seeding Assets ───");
    const assets = [
        {
            name: "เครื่องคอมพิวเตอร์ Desktop Dell Vostro 3020",
            assetCode: "CP-2569-001",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 24500,
            fiscalYear: "2569",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายไอที",
            location: "ห้องคอมพิวเตอร์",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-01-10"),
            remark: "ใช้งานในส่วนงานทะเบียน"
        },
        {
            name: "โน้ตบุ๊ก Apple MacBook Air M3 13-inch",
            assetCode: "NB-2569-002",
            assetType: "durable",
            status: "ชำรุด",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 39900,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องประชุมเล็ก",
            receivedBy: "นางสาวสมหญิง ใจดี",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-01-15"),
            remark: "หน้าจอแตก รอประเมินราคาซ่อม"
        },
        {
            name: "เครื่องพิมพ์เลเซอร์ HP Color LaserJet Pro",
            assetCode: "PR-2569-003",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 18500,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายบริหาร",
            location: "บริเวณทางเข้าอาคาร",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2026-01-20")
        },
        {
            name: "เก้าอี้ทำงาน Ergonomic รุ่น Modern-Grey",
            assetCode: "CH-2569-004",
            assetType: "general",
            status: "สูญหาย",
            quantity: 1,
            unit: "ตัว",
            unitPrice: 4200,
            fiscalYear: "2569",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องทำงาน ชั้น 1",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2026-01-22"),
            remark: "ล้อล็อก เคลื่อนย้ายไม่ได้"
        },
        {
            name: "โต๊ะประชุมไม้สักสลักลาย (ขนาด 12 ที่นั่ง)",
            assetCode: "TB-2569-005",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "ตัว",
            unitPrice: 120000,
            fiscalYear: "2568",
            acquisitionMethod: "บริจาค",
            moneyType: "เงินบริจาค",
            department: "ฝ่ายบริหาร",
            location: "ห้องประชุมใหญ่",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นายวิชัย มั่นคง",
            receivedDate: new Date("2025-11-05"),
            remark: "บริจาคโดยศิษย์เก่ารุ่น 15"
        },
        {
            name: "เครื่องปรับอากาศ Mitsubishi Heavy Duty (36,000 BTU)",
            assetCode: "AC-2569-006",
            assetType: "durable",
            status: "เสื่อมสภาพ",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 45000,
            fiscalYear: "2565",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายซ่อมบำรุง",
            location: "บริเวณทางเข้าอาคาร",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2022-05-12"),
            remark: "ความเย็นลดลง มีเสียงดังรบกวน"
        },
        {
            name: "เครื่องโปรเจคเตอร์ Epson EB-X06 (XGA)",
            assetCode: "PJ-2569-007",
            assetType: "durable",
            status: "สูญหาย",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 14900,
            fiscalYear: "2568",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องเก็บพัสดุ",
            receivedBy: "นางสาวสมหญิง ใจดี",
            createdBy: "นายวิชัย มั่นคง",
            receivedDate: new Date("2025-08-10"),
            remark: "แจ้งความหายเมื่อวันที่ 12 ก.พ. 2569"
        },
        {
            name: "ตู้เก็บเอกสารเหล็ก 4 ลิ้นชัก สีเทา",
            assetCode: "CB-2569-008",
            assetType: "general",
            status: "ใช้งานได้",
            quantity: 2,
            unit: "ตัว",
            unitPrice: 3800,
            fiscalYear: "2569",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายบริหาร",
            location: "ห้องทำงาน ชั้น 2",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2026-02-01")
        },
        {
            name: "ตู้กดน้ำดื่มสแตนเลส (แบบน้ำร้อน-น้ำเย็น)",
            assetCode: "WD-2569-009",
            assetType: "durable",
            status: "ชำรุด",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 8500,
            fiscalYear: "2569",
            acquisitionMethod: "บริจาค",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องพักเจ้าหน้าที่",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-01-05"),
            remark: "คอมเพรสเซอร์ไม่ทำงาน"
        },
        {
            name: "iPad Air 6th Generation (Wi-Fi, 128GB)",
            assetCode: "IP-2569-010",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 23900,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องเก็บพัสดุ",
            receivedBy: "นางสาวสมหญิง ใจดี",
            createdBy: "นายวิชัย มั่นคง",
            receivedDate: new Date("2026-02-15")
        },
        {
            name: "กล้องดิจิทัล Sony Alpha 7 IV (Body)",
            assetCode: "CA-2569-011",
            assetType: "durable",
            status: "สูญหาย",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 82990,
            fiscalYear: "2568",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายบริหาร",
            location: "ห้องเก็บพัสดุ",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2025-06-20"),
            remark: "เซนเซอร์มีจุด Dead Pixel"
        },
        {
            name: "เครื่องทำลายเอกสาร Fellowes รุ่น LX211",
            assetCode: "SD-2569-012",
            assetType: "general",
            status: "ชำรุด",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 12500,
            fiscalYear: "2569",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องทำงาน ชั้น 1",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-01-30"),
            remark: "ใบมีดติดขัด"
        },
        {
            name: "เราเตอร์ Cisco ISR 4331 (Industrial Grade)",
            assetCode: "RT-2569-013",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 55000,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายไอที",
            location: "ห้องคอมพิวเตอร์",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-02-10")
        },
        {
            name: "เครื่องสำรองไฟ CyberPower UPS 1500VA",
            assetCode: "UP-2569-014",
            assetType: "durable",
            status: "เสื่อมสภาพ",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 9800,
            fiscalYear: "2565",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "เงินรายได้",
            department: "ฝ่ายไอที",
            location: "ห้องคอมพิวเตอร์",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2022-11-20"),
            remark: "แบตเตอรี่บวม เก็บไฟไม่ได้"
        },
        {
            name: "กระดานไวท์บอร์ดอัจฉริยะ Samsung Flip 2 (65 นิ้ว)",
            assetCode: "WB-2569-015",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "ชุด",
            unitPrice: 65000,
            fiscalYear: "2568",
            acquisitionMethod: "บริจาค",
            moneyType: "เงินบริจาค",
            department: "ฝ่ายบริหาร",
            location: "ห้องประชุมใหญ่",
            receivedBy: "นางสาวสมหญิง ใจดี",
            createdBy: "นายวิชัย มั่นคง",
            receivedDate: new Date("2025-12-01")
        },
        {
            name: "ตู้เย็น Sharp 2 ประตู 10.2 คิว",
            assetCode: "RF-2569-016",
            assetType: "general",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 11500,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องพักเจ้าหน้าที่",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2026-02-18")
        },
        {
            name: "เครื่องดูดฝุ่น Nilfisk (Industrial Wet/Dry)",
            assetCode: "VC-2569-017",
            assetType: "durable",
            status: "สูญหาย",
            quantity: 1,
            unit: "เครื่อง",
            unitPrice: 15800,
            fiscalYear: "2568",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายซ่อมบำรุง",
            location: "ห้องเก็บพัสดุ",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นายวิชัย มั่นคง",
            receivedDate: new Date("2025-10-15"),
            remark: "มอเตอร์ไหม้"
        },
        {
            name: "ชุดโซฟาหนังพรีเมียม (3 ที่นั่ง + 1 ที่นั่ง 2 ตัว)",
            assetCode: "SF-2569-018",
            assetType: "durable",
            status: "ใช้งานได้",
            quantity: 1,
            unit: "ชุด",
            unitPrice: 48000,
            fiscalYear: "2569",
            acquisitionMethod: "ตกลงราคา",
            moneyType: "เงินรายได้",
            department: "ฝ่ายบริหาร",
            location: "ห้องทำงาน ชั้น 1",
            receivedBy: "นางสาวสมหญิง ใจดี",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-01-25")
        },
        {
            name: "สว่านโรตารี่ไร้สาย Bosch GBH 18V-26",
            assetCode: "TL-2569-019",
            assetType: "general",
            status: "ชำรุด",
            quantity: 1,
            unit: "ชุด",
            unitPrice: 8900,
            fiscalYear: "2569",
            acquisitionMethod: "เฉพาะเจาะจง",
            moneyType: "งบประมาณแผ่นดิน",
            department: "ฝ่ายซ่อมบำรุง",
            location: "ห้องเก็บพัสดุ",
            receivedBy: "นายวิชัย มั่นคง",
            createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            receivedDate: new Date("2026-02-05"),
            remark: "สวิตซ์ไกปืนค้าง"
        },
        {
            name: "บันไดอลูมิเนียมก้าวกระโดด 10 ฟุต",
            assetCode: "LD-2569-020",
            assetType: "general",
            status: "เสื่อมสภาพ",
            quantity: 1,
            unit: "อัน",
            unitPrice: 2800,
            fiscalYear: "2564",
            acquisitionMethod: "บริจาค",
            moneyType: "เงินรายได้",
            department: "ฝ่ายพัสดุ",
            location: "โกดังสินค้า",
            receivedBy: "นายสุรสิทธิ์ พิมพ์สีดา",
            createdBy: "นางสาวสมหญิง ใจดี",
            receivedDate: new Date("2021-03-15"),
            remark: "โครงสร้างเริ่มบิดเบี้ยว ไม่ปลอดภัย"
        }
    ];

    console.log("Starting seeding...");
    for (const asset of assets) {
        try {
            await prisma.asset.upsert({
                where: { assetCode: asset.assetCode },
                update: {
                    location: asset.location,
                    receivedBy: asset.receivedBy,
                    createdBy: asset.createdBy,
                    acquisitionMethod: asset.acquisitionMethod,
                    moneyType: asset.moneyType,
                    department: asset.department,
                    unit: asset.unit,
                },
                create: asset,
            });
            console.log(`✓ Asset: ${asset.name}`);
        } catch (err: any) {
            console.error(`× Error asset ${asset.assetCode}:`, err.message);
        }
    }
    console.log("Seeding finished!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
