import fs from "fs";
import path from "path";

/**
 * ลบไฟล์รูปภาพออกจากโฟลเดอร์ public/uploads
 * @param url URL ของรูปภาพ (เช่น /uploads/filename.png)
 */
export async function deleteFileFromUrl(url: string | null | undefined) {
    if (!url) return;

    try {
        // ดึงชื่อไฟล์จาก URL (สมมติ URL คือ /uploads/filename.jpg)
        const filename = url.replace("/uploads/", "");
        if (!filename || filename === url) return;

        // กำหนด Path เต็มของไฟล์
        const filePath = path.join(process.cwd(), "public", "uploads", filename);

        // ตรวจสอบว่าไฟล์มีอยู่จริงก่อนลบ
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✓ Deleted file: ${filename}`);
        }
    } catch (error) {
        console.error(`✗ Error deleting file: ${url}`, error);
    }
}

/**
 * ลบไฟล์รูปภาพหลายไฟล์พร้อมกัน
 * @param urls รายการ URL ของรูปภาพ
 */
export async function deleteFilesFromUrls(urls: string[]) {
    if (!urls || urls.length === 0) return;
    
    await Promise.all(urls.map(url => deleteFileFromUrl(url)));
}
