import fs from "fs";
import path from "path";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db, subtitles } from "../db/index";
import type { SubtitlesUploadRequest, SubtitleTrack } from "@owlite/types";
import { srtToVtt } from "../lib/srt-to-vtt";
import { parseSubtitleFilename, parseSubtitleFilenameAsTv } from "../lib/filename-parser";
import {
  subtitles as openSubtitlesApi,
  downloads as openSubtitlesDownloads,
  HttpError,
} from "./opensubtitles.service";

const CACHE_DIR = path.join(process.cwd(), "cache", "subtitles");

export interface SubtitleFileRow {
  id: number;
  filename: string;
  language: string;
  season: number | null;
  episode: number | null;
  isFavorite: boolean;
  createdAt: string;
}

export type SubtitleEntry =
  | ({ kind: "single" } & SubtitleFileRow)
  | {
      kind: "batch";
      batchId: string;
      files: SubtitleFileRow[];
      language: string;
      createdAt: string;
    };

export interface SubtitleSearchParams {
  imdb_id?: string;
  tmdb_id?: number;
  season?: number;
  episode?: number;
  language?: string;
}

export interface UploadParams {
  fields: Record<string, string>;
  files: Array<{ filename: string; buffer: Buffer }>;
}

export function listSubtitles(
  tmdbId: number,
  season?: number,
  episode?: number,
): { entries: SubtitleEntry[] } {
  const rows = db
    .select()
    .from(subtitles)
    .where(eq(subtitles.tmdbId, tmdbId))
    .orderBy(asc(subtitles.createdAt))
    .all();

  const batchMap = new Map<string, SubtitleFileRow[]>();
  const entries: SubtitleEntry[] = [];

  for (const row of rows) {
    if (season !== undefined && row.season !== season) continue;
    if (episode !== undefined && row.episode !== episode) continue;

    const fileRow: SubtitleFileRow = {
      id: row.id,
      filename: path.basename(row.file),
      language: row.language,
      season: row.season,
      episode: row.episode,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.batchId) {
      const existing = batchMap.get(row.batchId);
      if (existing) {
        existing.push(fileRow);
      } else {
        batchMap.set(row.batchId, [fileRow]);
      }
    } else {
      entries.push({ kind: "single", ...fileRow });
    }
  }

  for (const [batchId, files] of batchMap) {
    entries.push({
      kind: "batch",
      batchId,
      files,
      language: files[0].language,
      createdAt: files[0].createdAt,
    });
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { entries };
}

export function setFavorite(
  body: { id: number; isFavorite: boolean } | { batchId: string; isFavorite: boolean },
): void {
  if ("id" in body) {
    const { id, isFavorite } = body;
    if (isFavorite) {
      const row = db.select().from(subtitles).where(eq(subtitles.id, id)).get();
      if (row) {
        const seasonCond =
          row.season != null ? eq(subtitles.season, row.season) : isNull(subtitles.season);
        const episodeCond =
          row.episode != null ? eq(subtitles.episode, row.episode) : isNull(subtitles.episode);
        db.update(subtitles)
          .set({ isFavorite: false })
          .where(
            and(
              eq(subtitles.tmdbId, row.tmdbId),
              eq(subtitles.language, row.language),
              seasonCond,
              episodeCond,
            ),
          )
          .run();
      }
    }
    db.update(subtitles).set({ isFavorite }).where(eq(subtitles.id, id)).run();
    return;
  }

  const { batchId, isFavorite } = body;
  if (isFavorite) {
    const rows = db.select().from(subtitles).where(eq(subtitles.batchId, batchId)).all();
    for (const row of rows) {
      const seasonCond =
        row.season != null ? eq(subtitles.season, row.season) : isNull(subtitles.season);
      const episodeCond =
        row.episode != null ? eq(subtitles.episode, row.episode) : isNull(subtitles.episode);
      db.update(subtitles)
        .set({ isFavorite: false })
        .where(
          and(
            eq(subtitles.tmdbId, row.tmdbId),
            eq(subtitles.language, row.language),
            seasonCond,
            episodeCond,
          ),
        )
        .run();
      db.update(subtitles).set({ isFavorite: true }).where(eq(subtitles.id, row.id)).run();
    }
  } else {
    db.update(subtitles).set({ isFavorite: false }).where(eq(subtitles.batchId, batchId)).run();
  }
}

export function deleteSubtitle(body: { id?: number; batchId?: string }): { deleted: number } {
  const { id, batchId } = body;

  const rows = id
    ? db.select().from(subtitles).where(eq(subtitles.id, id)).all()
    : db.select().from(subtitles).where(eq(subtitles.batchId, batchId!)).all();

  for (const row of rows) {
    try {
      fs.unlinkSync(row.file);
    } catch {
      // file already gone — continue with DB cleanup
    }
    db.delete(subtitles).where(eq(subtitles.id, row.id)).run();
  }

  return { deleted: rows.length };
}

export async function searchSubtitles(params: SubtitleSearchParams): Promise<{
  tracks: SubtitleTrack[];
}> {
  const { tmdb_id, season, episode } = params;

  const contextParams = new URLSearchParams();
  if (tmdb_id) contextParams.set("tmdb_id", String(tmdb_id));
  if (season != null) contextParams.set("season", String(season));
  if (episode != null) contextParams.set("episode", String(episode));
  if (params.language) contextParams.set("language", params.language);

  const localTracks: SubtitleTrack[] = [];
  if (tmdb_id) {
    const conditions = [eq(subtitles.tmdbId, tmdb_id)];
    if (season != null) {
      conditions.push(eq(subtitles.season, season));
    } else {
      conditions.push(isNull(subtitles.season));
    }
    if (episode != null) {
      conditions.push(eq(subtitles.episode, episode));
    } else {
      conditions.push(isNull(subtitles.episode));
    }

    const rows = db
      .select()
      .from(subtitles)
      .where(and(...conditions))
      .all();

    for (const row of rows) {
      const basename = path.basename(row.file);
      localTracks.push({
        id: `local-${row.id}`,
        language: row.language,
        format: "vtt",
        download_url: `/subtitles/stream?cache_key=${encodeURIComponent(basename)}`,
        release_name: path.basename(row.file, path.extname(row.file)),
        provider: "local",
        isFavorite: row.isFavorite,
      });
    }
  }

  const osTracks: SubtitleTrack[] = [];
  if (process.env.OPENSUBTITLES_API_KEY) {
    try {
      const data = await openSubtitlesApi.search(params);
      if (!("error" in data)) {
        for (const item of data.data ?? []) {
          const fileId = item.attributes.files[0]?.file_id;
          if (!fileId) continue;
          if (fs.existsSync(path.join(CACHE_DIR, `${fileId}.ref`))) continue;
          const lang = item.attributes.language;
          const trackContextParams = new URLSearchParams(contextParams);
          trackContextParams.set("language", lang);
          osTracks.push({
            id: String(fileId),
            language: lang,
            format: item.attributes.format ?? "srt",
            download_url: `/subtitles/download?file_id=${fileId}&${trackContextParams.toString()}`,
            release_name: item.attributes.release,
            provider: "open_subtitles",
          });
        }
      }
    } catch {
      // Graceful degradation — local subtitles still returned
    }
  }

  return { tracks: [...localTracks, ...osTracks] };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 200);
}

