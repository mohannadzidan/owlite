import { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import Hls, { ErrorData, Events, HlsConfig } from "hls.js";
import { createPlayerStore, PlayerStoreContext, QualityLevel, TextTrackInfo } from "./player-store";
import { SubtitleOverlay } from "./subtitle-overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerProps extends Omit<ComponentProps<"video">, "src" | "children"> {
  /** Video / HLS stream URL (.m3u8) or any plain media URL (mp4, webm, …) */
  src: string;
  /** Composable controls / overlays rendered on top of the video */
  children?: ReactNode;
  /** Called on unrecoverable errors */
  onFatalError?: (data: ErrorData) => void;
  /** hls.js config overrides (only applied for HLS streams) */
  hlsConfig?: Partial<HlsConfig>;
  /** Max recovery attempts before giving up (default: 3) */
  maxRecoveryAttempts?: number;
  /** Container className (the div wrapping video + children) */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHlsSrc(src: string): boolean {
  try {
    const url = new URL(src, window.location.href);
    if (url.pathname.endsWith(".m3u8")) return true;
    if (url.searchParams.get("type") === "hls") return true;
    // Proxy URLs don't carry a .m3u8 extension but are always HLS manifests
    if (url.pathname === "/api/hls-proxy") return true;
  } catch {
    if (src.includes(".m3u8")) return true;
    if (src.includes("/api/hls-proxy")) return true;
  }
  return false;
}

function supportsNativeHLS(video: HTMLVideoElement): boolean {
  return !Hls.isSupported() && video.canPlayType("application/vnd.apple.mpegurl") !== "";
}

function getBufferedEnd(video: HTMLVideoElement): number {
  if (!video.duration || !video.buffered.length) return 0;
  return video.buffered.end(video.buffered.length - 1) / video.duration;
}

function readTextTracks(video: HTMLVideoElement): TextTrackInfo[] {
  const tracks: TextTrackInfo[] = [];
  for (let i = 0; i < video.textTracks.length; i++) {
    const t = video.textTracks[i];
    if (t.kind === "subtitles" || t.kind === "captions") {
      tracks.push({ index: i, label: t.label, language: t.language });
    }
  }
  return tracks;
}

function mapHlsLevels(hls: Hls): QualityLevel[] {
  return hls.levels.map((l, i) => ({
    index: i,
    height: l.height ?? 0,
    bitrate: l.bitrate,
    name: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Player({
  src,
  children,
  onFatalError,
  hlsConfig,
  maxRecoveryAttempts = 3,
  className,
  ...videoProps
}: PlayerProps) {
  const store = useMemo(() => createPlayerStore(), []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const onFatalErrorRef = useRef(onFatalError);
  useEffect(() => {
    onFatalErrorRef.current = onFatalError;
  }, [onFatalError]);

  // ── Sync native video events → store ──────────────────────────────────────
  const attachVideoListeners = useCallback(
    (video: HTMLVideoElement) => {
      const s = store.getState();

      const onLoadStart = () => s.setPlaybackState("loading");
      const onCanPlay = () => {
        // canplay fires multiple times (buffering, quality switches) — reflect actual video state
        if (video.ended) s.setPlaybackState("ended");
        else if (!video.paused) s.setPlaybackState("playing");
        else s.setPlaybackState("paused");
        s.setDuration(video.duration || 0);
        s.setSubtitles(readTextTracks(video));
      };
      const onDurationChange = () => s.setDuration(video.duration || 0);
      const onTimeUpdate = () => {
        s.setCurrentTime(video.currentTime);
        s.setBuffered(getBufferedEnd(video));
      };
      const onPlay = () => s.setPlaybackState("playing");
      const onPause = () => s.setPlaybackState("paused");
      const onEnded = () => s.setPlaybackState("ended");
      const onError = () => s.setPlaybackState("error");
      const onVolumeChange = () => {
        s.setVolume(video.volume);
        s.setMuted(video.muted);
      };

      video.addEventListener("loadstart", onLoadStart);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("durationchange", onDurationChange);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("ended", onEnded);
      video.addEventListener("error", onError);
      video.addEventListener("volumechange", onVolumeChange);

      return () => {
        video.removeEventListener("loadstart", onLoadStart);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("durationchange", onDurationChange);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", onError);
        video.removeEventListener("volumechange", onVolumeChange);
      };
    },
    [store],
  );

  // ── Plain / native path ────────────────────────────────────────────────────
  const attachNative = useCallback(
    (video: HTMLVideoElement) => {
      const cleanupListeners = attachVideoListeners(video);
      video.volume = 1;
      video.muted = false;
      video.src = src;
      return () => {
        cleanupListeners();
        video.removeAttribute("src");
        video.load();
      };
    },
    [src, attachVideoListeners],
  );

  // ── hls.js path ───────────────────────────────────────────────────────────
  const attachHls = useCallback(
    (video: HTMLVideoElement) => {
      recoveryAttemptsRef.current = 0;
      store.getState().setPlaybackState("loading");

      const hls = new Hls({ enableWorker: true, ...hlsConfig });
      hlsRef.current = hls;

      const cleanupListeners = attachVideoListeners(video);
      hls.loadSource(src);
      hls.attachMedia(video);

      video.volume = 1;
      video.muted = false;

      hls.on(Events.MANIFEST_PARSED, () => {
        store.getState().setHlsInstance(hls);
        store.getState().setQualityLevels(mapHlsLevels(hls));
        hls.currentLevel = store.getState().activeQualityLevel ?? -1;
        store.getState().setDuration(video.duration || 0);
      });

      hls.on(Events.ERROR, (_e, data) => {
        if (!data.fatal) return;

        const attempt = ++recoveryAttemptsRef.current;
        if (attempt > maxRecoveryAttempts) {
          store.getState().setPlaybackState("error");
          onFatalErrorRef.current?.(data);
          hls.destroy();
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setTimeout(() => hls.startLoad(), Math.min(1000 * 2 ** attempt, 16_000));
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          store.getState().setPlaybackState("error");
          onFatalErrorRef.current?.(data);
          hls.destroy();
        }
      });

      return () => {
        cleanupListeners();
        store.getState().setHlsInstance(null);
        store.getState().setQualityLevels([]);
        hls.destroy();
        hlsRef.current = null;
      };
    },
    [src, hlsConfig, maxRecoveryAttempts, store, attachVideoListeners],
  );

  // ── Mount / src change ─────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    store.getState().setVideoEl(video);

    if (!isHlsSrc(src)) return attachNative(video);
    if (supportsNativeHLS(video)) return attachNative(video);
    if (Hls.isSupported()) return attachHls(video);

    console.error("[Player] HLS playback is not supported in this browser.");
    store.getState().setPlaybackState("error");
  }, [src, store, attachNative, attachHls]);

  // ── Cleanup store videoEl on unmount ──────────────────────────────────────
  useEffect(() => () => store.getState().setVideoEl(null), [store]);

  return (
    <PlayerStoreContext.Provider value={store}>
      <div
        className={className}
        style={{ position: "relative", display: "inline-block", top: 0, left: 0 }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          {...videoProps}
          style={{ display: "block", width: "100%", height: "100%", ...videoProps.style }}
        />
        <SubtitleOverlay />
        {children}
      </div>
    </PlayerStoreContext.Provider>
  );
}

export default Player;
