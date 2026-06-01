import { type NextRequest, NextResponse } from "next/server";
import { tv } from "@/services/tmdb.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seriesId = Number(id);
  const seasonNum = request.nextUrl.searchParams.get("season");

  try {
    if (seasonNum) {
      const episodes = await tv.seasonEpisodes(seriesId, Number(seasonNum));
      return NextResponse.json({ episodes });
    }
    const details = await tv.series(seriesId);
    return NextResponse.json(details);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
