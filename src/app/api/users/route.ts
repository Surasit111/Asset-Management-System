import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET: List users with pagination and filters
export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") || "createdAt";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }

    if (role) where.role = role;
    if (status) where.status = status;

    // [แก้ไข] ลบ any ออก ใช้ type ที่ชัดเจน
    const allowedSortFields = ["id", "name", "email", "role", "status", "createdAt", "phoneNumber"];
    const safeSort = allowedSortFields.includes(sort) ? sort : "createdAt";
    const orderBy: Record<string, string> = { [safeSort]: order };

    try {
        const [users, total, roleCounts, suspendedCount, allCount, firstAdmin] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    fullImage: true,
                    role: true,
                    phoneNumber: true,
                    status: true,
                    lastLogin: true,
                    createdAt: true,
                    createdById: true,
                    createdBy: { select: { id: true, name: true } },
                },
            }),
            prisma.user.count({ where }),
            prisma.user.groupBy({
                by: ["role"],
                _count: { _all: true },
            }),
            prisma.user.count({ where: { status: "suspended" } }),
            prisma.user.count({}),
            prisma.user.findFirst({
                where: { role: "admin" },
                orderBy: { createdAt: "asc" },
                select: { id: true },
            }),
        ]);

        const adminCount = roleCounts.find(r => r.role === "admin")?._count._all || 0;
        const userCount = roleCounts.reduce(
            (acc, r) => (r.role !== "admin" ? acc + r._count._all : acc), 0
        );

        // [ข้อใหม่] แปลง createdBy เป็น string ที่ frontend อ่านได้
        // ถ้ายังไม่มี createdBy ใน schema จะแสดงเป็น "ลงทะเบียนเอง" ทั้งหมด
        const usersWithSource = users.map((u: { createdBy?: { name: string } | null, [key: string]: unknown }) => ({
            ...u,
            createdByName: u.createdBy?.name || null,
        }));

        return NextResponse.json({
            users: usersWithSource,
            total,
            allCount,
            adminCount,
            userCount,
            suspendedCount,
            page,
            totalPages: Math.ceil(total / limit),
            firstAdminId: firstAdmin?.id,
            currentUserId: session.user.id,
        });
    } catch (error) {
        console.error("List users error:", error);
        return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
    }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, password, role, phoneNumber, status } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        // --- Permission Check ---
        // Only Super-Admin (First Admin) can create accounts with "admin" role
        if (role === "admin") {
            const firstAdmin = await prisma.user.findFirst({
                where: { role: "admin" },
                orderBy: { createdAt: "asc" },
                select: { id: true }
            });
            if (firstAdmin && session.user.id !== firstAdmin.id) {
                return NextResponse.json({ error: "Only Super-Admin can create administrator accounts" }, { status: 403 });
            }
        }

        try {
            const newUser = await auth.api.signUpEmail({
                body: { email, password, name }
            });

            if (newUser?.user?.id) {
                await prisma.user.update({
                    where: { id: newUser.user.id },
                    data: {
                        role: role || "user",
                        phoneNumber: phoneNumber || null,
                        status: status || "active",
                        createdById: session.user.id,
                    }
                });
                return NextResponse.json(newUser.user);
            } else {
                throw new Error("Failed to create user");
            }
        } catch (authError: unknown) {
            console.error("Auth creation error:", authError);
            const msg = authError instanceof Error ? authError.message : "Failed to create user";
            return NextResponse.json({ error: msg }, { status: 500 });
        }
    } catch (error) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}