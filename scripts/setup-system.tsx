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
    console.log("─── Step 1: Seeding Admin User (Super Admin) ───");
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

        console.log(`✓ Super Admin created: ${adminEmail}`);
    } catch (e: any) {
        if (e.message?.includes("already exists")) {
            console.log(`! Admin User ${adminEmail} already exists`);
        } else {
            console.log(`! Note: Admin creation might have skipped or already exists: ${e.message}`);
        }
    }

    console.log("\n─── Step 2: Seeding Category Types (System Configuration) ───");
    const categoryTypes = [
        { typeKey: "status", label: "สถานะ" },
        { typeKey: "department", label: "หน่วยงาน" },
        { typeKey: "money_type", label: "ประเภทเงิน" },
        { typeKey: "acquisition_method", label: "วิธีการได้มา" },
        { typeKey: "unit", label: "หน่วยนับ" },
        { typeKey: "location", label: "ใช้ประจำที่ไหน" },
        { typeKey: "recipient", label: "ผู้รับของ" },
        { typeKey: "recorder", label: "ผู้บันทึก" },
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
            console.log(`× CategoryType ${ct.typeKey} error:`, e?.message);
        }
    }

    console.log("\n─── Step 3: Seeding Initial Categories ───");
    const categories = [
        // สถานะ
        { name: "ใช้งานได้", type: "status", color: "green" },
        { name: "ชำรุด", type: "status", color: "red" },
        { name: "เสื่อมสภาพ", type: "status", color: "yellow" },
        { name: "สูญหาย", type: "status", color: "orange" },
        { name: "ไม่จำเป็นต้องใช้ในราชการ", type: "status", color: "gray" },

        // หน่วยงาน
        { name: "ศูนย์คอมพิวเตอร์", type: "department" },
        { name: "ศูนย์ภาษา ", type: "department" },
        { name: "ศูนย์วิทยบริการ", type: "department" },
        { name: "ศูนย์เทคโนโลยีทางการศึกษา", type: "department" },

        // ประเภทเงิน
        { name: "งบประมาณแผ่นดิน", type: "money_type" },
        { name: "เงินรายได้", type: "money_type" },
        { name: "เงินบริจาค", type: "money_type" },
        { name: "เงินศูนย์คอม อ.วินัย", type: "money_type" },
        { name: "เงินศูนย์คอม อ.ภาณุพงษ์", type: "money_type" },
        { name: "ศูนย์คอมพิวเตอร์", type: "money_type" },
        { name: "เงินรายได้ ศูนย์คอมพิวเตอร์", type: "money_type" },
        { name: "งบแผ่นดิน 669215004", type: "money_type" },
        { name: "คงคลัง 650925002", type: "money_type" },
        { name: "บ.กศ. 650015035", type: "money_type" },
        { name: "เงินเหลื่อมปีคงคลัง ปี 63 649915004", type: "money_type" },




        // วิธีการได้มา
        { name: "ตกลงราคา", type: "acquisition_method" },
        { name: "เฉพาะเจาะจง", type: "acquisition_method" },
        { name: "ประกวดราคา", type: "acquisition_method" },

        // หน่วยนับ
        { name: "ตู้", type: "unit" },
        { name: "ระบบ", type: "unit" },
        { name: "หลัง", type: "unit" },
        { name: "เครื่อง", type: "unit" },
        { name: "ชุด", type: "unit" },
        { name: "ตัว", type: "unit" },
        { name: "จอ", type: "unit" },
        { name: "ห้อง", type: "unit" },
        { name: "ลูก", type: "unit" },
        { name: "เครื่อง", type: "unit" },
        { name: "คัน", type: "unit" },
        { name: "ชิ้น", type: "unit" },
        { name: "อัน", type: "unit" },


        // ใช้ประจำที่ไหน
        { name: "ศูนย์คอมพิวเตอร์ มหาวิทยาลัยราชภัฏเลย", type: "location" },
        { name: "มหาลัยราชภัฏเลย", type: "location" },
        { name: "Data Center", type: "location" },
        { name: "ศูนย์วิทยบริการ มหาวิทยาลัยราชภัฏเลย", type: "location" },
        { name: "ห้องปฏิบัติการคอมพิวเตอร์ 105", type: "location" },
        { name: "ห้องปฏิบัติการคอมพิวเตอร์ 106", type: "location" },
        { name: "ห้องปฏิบัติการคอมพิวเตอร์ 202", type: "location" },
        { name: "ตึก 18 สำนักวิชาการและงานทะเบียน มหาวิทยาลัยราชภัฏเลย", type: "location" },
        { name: "ซำไก่เขี่ย", type: "location" },
        { name: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเลย", type: "location" },
        { name: "ห้องเรียน", type: "location" },

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
            console.log(`× Category ${cat.name} error`);
        }
    }

    console.log("\n✅ System Setup Finished! Super Admin and All Categories are ready.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
