import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFileFromUrl, deleteFilesFromUrls } from "@/lib/file-system";

// GET single asset
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const asset = await prisma.asset.findUnique({
            where: { id },
            include: { images: true },
        });

        if (!asset) {
            return NextResponse.json({ error: "ไม่พบครุภัณฑ์" }, { status: 404 });
        }

        return NextResponse.json(asset);
    } catch (error) {
        console.error("Asset GET error:", error);
        return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
    }
}

// PUT update asset
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.asset.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "ไม่พบครุภัณฑ์" }, { status: 404 });
        }

        // Check if assetCode changed and if it's duplicate
        if (body.assetCode && body.assetCode !== existing.assetCode) {
            const codeExists = await prisma.asset.findFirst({
                where: { assetCode: body.assetCode, NOT: { id } },
            });
            if (codeExists) {
                return NextResponse.json(
                    { error: "รหัสครุภัณฑ์นี้มีอยู่แล้ว" },
                    { status: 400 }
                );
            }
        }

        const {
            imageUrls,
            ...data
        } = body;

        // Parse numeric and date fields
        if (data.receivedDate) data.receivedDate = new Date(data.receivedDate);
        if (data.createdBy === "") data.createdBy = null;
        
        if (data.quantity !== undefined && data.quantity !== null && data.quantity !== "") {
            data.quantity = parseInt(data.quantity);
        } else if (data.quantity === "") {
            data.quantity = null;
        }

        if (data.unitPrice !== undefined && data.unitPrice !== null && data.unitPrice !== "") {
            data.unitPrice = parseFloat(data.unitPrice);
        } else if (data.unitPrice === "") {
            data.unitPrice = null;
        }

        if (data.latitude !== undefined && data.latitude !== null && data.latitude !== "") {
            data.latitude = parseFloat(data.latitude);
        } else if (data.latitude === "") {
            data.latitude = null;
        }

        if (data.longitude !== undefined && data.longitude !== null && data.longitude !== "") {
            data.longitude = parseFloat(data.longitude);
        } else if (data.longitude === "") {
            data.longitude = null;
        }

        if (data.mapPinId === "") {
            data.mapPinId = null;
        }

        // Handle images update
        if (imageUrls !== undefined) {
            // Get current images to find which ones to delete from disk
            const currentImages = await prisma.assetImage.findMany({
                where: { assetId: id }
            });
            const currentUrls = currentImages.map(img => img.url);
            
            // Find URLs that are in DB but NOT in the new list (these were removed by user)
            const urlsToDelete = currentUrls.filter(url => !imageUrls.includes(url));
            
            // Delete removed files from disk
            if (urlsToDelete.length > 0) {
                await deleteFilesFromUrls(urlsToDelete);
            }

            // Update DB: Delete old and add new
            await prisma.assetImage.deleteMany({ where: { assetId: id } });
            if (imageUrls.length > 0) {
                await prisma.assetImage.createMany({
                    data: imageUrls.map((url: string) => ({ url, assetId: id })),
                });
            }
        }

        const asset = await prisma.asset.update({
            where: { id },
            data,
            include: { images: true },
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error("Asset PUT error:", error);
        return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
    }
}

// DELETE asset
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Find asset with images first
        const existing = await prisma.asset.findUnique({ 
            where: { id },
            include: { images: true }
        });

        if (!existing) {
            return NextResponse.json({ error: "ไม่พบครุภัณฑ์" }, { status: 404 });
        }

        // 1. Delete image files from disk
        const urls = existing.images.map(img => img.url);
        if (urls.length > 0) {
            await deleteFilesFromUrls(urls);
        }

        // 2. Delete from DB (Images will be cascade deleted)
        await prisma.asset.delete({ where: { id } });

        return NextResponse.json({ message: "ลบครุภัณฑ์สำเร็จ" });
    } catch (error) {
        console.error("Asset DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
    }
}
