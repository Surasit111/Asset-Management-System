import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const { label } = await request.json();
        if (!label?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อประเภท" }, { status: 400 });

        const type = await prisma.categoryType.update({
            where: { typeKey: id },
            data: { label: label.trim() },
        });
        return NextResponse.json(type);
    } catch (error) {
        console.error("CategoryType PATCH error:", error);
        return NextResponse.json({ error: "Failed to update category type" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        await prisma.categoryType.delete({
            where: { typeKey: id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("CategoryType DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete category type" }, { status: 500 });
    }
}
