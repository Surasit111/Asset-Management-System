import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

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

        const blob = await response.blob();
        return new NextResponse(blob, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("Proxy image error:", error);
        return new NextResponse("Error fetching image", { status: 500 });
    }
}
