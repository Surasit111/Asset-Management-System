import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Increase max body size for Next.js App Router API route
export const maxDuration = 60;


export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type");
        const contentLength = request.headers.get("content-length");
        console.log(`Backend: Received upload request. Content-Type: ${contentType}, Content-Length: ${contentLength}`);

        let formData;
        try {
            formData = await request.formData();
        } catch (parseError: any) {
            console.error("Backend: Failed to parse body as FormData:", parseError);
            // Try to log some info about the body if possible
            try {
                const rawBody = await request.text();
                console.log(`Backend: Raw body preview (first 100 chars): ${rawBody.substring(0, 100)}`);
                console.log(`Backend: Raw body length: ${rawBody.length}`);
            } catch (e) {
                console.log("Backend: Could not read raw body text");
            }
            throw parseError; // Re-throw to be caught by the outer try-catch
        }

        const file = formData.get("file") as File;

        if (!file) {
            console.error("Upload error: No file provided in formData");
            return NextResponse.json({ error: "ไม่มีไฟล์" }, { status: 400 });
        }

        console.log(`Uploading file: ${file.name} (${file.type}, ${file.size} bytes)`);

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            console.error(`Upload error: Unsupported file type ${file.type}`);
            return NextResponse.json(
                { error: `รูปแบบไฟล์ไม่รองรับ (${file.type}) รองรับ: jpg, png, webp, gif` },
                { status: 400 }
            );
        }

        // Max 10MB (Increased from 5MB to be safe)
        if (file.size > 10 * 1024 * 1024) {
            console.error(`Upload error: File too large (${file.size} bytes)`);
            return NextResponse.json(
                { error: "ไฟล์ขนาดเกิน 10MB" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadsDir, { recursive: true });
        } catch (err) {
            console.error("Error creating uploads directory:", err);
            return NextResponse.json({ error: "Could not create uploads directory" }, { status: 500 });
        }

        // Generate unique filename
        const ext = path.extname(file.name) || ".png";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        try {
            await writeFile(filepath, buffer);
            console.log(`File saved successfully to: ${filepath}`);
        } catch (err) {
            console.error("Error writing file to disk:", err);
            return NextResponse.json({ error: "Failed to write file to storage" }, { status: 500 });
        }

        const url = `/uploads/${filename}`;

        return NextResponse.json({ url }, { status: 201 });
    } catch (error: any) {
        console.error("General Upload error:", error);
        return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }
}
