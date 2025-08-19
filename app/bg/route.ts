import { kv } from "@vercel/kv";

export const runtime = "edge";

export async function GET() {
  const data = (await kv.hgetall("bg:current")) as { url?: string; version?: string } | null;
  if (!data?.url) return new Response("No background yet", { status: 404 });

  // Use unique URL directly (already contains version semantics), no need to append ?v=
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: data.url,
      // Prevent any level of caching for this 302
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Vercel-CDN-Cache-Control": "max-age=0",
      "CDN-Cache-Control": "max-age=0",
    },
  });
  return res;
}
