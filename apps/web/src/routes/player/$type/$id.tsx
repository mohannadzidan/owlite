import { createFileRoute } from "@tanstack/react-router";
import SelectSourceDialog from "@/player/select-source-page";
import useSWR from "swr";
import { sources } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import ErrorFallback from "@/components/error";
import { errorThrower } from "@/services/request";
import FullScreenSpinner from "@/components/fullscreen-spinner";
import Player from "@/player/player";
import { useCallback, useEffect, useRef } from "react";
import { usePlayerStore, usePlayerStoreApi } from "@/player/player-store";
import type { SubtitleTrack } from "@/lib/types";
import { shortcutsScopes, useShortcut, useShortcutScope } from "@/lib/shortcuts";
import { PlayerControls } from "@/player/player-controls";
import { profileService } from "@/services/profile.service";
import { getClientProfileId } from "@/lib/profile-id";
import { subtitles as subtitlesService } from "@/services/api.service";
import { url as apiUrl } from "@/services/api-client";
import { ArrowLeft } from "lucide-react";
import FullScreenButton from "@/components/fullscreen-button";
import { tmdb } from "@/services/tmdb.service";
import { useProfilePreferences } from "@/hooks/use-profile-preferences";

export const Route = createFileRoute("/player/$type/$id")({
  validateSearch: (search) => ({
    season: typeof search.season === "string" ? search.season : undefined,
    episode: typeof search.episode === "string" ? search.episode : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
  }),
  component: PlayerPage,
});

interface PlayerUIProps {
  title: string;
  tmdbId: number;
  imdbId?: string;
  season?: number;
  episode?: number;
  nextSeason?: number;
  nextEpisode?: number;
  episodeTitle?: string;
  fileName?: string;
  onNextEpisode?: () => void;
}

function ProgressSaver({
  tmdbId,
  season,
  episode,
}: {
  tmdbId: number;
  season?: number;
  episode?: number;
}) {
  const profileId = getClientProfileId();
  const playbackState = usePlayerStore((s) => s.playbackState);
  const seek = usePlayerStore((s) => s.seek);
  const duration = usePlayerStore((s) => s.duration);
  const setActiveExternalTrackId = usePlayerStore((s) => s.setActiveExternalTrackId);
  const currentTimeRef = useRef(0);
  const playerApi = usePlayerStoreApi();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!profileId) return;
    profileService.getSubtitles(profileId, tmdbId, season, episode).then((trackId) => {
      if (trackId) setActiveExternalTrackId(trackId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, tmdbId, season, episode]);

  useEffect(() => {
    return playerApi.subscribe((state) => (currentTimeRef.current = state.currentTime));
  }, [playerApi]);

  useEffect(() => {
    if (!profileId) return;
    void profileService.patchProgress(profileId, tmdbId, { total: duration }, season, episode);
  }, [profileId, duration, episode, season, tmdbId]);

  useEffect(() => {
    if (restoredRef.current) return;
    if (playbackState !== "playing" && playbackState !== "paused") return;
    restoredRef.current = true;
    if (!profileId) return;
    profileService.getProgress(profileId, tmdbId, season, episode).then((saved) => {
      if (saved && saved.watched > 5) seek(saved.watched);
    });
  }, [profileId, playbackState, tmdbId, season, episode, seek]);

  useEffect(() => {
    if (playbackState !== "paused" && playbackState !== "ended") return;
    if (!profileId) return;
    void profileService.patchProgress(
      profileId,
      tmdbId,
      { watched: currentTimeRef.current },
      season,
      episode,
    );
  }, [profileId, playbackState, tmdbId, season, episode]);

  useEffect(() => {
    if (playbackState !== "playing") return;
    if (!profileId) return;
    const id = setInterval(() => {
      void profileService.patchProgress(
        profileId,
        tmdbId,
        { watched: currentTimeRef.current },
        season,
        episode,
      );
    }, 5_000);
    return () => clearInterval(id);
  }, [profileId, playbackState, tmdbId, season, episode]);

  return null;
}

