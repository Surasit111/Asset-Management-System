import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: parse imageUrl — handle both simple array and metadata object
function parsePinData(imageUrl: string | null) {
    const defaultData = {
        images: [] as string[],
        cardAdjustment: undefined as any,
        pinAdjustment: undefined as any,
    };
    if (!imageUrl) return defaultData;

    try {
        if (imageUrl.startsWith("{")) {
            const data = JSON.parse(imageUrl);
            return {
                images: data.images || [],
                cardAdjustment: data.cardAdjustment || data.card || undefined,
                pinAdjustment: data.pinAdjustment || data.pin || undefined,
            };
        }
        if (imageUrl.startsWith("[")) {
            return { ...defaultData, images: JSON.parse(imageUrl) };
        }
    } catch (e) {
        console.error("Parse error:", e);
    }
    return { ...defaultData, images: [imageUrl] };
}

// GET all map pins
export async function GET(request: NextRequest) {
    try {
        const pins = await prisma.mapPin.findMany({
            orderBy: { name: "asc" },
        });

        const result = pins.map((p) => {
            const data = parsePinData(p.imageUrl);
            return {
                ...p,
                images: data.images,
                cardAdjustment: data.cardAdjustment,
                pinAdjustment: data.pinAdjustment,
                pinImageUrl:  p.pinImageUrl  ?? null,
                cardImageUrl: p.cardImageUrl ?? null,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("MapPins GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch map pins" },
            { status: 500 }
        );
    }
}

// POST create new map pin
export async function POST(request: NextRequest) {
    try {
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

        if (!name || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: "กรุณากรอกชื่อและพิกัดเลทติจูด/ลองจิจูด" },
                { status: 400 }
            );
        }

        const existing = await prisma.mapPin.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json(
                { error: "ชื่อสถานที่นี้มีอยู่แล้ว" },
                { status: 400 }
            );
        }

        const imageArray = Array.isArray(images) ? images : [];
        const imageUrlValue = JSON.stringify({
            images: imageArray,
            cardAdjustment,
            pinAdjustment,
        });

        const pin = await prisma.mapPin.create({
            data: {
                name,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                description,
                imageUrl: imageUrlValue,
                pinImageUrl:  pinImageUrl  ?? null,
                cardImageUrl: cardImageUrl ?? null,
                type: type || "building",
            },
        });

        return NextResponse.json(
            {
                ...pin,
                images: imageArray,
                cardAdjustment,
                pinAdjustment,
                pinImageUrl:  pin.pinImageUrl  ?? null,
                cardImageUrl: pin.cardImageUrl ?? null,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("MapPins POST error:", error);
        return NextResponse.json(
            { error: "Failed to create map pin" },
            { status: 500 }
        );
    }
}