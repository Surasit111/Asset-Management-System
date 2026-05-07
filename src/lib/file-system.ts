import fs from "fs";
import path from "path";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

// ── Supabase helpers (lazy) ──────────────────────────────────────────────────

function extractSupabasePath(url: string, bucket: string): string | null {
    const marker = `/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
}

async function deleteFromSupabase(paths: string[]) {
    const { supabase, STORAGE_BUCKET } = await import("./supabase");
    const storagePaths = paths
        .map((url) => extractSupabasePath(url, STORAGE_BUCKET))
        .filter((p): p is string => p !== null);

    if (storagePaths.length === 0) return;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    if (error) {
        console.error(`✗ Error deleting from Supabase:`, error);
    } else {
        console.log(`✓ Deleted ${storagePaths.length} file(s) from Supabase`);
    }
}

// ── Local helpers ────────────────────────────────────────────────────────────

function deleteFromLocal(url: string) {
    try {
        const filename = url.replace("/uploads/", "");
        if (!filename || filename === url) return;
        const filePath = path.join(process.cwd(), "public", "uploads", filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✓ Deleted local file: ${filename}`);
        }
    } catch (error) {
        console.error(`✗ Error deleting local file: ${url}`, error);
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * ลบไฟล์รูปภาพ 1 ไฟล์
 * รองรับทั้ง local storage และ Supabase Storage ขึ้นอยู่กับ STORAGE_PROVIDER
 */
export async function deleteFileFromUrl(url: string | null | undefined) {
    if (!url) return;

    if (STORAGE_PROVIDER === "supabase") {
        await deleteFromSupabase([url]);
    } else {
        deleteFromLocal(url);
    }
}

/**
 * ลบไฟล์รูปภาพหลายไฟล์พร้อมกัน
 * รองรับทั้ง local storage และ Supabase Storage ขึ้นอยู่กับ STORAGE_PROVIDER
 */
export async function deleteFilesFromUrls(urls: string[]) {
    if (!urls || urls.length === 0) return;

    if (STORAGE_PROVIDER === "supabase") {
        await deleteFromSupabase(urls);
    } else {
        urls.forEach(deleteFromLocal);
    }
}
