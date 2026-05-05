
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PATCH: Update specific user
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const { name, email, role, phoneNumber, status, password } = body;

        // Fetch target user and first admin
        const [targetUser, firstAdmin] = await Promise.all([
            prisma.user.findUnique({ where: { id } }),
            prisma.user.findFirst({
                where: { role: "admin" },
                orderBy: { createdAt: "asc" },
                select: { id: true }
            })
        ]);

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // --- Protection Rules ---

        // 1. First Admin Protection: Only the First Admin can edit themselves. Others cannot edit First Admin.
        if (firstAdmin && id === firstAdmin.id && session.user.id !== firstAdmin.id) {
            return NextResponse.json({ error: "Cannot modify the Super-Admin account" }, { status: 403 });
        }

        // 2. Self-Role/Status Protection: Cannot change own role or status
        if (id === session.user.id) {
            if (role && role !== targetUser.role) {
                return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
            }
            if (status && status !== targetUser.status) {
                return NextResponse.json({ error: "Cannot change your own status" }, { status: 403 });
            }
        }

        // 3. Peer Protection: Secondary admins cannot change role/status of other admins
        //    First Admin is exempt from this rule — they can edit anyone
        const requesterIsFirstAdmin = firstAdmin && session.user.id === firstAdmin.id;
        if (!requesterIsFirstAdmin && id !== session.user.id && targetUser.role === "admin") {
            if (role && role !== targetUser.role) {
                return NextResponse.json({ error: "Cannot change role of another administrator" }, { status: 403 });
            }
            if (status && status !== targetUser.status) {
                return NextResponse.json({ error: "Cannot change status of another administrator" }, { status: 403 });
            }
        }

        // 4. Role Escalation Protection: Only Super-Admin can promote someone to Admin
        if (role === "admin" && targetUser.role !== "admin" && !requesterIsFirstAdmin) {
            return NextResponse.json({ error: "Only Super-Admin can promote a user to administrator" }, { status: 403 });
        }

        const updateData: any = {
            name: name || undefined,
            email: email || undefined,
            role: role || undefined,
            phoneNumber: phoneNumber || undefined,
            status: status || undefined,
        };

        // Update basic info via Prisma
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // If password is provided, update it via better-auth admin API
        if (password && password.trim() !== "") {
            await (auth.api as any).setUserPassword({
                body: {
                    userId: id,
                    newPassword: password,
                },
                headers: await headers()
            });
        }

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

// DELETE: Delete specific user
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;

        // Fetch target user and first admin
        const [targetUser, firstAdmin] = await Promise.all([
            prisma.user.findUnique({ where: { id } }),
            prisma.user.findFirst({
                where: { role: "admin" },
                orderBy: { createdAt: "asc" },
                select: { id: true }
            })
        ]);

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // --- Deletion Rules ---

        // 1. Self-Deletion: Prevent deleting self
        if (id === session.user.id) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        // 2. Super-Admin Deletion: Prevent deleting the First Admin
        if (firstAdmin && id === firstAdmin.id) {
            return NextResponse.json({ error: "Cannot delete the Super-Admin account" }, { status: 403 });
        }

        // 3. Admin Deletion: Secondary admins cannot delete other administrators.
        //    Super-Admin (First Admin) is allowed to delete secondary admins.
        const requesterIsFirstAdmin = firstAdmin && session.user.id === firstAdmin.id;
        if (targetUser.role === "admin" && !requesterIsFirstAdmin) {
            return NextResponse.json({ error: "Cannot delete other administrator accounts" }, { status: 403 });
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
