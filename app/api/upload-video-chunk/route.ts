// app/api/upload-video-chunk/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const session = String(form.get("session") || "");
    const idx = String(form.get("idx") || "");
    const mimeType = String(form.get("mimeType") || "video/webm");

    if (!file || !(file instanceof File)) {
      return new NextResponse("missing file", { status: 400 });
    }
    if (!session || !idx) {
      return new NextResponse("missing session/idx", { status: 400 });
    }

    // Optional guard: reject extremely large chunks (increased for 4K support)
    // 4K video at 18 Mbps for 4 seconds = ~9MB, so allow up to 15MB for safety
    if (file.size > 15 * 1024 * 1024) {
      return new NextResponse("chunk too large", { status: 413 });
    }

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");

    const buf = Buffer.from(await file.arrayBuffer());
    
    // Determine file extension and content type based on MIME type
    let fileExtension = "webm";
    let contentType = "video/webm";
    
    // Realistic MIME type detection - only formats MediaRecorder actually produces
    if (mimeType.includes("mp4")) {
      // MP4 only from Safari/iOS MediaRecorder
      fileExtension = "mp4";
      contentType = "video/mp4";
    } else if (mimeType.includes("webm")) {
      // WebM from Chrome/Firefox/Edge MediaRecorder
      fileExtension = "webm";
      contentType = "video/webm";
    } else {
      // Default to WebM since it's the most common MediaRecorder output
      fileExtension = "webm";
      contentType = "video/webm";
    }
    
    console.log(`Processing video chunk: ${mimeType} -> ${fileExtension} (${contentType})`);
    
    const pathname = `backups/videos/${yyyy}/${mm}/${dd}/${session}/${idx}.${fileExtension}`;

    const res = await put(pathname, buf, {
      access: "public",           // Vercel Blob objects are public-by-URL
      addRandomSuffix: false,     // deterministic order by index
      contentType: contentType,
      cacheControlMaxAge: 31536000,
    });

    return NextResponse.json({ ok: true, url: res.url, pathname: res.pathname });
  } catch (e: unknown) {
    return new NextResponse(e instanceof Error ? e.message : "upload failed", { status: 500 });
  }
}
