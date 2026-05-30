"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FilmIcon,
  MaximizeIcon,
  SearchIcon,
  Share2Icon,
  UserIcon,
  PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  TmdbCredits,
  TmdbEpisode,
  TmdbMovieDetails,
  TmdbSeason,
  TmdbTvDetails,
} from "@/lib/types";

const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const STILL = "https://image.tmdb.org/t/p/w185";

interface SourceInfo {
  id: string;
  name: string;
  description?: string;
}

type Props =
  | { type: "movie"; tmdbId: number; movieDetails: TmdbMovieDetails; credits: TmdbCredits }
  | {
      type: "tv";
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

// ── Right panel: movie sources ──────────────────────────────────────────────

function MovieSourcesPanel({
  sources,
  loading,
  onPlay,
}: {
  sources: SourceInfo[];
  loading: boolean;
  onPlay: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-white/10 px-5 py-4 border-b">
        <p className="text-sm font-semibold text-white/80">Available Sources</p>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
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

// ── Right panel: TV episode list ────────────────────────────────────────────

function TvEpisodeListPanel({
  seasons,
  currentSeason,
  episodes,
  loading,
  onSeasonChange,
  onEpisodeClick,
}: {
  seasons: TmdbSeason[];
  currentSeason: number;
  episodes: TmdbEpisode[];
  loading: boolean;
  onSeasonChange: (n: number) => void;
  onEpisodeClick: (ep: TmdbEpisode) => void;
}) {
  const [query, setQuery] = useState("");
  const realSeasons = seasons.filter((s) => s.season_number > 0);
  const idx = realSeasons.findIndex((s) => s.season_number === currentSeason);
  const filtered = episodes.filter((ep) => ep.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      {/* Season selector */}
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

      {/* Episode search */}
      <div className="border-white/10 border-b px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/8 px-3 py-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search videos"
            className="border-0 bg-transparent p-0 text-sm text-white shadow-none placeholder:text-white/30 focus-visible:ring-0"
          />
          <SearchIcon className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
        </div>
      </div>

      {/* Episode list */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          <div className="flex flex-col gap-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skeleton className="aspect-video w-20 flex-shrink-0 rounded" />
                <div className="flex flex-col gap-1.5 pt-1">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          filtered.map((ep) => (
            <button
              key={ep.id}
              onClick={() => onEpisodeClick(ep)}
              className="flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
            >
              <div className="relative aspect-video w-20 flex-shrink-0 overflow-hidden rounded">
                {ep.still_path ? (
                  <Image
                    src={`${STILL}${ep.still_path}`}
                    alt={ep.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-muted h-full w-full" />
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

// ── Right panel: episode sources ────────────────────────────────────────────

function EpisodeSourcesPanel({
  episode,
  sources,
  loading,
  onBack,
  onPlay,
}: {
  episode: TmdbEpisode;
  sources: SourceInfo[];
  loading: boolean;
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
        {loading ? (
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

// ── Main component ──────────────────────────────────────────────────────────

export function DetailView(props: Props) {
  const router = useRouter();

  // Common data
  const { type, tmdbId, credits } = props;
  const backdropPath =
    type === "movie" ? props.movieDetails.backdrop_path : props.tvDetails.backdrop_path;
  const title = type === "movie" ? props.movieDetails.title : props.tvDetails.name;
  const overview = type === "movie" ? props.movieDetails.overview : props.tvDetails.overview;
  const genres = type === "movie" ? props.movieDetails.genres : props.tvDetails.genres;
  const voteAverage =
    type === "movie" ? props.movieDetails.vote_average : props.tvDetails.vote_average;

  const runtime =
    type === "movie" ? props.movieDetails.runtime : (props.tvDetails.episode_run_time[0] ?? null);

  const year =
    type === "movie"
      ? props.movieDetails.release_date?.slice(0, 4)
      : `${props.tvDetails.first_air_date?.slice(0, 4)}–${props.tvDetails.last_air_date?.slice(0, 4) ?? ""}`;

  const cast = credits.cast.slice(0, 4);
  const directors =
    type === "movie" ? credits.crew.filter((c) => c.job === "Director").slice(0, 3) : [];

  // TV state
  const [currentSeason, setCurrentSeason] = useState(type === "tv" ? props.initialSeasonNumber : 1);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>(
    type === "tv" ? props.initialEpisodes : [],
  );
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<TmdbEpisode | null>(null);

  // Sources state
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSources([]);
    try {
      const res = await fetch(`/api/sources?tmdb_id=${tmdbId}&media_type=${type}`);
      const data = (await res.json()) as { sources: SourceInfo[] };
      setSources(data.sources ?? []);
    } catch {
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  }, [tmdbId, type]);

  // Fetch sources on mount for movies
  useEffect(() => {
    if (type === "movie") fetchSources();
  }, [type, fetchSources]);

  const handleSeasonChange = useCallback(
    async (seasonNum: number) => {
      setEpisodesLoading(true);
      setSelectedEpisode(null);
      try {
        const res = await fetch(`/api/tmdb/tv/${tmdbId}/seasons?season=${seasonNum}`);
        const data = (await res.json()) as { episodes: TmdbEpisode[] };
        setEpisodes(data.episodes ?? []);
        setCurrentSeason(seasonNum);
      } finally {
        setEpisodesLoading(false);
      }
    },
    [tmdbId],
  );

  const handleEpisodeClick = useCallback(
    (ep: TmdbEpisode) => {
      setSelectedEpisode(ep);
      fetchSources();
    },
    [fetchSources],
  );

  const handlePlay = useCallback(
    async (sourceId: string) => {
      setPlayError(null);
      const body: Record<string, unknown> = {
        source_id: sourceId,
        tmdb_id: tmdbId,
        media_type: type,
      };
      if (selectedEpisode) {
        body.season = selectedEpisode.season_number;
        body.episode = selectedEpisode.episode_number;
      }

      const res = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setPlayError("Source could not resolve this title.");
        return;
      }

      const play = (await res.json()) as {
        type: string;
        url?: string;
        master_manifest_url?: string;
      };
      const streamUrl = play.url ?? play.master_manifest_url ?? "";
      router.push(
        `/player?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title)}`,
      );
    },
    [tmdbId, type, selectedEpisode, title, router],
  );

  return (
    <div className="relative h-full overflow-hidden">
      {/* Backdrop */}
      {backdropPath ? (
        <Image
          src={`${BACKDROP}${backdropPath}`}
          alt={title}
          fill
          className="object-cover object-top"
          priority
        />
      ) : (
        <div className="bg-background absolute inset-0" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      {/* Layout */}
      <div className="absolute inset-0 flex">
        {/* ── Left content ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-8 pt-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-lg p-2 text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <button className="text-white/60 transition-colors hover:text-white">
                <MaximizeIcon className="h-5 w-5" />
              </button>
              <button className="text-white/60 transition-colors hover:text-white">
                <UserIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 overflow-y-auto px-8 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              {title}
            </h1>

            {/* Meta row */}
            <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
              {runtime && <span className="text-white/70">{runtime} min</span>}
              <span className="text-white/70">{year}</span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-bold text-black">
                  IMDb
                </span>
                <span className="font-semibold text-white">{voteAverage.toFixed(1)}</span>
              </span>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Genres
                </p>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Pill key={g.id} label={g.name} />
                  ))}
                </div>
              </div>
            )}

            {/* Cast */}
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

            {/* Directors (movie only) */}
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

            {/* Summary */}
            {overview && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Summary
                </p>
                <p className="max-w-xl text-sm leading-relaxed text-white/75">{overview}</p>
              </div>
            )}

            {playError && <p className="text-destructive text-sm">{playError}</p>}
          </div>

          {/* Action buttons */}
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

        {/* ── Right panel ── */}
        <div className="flex w-80 flex-shrink-0 flex-col border-l border-white/10 bg-black/70 backdrop-blur-sm">
          {type === "movie" ? (
            <MovieSourcesPanel sources={sources} loading={sourcesLoading} onPlay={handlePlay} />
          ) : selectedEpisode ? (
            <EpisodeSourcesPanel
              episode={selectedEpisode}
              sources={sources}
              loading={sourcesLoading}
              onBack={() => setSelectedEpisode(null)}
              onPlay={handlePlay}
            />
          ) : (
            <TvEpisodeListPanel
              seasons={props.tvDetails.seasons}
              currentSeason={currentSeason}
              episodes={episodes}
              loading={episodesLoading}
              onSeasonChange={handleSeasonChange}
              onEpisodeClick={handleEpisodeClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
