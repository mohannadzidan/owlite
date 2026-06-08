"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";
import { tmdb } from "@/services/tmdb.service";
import { paths } from "@/lib/paths";
import { SubtitlesManager } from "@/components/subtitles-manager";
import dayjs from "dayjs";

function LoadingSkeleton() {
  return (
    <main className="p-8 pt-16">
      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-6" />
      <div className="h-7 w-64 bg-muted rounded animate-pulse mb-2" />
      <div className="h-4 w-40 bg-muted rounded animate-pulse mb-8" />
    </main>
  );
}

export default function SubtitlesPage() {
  const { type, id } = useParams<{ type: string; id: string }>();

  if (type !== "movie" && type !== "tv") notFound();

  const numId = Number(id);
  if (isNaN(numId)) notFound();

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
    if (!movieDetails || "error" in movieDetails) notFound();
    const year = movieDetails.release_date
      ? Number(dayjs(movieDetails.release_date).format("YYYY"))
      : undefined;

    return (
      <main className="p-8 pt-16">
        <Link
          href={paths.details("movie", numId)}
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

  if (!tvDetails || "error" in tvDetails) notFound();

  return (
    <main className="p-8 pt-16">
      <Link
        href={paths.details("tv", numId)}
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
