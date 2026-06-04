import { notFound } from "next/navigation";
import { MovieDetailView } from "../../movie-detail-view";
import { tmdb } from "@/services/tmdb.service";

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  let details;
  let credits;

  try {
    [details, credits] = await Promise.all([
      tmdb.movies.details(numId),
      tmdb.movies.credits(numId),
    ]);
  } catch {
    notFound();
  }

  if (!details || "error" in details || !credits || "error" in credits) notFound();

  return <MovieDetailView tmdbId={numId} movieDetails={details} credits={credits} />;
}
