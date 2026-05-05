import { cookies, headers } from "next/headers";
import ClientLayout from "./client-layout";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Read the collapsed state from the cookie
    const cookieStore = await cookies();
    const collapsedCookie = cookieStore.get("sidebar-collapsed");
    
    // Default to true (collapsed) if no cookie is set, or use the cookie's value
    const defaultCollapsed = collapsedCookie ? collapsedCookie.value === "true" : true;

    // Fetch session on the server to prevent FOUC for authenticated UI parts
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    return (
        <ClientLayout defaultCollapsed={defaultCollapsed} initialSession={session}>
            {children}
        </ClientLayout>
    );
}
