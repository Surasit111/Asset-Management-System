import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_SEED_TYPES = [
    { typeKey: "status",              label: "สถานะ" },
    { typeKey: "acquisition_method",  label: "วิธีการได้มา" },
    { typeKey: "money_type",          label: "ประเภทเงิน" },
    { typeKey: "department",          label: "หน่วยงาน" },
    { typeKey: "unit",                label: "หน่วยนับ" },
    { typeKey: "location",            label: "ใช้ประจำที่ไหน" },
    { typeKey: "recipient",           label: "ผู้รับของ" },
    { typeKey: "recorder",            label: "ผู้บันทึก" },
];

// GET all custom category types
export async function GET() {
    try {
        let types = await prisma.categoryType.findMany({
            orderBy: { createdAt: "asc" },
        });

        if (types.length === 0) {
            await prisma.categoryType.createMany({
                data: DEFAULT_SEED_TYPES,
                skipDuplicates: true,
            });
        } else {
            // Upsert any missing default types
            const existingKeys = new Set(types.map((t) => t.typeKey));
            const missing = DEFAULT_SEED_TYPES.filter((d) => !existingKeys.has(d.typeKey));
            if (missing.length > 0) {
                await prisma.categoryType.createMany({
                    data: missing,
                    skipDuplicates: true,
                });
            }
        }

        types = await prisma.categoryType.findMany({
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(types);
    } catch (error) {
        console.error("CategoryType GET error:", error);
        return NextResponse.json({ error: "Failed to fetch category types" }, { status: 500 });
    }
}

// POST create new custom category type
export async function POST(request: NextRequest) {
    try {
        const { label } = await request.json();
        if (!label?.trim()) {
            return NextResponse.json({ error: "กรุณากรอกชื่อประเภท" }, { status: 400 });
        }

        // Generate a URL-safe key from the label
        const typeKey = `custom_${label.trim().replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;

        const existing = await prisma.categoryType.findFirst({
            where: { label: label.trim() },
        });
        if (existing) {
            return NextResponse.json({ error: "ชื่อประเภทนี้มีอยู่แล้ว" }, { status: 400 });
        }

        const type = await prisma.categoryType.create({
            data: { label: label.trim(), typeKey },
        });
        return NextResponse.json(type, { status: 201 });
    } catch (error) {
        console.error("CategoryType POST error:", error);
        return NextResponse.json({ error: "Failed to create category type" }, { status: 500 });
    }
}
