import { notFound } from "next/navigation";
import {
  getMovieDetails,
  getMovieCredits,
  getTvDetails,
  getTvCredits,
  getSeasonEpisodes,
} from "@/lib/tmdb";
import { DetailView } from "./detail-view";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "movie" && type !== "tv") notFound();

  const numId = Number(id);
  if (isNaN(numId)) notFound();

  try {
    if (type === "movie") {
      const [details, credits] = await Promise.all([
        getMovieDetails(numId),
        getMovieCredits(numId),
      ]);
      return <DetailView type="movie" tmdbId={numId} movieDetails={details} credits={credits} />;
    }

    const [details, credits] = await Promise.all([getTvDetails(numId), getTvCredits(numId)]);

    const firstRealSeason = details.seasons.find((s) => s.season_number > 0) ?? details.seasons[0];
    const initialEpisodes = firstRealSeason
      ? await getSeasonEpisodes(numId, firstRealSeason.season_number)
      : [];

    return (
      <DetailView
        type="tv"
        tmdbId={numId}
        tvDetails={details}
        credits={credits}
        initialEpisodes={initialEpisodes}
        initialSeasonNumber={firstRealSeason?.season_number ?? 1}
      />
    );
  } catch {
    notFound();
  }
}
