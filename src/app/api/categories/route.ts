import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET all categories (optionally filter by type)
export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        const categories = await prisma.category.findMany({
            where: type ? { type } : undefined,
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error("Categories GET error:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

// POST create new category
export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, description, sortOrder } = body;

        if (!name || !type) {
            return NextResponse.json(
                { error: "กรุณากรอกชื่อและประเภท" },
                { status: 400 }
            );
        }

        const existing = await prisma.category.findFirst({
            where: { name, type },
        });

        if (existing) {
            return NextResponse.json(
                { error: "หมวดหมู่นี้มีอยู่แล้ว" },
                { status: 400 }
            );
        }

        const category = await prisma.category.create({
            data: {
                name,
                type,
                description: description ?? null,
                sortOrder: sortOrder ?? 0,
                isActive: true,
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Categories POST error:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
