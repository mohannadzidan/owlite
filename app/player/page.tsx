"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PlayerControls } from "./player-controls";
import { Player } from "./player";
import { usePlayerStore, usePlayerStoreApi } from "./player-store";
import FullScreenButton from "@/components/fullscreen-button";
import { buildTitleId, TitleStorage } from "@/lib/player-storage";
import { useShortcut, useShortcutScope, shortcutsScopes } from "@/lib/shortcuts";
import type { PlayResponse, SubtitleTrack } from "@/lib/types";
import { sources, tmdb } from "@/services/api.service";

const HIDE_DELAY_MS = 1400;

// ─── Inner UI — must be a child of <Player> to access the store ───────────────

// ─── ProgressSaver ────────────────────────────────────────────────────────────

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

// ─── Inner UI — must be a child of <Player> to access the store ───────────────

interface PlayerUIProps {
  title: string;
  titleId: string | null;
  imdbId?: string;
  tmdbId?: number;
  season?: number;
  episode?: number;
  sourceId?: string;
  nextSeason?: number;
  nextEpisode?: number;
}

function PlayerUI({
  title,
  titleId,
  imdbId,
  tmdbId,
  season,
  episode,
  sourceId,
  nextSeason,
  nextEpisode,
}: PlayerUIProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const handleNextEpisode = useCallback(async () => {
    if (!nextSeason || !nextEpisode || !tmdbId || !sourceId) return;

    let play: PlayResponse;
    try {
      const result = await sources.play({
        source_id: sourceId,
        tmdb_id: tmdbId,
        media_type: "tv",
        season: nextSeason,
        episode: nextEpisode,
        screenSize: window.screen.height,
      });
      if ("error" in result) throw result;
      play = result;
    } catch {
      return;
    }
    const streamUrl = play.type === "hls" ? play.master_manifest_url : play.url;
    if (!streamUrl) return;

    const params = new URLSearchParams({
      url: streamUrl,
      title,
      tmdb_id: String(tmdbId),
      source_id: sourceId,
      season: String(nextSeason),
      episode: String(nextEpisode),
    });

    // Fetch series info to compute the next-next episode
    const seriesResult = await tmdb.tvSeries(tmdbId).catch(() => null);
    const seriesData = seriesResult && !("error" in seriesResult) ? seriesResult : null;
    if (seriesData) {
      const realSeasons = (seriesData.seasons ?? []).filter((s) => s.season_number > 0);
      const currentSeasonInfo = realSeasons.find((s) => s.season_number === nextSeason);
      if (currentSeasonInfo) {
        if (nextEpisode < currentSeasonInfo.episode_count) {
          params.set("next_season", String(nextSeason));
          params.set("next_episode", String(nextEpisode + 1));
        } else {
          const idx = realSeasons.findIndex((s) => s.season_number === nextSeason);
          if (idx !== -1 && idx < realSeasons.length - 1) {
            params.set("next_season", String(realSeasons[idx + 1].season_number));
            params.set("next_episode", "1");
          }
        }
      }
    }

    router.push(`/player?${params}`);
  }, [nextSeason, nextEpisode, tmdbId, sourceId, title, router]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
  }, []);

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

  // Start the initial hide timer on mount
  useEffect(() => {
    showControls();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showControls]);

  useShortcutScope(shortcutsScopes.player);

  useShortcut(shortcutsScopes.player, "player.togglePlay", (e) => {
    e.preventDefault();
    togglePlay();
  });

  useShortcut(shortcutsScopes.player, "player.skipBackward", (e) => {
    // Let the focused progress bar slider handle its own ArrowLeft seek
    e.preventDefault();
    skip(-10);
  });

  useShortcut(shortcutsScopes.player, "player.skipForward", (e) => {
    e.preventDefault();
    skip(10);
  });

  useShortcut(shortcutsScopes.player, "player.nextEpisode", (e) => {
    console.log("Next episode shortcut triggered");
    e.preventDefault();
    handleNextEpisode?.();
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
  // Show controls on any keydown or mouse move
  useEffect(() => {
    document.addEventListener("mousemove", showControls);
    return () => {
      document.removeEventListener("mousemove", showControls);
    };
  }, [showControls]);

  return (
    <>
      {titleId && <ProgressSaver titleId={titleId} />}
      <PlayerControls
        className={[
          "transition-opacity duration-300",
          controlsVisible
            ? "opacity-100 cursor-default"
            : "opacity-0 pointer-events-none cursor-none",
        ].join(" ")}
        onMouseMove={showControls}
        onClick={showControls}
      >
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
                onNext={handleNextEpisode}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayerPage() {
  const searchParams = useSearchParams();
  const url = decodeURIComponent(searchParams.get("url") ?? "");
  // const url = "https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8"; // 480p only
  // const url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; //decodeURIComponent(searchParams.get("url") ?? "");
  const title = decodeURIComponent(searchParams.get("title") ?? "");
  const imdbId = searchParams.get("imdb_id") ?? undefined;
  const tmdbId = searchParams.get("tmdb_id") ? Number(searchParams.get("tmdb_id")) : undefined;
  const season = searchParams.get("season") ? Number(searchParams.get("season")) : undefined;
  const episode = searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined;
  const sourceId = searchParams.get("source_id") ?? undefined;
  const nextSeason = searchParams.get("next_season")
    ? Number(searchParams.get("next_season"))
    : undefined;
  const nextEpisode = searchParams.get("next_episode")
    ? Number(searchParams.get("next_episode"))
    : undefined;
  const titleId = buildTitleId(tmdbId, season, episode);

  if (!url) return <p className="text-muted-foreground">No video URL provided.</p>;

  return (
    <main className="h-screen w-screen overflow-hidden">
      <Player
        src={url}
        className="w-full h-full bg-black"
        maxRecoveryAttempts={3}
        onFatalError={(err) => console.error("Fatal HLS error", err)}
        autoPlay
      >
        <PlayerUI
          title={title}
          titleId={titleId}
          imdbId={imdbId}
          tmdbId={tmdbId}
          season={season}
          episode={episode}
          sourceId={sourceId}
          nextSeason={nextSeason}
          nextEpisode={nextEpisode}
        />
      </Player>
    </main>
  );
}
