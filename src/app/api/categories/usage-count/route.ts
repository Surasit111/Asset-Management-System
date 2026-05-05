import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // 1. Fetch all categories to get their IDs, names, and types
        const categories = await prisma.category.findMany({
            select: {
                id: true,
                name: true,
                type: true,
            },
        });

        // 2. Mapping of Category Type -> Asset Field
        const typeToField: Record<string, string> = {
            status: "status",
            acquisition: "acquisitionMethod",
            acquisition_method: "acquisitionMethod",
            moneyType: "moneyType",
            money_type: "moneyType",
            department: "department",
            unit: "unit",
            location: "location",
            recipient: "receivedBy",
            receiver: "receivedBy",
            recorder: "createdBy",
        };

        // 3. Prepare to count usage
        // We'll fetch all unique values for relevant fields in Asset table
        const fieldsToQuery = Array.from(new Set(Object.values(typeToField))) as (keyof typeof prisma.asset)[];

        // Fetch counts for each field
        // Since we need to match by name, we can use groupBy for each field
        const usageData: Record<string, number> = {};

        // Initialize usage count for all categories to 0
        categories.forEach(cat => {
            usageData[cat.id] = 0;
        });

        // Group counts for each relevant field in Asset table
        for (const field of fieldsToQuery) {
            // Prisma doesn't easily allow dynamic field names in groupBy with types, 
            // but we can use raw query or just loop through the categories of that type.
            // A more efficient way is to get the counts for all unique values in that field.

            const counts = await (prisma.asset as any).groupBy({
                by: [field],
                _count: {
                    [field]: true,
                },
            });

            // Map the counts back to categories
            // Find categories that match this field's type
            const relevantTypes = Object.entries(typeToField)
                .filter(([_, f]) => f === field)
                .map(([t]) => t);

            const relevantCategories = categories.filter(c => relevantTypes.includes(c.type));

            for (const countItem of counts) {
                const val = countItem[field];
                if (!val) continue;

                const countValue = countItem._count[field];

                // Check which categories match this value
                relevantCategories.forEach(cat => {
                    if (cat.name === val) {
                        usageData[cat.id] += countValue;
                    }
                });
            }
        }

        return NextResponse.json(usageData);
    } catch (error) {
        console.error("Usage count GET error:", error);
        return NextResponse.json({ error: "Failed to fetch usage counts" }, { status: 500 });
    }
}
