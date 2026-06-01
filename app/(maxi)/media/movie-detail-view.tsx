"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BookmarkIcon, EyeIcon, FilmIcon, PlayIcon, Share2Icon } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlayResponse, TmdbCredits, TmdbMovieDetails } from "@/lib/types";
import { sources as sourcesApi } from "@/services/api.service";
import ErrorFallback from "@/components/error";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";

interface SourceInfo {
  id: string;
  name: string;
  description?: string;
}

type Props = {
  tmdbId: number;
  movieDetails: TmdbMovieDetails;
  credits: TmdbCredits;
};

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/25 px-3 py-1 text-sm text-white/90">
      {label}
    </span>
  );
}

function MovieSourcesPanel({
  sources,
  loading,
  error,
  onPlay,
}: {
  sources: SourceInfo[];
  loading: boolean;
  error: boolean;
  onPlay: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-white/10 px-5 py-4 border-b">
        <p className="text-sm font-semibold text-white/80">Available Sources</p>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-8">
            <ErrorFallback title="Failed to load" message="Could not load available sources." />
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-muted-foreground text-sm">No streams were found</p>
          </div>
        ) : (
          sources.map((s) => (
            <button
              key={s.id}
              onClick={() => onPlay(s.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-medium text-white">{s.name}</p>
                {s.description && <p className="text-muted-foreground text-xs">{s.description}</p>}
              </div>
              <PlayIcon className="h-4 w-4 text-white/50" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function MovieDetailView({ tmdbId, movieDetails, credits }: Props) {
  const router = useRouter();
  const [playError, setPlayError] = useState<string | null>(null);

  const {
    data: sourcesData,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useSWR(["sources", tmdbId, "movie"], async () => {
    const result = await sourcesApi.list(tmdbId, "movie");
    if ("error" in result) throw result;
    return result;
  });

  const sources: SourceInfo[] = sourcesData?.sources ?? [];

  const handlePlay = useCallback(
    async (sourceId: string) => {
      setPlayError(null);
      let play: PlayResponse;
      try {
        const result = await sourcesApi.play({
          source_id: sourceId,
          tmdb_id: tmdbId,
          media_type: "movie",
          screenSize: window.screen.height,
        });
        if ("error" in result) throw result;
        play = result;
      } catch {
        setPlayError("Source could not resolve this title.");
        return;
      }
      const streamUrl = play.type === "hls" ? play.master_manifest_url : play.url;
      const params = new URLSearchParams({
        url: streamUrl,
        title: movieDetails.title,
      });
      if (movieDetails.imdb_id) params.set("imdb_id", movieDetails.imdb_id);
      params.set("tmdb_id", String(tmdbId));
      router.push(`/player?${params}`);
    },
    [tmdbId, router, movieDetails.title, movieDetails.imdb_id],
  );

  const cast = credits.cast.slice(0, 4);
  const directors = credits.crew.filter((c) => c.job === "Director").slice(0, 3);
  const year = movieDetails.release_date?.slice(0, 4) ?? "";

  return (
    <>
      {movieDetails.backdrop_path ? (
        <Image
          src={`${BACKDROP}${movieDetails.backdrop_path}`}
          alt={movieDetails.title}
          fill
          className="object-cover object-top"
          priority
        />
      ) : (
        <div className="bg-background absolute inset-0" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      <div className="absolute inset-0 flex">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              {movieDetails.title}
            </h1>

            <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
              {movieDetails.runtime && (
                <span className="text-white/70">{movieDetails.runtime} min</span>
              )}
              <span className="text-white/70">{year}</span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-bold text-black">
                  IMDb
                </span>
                <span className="font-semibold text-white">
                  {movieDetails.vote_average.toFixed(1)}
                </span>
              </span>
            </div>

            {movieDetails.genres.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Genres
                </p>
                <div className="flex flex-wrap gap-2">
                  {movieDetails.genres.map((g) => (
                    <Pill key={g.id} label={g.name} />
                  ))}
                </div>
              </div>
            )}

            {cast.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Cast
                </p>
                <div className="flex flex-wrap gap-2">
                  {cast.map((c) => (
                    <Pill key={c.id} label={c.name} />
                  ))}
                </div>
              </div>
            )}

            {directors.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Directors
                </p>
                <div className="flex flex-wrap gap-2">
                  {directors.map((d) => (
                    <Pill key={d.id} label={d.name} />
                  ))}
                </div>
              </div>
            )}

            {movieDetails.overview && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Summary
                </p>
                <p className="max-w-xl text-sm leading-relaxed text-white/75">
                  {movieDetails.overview}
                </p>
              </div>
            )}

            {playError && <p className="text-destructive text-sm">{playError}</p>}
          </div>

          <div className="flex-shrink-0 px-8 pb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="gap-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <FilmIcon className="h-4 w-4" /> Trailer
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <BookmarkIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <EyeIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Share2Icon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex w-96 flex-shrink-0 flex-col m-4">
          <MovieSourcesPanel
            sources={sources}
            loading={sourcesLoading}
            error={!!sourcesError}
            onPlay={handlePlay}
          />
        </div>
      </div>
    </>
  );
}
