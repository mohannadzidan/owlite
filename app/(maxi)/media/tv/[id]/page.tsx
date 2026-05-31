import { notFound } from "next/navigation";
import { getSeasonEpisodes, getTvCredits, getTvDetails } from "@/lib/tmdb";
import { TvDetailView } from "../../tv-detail-view";
import type { TmdbEpisode } from "@/lib/types";

export default async function TvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  let details;
  let credits;
  let firstRealSeason;
  let initialEpisodes: TmdbEpisode[] = [];

  try {
    [details, credits] = await Promise.all([getTvDetails(numId), getTvCredits(numId)]);
    firstRealSeason = details.seasons.find((s) => s.season_number > 0) ?? details.seasons[0];
    initialEpisodes = firstRealSeason
      ? await getSeasonEpisodes(numId, firstRealSeason.season_number)
      : [];
  } catch {
    notFound();
  }

  return (
    <TvDetailView
      tmdbId={numId}
      tvDetails={details}
      credits={credits}
      initialEpisodes={initialEpisodes}
      initialSeasonNumber={firstRealSeason?.season_number ?? 1}
    />
  );
}
