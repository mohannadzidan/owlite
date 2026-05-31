import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import type { StoreApi } from "zustand";
import type Hls from "hls.js";
import { PlayerPrefs } from "@/lib/player-storage";

// ─── State shape ──────────────────────────────────────────────────────────────

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error" | "ended";

export interface TextTrackInfo {
  index: number;
  label: string;
  language: string;
}

export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  name: string;
}

export interface PlayerState {
  // Playback
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  buffered: number; // 0–1 fraction
  volume: number; // 0–1
  muted: boolean;
  playbackRate: number;

  // Metadata
  activeSubtitleIndex: number | null; // null = off
  subtitles: TextTrackInfo[];

  // External subtitles (OpenSubtitles)
  externalSubtitleUrl: string | null;
  activeExternalTrackId: string | null;
  subtitleDelay: number; // seconds; positive = show later
  subtitleFontSize: number; // percentage, e.g. 75
  subtitleVerticalPosition: number; // % from bottom, e.g. 5

  // Quality
  qualityLevels: QualityLevel[];
  activeQualityLevel: number; // -1 = auto

  // Internal refs — not reactive, just stored here for actions to reach
  videoEl: HTMLVideoElement | null;
  hlsInstance: Hls | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setVideoEl: (el: HTMLVideoElement | null) => void;
  setHlsInstance: (hls: Hls | null) => void;
  setPlaybackState: (s: PlaybackState) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setBuffered: (b: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setSubtitles: (tracks: TextTrackInfo[]) => void;
  setQualityLevels: (levels: QualityLevel[]) => void;
  setActiveQualityLevel: (level: number) => void;
  setExternalSubtitleUrl: (url: string | null) => void;
  setActiveExternalTrackId: (id: string | null) => void;
  setSubtitleDelay: (delay: number) => void;
  setSubtitleFontSize: (size: number) => void;
  setSubtitleVerticalPosition: (pos: number) => void;

  // ── Dispatched actions ────────────────────────────────────────────────────
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setActiveSubtitle: (index: number | null) => void;
  setQualityLevel: (level: number) => void;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPlayerStore() {
  return createStore<PlayerState>((set, get) => ({
    playbackState: "idle",
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
    activeSubtitleIndex: null,
    subtitles: [],
    externalSubtitleUrl: null,
    activeExternalTrackId: null,
    subtitleDelay: 0,
    subtitleFontSize: PlayerPrefs.subtitleFontSize.get(),
    subtitleVerticalPosition: PlayerPrefs.subtitleVerticalPosition.get(),
    qualityLevels: [],
    activeQualityLevel: PlayerPrefs.qualityLevel.get(),
    videoEl: null,
    hlsInstance: null,

    setVideoEl: (el) => set({ videoEl: el }),
    setHlsInstance: (hls) => set({ hlsInstance: hls }),
    setPlaybackState: (playbackState) => set({ playbackState }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setBuffered: (buffered) => set({ buffered }),
    setVolume: (volume) => set({ volume }),
    setMuted: (muted) => set({ muted }),
    setSubtitles: (subtitles) => set({ subtitles }),
    setQualityLevels: (qualityLevels) => set({ qualityLevels }),
    setActiveQualityLevel: (activeQualityLevel) => set({ activeQualityLevel }),
    setExternalSubtitleUrl: (externalSubtitleUrl) => set({ externalSubtitleUrl }),
    setActiveExternalTrackId: (activeExternalTrackId) => set({ activeExternalTrackId }),
    setSubtitleDelay: (subtitleDelay) => set({ subtitleDelay }),
    setSubtitleFontSize: (subtitleFontSize) => {
      PlayerPrefs.subtitleFontSize.set(subtitleFontSize);
      set({ subtitleFontSize });
    },
    setSubtitleVerticalPosition: (subtitleVerticalPosition) => {
      PlayerPrefs.subtitleVerticalPosition.set(subtitleVerticalPosition);
      set({ subtitleVerticalPosition });
    },

    play: () => get().videoEl?.play(),
    pause: () => get().videoEl?.pause(),
    togglePlay: () => {
      const { videoEl, playbackState } = get();
      if (!videoEl) return;
      if (playbackState === "playing") {
        videoEl.pause();
      } else {
        videoEl.play();
      }
    },
    seek: (time) => {
      const { videoEl, duration } = get();
      if (!videoEl) return;
      videoEl.currentTime = Math.max(0, Math.min(time, duration));
    },
    skip: (seconds) => {
      const { videoEl, currentTime, duration } = get();
      if (!videoEl) return;
      videoEl.currentTime = Math.max(0, Math.min(currentTime + seconds, duration));
    },
    setActiveSubtitle: (index) => {
      const { videoEl } = get();
      if (!videoEl) return;

      const tracks = videoEl.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = i === index ? "showing" : "hidden";
      }
      set({ activeSubtitleIndex: index });
    },
    setQualityLevel: (level) => {
      const { hlsInstance } = get();
      if (hlsInstance && hlsInstance.levels.length - 1 > level) {
        hlsInstance.currentLevel = hlsInstance.levels.length - 1;
      } else if (hlsInstance) hlsInstance.currentLevel = level;
      PlayerPrefs.qualityLevel.set(level);
      set({ activeQualityLevel: level });
    },
  }));
}

// ─── Context + hook ───────────────────────────────────────────────────────────

export type PlayerStoreApi = StoreApi<PlayerState>;

export const PlayerStoreContext = createContext<PlayerStoreApi | null>(null);

export function usePlayerStore<T>(selector: (state: PlayerState) => T): T {
  const store = useContext(PlayerStoreContext);
  if (!store) throw new Error("usePlayerStore must be used inside <Player>");
  return useStore(store, selector);
}
