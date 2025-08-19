import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

export async function GET() {
  const data = (await kv.hgetall("bg:current")) as
    | { url?: string; version?: string }
    | null;

  if (!data?.url) {
    return new NextResponse("No background yet", { status: 404 });
  }
  const v = data.version ?? Date.now().toString();
  return NextResponse.redirect(`${data.url}?v=${encodeURIComponent(v)}`, 302);
}
