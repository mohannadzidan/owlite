import { type NextRequest, NextResponse } from "next/server";
import type { SubtitleTrack } from "@/lib/types";
import { subtitles } from "@/services/opensubtitles.service";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    imdb_id?: string;
    tmdb_id?: number;
    season?: number;
    episode?: number;
    language?: string;
  };

  if (!process.env.OPENSUBTITLES_API_KEY) return NextResponse.json({ tracks: [] });

  let data;
  try {
    data = await subtitles.search(body);
  } catch {
    return NextResponse.json({ tracks: [] });
  }

  if ("error" in data) return NextResponse.json({ tracks: [] });

  const tracks: SubtitleTrack[] = (data.data ?? []).map((item) => ({
    id: String(item.attributes.files[0]?.file_id ?? item.id),
    language: item.attributes.language,
    format: item.attributes.format ?? "srt",
    download_url: `/api/subtitles/download?file_id=${item.attributes.files[0]?.file_id}`,
    release_name: item.attributes.release,
  }));

  return NextResponse.json({ tracks });
}
