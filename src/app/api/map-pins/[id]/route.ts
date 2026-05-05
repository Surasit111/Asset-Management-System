import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT update map pin
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const body = await request.json();
        const {
            name,
            latitude,
            longitude,
            description,
            images,
            type,
            cardAdjustment,
            pinAdjustment,
            pinImageUrl,
            cardImageUrl,
        } = body;

        const imageArray = Array.isArray(images) ? images : [];
        const imageUrlValue = JSON.stringify({
            images: imageArray,
            cardAdjustment,
            pinAdjustment,
        });

        const pin = await prisma.mapPin.update({
            where: { id: params.id },
            data: {
                name,
                latitude:    latitude  !== undefined ? parseFloat(latitude)  : undefined,
                longitude:   longitude !== undefined ? parseFloat(longitude) : undefined,
                description,
                imageUrl: imageUrlValue,
                pinImageUrl:  pinImageUrl  ?? null,
                cardImageUrl: cardImageUrl ?? null,
                type,
            },
        });

        return NextResponse.json({
            ...pin,
            images: imageArray,
            cardAdjustment,
            pinAdjustment,
            pinImageUrl:  pin.pinImageUrl  ?? null,
            cardImageUrl: pin.cardImageUrl ?? null,
        });
    } catch (error) {
        console.error("MapPin PUT error:", error);
        return NextResponse.json(
            { error: "Failed to update map pin" },
            { status: 500 }
        );
    }
}

// DELETE map pin
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        await prisma.mapPin.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Map pin deleted successfully" });
    } catch (error) {
        console.error("MapPin DELETE error:", error);
        return NextResponse.json(
            { error: "Failed to delete map pin" },
            { status: 500 }
        );
    }
}