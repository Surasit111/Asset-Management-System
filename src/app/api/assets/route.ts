import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all assets with filtering & pagination
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = searchParams.get("search") || "";
        const assetType = searchParams.get("assetType") || "";
        const status = searchParams.get("status") || "";
        const location = searchParams.get("location") || "";
        const fiscalYear = searchParams.get("fiscalYear") || "";
        const startMonth = searchParams.get("startMonth") || "";
        const endMonth = searchParams.get("endMonth") || "";
        const startDate = searchParams.get("startDate") || "";
        const endDate = searchParams.get("endDate") || "";
        const acquisitionMethod = searchParams.get("acquisitionMethod") || "";
        const moneyType = searchParams.get("moneyType") || "";
        const mapPinId = searchParams.get("mapPinId") || "";
        const department = searchParams.get("department") || "";
        const qualityFilter = searchParams.get("qualityFilter") || "";
        const sortBy = searchParams.get("sortBy") || "createdAt";
        const sortOrder = searchParams.get("sortOrder") || "desc";

        const andConditions: any[] = [];

        // 1. Search
        if (search) {
            andConditions.push({
                OR: [
                    { assetCode: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                ]
            });
        }

        // 2. Quality Filters
        if (qualityFilter === "incomplete") {
            andConditions.push({
                OR: [
                    { name: { equals: "" } },
                    { assetCode: { equals: "" } },
                    { status: null },
                    { status: { equals: "" } },
                    { receivedDate: null },
                    { quantity: { lte: 0 } },
                    { department: null },
                    { department: { equals: "" } },
                    { fiscalYear: null },
                    { fiscalYear: { equals: "" } },
                    { unit: null },
                    { unit: { equals: "" } },
                    { unitPrice: null },
                    { moneyType: null },
                    { moneyType: { equals: "" } },
                    { acquisitionMethod: null },
                    { acquisitionMethod: { equals: "" } },
                    { location: null },
                    { location: { equals: "" } },
                    { receivedBy: null },
                    { receivedBy: { equals: "" } },
                    { createdBy: null },
                    { createdBy: { equals: "" } },
                    { remark: null },
                    { remark: { equals: "" } },
                ]
            });
        } else if (qualityFilter === "noImage") {
            andConditions.push({
                AND: [
                    { OR: [{ imageUrl: null }, { imageUrl: { equals: "" } }] },
                    { images: { none: {} } }
                ]
            });
        } else if (qualityFilter === "noCoords") {
            andConditions.push({
                OR: [
                    { latitude: null },
                    { longitude: null },
                    { latitude: { equals: 0 } },
                    { longitude: { equals: 0 } },
                ]
            });
        }

        // 3. Category Filters
        if (assetType) andConditions.push({ assetType });
        if (status) andConditions.push({ status });
        if (location) andConditions.push({ location });
        if (fiscalYear) andConditions.push({ fiscalYear });
        if (acquisitionMethod) andConditions.push({ acquisitionMethod });
        if (moneyType) andConditions.push({ moneyType });
        if (mapPinId) andConditions.push({ mapPinId });
        if (department) andConditions.push({ department });

        // 4. Date range filter
        if (startDate || endDate || startMonth || endMonth) {
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(startDate);
            } else if (startMonth) {
                const [y, m] = startMonth.split("-").map(Number);
                dateFilter.gte = new Date(y, m - 1, 1);
            }

            if (endDate) {
                const d = new Date(endDate);
                d.setHours(23, 59, 59, 999);
                dateFilter.lte = d;
            } else if (endMonth) {
                const [y, m] = endMonth.split("-").map(Number);
                dateFilter.lte = new Date(y, m, 0, 23, 59, 59);
            }
            andConditions.push({ receivedDate: dateFilter });
        }

        const where = andConditions.length > 0 ? { AND: andConditions } : {};

        const validSortFields = [
            "createdAt", "receivedDate", "assetCode", "name",
            "status", "assetType", "fiscalYear", "acquisitionMethod",
            "quantity", "unitPrice", "moneyType", "location"
        ];
        const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
        const finalSortOrder = sortOrder === "asc" ? "asc" : "desc";

        const [assets, total, allFiltered] = await Promise.all([
            prisma.asset.findMany({
                where: where,
                include: { images: true },
                orderBy: { [finalSortBy]: finalSortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.asset.count({ where: where }),
            prisma.asset.findMany({
                where: where,
                select: { quantity: true, unitPrice: true }
            }),
        ]);

        const totalValue = allFiltered.reduce((sum, a) => sum + ((a.quantity || 0) * (a.unitPrice || 0)), 0);

        return NextResponse.json({
            assets,
            total,
            totalValue,
            page,
            totalPages: Math.ceil(total / limit),
            sortBy: finalSortBy,
            sortOrder: finalSortOrder,
        });
    } catch (error) {
        console.error("Assets GET error:", error);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
}

// POST create new asset
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            assetType,
            assetCode,
            name,
            status,
            receivedDate,
            fiscalYear,
            acquisitionMethod,
            quantity,
            unit,
            unitPrice,
            department,
            moneyType,
            receivedBy,
            createdBy,
            remark,
            location,
            latitude,
            longitude,
            locationDetail,
            imageUrl,
            imageUrls,
            mapPinId,
        } = body;

        if (!assetCode || !name) {
            return NextResponse.json(
                { error: "กรุณากรอกรหัสครุภัณฑ์และชื่อ" },
                { status: 400 }
            );
        }

        const existing = await prisma.asset.findUnique({
            where: { assetCode },
        });

        if (existing) {
            return NextResponse.json(
                { error: "รหัสครุภัณฑ์นี้มีอยู่แล้ว" },
                { status: 400 }
            );
        }

        const asset = await prisma.asset.create({
            data: {
                assetType: assetType || "general",
                assetCode,
                name,
                status: status || null,
                receivedDate: receivedDate ? new Date(receivedDate) : null,
                fiscalYear: fiscalYear || null,
                acquisitionMethod: acquisitionMethod || null,
                quantity: quantity ? parseInt(quantity) : 1,
                unit: unit || null,
                unitPrice: unitPrice ? parseFloat(unitPrice) : null,
                moneyType: moneyType || null,
                department: department || null,
                receivedBy: receivedBy || null,
                createdBy: createdBy || null,
                remark: remark || null,
                location: location || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                locationDetail: locationDetail || null,
                imageUrl: imageUrl || null,
                mapPinId: mapPinId || null,
                images: imageUrls?.length
                    ? {
                        create: imageUrls.map((url: string) => ({ url })),
                    }
                    : undefined,
            },
            include: { images: true },
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error("Assets POST error:", error);
        return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
    }
}
