import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

const CACHE_DIR = path.join(process.cwd(), "cache", "subtitles");

export async function GET(request: NextRequest) {
  const cacheKey = request.nextUrl.searchParams.get("cache_key");
  if (!cacheKey) return new NextResponse("Missing cache_key", { status: 400 });

  const safeKey = path.basename(cacheKey);
  const filePath = path.join(CACHE_DIR, safeKey);

  if (!filePath.startsWith(CACHE_DIR)) return new NextResponse("Forbidden", { status: 403 });
  if (!fs.existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  const content = fs.readFileSync(filePath, "utf-8");
  return new NextResponse(content, {
    headers: { "Content-Type": "text/vtt; charset=utf-8" },
  });
}
