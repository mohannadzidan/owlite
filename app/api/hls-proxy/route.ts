import { type NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface ProxyPayload {
  u: string;
  r: string;
}

function decode(p: string): ProxyPayload | null {
  try {
    return JSON.parse(Buffer.from(p, "base64url").toString("utf-8")) as ProxyPayload;
  } catch {
    return null;
  }
}

function encode(u: string, r: string): string {
  return Buffer.from(JSON.stringify({ u, r })).toString("base64url");
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams.get("p");
  if (!p) return new NextResponse("Missing p", { status: 400 });

  const data = decode(p);
  if (!data?.u) return new NextResponse("Bad request", { status: 400 });

  const { u: manifestUrl, r: referer } = data;

  let upstream: Response;
  try {
    upstream = await fetch(manifestUrl, {
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return new NextResponse("Proxy fetch failed", { status: 502 });
  }

  if (!upstream.ok) return new NextResponse("CDN error", { status: upstream.status });

  const body = await upstream.text();
  const rewritten = body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      let abs: string;
      try {
        abs = new URL(t, manifestUrl).href;
      } catch {
        abs = t;
      }
      const enc = encode(abs, referer);
      return abs.includes(".m3u8") ? `/api/hls-proxy?p=${enc}` : `/api/hls-segment?p=${enc}`;
    })
    .join("\n");

  return new NextResponse(rewritten, {
    headers: {
      "Content-Type": "application/x-mpegURL",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