function FavoriteSubtitleApplier({
  tmdbId,
  imdbId,
  season,
  episode,
}: {
  tmdbId: number;
  imdbId?: string;
  season?: number;
  episode?: number;
}) {
  const profileId = getClientProfileId();
  const activeExternalTrackId = usePlayerStore((s) => s.activeExternalTrackId);
  const setExternalSubtitleUrl = usePlayerStore((s) => s.setExternalSubtitleUrl);
  const setActiveExternalTrackId = usePlayerStore((s) => s.setActiveExternalTrackId);
  const { preferences } = useProfilePreferences();

  const { data } = useSWR(
    imdbId || tmdbId ? ["subtitles", imdbId, tmdbId, season, episode] : null,
    () => subtitlesService.search({ imdb_id: imdbId, tmdb_id: tmdbId, season, episode }),
  );

  const tracks: SubtitleTrack[] = data && !("error" in data) ? (data.tracks ?? []) : [];

  const appliedRef = useRef(false);

  useEffect(() => {
    appliedRef.current = false;
  }, [imdbId, tmdbId, season, episode]);

  useEffect(() => {
    const preferred = preferences.subtitleLanguage;
    const favTrack =
      tracks.filter((t) => t.isFavorite && t.provider === "local" && t.language === preferred)[0] ??
      null;
    if (!favTrack) return;
    if (
      appliedRef.current ||
      tracks.length === 0 ||
      !activeExternalTrackId ||
      activeExternalTrackId !== favTrack.id
    ) {
      return;
    }

    appliedRef.current = true;
    if (profileId)
      void profileService.saveSubtitles(profileId, tmdbId, favTrack.id, season, episode);
    setExternalSubtitleUrl(apiUrl(favTrack.download_url));
    setActiveExternalTrackId(favTrack.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, activeExternalTrackId, tracks.length]);

  return null;
}

function PrefsInitializer() {
  const { preferences } = useProfilePreferences();
  const setSubtitleFontSize = usePlayerStore((s) => s.setSubtitleFontSize);
  const setSubtitleVerticalPosition = usePlayerStore((s) => s.setSubtitleVerticalPosition);
  const setQualityLevel = usePlayerStore((s) => s.setQualityLevel);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setSubtitleFontSize(preferences.subtitleFontSize);
    setSubtitleVerticalPosition(preferences.subtitleVerticalPosition);
    setQualityLevel(preferences.qualityLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  return null;
}

function PlayerUI({
  title,
  tmdbId,
  imdbId,
  season,
  episode,
  nextSeason,
  nextEpisode,
  onNextEpisode,
  episodeTitle,
  fileName,
}: PlayerUIProps) {
  useShortcutScope(shortcutsScopes.player);
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
      setExternalSubtitleUrl(apiUrl(track.download_url));
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
      <PrefsInitializer />
      <ProgressSaver tmdbId={tmdbId} season={season} episode={episode} />
      <FavoriteSubtitleApplier tmdbId={tmdbId} imdbId={imdbId} season={season} episode={episode} />
      <PlayerControls>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

        <div className="relative flex items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-white hover:opacity-70 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft size={28} strokeWidth={1.5} />
          </button>
          {title && (
            <span className="text-white font-semibold text-base tracking-wide">
              {title} {!!episode && `E${episode}`}
              {episodeTitle && !episodeTitle.match(/^Episode \d+$/) && (
                <span className="ms-2 text-gray-400 font-normal"> {episodeTitle}</span>
              )}
            </span>
          )}
          <FullScreenButton />
        </div>

        <div className="relative flex-1 flex justify-center items-center gap-4">
          <PlayerControls.ScreenRewind seconds={10} className="text-white" onSkip={skip} />
          <PlayerControls.ScreenPlayPause className="text-white" onTogglePlay={togglePlay} />
          <PlayerControls.ScreenForward seconds={10} className="text-white" onSkip={skip} />
        </div>

        <div className="relative flex flex-col gap-4 px-6 pb-6">
          <div className="flex items-center gap-4">
            <PlayerControls.ProgressBar className="flex-1" onSeek={seek} />
            <PlayerControls.RemainingTime className="text-white text-sm tabular-nums shrink-0 opacity-90" />
          </div>

          <div className="flex justify-center items-center gap-10">
            <PlayerControls.Subtitles
              className="text-white text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
              imdbId={imdbId}
              tmdbId={tmdbId}
              season={season}
              episode={episode}
              fileName={fileName}
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

function PlayerPage() {
  const profileId = getClientProfileId();
  const navigate = Route.useNavigate();
  const { type, id } = Route.useParams();
  const { season, episode, source: sourceId } = Route.useSearch();
  const isTitleParametersOk = (type === "tv" && season && episode) || type === "movie";
  const movieTitleResponse = useSWR(
    type === "movie" ? ["tmdb.movies.details", id] : null,
    () => tmdb.movies.details(Number(id), ["external_ids"]),
    { revalidateOnFocus: false },
  );

  const tvTitleResponse = useSWR(
    type === "tv" ? ["tmdb.tvShows.details", id] : null,
    () => tmdb.tvShows.details(Number(id), ["external_ids"]),
    { revalidateOnFocus: false },
  );

  const playResponse = useSWR(
    sourceId &&
      isTitleParametersOk &&
      (type === "movie" ? movieTitleResponse.data : tvTitleResponse.data)
      ? [sourceId, type, id, season, episode]
      : null,
    () =>
      errorThrower(
        sources.play({
          source_id: sourceId!,
          imdb_id:
            type === "movie"
              ? movieTitleResponse.data!.external_ids.imdb_id!
              : tvTitleResponse.data!.external_ids.imdb_id!,
          media_type: type as "tv" | "movie",
          screenSize: Math.min(window.screen.width, window.screen.height),
          episode: episode ? parseInt(episode) : undefined,
          season: season ? parseInt(season) : undefined,
        }),
      ),
    { revalidateOnFocus: false },
  );

  const seasonDetails = useSWR(
    type === "tv" && season && ["tmdb.tvSeasons.details", id, season],
    () => tmdb.tvSeasons.details({ tvShowID: Number(id), seasonNumber: Number(season!) }),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  useEffect(() => {
    if (!profileId) return;
    if (tvTitleResponse.data?.id && tvTitleResponse.data.id === Number(id)) {
      void profileService.saveContinueWatching(profileId, {
        id: Number(id),
        type: "tv",
        lastWatch: Date.now(),
        name: tvTitleResponse.data.name,
        overview: tvTitleResponse.data.overview,
        season: Number(season!),
        episode: Number(episode!),
        backdrop_path: tvTitleResponse.data.backdrop_path,
        poster_path: tvTitleResponse.data.poster_path,
      });
    } else if (movieTitleResponse.data?.id && movieTitleResponse.data.id === Number(id)) {
      void profileService.saveContinueWatching(profileId, {
        id: Number(id),
        type: "movie",
        lastWatch: Date.now(),
        name: movieTitleResponse.data.title,
        overview: movieTitleResponse.data.overview,
        backdrop_path: movieTitleResponse.data.backdrop_path,
        poster_path: movieTitleResponse.data.poster_path ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, id, tvTitleResponse.data?.id, movieTitleResponse.data?.id]);

  if (!sourceId)
    return (
      <SelectSourceDialog type={type as "tv" | "movie"} season={season} episode={episode} id={id} />
    );

  if (
    tvTitleResponse.isLoading ||
    movieTitleResponse.isLoading ||
    playResponse.isLoading ||
    seasonDetails.isLoading
  ) {
    return <FullScreenSpinner />;
  }

  if (
    !isTitleParametersOk ||
    playResponse.error ||
    tvTitleResponse.error ||
    movieTitleResponse.error ||
    seasonDetails.error ||
    (!movieTitleResponse.data && !tvTitleResponse.data) ||
    !playResponse.data
  ) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center">
        {JSON.stringify([
          !isTitleParametersOk,
          playResponse.error,
          tvTitleResponse.error,
          movieTitleResponse.error,
          seasonDetails.error,
          !movieTitleResponse.data && !tvTitleResponse.data,
          !playResponse.data,
        ])}
        <ErrorFallback
          title="Something went wrong"
          message="Unexpected error occurred, please try again later."
        >
          <Button asChild>
            <Link to="/">Go back</Link>
          </Button>
        </ErrorFallback>
      </div>
    );
  }

  const streamUrl = new URL(
    playResponse.data!.type === "hls"
      ? playResponse.data!.master_manifest_url
      : playResponse.data!.url,
    import.meta.env.VITE_API_URL,
  ).toString();

  const title = type === "movie" ? movieTitleResponse.data!.title : tvTitleResponse.data!.name;
  const tmdbId = type === "movie" ? movieTitleResponse.data!.id : tvTitleResponse.data!.id;
  const imdbId =
    type === "movie"
      ? movieTitleResponse.data!.external_ids.imdb_id
      : tvTitleResponse.data!.external_ids.imdb_id;
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
      return navigate({
        search: { episode: "1", season: nextSeason!.toString(), source: sourceId },
      });
    }
    if (lastEpisodeOfSeason) {
      return void navigate({
        search: { episode: "1", season: ((nextSeason || 1) + 1).toString(), source: sourceId },
      });
    }
    navigate({
      search: { episode: nextEpisode.toString(), season, source: sourceId },
    });
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
        episodeTitle={
          seasonDetails?.data?.episodes.find((e) => e.episode_number === Number(episode))?.name
        }
        tmdbId={tmdbId}
        imdbId={imdbId}
        season={Number(season)}
        episode={Number(episode)}
        nextSeason={nextSeason}
        nextEpisode={nextEpisode}
        onNextEpisode={nextEpisodeHandler}
        fileName={playResponse.data.type === "hls" ? playResponse.data.fileName : undefined}
      />
    </Player>
  );
}
