"use client";
import SelectSourceDialog from "./select-source-page";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { sources, tmdb } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ErrorFallback from "@/components/error";
import { errorThrower } from "@/services/request";
import FullScreenSpinner from "@/components/fullscreen-spinner";
import Player from "@/app/player/[type]/[id]/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore, usePlayerStoreApi } from "@/app/player/[type]/[id]/player-store";
import { PlayResponse, SubtitleTrack } from "@/lib/types";
import { shortcutsScopes, useShortcut, useShortcutScope } from "@/lib/shortcuts";
import { PlayerControls } from "@/app/player/[type]/[id]/player-controls";
import { TitleStorage } from "@/lib/player-storage";
import { ArrowLeft } from "lucide-react";
import FullScreenButton from "@/components/fullscreen-button";
import { paths } from "@/lib/paths";

interface PlayerUIProps {
  title: string;
  titleId: string | null;
  imdbId?: string;
  tmdbId?: number;
  season?: number;
  episode?: number;
  nextSeason?: number;
  nextEpisode?: number;
  onNextEpisode?: () => void;
}

function ProgressSaver({ titleId }: { titleId: string }) {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const seek = usePlayerStore((s) => s.seek);
  const setExternalSubtitleUrl = usePlayerStore((s) => s.setExternalSubtitleUrl);
  const setActiveExternalTrackId = usePlayerStore((s) => s.setActiveExternalTrackId);
  const currentTimeRef = useRef(0);
  const playerApi = usePlayerStoreApi();

  // Restore saved subtitle immediately on mount
  useEffect(() => {
    const saved = TitleStorage.get(titleId);
    if (saved.subtitleDownloadUrl && saved.subtitleTrackId) {
      setExternalSubtitleUrl(saved.subtitleDownloadUrl);
      setActiveExternalTrackId(saved.subtitleTrackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleId]);

  useEffect(() => {
    return playerApi.subscribe((state) => (currentTimeRef.current = state.currentTime));
  }, [playerApi]);

  // Restore saved position once playback is ready
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    if (playbackState !== "playing" && playbackState !== "paused") return;
    restored.current = true;
    const saved = TitleStorage.get(titleId).time;
    if (saved && saved > 5) seek(saved);
  }, [playbackState, titleId, seek]);

  // Save on pause / ended
  useEffect(() => {
    if (playbackState !== "paused" && playbackState !== "ended") return;
    TitleStorage.patch(titleId, { time: currentTimeRef.current });
  }, [playbackState, titleId]);

  // Save every 30 s while playing
  useEffect(() => {
    if (playbackState !== "playing") return;
    const id = setInterval(() => {
      TitleStorage.patch(titleId, { time: currentTimeRef.current });
    }, 30_000);
    return () => clearInterval(id);
  }, [playbackState, titleId]);

  return null;
}

