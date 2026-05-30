import { type NextRequest, NextResponse } from "next/server";
import { getSeriesDetails, getSeasonEpisodes } from "@/lib/tmdb";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seriesId = Number(id);
  const seasonNum = request.nextUrl.searchParams.get("season");

  try {
    if (seasonNum) {
      const episodes = await getSeasonEpisodes(seriesId, Number(seasonNum));
      return NextResponse.json({ episodes });
    }
    const details = await getSeriesDetails(seriesId);
    return NextResponse.json(details);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
