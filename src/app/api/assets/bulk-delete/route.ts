import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFilesFromUrls } from "@/lib/file-system";

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "กรุณาระบุรายการที่ต้องการลบ" },
                { status: 400 }
            );
        }

        // 1. Find all images associated with these assets
        const assetsWithImages = await prisma.asset.findMany({
            where: { id: { in: ids } },
            include: { images: true }
        });

        // 2. Collect all image URLs
        const allUrls: string[] = [];
        assetsWithImages.forEach(asset => {
            asset.images.forEach(img => {
                if (img.url) allUrls.push(img.url);
            });
        });

        // 3. Delete files from disk
        if (allUrls.length > 0) {
            await deleteFilesFromUrls(allUrls);
        }

        // 4. Delete assets from DB (Images will be cascade deleted)
        const result = await prisma.asset.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        return NextResponse.json({
            message: `ลบครุภัณฑ์สำเร็จจำนวน ${result.count} รายการ`,
            count: result.count,
        });
    } catch (error) {
        console.error("Bulk Delete error:", error);
        return NextResponse.json(
            { error: "ไม่สามารถลบคครุภัณฑ์บางรายการได้" },
            { status: 500 }
        );
    }
}
