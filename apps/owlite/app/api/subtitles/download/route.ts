import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { downloads, HttpError } from "@/services/opensubtitles.service";
import { srtToVtt } from "@/lib/srt-to-vtt";
import { parseSubtitleFilename } from "@/lib/filename-parser";
import { db } from "@/db";
import { subtitles } from "@/db/schema";

const CACHE_DIR = path.join(process.cwd(), "cache", "subtitles");

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fileId = params.get("file_id");
  if (!fileId) return new NextResponse("Missing file_id", { status: 400 });
  if (!/^\d+$/.test(fileId)) return new NextResponse("Invalid file_id", { status: 400 });

  const tmdbId = params.get("tmdb_id") ? Number(params.get("tmdb_id")) : null;
  const season = params.get("season") ? Number(params.get("season")) : null;
  const episode = params.get("episode") ? Number(params.get("episode")) : null;
  const language = params.get("language");

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

  if (tmdbId && language) {
    const fileName = dlData.file_name ?? `${fileId}.srt`;
    const parsed = parseSubtitleFilename(fileName);
    try {
      await db
        .insert(subtitles)
        .values({
          tmdbId,
          file: filePath,
          language,
          year: parsed.year ? Number(parsed.year) : null,
          resolution: parsed.resolution ? String(parsed.resolution) : null,
          source: parsed.sources[0] ? String(parsed.sources[0]) : null,
          videoCodec: parsed.videoCodec ? String(parsed.videoCodec) : null,
          group: parsed.group ?? null,
          season,
          episode,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    } catch {
      // Non-fatal — subtitle is still served even if DB insert fails
    }
  }

  return new NextResponse(content, {
    headers: { "Content-Type": "text/vtt; charset=utf-8" },
  });
}
