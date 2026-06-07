import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { srtToVtt } from "@/lib/srt-to-vtt";
import { parseSubtitleFilename, parseSubtitleFilenameAsTv } from "@/lib/filename-parser";
import { db } from "@/db";
import { subtitles } from "@/db/schema";

const CACHE_DIR = path.join(process.cwd(), "cache", "subtitles");

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatches(parsedTitle: string, expected: string) {
  return (
    normalize(parsedTitle).includes(normalize(expected)) ||
    normalize(expected).includes(normalize(parsedTitle))
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    tmdbId: number;
    type: "movie" | "tv";
    language: string;
    title: string;
    year?: number;
    files: Array<{ filename: string; content: string }>;
  };

  const { tmdbId, type, language, title, year, files } = body;

  if (!tmdbId || !language || !title || !files?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const batchId = files.length > 1 ? crypto.randomUUID() : null;

  const errors: Array<{ filename: string; reason: string }> = [];

  for (const { filename } of files) {
    const parsed =
      type === "tv" ? parseSubtitleFilenameAsTv(filename) : parseSubtitleFilename(filename);

    if (!titleMatches(parsed.title, title)) {
      errors.push({
        filename,
        reason: `Title mismatch: parsed "${parsed.title}", expected "${title}"`,
      });
      continue;
    }

    if (type === "movie" && year && parsed.year) {
      if (Number(parsed.year) !== year) {
        errors.push({
          filename,
          reason: `Year mismatch: parsed "${parsed.year}", expected "${year}"`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const ids: number[] = [];

  for (const { filename, content } of files) {
    const parsed =
      type === "tv" ? parseSubtitleFilenameAsTv(filename) : parseSubtitleFilename(filename);

    const baseName = path.basename(filename, path.extname(filename));
    const cacheFileName = `${baseName}.vtt`;
    const filePath = path.join(CACHE_DIR, cacheFileName);

    if (!filePath.startsWith(CACHE_DIR)) continue;

    const vttContent = content.trimStart().startsWith("WEBVTT") ? content : srtToVtt(content);
    fs.writeFileSync(filePath, vttContent, "utf-8");

    const season =
      "seasons" in parsed && Array.isArray(parsed.seasons) ? (parsed.seasons[0] ?? null) : null;
    const episode =
      "episodeNumbers" in parsed && Array.isArray(parsed.episodeNumbers)
        ? (parsed.episodeNumbers[0] ?? null)
        : null;

    const [row] = await db
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
        batchId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: subtitles.id });

    if (row) ids.push(row.id);
  }

  return NextResponse.json({ ids });
}
