import { NextResponse } from "next/server";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { kv } from "@vercel/kv";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return new NextResponse("Missing file", { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return new NextResponse("Only images are allowed", { status: 400 });
    }

    // Read and normalize the image
    const input = Buffer.from(await file.arrayBuffer());
    let img = sharp(input, { failOnError: false }).rotate();
    const meta = await img.metadata();

    // For current background: resize and compress
    let currentImg = img.clone();
    const MAX_W = 1920;
    if ((meta.width ?? 0) > MAX_W) {
      currentImg = currentImg.resize({ width: MAX_W, withoutEnlargement: true });
    }

    // Output current as JPEG, strip metadata (no EXIF/GPS)
    const jpeg = await currentImg.jpeg({
      quality: 82,
      progressive: true,
      chromaSubsampling: "4:2:0",
      mozjpeg: true,
    }).toBuffer();

    // For backup: keep original quality, only strip metadata
    const backupBuffer = await img.jpeg({
      quality: 100,        // Maximum quality
      progressive: false,  // Disable progressive for maximum compatibility
      chromaSubsampling: "4:4:4",  // Best chroma subsampling
      mozjpeg: false,      // Use standard JPEG encoder for maximum quality
    }).toBuffer();

    // Generate version number (used as part of filename)
    const version = Date.now();
    const currentPath = `bg/current/${version}.jpg`;

    // Build backup path
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const backupPath = `backups/${yyyy}/${mm}/${dd}/${uuidv4()}.jpg`;

    // Write 1) current background: unique path with long cache (content won't change)
    const current = await put(currentPath, jpeg, {
      access: "public",
      addRandomSuffix: false,        // We use version as filename, no need for random suffix
      contentType: "image/jpeg",
      cacheControlMaxAge: 31536000,  // 1 year, since this URL will never change content
    });

    // Write 2) backup (non-guessable URL, not exposed publicly, maximum quality)
    await put(backupPath, backupBuffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/jpeg",
      cacheControlMaxAge: 31536000,
    });

    // Update KV pointer
    await kv.hset("bg:current", {
      url: current.url,
      version: String(version),
      updatedAt: String(version),
    });

    return NextResponse.json({ ok: true, version });
  } catch (err: unknown) {
    return new NextResponse(err instanceof Error ? err.message : "Upload failed", { status: 500 });
  }
}
