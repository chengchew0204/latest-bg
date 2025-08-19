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

    // Resize if too large
    const MAX_W = 1920;
    if ((meta.width ?? 0) > MAX_W) {
      img = img.resize({ width: MAX_W, withoutEnlargement: true });
    }

    // Output as JPEG, strip metadata (no EXIF/GPS)
    const jpeg = await img.jpeg({
      quality: 82,
      progressive: true,
      chromaSubsampling: "4:2:0",
      mozjpeg: true,
    }).toBuffer();

    // Build paths
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const backupPath = `backups/${yyyy}/${mm}/${dd}/${uuidv4()}.jpg`;
    const currentPath = "bg/current.jpg";

    // Write 1) public current image (fixed path)
    const current = await put(currentPath, jpeg, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false, // keep deterministic path
    });

    // Write 2) private backup
    await put(backupPath, jpeg, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    // Update KV pointer with a version for cache busting
    const version = Date.now();
    await kv.hset("bg:current", {
      path: current.pathname,
      url: current.url,
      version: String(version),
      updatedAt: String(version),
    });

    return NextResponse.json({ ok: true, version });
  } catch (err: any) {
    return new NextResponse(err?.message ?? "Upload failed", { status: 500 });
  }
}
