import { type NextRequest, NextResponse } from "next/server";
import { getSources } from "@/lib/sources/registry";

export async function GET(request: NextRequest) {
  const tmdbId = Number(request.nextUrl.searchParams.get("tmdb_id"));
  const mediaType = (request.nextUrl.searchParams.get("media_type") ?? "movie") as "movie" | "tv";

  if (!tmdbId) return NextResponse.json({ error: "tmdb_id required" }, { status: 400 });

  const sources = getSources();
  return NextResponse.json({ sources, tmdb_id: tmdbId, media_type: mediaType });
}