export function PlayerUI({
  title,
  titleId,
  imdbId,
  tmdbId,
  season,
  episode,
  nextSeason,
  nextEpisode,
  onNextEpisode,
}: PlayerUIProps) {
  useShortcutScope(shortcutsScopes.player);
  const router = useRouter();
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const skip = usePlayerStore((s) => s.skip);
  const seek = usePlayerStore((s) => s.seek);
  const setQualityLevel = usePlayerStore((s) => s.setQualityLevel);
  const setExternalSubtitleUrl = usePlayerStore((s) => s.setExternalSubtitleUrl);
  const setActiveExternalTrackId = usePlayerStore((s) => s.setActiveExternalTrackId);
  const setSubtitleDelay = usePlayerStore((s) => s.setSubtitleDelay);
  const setSubtitleFontSize = usePlayerStore((s) => s.setSubtitleFontSize);
  const setSubtitleVerticalPosition = usePlayerStore((s) => s.setSubtitleVerticalPosition);
  const subtitleDelay = usePlayerStore((s) => s.subtitleDelay);
  const subtitleFontSize = usePlayerStore((s) => s.subtitleFontSize);

  const handleQualityChange = useCallback(
    (level: number) => {
      setQualityLevel(level);
    },
    [setQualityLevel],
  );

  const handleSelectTrack = useCallback(
    (track: SubtitleTrack) => {
      setExternalSubtitleUrl(track.download_url);
      setActiveExternalTrackId(track.id);
    },
    [setActiveExternalTrackId, setExternalSubtitleUrl],
  );

  const handleClearTrack = useCallback(() => {
    setExternalSubtitleUrl(null);
    setActiveExternalTrackId(null);
  }, [setActiveExternalTrackId, setExternalSubtitleUrl]);

  useShortcut(shortcutsScopes.player, "player.togglePlay", (e) => {
    e.preventDefault();
    togglePlay();
  });

  useShortcut(shortcutsScopes.player, "player.skipBackward", (e) => {
    e.preventDefault();
    skip(-10);
  });

  useShortcut(shortcutsScopes.player, "player.skipForward", (e) => {
    e.preventDefault();
    skip(10);
  });

  useShortcut(shortcutsScopes.player, "player.nextEpisode", (e) => {
    e.preventDefault();
    onNextEpisode?.();
  });

  useShortcut(shortcutsScopes.player, "player.subtitlesDelayIncrease", (e) => {
    e.preventDefault();
    setSubtitleDelay(Math.round((subtitleDelay + 0.5) * 10) / 10);
  });

  useShortcut(shortcutsScopes.player, "player.subtitlesDelayDecrease", (e) => {
    e.preventDefault();
    setSubtitleDelay(Math.round((subtitleDelay - 0.5) * 10) / 10);
  });

  useShortcut(shortcutsScopes.player, "player.subtitlesFontDecrease", (e) => {
    e.preventDefault();
    setSubtitleFontSize(Math.max(25, subtitleFontSize - 5));
  });

  useShortcut(shortcutsScopes.player, "player.subtitlesFontIncrease", (e) => {
    e.preventDefault();
    setSubtitleFontSize(Math.min(200, subtitleFontSize + 5));
  });

  return (
    <>
      {titleId && <ProgressSaver titleId={titleId} />}
      <PlayerControls>
        {/* Semi-transparent gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

        {/* Top bar */}
        <div className="relative flex items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-white hover:opacity-70 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft size={28} strokeWidth={1.5} />
          </button>
          {title && <span className="text-white font-medium text-base tracking-wide">{title}</span>}
          <FullScreenButton />
        </div>

        {/* Center controls */}
        <div className="relative flex-1 flex justify-center items-center gap-4">
          <PlayerControls.ScreenRewind seconds={10} className="text-white" onSkip={skip} />
          <PlayerControls.ScreenPlayPause className="text-white" onTogglePlay={togglePlay} />
          <PlayerControls.ScreenForward seconds={10} className="text-white" onSkip={skip} />
        </div>

        {/* Bottom area */}
        <div className="relative flex flex-col gap-4 px-6 pb-6">
          {/* Progress bar + remaining time */}
          <div className="flex items-center gap-4">
            <PlayerControls.ProgressBar className="flex-1" style={{ height: 4 }} onSeek={seek} />
            <PlayerControls.RemainingTime className="text-white text-sm tabular-nums shrink-0 opacity-90" />
          </div>

          {/* Bottom toolbar */}
          <div className="flex justify-center items-center gap-10">
            <PlayerControls.Subtitles
              className="text-white text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
              imdbId={imdbId}
              tmdbId={tmdbId}
              season={season}
              episode={episode}
              titleId={titleId}
              onSelectTrack={handleSelectTrack}
              onClearSelection={handleClearTrack}
              onDelayChange={setSubtitleDelay}
              onFontSizeChange={setSubtitleFontSize}
              onVerticalPosChange={setSubtitleVerticalPosition}
            >
              Audio &amp; Subtitles
            </PlayerControls.Subtitles>
            <PlayerControls.Quality
              className="text-white opacity-90 hover:opacity-100 transition-opacity"
              onQualityChange={handleQualityChange}
            />
            {nextSeason && nextEpisode && (
              <PlayerControls.NextEpisode
                className="text-white text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
                onNext={onNextEpisode}
              >
                Next episode
              </PlayerControls.NextEpisode>
            )}
          </div>
        </div>
      </PlayerControls>
    </>
  );
}

