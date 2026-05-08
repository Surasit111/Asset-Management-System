import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const w = parseInt(searchParams.get("w") || "0");
    const h = parseInt(searchParams.get("h") || "0");

    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        let fetchUrl = url;
        if (url.startsWith("/")) {
            const origin = request.nextUrl.origin;
            fetchUrl = `${origin}${url}`;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);

        const buffer = Buffer.from(await response.arrayBuffer());

        // If resize params provided → resize + convert to WebP for max savings
        if (w > 0 || h > 0) {
            const resized = await sharp(buffer)
                .resize({
                    width: w > 0 ? w : undefined,
                    height: h > 0 ? h : undefined,
                    fit: "cover",
                    withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toBuffer();

            return new NextResponse(resized, {
                headers: {
                    "Content-Type": "image/webp",
                    "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }

        // No resize → pass through as-is with 7-day cache
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
                "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("Proxy image error:", error);
        return new NextResponse("Error fetching image", { status: 500 });
    }
}
