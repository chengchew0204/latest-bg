import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

export async function GET() {
  try {
    // Get current background info from KV
    const bgInfo = await kv.hgetall("bg:current");
    
    if (!bgInfo || !bgInfo.url) {
      return new NextResponse("No background image found", { status: 404 });
    }

    // Redirect to the current background image URL
    return NextResponse.redirect(bgInfo.url as string);
  } catch (error) {
    console.error("Error fetching background:", error);
    return new NextResponse("Error fetching background", { status: 500 });
  }
}
