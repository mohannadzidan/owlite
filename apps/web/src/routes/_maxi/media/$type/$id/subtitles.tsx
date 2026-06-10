import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";
import dayjs from "dayjs";
import { tmdb } from "@/services/tmdb.service";
import { SubtitlesManager } from "@/components/subtitles-manager";

export const Route = createFileRoute("/_maxi/media/$type/$id/subtitles")({
  component: SubtitlesPage,
});

function LoadingSkeleton() {
  return (
    <main className="p-8 pt-16">
      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-6" />
      <div className="h-7 w-64 bg-muted rounded animate-pulse mb-2" />
      <div className="h-4 w-40 bg-muted rounded animate-pulse mb-8" />
    </main>
  );
}

function SubtitlesPage() {
  const { type, id } = Route.useParams();

  if (type !== "movie" && type !== "tv") throw notFound();

  const numId = Number(id);
  if (isNaN(numId)) throw notFound();

  const { data: movieDetails, isLoading: movieLoading } = useSWR(
    type === "movie" ? ["movie-details", numId] : null,
    () => tmdb.movies.details(numId),
  );

  const { data: tvDetails, isLoading: tvLoading } = useSWR(
    type === "tv" ? ["tv-details", numId] : null,
    () => tmdb.tvShows.details(numId),
  );

  if (movieLoading || tvLoading) return <LoadingSkeleton />;

  if (type === "movie") {
    if (!movieDetails || "error" in movieDetails) throw notFound();
    const year = movieDetails.release_date
      ? Number(dayjs(movieDetails.release_date).format("YYYY"))
      : undefined;

    return (
      <main className="p-8 pt-16">
        <Link
          // to={paths.details("movie", numId) as string}
          to={"/media/movie/$id"}
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          {movieDetails.title}
        </Link>
        <h1 className="text-2xl font-bold mb-1">{movieDetails.title}</h1>
        <p className="text-muted-foreground text-sm mb-8">Subtitle management</p>
        <SubtitlesManager tmdbId={numId} type="movie" title={movieDetails.title} year={year} />
      </main>
    );
  }

  if (!tvDetails || "error" in tvDetails) throw notFound();

  return (
    <main className="p-8 pt-16">
      <Link
        to={type === "tv" ? "/media/tv/$id" : "/media/movie/$id"}
        params={{ id }}
        search={{ season: undefined }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        {tvDetails.name}
      </Link>
      <h1 className="text-2xl font-bold mb-1">{tvDetails.name}</h1>
      <p className="text-muted-foreground text-sm mb-8">Subtitle management</p>
      <SubtitlesManager tmdbId={numId} type="tv" title={tvDetails.name} />
    </main>
  );
}