export default function Page() {
  const searchPrams = useSearchParams();
  const router = useRouter();
  const { type, id } = useParams<{ type: "tv" | "movie"; id: string }>();
  const season = searchPrams.get("season") ?? undefined;
  const episode = searchPrams.get("episode") ?? undefined;
  const sourceId = searchPrams.get("source") ?? undefined;
  const isTitleParametersOk = (type === "tv" && season && episode) || type === "movie";
  const playResponse = useSWR(
    sourceId && isTitleParametersOk ? [sourceId, type, id, season, episode] : null,
    () =>
      errorThrower(
        sources.play({
          source_id: sourceId!,
          tmdb_id: parseInt(id),
          media_type: type!,
          screenSize: Math.min(window.screen.width, window.screen.height),
          episode: episode ? parseInt(episode) : undefined,
          season: season ? parseInt(season) : undefined,
        }),
      ),
    { revalidateOnFocus: false },
  );

  const movieTitleResponse = useSWR(
    type === "movie" ? [type, id, season, episode] : null,
    () => errorThrower(tmdb.movie.get(Number(id))),
    { revalidateOnFocus: false },
  );

  const tvTitleResponse = useSWR(
    type === "tv" ? [type, id, season, episode] : null,
    () => errorThrower(tmdb.tv.get(Number(id))),
    { revalidateOnFocus: false },
  );

  const imdbIdResponse = useSWR(
    isTitleParametersOk ? [type, id, season, episode, "imdbId"] : null,
    () =>
      errorThrower(type === "movie" ? tmdb.movie.imdbId(Number(id)) : tmdb.tv.imdbId(Number(id))),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);
  if (
    !isTitleParametersOk ||
    playResponse.error ||
    tvTitleResponse.error ||
    movieTitleResponse.error
  ) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center">
        <ErrorFallback
          title="Something went wrong"
          message="Unexpected error occurred, please try again later."
        >
          <Button>
            <Link href="/">Go back</Link>
          </Button>
        </ErrorFallback>
      </div>
    );
  }
  if (!sourceId)
    return <SelectSourceDialog type={type} season={season} episode={episode} id={id} />;

  if (
    tvTitleResponse.isLoading ||
    movieTitleResponse.isLoading ||
    playResponse.isLoading ||
    imdbIdResponse.isLoading
  ) {
    return <FullScreenSpinner className="bg-black" />;
  }

  const streamUrl =
    playResponse.data!.type === "hls"
      ? playResponse.data!.master_manifest_url
      : playResponse.data!.url;
  const title = type === "movie" ? movieTitleResponse.data!.name : tvTitleResponse.data!.name;
  const titleId = type === "movie" ? movieTitleResponse.data!.id : tvTitleResponse.data!.id;
  const tmdbId = type === "movie" ? movieTitleResponse.data!.id : tvTitleResponse.data!.id;
  const seasons =
    tvTitleResponse.data?.seasons
      .filter((s) => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number) ?? [];
  const nextSeason =
    type === "tv" && season && episode && seasons.length !== Number(season)
      ? Number(season) + 1
      : undefined;
  const lastEpisodeOfSeason =
    type === "tv" &&
    !!season &&
    !!episode &&
    Number(episode) === seasons[Number(season) - 1].episode_count;
  const lastEpisodeOfSeries =
    type === "tv" &&
    !!season &&
    !!episode &&
    lastEpisodeOfSeason &&
    Number(season) === seasons.length;
  const nextEpisode =
    type === "tv" && season && episode && !lastEpisodeOfSeries
      ? lastEpisodeOfSeason
        ? 1
        : Number(episode) + 1
      : undefined;

  const nextEpisodeHandler = () => {
    if (lastEpisodeOfSeries || !nextEpisode || type !== "tv" || !episode || !season) return;

    if (lastEpisodeOfSeason && !lastEpisodeOfSeries) {
      return router.replace(
        paths.player(type as "tv", id, {
          episode: "1",
          season: nextSeason!.toString(),
          source: sourceId,
        }),
      );
    }
    if (lastEpisodeOfSeason) {
      return router.replace(
        paths.player(type as "tv", id, {
          episode: "1",
          season: ((nextSeason || 1) + 1)!.toString(),
          source: sourceId,
        }),
      );
    }
    router.replace(
      paths.player(type as "tv", id, {
        episode: nextEpisode.toString(),
        season,
        source: sourceId,
      }),
    );
  };

  return (
    <Player
      src={streamUrl}
      className="w-screen h-screen bg-black"
      maxRecoveryAttempts={3}
      onFatalError={(err) => console.error("Fatal HLS error", err)}
      autoPlay
    >
      <PlayerUI
        title={title}
        titleId={titleId.toString()}
        imdbId={imdbIdResponse.data ?? tmdbId.toString()}
        tmdbId={tmdbId}
        season={Number(season)}
        episode={Number(episode)}
        nextSeason={nextSeason}
        nextEpisode={nextEpisode}
        onNextEpisode={nextEpisodeHandler}
      />
    </Player>
  );
}
