"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FilmIcon,
  PlayIcon,
  Share2Icon,
} from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  PlayResponse,
  TmdbCredits,
  TmdbEpisode,
  TmdbSeason,
  TmdbTvDetails,
} from "@/lib/types";
import { sources as sourcesApi, tmdb } from "@/services/api.service";
import ErrorFallback from "@/components/error";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const STILL = "https://image.tmdb.org/t/p/w185";

interface SourceInfo {
  id: string;
  name: string;
  description?: string;
}

type Props = {
  tmdbId: number;
  tvDetails: TmdbTvDetails;
  credits: TmdbCredits;
  initialEpisodes: TmdbEpisode[];
  initialSeasonNumber: number;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/25 px-3 py-1 text-sm text-white/90">
      {label}
    </span>
  );
}

function TvEpisodeListPanel({
  seasons,
  currentSeason,
  episodes,
  loading,
  error,
  onSeasonChange,
  onEpisodeClick,
}: {
  seasons: TmdbSeason[];
  currentSeason: number;
  episodes: TmdbEpisode[];
  loading: boolean;
  error: boolean;
  onSeasonChange: (n: number) => void;
  onEpisodeClick: (ep: TmdbEpisode) => void;
}) {
  const realSeasons = seasons.filter((s) => s.season_number > 0);
  const idx = realSeasons.findIndex((s) => s.season_number === currentSeason);

  return (
    <div className="flex h-full flex-col">
      <div className="border-white/10 flex items-center justify-between border-b px-3 py-3">
        <button
          disabled={idx <= 0}
          onClick={() => onSeasonChange(realSeasons[idx - 1].season_number)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            idx <= 0 ? "text-white/20" : "text-white/60 hover:text-white",
          )}
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" /> Prev
        </button>

        <select
          value={currentSeason}
          onChange={(e) => onSeasonChange(Number(e.target.value))}
          className="border-white/20 bg-transparent text-center text-sm font-semibold text-white outline-none"
        >
          {realSeasons.map((s) => (
            <option key={s.season_number} value={s.season_number} className="bg-black">
              {s.name || `Season ${s.season_number}`}
            </option>
          ))}
        </select>

        <button
          disabled={idx >= realSeasons.length - 1}
          onClick={() => onSeasonChange(realSeasons[idx + 1].season_number)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            idx >= realSeasons.length - 1 ? "text-white/20" : "text-white/60 hover:text-white",
          )}
        >
          Next <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-8">
            <ErrorFallback title="Failed to load" message="Could not load episodes." />
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skeleton
                  className="w-20 flex-shrink-0 rounded"
                  style={{ paddingBottom: "56.25%" }}
                />
                <div className="flex flex-col gap-1.5 pt-1">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => onEpisodeClick(ep)}
              className="flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
            >
              <div className="relative w-24 h-14 flex-shrink-0 overflow-hidden rounded">
                {ep.still_path ? (
                  <Image
                    src={`${STILL}${ep.still_path}`}
                    alt={ep.name}
                    fill
                    sizes="144px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="line-clamp-2 text-sm font-medium text-white">
                  {ep.episode_number}. {ep.name}
                </p>
                {ep.air_date && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{formatDate(ep.air_date)}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EpisodeSourcesPanel({
  episode,
  sources,
  loading,
  error,
  onBack,
  onPlay,
}: {
  episode: TmdbEpisode;
  sources: SourceInfo[];
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onPlay: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-white/10 flex items-center gap-2 border-b px-4 py-4">
        <button onClick={onBack} className="text-white/60 transition-colors hover:text-white">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="line-clamp-1 text-sm font-medium text-white">
          S{episode.season_number}E{episode.episode_number} {episode.name}
        </p>
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

export function TvDetailView({
  tmdbId,
  tvDetails,
  credits,
  initialEpisodes,
  initialSeasonNumber,
}: Props) {
  const router = useRouter();

  const [currentSeason, setCurrentSeason] = useState(initialSeasonNumber);
  const [selectedEpisode, setSelectedEpisode] = useState<TmdbEpisode | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const {
    data: sourcesData,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useSWR(["sources", tmdbId, "tv"], async () => {
    const result = await sourcesApi.list(tmdbId, "tv");
    if ("error" in result) throw result;
    return result;
  });

  const {
    data: episodesData,
    isLoading: episodesLoading,
    error: episodesError,
  } = useSWR(
    ["episodes", tmdbId, currentSeason],
    async () => {
      const result = await tmdb.tvEpisodes(tmdbId, currentSeason);
      if ("error" in result) throw result;
      return result;
    },
    { fallbackData: { episodes: initialEpisodes } },
  );

  const sources: SourceInfo[] = sourcesData?.sources ?? [];
  const episodes: TmdbEpisode[] = episodesData?.episodes ?? [];

  const handlePlay = useCallback(
    async (sourceId: string) => {
      setPlayError(null);
      let play: PlayResponse;
      try {
        const result = await sourcesApi.play({
          source_id: sourceId,
          tmdb_id: tmdbId,
          media_type: "tv",
          screenSize: window.screen.height,
          ...(selectedEpisode && {
            season: selectedEpisode.season_number,
            episode: selectedEpisode.episode_number,
          }),
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
        title: tvDetails.name,
        tmdb_id: String(tmdbId),
        source_id: sourceId,
      });
      if (selectedEpisode) {
        params.set("season", String(selectedEpisode.season_number));
        params.set("episode", String(selectedEpisode.episode_number));

        const realSeasons = tvDetails.seasons.filter((s) => s.season_number > 0);
        const currentEpIdx = episodes.findIndex(
          (e) => e.episode_number === selectedEpisode.episode_number,
        );
        if (currentEpIdx !== -1 && currentEpIdx < episodes.length - 1) {
          params.set("next_season", String(selectedEpisode.season_number));
          params.set("next_episode", String(episodes[currentEpIdx + 1].episode_number));
        } else {
          const currentSeasonIdx = realSeasons.findIndex(
            (s) => s.season_number === selectedEpisode.season_number,
          );
          if (currentSeasonIdx !== -1 && currentSeasonIdx < realSeasons.length - 1) {
            params.set("next_season", String(realSeasons[currentSeasonIdx + 1].season_number));
            params.set("next_episode", "1");
          }
        }
      }
      router.push(`/player?${params}`);
    },
    [tmdbId, selectedEpisode, router, tvDetails.name, tvDetails.seasons, episodes],
  );

  const year = `${tvDetails.first_air_date?.slice(0, 4)}–${tvDetails.last_air_date?.slice(0, 4) ?? ""}`;
  const cast = credits.cast.slice(0, 4);

  return (
    <>
      {tvDetails.backdrop_path && (
        <Image
          src={`${BACKDROP}${tvDetails.backdrop_path}`}
          alt={tvDetails.name}
          fill
          className="absolute -z-10 object-cover object-top"
          sizes="1080px"
          priority
        />
      )}

      <div className="absolute -z-10 inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
      <div className="absolute -z-10 inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      <div className="flex justify-between w-full z-1 gap-2">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              {tvDetails.name}
            </h1>

            <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
              {tvDetails.episode_run_time[0] && (
                <span className="text-white/70">{tvDetails.episode_run_time[0]} min</span>
              )}
              <span className="text-white/70">{year}</span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-bold text-black">
                  IMDb
                </span>
                <span className="font-semibold text-white">
                  {tvDetails.vote_average.toFixed(1)}
                </span>
              </span>
            </div>

            {tvDetails.genres.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Genres
                </p>
                <div className="flex flex-wrap gap-2">
                  {tvDetails.genres.map((g) => (
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

            {tvDetails.overview && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Summary
                </p>
                <p className="max-w-xl text-sm leading-relaxed text-white/75">
                  {tvDetails.overview}
                </p>
              </div>
            )}

            {playError && <p className="text-destructive text-sm">{playError}</p>}
          </div>

          <div className="flex-shrink-0 px-8 pb-8 ">
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

        <div className="flex w-96 flex-shrink-0 flex-col m-4 max-h-[80vh] overflow-hidden">
          {selectedEpisode ? (
            <EpisodeSourcesPanel
              episode={selectedEpisode}
              sources={sources}
              loading={sourcesLoading}
              error={!!sourcesError}
              onBack={() => setSelectedEpisode(null)}
              onPlay={handlePlay}
            />
          ) : (
            <TvEpisodeListPanel
              seasons={tvDetails.seasons}
              currentSeason={currentSeason}
              episodes={episodes}
              loading={episodesLoading}
              error={!!episodesError}
              onSeasonChange={setCurrentSeason}
              onEpisodeClick={setSelectedEpisode}
            />
          )}
        </div>
      </div>
    </>
  );
}
