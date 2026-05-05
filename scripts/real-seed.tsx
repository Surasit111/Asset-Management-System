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
    console.log("─── Seeding Admin User (Production) ───");
    const adminEmail = "surasit.phimseeda111@gmail.com";
    const adminPassword = "0982193141z";

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
            console.log(`× CategoryType ${ct.typeKey} error:`, e?.message);
        }
    }

    console.log("\n─── Seeding Required Statuses ───");
    const statuses = [
        { name: "ใช้งานได้", type: "status", color: "green" },
        { name: "ชำรุด", type: "status", color: "red" },
        { name: "เสื่อมสภาพ", type: "status", color: "yellow" },
        { name: "สูญหาย", type: "status", color: "orange" },
        { name: "ไม่จำเป็นต้องใช้ในราชการ", type: "status", color: "gray" },
    ];

    for (const cat of statuses) {
        try {
            await prisma.category.upsert({
                where: { name_type: { name: cat.name, type: cat.type } },
                update: {},
                create: cat
            });
            console.log(`✓ Status: ${cat.name}`);
        } catch (e) {
            console.log(`× Status ${cat.name} error`);
        }
    }

    console.log("\n✅ Real-seed finished! System is ready for production setup.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
