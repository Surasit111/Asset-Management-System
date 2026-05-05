import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "all";
        const fiscalYear = searchParams.get("fiscalYear") || "";
        const startMonth = searchParams.get("startMonth") || "";
        const endMonth = searchParams.get("endMonth") || "";
        const status = searchParams.get("status") || "";
        const acquisitionMethod = searchParams.get("acquisitionMethod") || "";
        const moneyType = searchParams.get("moneyType") || "";
        const department = searchParams.get("department") || "";

        const where: any = {};
        if (type === "general") {
            where.assetType = "general";
        } else if (type === "durable") {
            where.assetType = "durable";
        }

        if (fiscalYear) where.fiscalYear = fiscalYear;
        if (status) where.status = status;
        if (acquisitionMethod) where.acquisitionMethod = acquisitionMethod;
        if (moneyType) where.moneyType = moneyType;
        if (department) where.department = department;

        // Date range filter using receivedDate
        if (startMonth) {
            const [y, m] = startMonth.split("-").map(Number);
            where.receivedDate = { ...where.receivedDate, gte: new Date(y, m - 1, 1) };
        }
        if (endMonth) {
            const [y, m] = endMonth.split("-").map(Number);
            where.receivedDate = { ...where.receivedDate, lte: new Date(y, m, 0, 23, 59, 59) };
        }

        const [
            totalAssets,
            statusCounts,
            acquisitionCounts,
            moneyTypeCounts,
            recentAssets,
            pinnedAssets,
            assetSum
        ] = await Promise.all([
            prisma.asset.count({ where }),
            prisma.asset.groupBy({
                by: ["status"],
                _count: { status: true },
                where: { ...where, status: { not: null } },
            }),
            prisma.asset.groupBy({
                by: ["acquisitionMethod"],
                _count: { acquisitionMethod: true },
                where: { ...where, acquisitionMethod: { not: null } },
            }),
            prisma.asset.groupBy({
                by: ["moneyType"],
                _count: { moneyType: true },
                where: { ...where, moneyType: { not: null } },
            }),
            prisma.asset.findMany({
                take: 10,
                where,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    assetCode: true,
                    name: true,
                    status: true,
                    createdAt: true,
                    receivedDate: true,
                    quantity: true,
                    unit: true,
                    unitPrice: true,
                    assetType: true,
                    fiscalYear: true,
                    acquisitionMethod: true,
                    moneyType: true,
                    location: true,
                },
            }),
            prisma.asset.findMany({
                take: 50,
                where: {
                    ...where,
                    AND: [{ latitude: { not: null } }, { longitude: { not: null } }],
                },
                select: {
                    id: true,
                    assetCode: true,
                    name: true,
                    status: true,
                    location: true,
                    latitude: true,
                    longitude: true,
                    mapPinId: true,
                    assetType: true,
                    images: true,
                    imageUrl: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.asset.findMany({
                where,
                select: {
                    quantity: true,
                    unitPrice: true
                }
            })
        ]);

        const totalValue = (assetSum as any[]).reduce((sum, asset) => {
            return sum + ((asset.quantity || 0) * (asset.unitPrice || 0));
        }, 0);

        return NextResponse.json({
            totalAssets,
            totalValue: totalValue,
            statusCounts: statusCounts.map((s: { status: string | null; _count: { status: number } }) => ({
                name: s.status,
                value: s._count.status,
            })),
            acquisitionCounts: acquisitionCounts.map((s: { acquisitionMethod: string | null; _count: { acquisitionMethod: number } }) => ({
                name: s.acquisitionMethod,
                value: s._count.acquisitionMethod,
            })),
            moneyTypeCounts: moneyTypeCounts.map((s: { moneyType: string | null; _count: { moneyType: number } }) => ({
                name: s.moneyType,
                value: s._count.moneyType,
            })),
            recentAssets,
            pinnedAssets: pinnedAssets.map((asset: any) => ({
                ...asset,
                latitude: Number(asset.latitude),
                longitude: Number(asset.longitude)
            })),
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
}
