
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, image, fullImage } = body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (image !== undefined) data.image = image === "" ? null : image;
        if (fullImage !== undefined) data.fullImage = fullImage === "" ? null : fullImage;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data,
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("User update error:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
