import { notFound } from "next/navigation";
import { tv } from "@/services/tmdb.service";
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
    [details, credits] = await Promise.all([tv.get(numId), tv.credits(numId)]);
    if (!details || "error" in details || !credits || "error" in credits) notFound();
    firstRealSeason = details.seasons.find((s) => s.season_number > 0) ?? details.seasons[0];
    if (firstRealSeason) {
      const episodesResult = await tv.seasonEpisodes(numId, firstRealSeason.season_number);
      if (!("error" in episodesResult)) initialEpisodes = episodesResult;
    }
  } catch {
    notFound();
  }

  if (!details || "error" in details || !credits || "error" in credits) notFound();

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
