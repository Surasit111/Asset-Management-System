import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Fetch distinct values for each filter field directly from the Asset table.
        // This ensures that even if a category is deleted from the Category table,
        // if an asset still uses that value, it will appear in the filter dropdown.
        const [
            statusRows,
            methodRows,
            moneyRows,
            deptRows,
            yearRows
        ] = await Promise.all([
            prisma.asset.findMany({ distinct: ["status"], select: { status: true }, where: { status: { not: null } } }),
            prisma.asset.findMany({ distinct: ["acquisitionMethod"], select: { acquisitionMethod: true }, where: { acquisitionMethod: { not: null } } }),
            prisma.asset.findMany({ distinct: ["moneyType"], select: { moneyType: true }, where: { moneyType: { not: null } } }),
            prisma.asset.findMany({ distinct: ["location"], select: { location: true }, where: { location: { not: null } } }),
            prisma.asset.findMany({ distinct: ["fiscalYear"], select: { fiscalYear: true }, where: { fiscalYear: { not: null } } }),
        ]);

        return NextResponse.json({
            status: statusRows.map(r => r.status).filter(Boolean).sort(),
            acquisitionMethod: methodRows.map(r => r.acquisitionMethod).filter(Boolean).sort(),
            moneyType: moneyRows.map(r => r.moneyType).filter(Boolean).sort(),
            department: deptRows.map(r => r.location).filter(Boolean).sort(), // using location as department like existing code
            fiscalYear: yearRows.map(r => r.fiscalYear).filter(Boolean).sort().reverse()
        });

    } catch (error) {
        console.error("Distinct filters error:", error);
        return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
    }
}
