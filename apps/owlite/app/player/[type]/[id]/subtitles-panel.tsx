"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, HardDrive, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import type { SubtitleTrack } from "@/lib/types";
import { profileService } from "@/services/profile.service";
import { getClientProfileId } from "@/lib/profile-id";
import { useProfilePreferences } from "@/hooks/use-profile-preferences";
import { subtitles } from "@/services/api.service";
import { url as apiUrl } from "@/services/api-client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePlayerStore } from "./player-store";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest w-20">
          {label}
        </p>
        <button
          type="button"
          onClick={onDecrement}
          className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={14} />
        </button>
        <span className="text-white text-sm font-medium w-14 text-center flex-1">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
          aria-label={`Increase ${label}`}
        >
          <Plus size={14} />
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
  fileName?: string;
  onSelectTrack?: (track: SubtitleTrack) => void;
  onClearSelection?: () => void;
  onDelayChange?: (value: number) => void;
  onFontSizeChange?: (value: number) => void;
  onVerticalPosChange?: (value: number) => void;
  trigger: React.ReactNode;
}

export function SubtitlesPanel({
  imdbId,
  tmdbId,
  season,
  episode,
  fileName,
  onSelectTrack,
  onClearSelection,
  onDelayChange,
  onFontSizeChange,
  onVerticalPosChange,
  trigger,
}: SubtitlesPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { preferences, patchPreferences } = useProfilePreferences();

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

  const autoSelectedRef = useRef(false);

  useEffect(() => {
    autoSelectedRef.current = false;
  }, [imdbId, tmdbId, season, episode]);

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
    const preferred = preferences.subtitleLanguage;
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
      const res = await fetch(apiUrl(track.download_url));
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
      void patchPreferences({ subtitleLanguage: track.language });
      const profileId = getClientProfileId();
      if (tmdbId && profileId) {
        void profileService.saveSubtitles(profileId, tmdbId, track.id, season, episode);
      }
    } catch {
      setDownloadError("An error occurred while downloading subtitles.");
    }
    setDownloadingId(null);
  };

  const handleOff = () => {
    onClearSelection?.();
    setDownloadError(null);
    const profileId = getClientProfileId();
    if (tmdbId && profileId) {
      void profileService.saveSubtitles(profileId, tmdbId, "", season, episode);
    }
  };

  const delayLabel = `${delay.toFixed(1)}s`;
  const step = selectedLanguage ? "variants" : "languages";

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-[26rem] sm:max-w-[26rem] bg-black/95 border-white/10 text-white flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-white/10 shrink-0">
          <SheetTitle className="text-white text-sm flex gap-2 items-center text-muted-foreground font-semibold">
            {step === "variants" && (
              <Button
                onClick={() => setSelectedLanguage(null)}
                aria-label="Back to languages"
                variant="ghost"
              >
                <ChevronLeft size={16} />
              </Button>
            )}
            {step === "languages" ? "Subtitles" : getLanguageName(selectedLanguage!)}
          </SheetTitle>
          {fileName && (
            <p className="text-white/40 text-xs truncate mt-1" title={fileName}>
              {fileName}
            </p>
          )}
        </SheetHeader>

        {/* Step 1 — Language list */}
        {step === "languages" && (
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={handleOff}
              className={cn(
                "w-full text-left px-6 py-4 text-sm transition-colors border-b border-white/5",
                !activeExternalTrackId
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:bg-white/5",
              )}
            >
              Off
            </button>
            {loading ? (
              <p className="px-6 py-4 text-white/40 text-sm">Searching…</p>
            ) : languages.length === 0 ? (
              <p className="px-6 py-4 text-white/30 text-sm">
                {imdbId || tmdbId ? "No subtitles found" : "No ID provided"}
              </p>
            ) : (
              languages.map((lang) => {
                const langTracks = byLanguage[lang] ?? [];
                const isActive = langTracks.some((t) => t.id === activeExternalTrackId);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={cn(
                      "w-full text-left px-6 py-4 text-sm transition-colors border-b border-white/5 flex items-center justify-between",
                      "text-white/70 hover:bg-white/5",
                    )}
                  >
                    <span className={cn(isActive && "text-white font-medium")}>
                      {getLanguageName(lang)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/30 text-xs">{langTracks.length}</span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-green-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Step 2 — Variant list */}
        {step === "variants" && (
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {currentLanguageTracks.map((track) => {
              const isActive = activeExternalTrackId === track.id;
              const isDownloading = downloadingId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectTrack(track)}
                  disabled={!!downloadingId}
                  className={cn(
                    "w-full text-left px-6 py-4 transition-colors border-b border-white/5",
                    isActive ? "bg-white/15" : "hover:bg-white/5",
                    downloadingId && !isDownloading ? "opacity-50" : "",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {track.provider === "local" ? (
                        <HardDrive className="size-4 shrink-0 text-white/50" />
                      ) : (
                        <Globe className="size-4 shrink-0 text-white/50" />
                      )}
                      <p className="text-sm text-white truncate">
                        {track.release_name
                          ? track.release_name
                          : `OpenSubtitles ${track.format.toUpperCase()}`}
                      </p>
                    </div>
                    {isDownloading && <span className="text-white/40 text-xs shrink-0">…</span>}
                    {isActive && !isDownloading && (
                      <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
            {downloadError && <p className="px-6 py-3 text-red-400 text-xs">{downloadError}</p>}
          </div>
        )}

        {/* Settings — always visible at bottom */}
        <div className="shrink-0 border-t border-white/10 px-6 py-5 flex flex-col gap-4 items-stretch">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">
            Settings
          </p>
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
            label="Position"
            value={`${verticalPos}%`}
            onDecrement={() => onVerticalPosChange?.(Math.max(0, verticalPos - 5))}
            onIncrement={() => onVerticalPosChange?.(Math.min(50, verticalPos + 5))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
