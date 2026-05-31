import { notFound } from "next/navigation";
import { getMovieCredits, getMovieDetails } from "@/lib/tmdb";
import { MovieDetailView } from "../../movie-detail-view";

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  let details;
  let credits;

  try {
    [details, credits] = await Promise.all([getMovieDetails(numId), getMovieCredits(numId)]);
  } catch {
    notFound();
  }

  return <MovieDetailView tmdbId={numId} movieDetails={details} credits={credits} />;
}
