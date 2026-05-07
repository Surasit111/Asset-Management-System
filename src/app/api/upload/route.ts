import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

export const maxDuration = 60;

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "ไม่มีไฟล์" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: `รูปแบบไฟล์ไม่รองรับ (${file.type}) รองรับ: jpg, png, webp, gif` },
                { status: 400 }
            );
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "ไฟล์ขนาดเกิน 10MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = file.name.split(".").pop() || "png";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // ── Supabase Storage ───────────────────────────────────────────────
        if (STORAGE_PROVIDER === "supabase") {
            const { supabase, STORAGE_BUCKET } = await import("@/lib/supabase");

            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filename, buffer, { contentType: file.type, upsert: false });

            if (uploadError) {
                console.error("Supabase upload error:", uploadError);
                return NextResponse.json({ error: "อัปโหลดไฟล์ไม่สำเร็จ" }, { status: 500 });
            }

            const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
            return NextResponse.json({ url: data.publicUrl }, { status: 201 });
        }

        // ── Local Storage (default) ────────────────────────────────────────
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const filepath = path.join(uploadsDir, filename);
        await writeFile(filepath, buffer);

        return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }
}
