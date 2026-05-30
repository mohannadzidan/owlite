import { type NextRequest, NextResponse } from "next/server";
import type { SubtitleTrack } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    imdb_id?: string;
    season?: number;
    episode?: number;
    language?: string;
  };

  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) return NextResponse.json({ tracks: [] });

  const params = new URLSearchParams();
  if (body.imdb_id) params.set("imdb_id", body.imdb_id.replace("tt", ""));
  if (body.season != null) params.set("season_number", String(body.season));
  if (body.episode != null) params.set("episode_number", String(body.episode));
  if (body.language) params.set("languages", body.language);

  const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params}`, {
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
  });

  if (!res.ok) return NextResponse.json({ tracks: [] });

  const data = (await res.json()) as {
    data: Array<{
      id: string;
      attributes: {
        language: string;
        format: string;
        release: string;
        files: Array<{ file_id: number }>;
      };
    }>;
  };

  const tracks: SubtitleTrack[] = (data.data ?? []).map((item) => ({
    id: String(item.attributes.files[0]?.file_id ?? item.id),
    language: item.attributes.language,
    format: item.attributes.format ?? "srt",
    download_url: `/api/subtitles/download?file_id=${item.attributes.files[0]?.file_id}`,
    release_name: item.attributes.release,
  }));

  return NextResponse.json({ tracks });
}
