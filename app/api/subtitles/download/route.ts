import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { downloads, HttpError } from "@/services/opensubtitles.service";

const CACHE_DIR = path.join(process.cwd(), "cache", "subtitles");

function srtToVtt(srt: string): string {
  return (
    "WEBVTT\n\n" +
    srt
      .trim()
      .replace(/\r\n|\r/g, "\n")
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
  );
}

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("file_id");
  if (!fileId) return new NextResponse("Missing file_id", { status: 400 });
  if (!/^\d+$/.test(fileId)) return new NextResponse("Invalid file_id", { status: 400 });

  const cacheFile = `${fileId}.vtt`;
  const filePath = path.join(CACHE_DIR, cacheFile);

  if (!filePath.startsWith(CACHE_DIR)) return new NextResponse("Forbidden", { status: 403 });

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/vtt; charset=utf-8" },
    });
  }

  if (!process.env.OPENSUBTITLES_API_KEY) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "OpenSubtitles API key not configured" } },
      { status: 503 },
    );
  }

  let dlData;
  try {
    dlData = await downloads.link(Number(fileId));
  } catch (e) {
    if (e instanceof HttpError && e.status === 429) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Subtitle download limit reached for today. Try again tomorrow.",
          },
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: { code: "upstream_error", message: "Subtitle download failed" } },
      { status: 502 },
    );
  }

  if (!dlData.link) {
    return NextResponse.json(
      { error: { code: "upstream_error", message: "No download link available" } },
      { status: 502 },
    );
  }

  const subRes = await fetch(dlData.link);
  if (!subRes.ok) {
    return NextResponse.json(
      { error: { code: "upstream_error", message: "Failed to fetch subtitle file" } },
      { status: 502 },
    );
  }

  let content = await subRes.text();
  if (!content.trimStart().startsWith("WEBVTT")) {
    content = srtToVtt(content);
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");

  return new NextResponse(content, {
    headers: { "Content-Type": "text/vtt; charset=utf-8" },
  });
}