export async function downloadSubtitle(
  fileId: number,
  context: {
    tmdbId: number | null;
    season: number | null;
    episode: number | null;
    language: string | null;
  },
): Promise<{ cacheKey: string; localId: number | null }> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // .ref sidecar maps fileId → real cache filename so we can check existence
  // without consuming an API download credit on repeat requests
  const refPath = path.join(CACHE_DIR, `${fileId}.ref`);
  if (fs.existsSync(refPath)) {
    const cacheFile = fs.readFileSync(refPath, "utf-8").trim();
    const filePath = path.join(CACHE_DIR, cacheFile);
    if (fs.existsSync(filePath)) {
      const existing = db
        .select({ id: subtitles.id })
        .from(subtitles)
        .where(eq(subtitles.file, filePath))
        .get();
      return { cacheKey: cacheFile, localId: existing?.id ?? null };
    }
  }

  if (!process.env.OPENSUBTITLES_API_KEY) {
    throw Object.assign(new Error("OpenSubtitles API key not configured"), {
      status: 503,
      code: "not_configured",
    });
  }

  let dlData;
  try {
    dlData = await openSubtitlesDownloads.link(fileId);
  } catch (e) {
    if (e instanceof HttpError && e.status === 429) {
      throw Object.assign(
        new Error("Subtitle download limit reached for today. Try again tomorrow."),
        {
          status: 429,
          code: "rate_limited",
        },
      );
    }
    throw Object.assign(new Error("Subtitle download failed"), {
      status: 502,
      code: "upstream_error",
    });
  }

  if (!dlData.link) {
    throw Object.assign(new Error("No download link available"), {
      status: 502,
      code: "upstream_error",
    });
  }

  const origName = dlData.file_name ?? `${fileId}.srt`;
  const baseName = sanitizeFilename(path.basename(origName, path.extname(origName)));
  const cacheFile = `${baseName}.vtt`;
  const filePath = path.join(CACHE_DIR, cacheFile);

  if (!filePath.startsWith(CACHE_DIR)) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const subRes = await fetch(dlData.link);
  if (!subRes.ok) {
    throw Object.assign(new Error("Failed to fetch subtitle file"), {
      status: 502,
      code: "upstream_error",
    });
  }

  let content = await subRes.text();
  if (!content.trimStart().startsWith("WEBVTT")) {
    content = srtToVtt(content);
  }

  fs.writeFileSync(filePath, content, "utf-8");
  fs.writeFileSync(refPath, cacheFile, "utf-8");

  let localId: number | null = null;
  if (context.tmdbId && context.language) {
    const parsed = parseSubtitleFilename(origName);
    try {
      const inserted = db
        .insert(subtitles)
        .values({
          tmdbId: context.tmdbId,
          file: filePath,
          language: context.language,
          year: parsed.year ? Number(parsed.year) : null,
          resolution: parsed.resolution ? String(parsed.resolution) : null,
          source: parsed.sources[0] ? String(parsed.sources[0]) : null,
          videoCodec: parsed.videoCodec ? String(parsed.videoCodec) : null,
          group: parsed.group ?? null,
          season: context.season,
          episode: context.episode,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: subtitles.id })
        .get();
      localId = inserted?.id ?? null;
    } catch {
      // Non-fatal — subtitle is still served even if DB insert fails
    }
  }

  return { cacheKey: cacheFile, localId };
}

export function resolveSubtitleCachePath(cacheKey: string): string {
  const safeKey = path.basename(cacheKey);
  const filePath = path.join(CACHE_DIR, safeKey);
  if (!filePath.startsWith(CACHE_DIR)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return filePath;
}

export async function uploadSubtitle({
  tmdbId,
  type,
  language,
  title,
  year,
  files,
}: SubtitlesUploadRequest): Promise<{ ids: number[] }> {
  if (!tmdbId || !language || !title || !files.length) {
    throw Object.assign(new Error("Missing required fields"), { status: 400 });
  }

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
    throw Object.assign(new Error("Validation errors"), { status: 422, errors });
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const batchId = files.length > 1 ? crypto.randomUUID() : null;
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

    const row = db
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
      .returning({ id: subtitles.id })
      .get();

    if (row) ids.push(row.id);
  }

  return { ids };
}
