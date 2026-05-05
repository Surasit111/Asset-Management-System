import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't need auth
    const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    const isApiRoute = pathname.startsWith("/api");
    const isStaticRoute = pathname.startsWith("/_next") || pathname.startsWith("/uploads");

    if (isPublicRoute || isApiRoute || isStaticRoute) {
        return NextResponse.next();
    }

    // Check for Better Auth session cookie (simple cookie check, no Prisma needed)
    const sessionToken =
        request.cookies.get("better-auth.session_token")?.value ||
        request.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
    ],
};
