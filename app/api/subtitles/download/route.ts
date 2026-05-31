import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

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

  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const dlRes = await fetch("https://api.opensubtitles.com/api/v1/download", {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "owlite v0.0.1",
    },
    body: JSON.stringify({ file_id: Number(fileId) }),
  });

  if (dlRes.status === 429) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Subtitle download limit reached for today. Try again tomorrow.",
      },
      { status: 429 },
    );
  }

  if (!dlRes.ok) {
    return NextResponse.json({ error: "download_failed" }, { status: 502 });
  }

  const dlData = (await dlRes.json()) as { link?: string; file_name?: string };
  if (!dlData.link) {
    return NextResponse.json({ error: "no_download_link" }, { status: 502 });
  }

  const subRes = await fetch(dlData.link);
  if (!subRes.ok) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
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
