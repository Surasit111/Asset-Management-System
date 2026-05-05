import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PATCH – partial update (name, description, color, isActive, sortOrder, …)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) {
            return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
        }

        // If renaming, check uniqueness within the same type
        if (body.name && body.name !== category.name) {
            const existing = await prisma.category.findFirst({
                where: { name: body.name, type: category.type, NOT: { id } },
            });
            if (existing) {
                return NextResponse.json({ error: "ชื่อหมวดหมู่นี้มีอยู่แล้ว" }, { status: 400 });
            }
        }

        const { name, description, isActive, sortOrder } = body;

        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Categories PATCH error:", error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

// DELETE category
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        const category = await prisma.category.findUnique({ where: { id } });
        if (!category) {
            return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
        }

        await prisma.category.delete({ where: { id } });

        return NextResponse.json({ message: "ลบหมวดหมู่สำเร็จ" });
    } catch (error) {
        console.error("Categories DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
