import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(dateStr: any) {
    if (!dateStr) return null;
    try {
        // If it's already a Date object or valid ISO string
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            // Check for Buddhist year (common in Thai Excel)
            if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
            return d;
        }

        // Try manual parse for DD/MM/YYYY
        if (typeof dateStr === "string" && dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
                let day = parseInt(parts[0]);
                let month = parseInt(parts[1]) - 1;
                let year = parseInt(parts[2]);
                if (year > 2400) year -= 543; // Buddhist to Christian
                const d2 = new Date(year, month, day);
                if (!isNaN(d2.getTime())) return d2;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { assets, fileName, department } = body;

        if (!assets || !Array.isArray(assets)) {
            return NextResponse.json({ error: "ข้อมูลครุภัณฑ์ไม่ถูกต้อง" }, { status: 400 });
        }

        const stats = { imported: 0, updated: 0, skipped: 0 };

        for (const item of assets) {
            try {
                if (!item.assetCode || !item.name) {
                    stats.skipped++;
                    continue;
                }

                const existing = await prisma.asset.findUnique({
                    where: { assetCode: item.assetCode },
                });

                const parsedDate = parseDate(item.receivedDate);

                if (existing) {
                    if (item.duplicateAction === "update") {
                        await prisma.asset.update({
                            where: { assetCode: item.assetCode },
                            data: {
                                name: item.name,
                                status: item.status || existing.status,
                                receivedDate: parsedDate || existing.receivedDate,
                                quantity: item.quantity ?? existing.quantity,
                                unitPrice: item.unitPrice ?? existing.unitPrice,
                                moneyType: item.moneyType || existing.moneyType,
                                acquisitionMethod: item.acquisitionMethod || existing.acquisitionMethod,
                                location: item.location || existing.location,
                                department: item.department || existing.department,
                                assetType: item.assetType || existing.assetType,
                                fiscalYear: item.fiscalYear || existing.fiscalYear,
                                unit: item.unit || existing.unit,
                                receivedBy: item.receivedBy || existing.receivedBy,
                                createdBy: item.createdBy || existing.createdBy,
                                remark: item.remark || existing.remark,
                            },
                        });
                        stats.updated++;
                    } else {
                        stats.skipped++;
                    }
                    continue;
                }

                // Create new
                await prisma.asset.create({
                    data: {
                        assetCode: item.assetCode,
                        name: item.name,
                        status: item.status || null,
                        receivedDate: parsedDate,
                        quantity: item.quantity ?? 1,
                        unitPrice: item.unitPrice ?? 0,
                        moneyType: item.moneyType || null,
                        acquisitionMethod: item.acquisitionMethod || null,
                        location: item.location || null,
                        department: item.department || null,
                        assetType: item.assetType || "general",
                        fiscalYear: item.fiscalYear || null,
                        unit: item.unit || null,
                        receivedBy: item.receivedBy || null,
                        createdBy: item.createdBy || null,
                        remark: item.remark || null,
                    },
                });
                stats.imported++;
            } catch (err) {
                console.error(`Import error for ${item.assetCode}:`, err);
                stats.skipped++;
            }
        }

        // Save History (Using try-catch to avoid crashing if prisma hasn't reloaded)
        try {
            await (prisma as any).importHistory.create({
                data: {
                    fileName: fileName || "Untitled",
                    department: department || null,
                    imported: stats.imported,
                    updated: stats.updated,
                    skipped: stats.skipped,
                },
            });
        } catch (e) {
            console.error("Failed to save history:", e);
        }

        return NextResponse.json({
            message: "นำเข้าข้อมูลสำเร็จ",
            ...stats
        });
    } catch (error) {
        console.error("Bulk Import POST error:", error);
        return NextResponse.json({ error: "Failed to process bulk import" }, { status: 500 });
    }
}
