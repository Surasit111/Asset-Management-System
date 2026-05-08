import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    try {
        const asset = await prisma.asset.findUnique({
            where: { id },
        });

        if (!asset) {
            return {
                title: "ไม่พบครุภัณฑ์ | ระบบจัดการครุภัณฑ์",
            };
        }

        return {
            title: `${asset.name} (${asset.assetCode}) | ระบบจัดการครุภัณฑ์`,
            description: `ครุภัณฑ์ ${asset.name} รหัส ${asset.assetCode} หน่วยงาน ${asset.department || "ไม่ระบุ"} สถานะ ${asset.status || "ไม่ระบุ"} สำหรับระบบบันทึกและติดตามครุภัณฑ์`,
        };
    } catch (e) {
        return {
            title: "รายละเอียดครุภัณฑ์ | ระบบจัดการครุภัณฑ์",
        };
    }
}

export default function AssetDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
