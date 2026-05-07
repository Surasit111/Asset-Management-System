import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
        const sqlConditions: Prisma.Sql[] = [];

        if (type === "general") {
            where.assetType = "general";
            sqlConditions.push(Prisma.sql`"assetType" = 'general'`);
        } else if (type === "durable") {
            where.assetType = "durable";
            sqlConditions.push(Prisma.sql`"assetType" = 'durable'`);
        }

        if (fiscalYear) {
            where.fiscalYear = fiscalYear;
            sqlConditions.push(Prisma.sql`"fiscalYear" = ${fiscalYear}`);
        }
        if (status) {
            where.status = status;
            sqlConditions.push(Prisma.sql`"status" = ${status}`);
        }
        if (acquisitionMethod) {
            where.acquisitionMethod = acquisitionMethod;
            sqlConditions.push(Prisma.sql`"acquisitionMethod" = ${acquisitionMethod}`);
        }
        if (moneyType) {
            where.moneyType = moneyType;
            sqlConditions.push(Prisma.sql`"moneyType" = ${moneyType}`);
        }
        if (department) {
            where.department = department;
            sqlConditions.push(Prisma.sql`"department" = ${department}`);
        }

        // Date range filter using receivedDate
        if (startMonth) {
            const [y, m] = startMonth.split("-").map(Number);
            const startDate = new Date(y, m - 1, 1);
            where.receivedDate = { ...where.receivedDate, gte: startDate };
            sqlConditions.push(Prisma.sql`"receivedDate" >= ${startDate}`);
        }
        if (endMonth) {
            const [y, m] = endMonth.split("-").map(Number);
            const endDate = new Date(y, m, 0, 23, 59, 59);
            where.receivedDate = { ...where.receivedDate, lte: endDate };
            sqlConditions.push(Prisma.sql`"receivedDate" <= ${endDate}`);
        }

        const whereSql = sqlConditions.length > 0 
            ? Prisma.sql`WHERE ${Prisma.join(sqlConditions, ' AND ')}`
            : Prisma.empty;

        const [
            totalAssets,
            statusCounts,
            acquisitionCounts,
            moneyTypeCounts,
            recentAssets,
            pinCountsRaw,
            totalValueResult
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
            prisma.asset.groupBy({
                by: ["mapPinId"],
                _count: { id: true },
                where: {
                    ...where,
                    AND: [
                        { mapPinId: { not: null } },
                    ],
                },
            }),
            prisma.$queryRaw<Array<{ total: number | null }>>`
                SELECT SUM(COALESCE(quantity, 0) * COALESCE("unitPrice", 0)) as total
                FROM "assets"
                ${whereSql}
            `
        ]);

        const totalValue = totalValueResult?.[0]?.total ? Number(totalValueResult[0].total) : 0;

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
            // Lightweight map: { [mapPinId]: count } — no full asset rows transferred
            pinCounts: Object.fromEntries(
                pinCountsRaw.map((r: { mapPinId: string | null; _count: { id: number } }) => [r.mapPinId!, r._count.id])
            ),
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
}
