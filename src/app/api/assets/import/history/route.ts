import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const history = await prisma.importHistory.findMany({
            orderBy: { importedAt: "desc" },
            take: 20,
        });
        return NextResponse.json(history);
    } catch (error) {
        console.error("Fetch Import History error:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
