"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import useSWR from "swr";
import type { SubtitleTrack } from "@/lib/types";
import { PlayerPrefs, TitleStorage } from "@/lib/player-storage";
import { subtitles } from "@/services/api.service";
import { usePlayerStore } from "./player-store";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function getLanguageName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div>
      <p className="text-white/60 text-sm mb-3">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} />
        </button>
        <span className="text-white text-base font-medium w-16 text-center">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

interface SubtitlesPanelProps {
  imdbId?: string;
  tmdbId?: number;
  season?: number;
  episode?: number;
  titleId?: string | null;
  onSelectTrack?: (track: SubtitleTrack) => void;
  onClearSelection?: () => void;
  onDelayChange?: (value: number) => void;
  onFontSizeChange?: (value: number) => void;
  onVerticalPosChange?: (value: number) => void;
}

export function SubtitlesPanel({
  imdbId,
  tmdbId,
  season,
  episode,
  titleId,
  onSelectTrack,
  onClearSelection,
  onDelayChange,
  onFontSizeChange,
  onVerticalPosChange,
}: SubtitlesPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const activeExternalTrackId = usePlayerStore((s) => s.activeExternalTrackId);
  const delay = usePlayerStore((s) => s.subtitleDelay);
  const fontSize = usePlayerStore((s) => s.subtitleFontSize);
  const verticalPos = usePlayerStore((s) => s.subtitleVerticalPosition);

  const { data: subtitlesData, isLoading: loading } = useSWR(
    imdbId || tmdbId ? ["subtitles", imdbId, tmdbId, season, episode] : null,
    () => subtitles.search({ imdb_id: imdbId, tmdb_id: tmdbId, season, episode }),
  );
  const tracks: SubtitleTrack[] =
    subtitlesData && !("error" in subtitlesData) ? (subtitlesData.tracks ?? []) : [];

  // Auto-select preferred language once tracks load (runs only once per load)
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    autoSelectedRef.current = false;
  }, [imdbId, tmdbId, season, episode]);

  // Auto-select language when tracks become available:
  // prefer the currently-active track's language, fall back to saved preference
  useEffect(() => {
    if (autoSelectedRef.current || tracks.length === 0) return;
    if (activeExternalTrackId) {
      const activeTrack = tracks.find((t) => t.id === activeExternalTrackId);
      if (activeTrack) {
        autoSelectedRef.current = true;
        setSelectedLanguage(activeTrack.language);
        return;
      }
    }
    const preferred = PlayerPrefs.subtitleLanguage.get();
    if (preferred && tracks.some((t) => t.language === preferred)) {
      autoSelectedRef.current = true;
      setSelectedLanguage(preferred);
    }
  }, [tracks, activeExternalTrackId]);

  const byLanguage: Record<string, SubtitleTrack[]> = {};
  for (const track of tracks) {
    if (!byLanguage[track.language]) byLanguage[track.language] = [];
    byLanguage[track.language].push(track);
  }
  const languages = Object.keys(byLanguage);
  const currentLanguageTracks = selectedLanguage ? (byLanguage[selectedLanguage] ?? []) : [];

  const handleSelectTrack = async (track: SubtitleTrack) => {
    if (downloadingId) return;
    setDownloadError(null);
    setDownloadingId(track.id);
    try {
      const res = await fetch(track.download_url);
      if (res.status === 429) {
        const data = (await res.json()) as { message?: string };
        setDownloadError(
          data.message ?? "Subtitle download limit reached for today. Try again tomorrow.",
        );
        setDownloadingId(null);
        return;
      }
      if (!res.ok) {
        setDownloadError("Failed to download subtitles. Please try another track.");
        setDownloadingId(null);
        return;
      }
      onSelectTrack?.(track);
      PlayerPrefs.subtitleLanguage.set(track.language);
      if (titleId) {
        TitleStorage.patch(titleId, {
          subtitleTrackId: track.id,
          subtitleDownloadUrl: track.download_url,
        });
      }
    } catch {
      setDownloadError("An error occurred while downloading subtitles.");
    }
    setDownloadingId(null);
  };

  const handleOff = () => {
    onClearSelection?.();
    setDownloadError(null);
    if (titleId) {
      TitleStorage.patch(titleId, { subtitleTrackId: undefined, subtitleDownloadUrl: undefined });
    }
  };

  const delayLabel = `${delay >= 0 ? "" : ""}${delay.toFixed(1)}s`;

  return (
    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl flex overflow-hidden">
      {/* Column 1: Languages */}
      <div className="w-52 border-r border-white/10 flex-shrink-0">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest px-5 py-4 border-b border-white/10">
          Subtitles Languages
        </p>
        <div className="overflow-y-auto max-h-64 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={handleOff}
            className={cn(
              "w-full text-left px-5 py-3 text-sm transition-colors",
              !activeExternalTrackId
                ? "bg-white/15 text-white font-medium"
                : "text-white/80 hover:bg-white/5",
            )}
          >
            OFF
          </button>
          {loading ? (
            <p className="px-5 py-3 text-white/40 text-sm">Searching…</p>
          ) : languages.length === 0 ? (
            <p className="px-5 py-3 text-white/30 text-sm">
              {imdbId || tmdbId ? "No subtitles found" : "No ID provided"}
            </p>
          ) : (
            languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={cn(
                  "w-full text-left px-5 py-3 text-sm transition-colors",
                  selectedLanguage === lang
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/80 hover:bg-white/5",
                )}
              >
                {getLanguageName(lang)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Column 2: Variants */}
      <div className="w-52 border-r border-white/10 flex-shrink-0">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest px-5 py-4 border-b border-white/10">
          Subtitles Variants
        </p>
        <div className="overflow-y-auto max-h-64 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {currentLanguageTracks.length === 0 ? (
            <p className="px-5 py-3 text-white/30 text-sm">
              {selectedLanguage ? "No variants" : "Select a language"}
            </p>
          ) : (
            currentLanguageTracks.map((track) => {
              const isActive = activeExternalTrackId === track.id;
              const isDownloading = downloadingId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectTrack(track)}
                  disabled={!!downloadingId}
                  className={cn(
                    "w-full text-left px-5 py-3 transition-colors",
                    isActive ? "bg-white/15" : "hover:bg-white/5",
                    downloadingId && !isDownloading ? "opacity-50" : "",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white truncate min-w-0">
                      {track.release_name
                        ? track.release_name.slice(0, 28)
                        : `OpenSubtitles ${track.format.toUpperCase()}`}
                    </p>
                    {isDownloading && <span className="text-white/40 text-xs shrink-0">…</span>}
                    {isActive && !isDownloading && (
                      <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
          {downloadError && <p className="px-5 py-2 text-red-400 text-xs">{downloadError}</p>}
        </div>
      </div>

      {/* Column 3: Settings */}
      <div className="w-52 flex-shrink-0">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest px-5 py-4 border-b border-white/10">
          Subtitles Settings
        </p>
        <div className="px-5 py-5 flex flex-col gap-5">
          <Stepper
            label="Delay"
            value={delayLabel}
            onDecrement={() => onDelayChange?.(Math.round((delay - 0.5) * 10) / 10)}
            onIncrement={() => onDelayChange?.(Math.round((delay + 0.5) * 10) / 10)}
          />
          <Stepper
            label="Size"
            value={`${fontSize}%`}
            onDecrement={() => onFontSizeChange?.(Math.max(25, fontSize - 5))}
            onIncrement={() => onFontSizeChange?.(Math.min(200, fontSize + 5))}
          />
          <Stepper
            label="Vertical Position"
            value={`${verticalPos}%`}
            onDecrement={() => onVerticalPosChange?.(Math.max(0, verticalPos - 5))}
            onIncrement={() => onVerticalPosChange?.(Math.min(50, verticalPos + 5))}
          />
        </div>
      </div>
    </div>
  );
}
