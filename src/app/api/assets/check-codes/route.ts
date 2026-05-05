import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const { codes } = await request.json();

        if (!codes || !Array.isArray(codes)) {
            return NextResponse.json({ error: "Invalid codes" }, { status: 400 });
        }

        const duplicates = await prisma.asset.findMany({
            where: {
                assetCode: { in: codes }
            },
            select: {
                assetCode: true,
                name: true
            }
        });

        return NextResponse.json({
            duplicates: duplicates.map(d => ({
                code: d.assetCode,
                name: d.name
            }))
        });
    } catch (error) {
        console.error("Check codes error:", error);
        return NextResponse.json({ error: "Failed to check codes" }, { status: 500 });
    }
}
