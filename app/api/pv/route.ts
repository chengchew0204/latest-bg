import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

// very light bot filter
function isBot(ua: string) {
  const p = /bot|crawl|spider|preview|scan|wget|curl|python-requests|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegram/i;
  return p.test(ua);
}

export async function GET(request: Request) {
  // read cookie
  // In Edge runtime, use Web Crypto
  const cookieHeader = (request.headers.get("cookie") ?? "");
  const m = cookieHeader.match(/(?:^|;\s*)v_id=([^;]+)/);
  let vid = m?.[1];
  let needSet = false;
  if (!vid) {
    vid = crypto.randomUUID();
    needSet = true;
  }

  const ua = request.headers.get("user-agent") || "";

  // count
  if (!isBot(ua)) {
    await kv.incr("stats:pv");            // total pageviews
    await kv.pfadd("stats:uv", vid);      // approximate unique visitors
  }

  const [pv, uv] = await Promise.all([
    kv.get<number>("stats:pv").then((n) => n ?? 0),
    kv.pfcount("stats:uv"),
  ]);

  const res = NextResponse.json({ pv, uv });

  if (needSet) {
    // one year
    res.headers.append(
      "Set-Cookie",
      `v_id=${vid}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`
    );
  }

  return res;
}
