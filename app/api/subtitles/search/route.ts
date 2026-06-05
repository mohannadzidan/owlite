import path from "path";
import { eq, isNull, and } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import type { SubtitleTrack } from "@/lib/types";
import { subtitles as openSubtitlesService } from "@/services/opensubtitles.service";
import { db } from "@/db";
import { subtitles as subtitlesTable } from "@/db/schema";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    imdb_id?: string;
    tmdb_id?: number;
    season?: number;
    episode?: number;
    language?: string;
  };

  const { tmdb_id, season, episode } = body;

  // Build context suffix for OS download URLs so the download route can record to DB
  const contextParams = new URLSearchParams();
  if (tmdb_id) contextParams.set("tmdb_id", String(tmdb_id));
  if (season != null) contextParams.set("season", String(season));
  if (episode != null) contextParams.set("episode", String(episode));
  if (body.language) contextParams.set("language", body.language);
  // Fetch local subtitles from DB
  const localTracks: SubtitleTrack[] = [];
  if (tmdb_id) {
    const conditions = [eq(subtitlesTable.tmdbId, tmdb_id)];
    if (season != null) {
      conditions.push(eq(subtitlesTable.season, season));
    } else {
      conditions.push(isNull(subtitlesTable.season));
    }
    if (episode != null) {
      conditions.push(eq(subtitlesTable.episode, episode));
    } else {
      conditions.push(isNull(subtitlesTable.episode));
    }

    const rows = await db
      .select()
      .from(subtitlesTable)
      .where(and(...conditions));

    for (const row of rows) {
      const basename = path.basename(row.file);
      localTracks.push({
        id: `local-${row.id}`,
        language: row.language,
        format: "vtt",
        download_url: `/api/subtitles/stream?cache_key=${encodeURIComponent(basename)}`,
        release_name: path.basename(row.file, path.extname(row.file)),
        provider: "local",
        isFavorite: row.isFavorite,
      });
    }
  }

  // Fetch OpenSubtitles tracks
  const osTracks: SubtitleTrack[] = [];
  if (process.env.OPENSUBTITLES_API_KEY) {
    try {
      const data = await openSubtitlesService.search(body);
      if (!("error" in data)) {
        for (const item of data.data ?? []) {
          const fileId = item.attributes.files[0]?.file_id;
          if (!fileId) continue;
          const lang = item.attributes.language;
          const trackContextParams = new URLSearchParams(contextParams);
          trackContextParams.set("language", lang);
          osTracks.push({
            id: String(fileId),
            language: lang,
            format: item.attributes.format ?? "srt",
            download_url: `/api/subtitles/download?file_id=${fileId}&${trackContextParams.toString()}`,
            release_name: item.attributes.release,
            provider: "open_subtitles",
          });
        }
      }
    } catch {
      // Graceful degradation — local subtitles still returned
    }
  }

  return NextResponse.json({ tracks: [...localTracks, ...osTracks] });
}
