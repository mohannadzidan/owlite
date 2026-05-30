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

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams.get("p");
  if (!p) return new NextResponse("Missing p", { status: 400 });

  const data = decode(p);
  if (!data?.u) return new NextResponse("Bad request", { status: 400 });

  const { u: segmentUrl, r: referer } = data;
  const rangeHeader = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(segmentUrl, {
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return new NextResponse("Proxy fetch failed", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("CDN error", { status: upstream.status });
  }

  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!upstream.headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("Access-Control-Allow-Origin", "*");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
