import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { Play, Pause, RotateCcw, RotateCw, SkipForward, Subtitles, Settings } from "lucide-react";
import { usePlayerStore, usePlayerStoreApi } from "./player-store";
import { SubtitlesPanel } from "./subtitles-panel";
import type { SubtitleTrack } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { usePlayerUIStore } from "./player-ui-store";

const HIDE_DELAY_MS = 1400;

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── PlayerControls (root overlay) ───────────────────────────────────────────

function PlayerControls({ className, children, style, ...props }: ComponentProps<"div">) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const virtualCursorActive = useRemoteControlStore((s) => s.cursorActive);
  const isVisible = controlsVisible || virtualCursorActive;
  const setControlsVisibleInStore = usePlayerUIStore((s) => s.setControlsVisible);

  useEffect(() => {
    setControlsVisibleInStore(isVisible);
  }, [isVisible, setControlsVisibleInStore]);

  // Show controls on any keydown or mouse move
  useEffect(() => {
    const showControls = () => {
      setControlsVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY_MS);
    };
    document.addEventListener("mousemove", showControls);
    // Start the initial hide timer on mount
    showControls();
    return () => {
      document.removeEventListener("mousemove", showControls);
    };
  }, []);

  return (
    <div
      className={cn(
        "player-controls-overlay z-10 transition-opacity duration-300 opacity-100 cursor-default",
        !isVisible && "opacity-0 pointer-events-none cursor-none",
        className,
      )}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
      {...props}
    >
      {isVisible && children}
    </div>
  );
}

// ─── PlayPause ────────────────────────────────────────────────────────────────

type TogglePlayProps = ComponentProps<"button"> & { onTogglePlay?: () => void };

PlayerControls.PlayPause = function PlayPause({
  className,
  onTogglePlay,
  ...props
}: TogglePlayProps) {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const isPlaying = playbackState === "playing";

  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      className={className}
      onClick={onTogglePlay}
      {...props}
    >
      {isPlaying ? <Pause /> : <Play />}
    </button>
  );
};

function ScreenButton({
  className,
  children,
  icon: Icon,
  ...props
}: ComponentProps<"button"> & {
  icon: React.JSXElementConstructor<{ size: string | number; strokeWidth: number }>;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 w-[20vmin] rounded-full p-[1vmin]",
        "hover:bg-white/10 transition-colors",
        className,
      )}
      {...props}
    >
      <Icon size="100%" strokeWidth={0.75} />
      {children}
    </button>
  );
}

// ─── ScreenPlayPause (large centered button) ─────────────────────────────────

PlayerControls.ScreenPlayPause = function ScreenPlayPause({
  className,
  onTogglePlay,
  ...props
}: TogglePlayProps) {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const isPlaying = playbackState === "playing";
  return (
    <ScreenButton
      icon={isPlaying ? Pause : Play}
      className={className}
      onClick={onTogglePlay}
      {...props}
    />
  );
};

// ─── ScreenRewind ─────────────────────────────────────────────────────────────

interface SkipComponentProps extends ComponentProps<"button"> {
  seconds?: number;
  onSkip?: (deltaSeconds: number) => void;
}

PlayerControls.ScreenRewind = function ScreenRewind({
  className,
  seconds = 10,
  onSkip,
  ...props
}: SkipComponentProps) {
  return (
    <ScreenButton
      icon={RotateCcw}
      className={className}
      onClick={() => onSkip?.(-seconds)}
      {...props}
    >
      <span className="text-[100%] font-medium leading-none absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2">
        {seconds}
      </span>
    </ScreenButton>
  );
};

// ─── ScreenForward ────────────────────────────────────────────────────────────

PlayerControls.ScreenForward = function ScreenForward({
  className,
  seconds = 10,
  onSkip,
  ...props
}: SkipComponentProps) {
  return (
    <ScreenButton
      icon={RotateCw}
      className={className}
      onClick={() => onSkip?.(seconds)}
      {...props}
    >
      <span className="text-[100%] font-medium leading-none absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2">
        {seconds}
      </span>
    </ScreenButton>
  );
};

// ─── NextEpisode ──────────────────────────────────────────────────────────────

interface NextEpisodeProps extends ComponentProps<"button"> {
  onNext?: () => void;
}

PlayerControls.NextEpisode = function NextEpisode({
  className,
  onNext,
  children,
  ...props
}: NextEpisodeProps) {
  return (
    <button
      type="button"
      aria-label="Next episode"
      className={cn("flex items-center gap-2", className)}
      onClick={onNext}
      {...props}
    >
      <SkipForward size={20} strokeWidth={1.5} />
      {children}
    </button>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

PlayerControls.ProgressBar = function ProgressBar({
  className,
  onSeek,
  ...props
}: ComponentProps<"div"> & { onSeek?: (timeSeconds: number) => void }) {
  const playerApi = usePlayerStoreApi();
  const barRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef<HTMLDivElement>(null);
  const bufferedRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const durationRef = useRef(0);
  const seekRef = useRef(onSeek);

  useEffect(() => {
    seekRef.current = onSeek;
  }, [onSeek]);

  const applyRatio = useCallback((ratio: number) => {
    const pct = `${ratio * 100}%`;
    if (playedRef.current) playedRef.current.style.width = pct;
    if (thumbRef.current) thumbRef.current.style.left = pct;
  }, []);

  // Update DOM directly — bypasses React re-renders entirely for every timeupdate tick
  useEffect(() => {
    return playerApi.subscribe((state) => {
      durationRef.current = state.duration;
      if (bufferedRef.current) bufferedRef.current.style.width = `${state.buffered * 100}%`;
      if (!isDragging.current && state.duration > 0) {
        applyRatio(state.currentTime / state.duration);
        barRef.current?.setAttribute("aria-valuenow", String(Math.round(state.currentTime)));
        barRef.current?.setAttribute("aria-valuemax", String(Math.round(state.duration)));
      }
    });
  }, [playerApi, applyRatio]);

  const getRatioFromX = useCallback((clientX: number): number | null => {
    const bar = barRef.current;
    if (!bar || !durationRef.current) return null;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const ratio = getRatioFromX(e.clientX);
      if (ratio !== null) {
        applyRatio(ratio);
        seekRef.current?.(ratio * durationRef.current);
      }
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [getRatioFromX, applyRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const ratio = getRatioFromX(e.clientX);
    if (ratio !== null) {
      applyRatio(ratio);
      seekRef.current?.(ratio * durationRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const ratio = getRatioFromX(e.touches[0].clientX);
    if (ratio !== null) {
      applyRatio(ratio);
      seekRef.current?.(ratio * durationRef.current);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const ratio = getRatioFromX(e.changedTouches[0].clientX);
    if (ratio !== null) {
      applyRatio(ratio);
      seekRef.current?.(ratio * durationRef.current);
    }
  };

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={0}
      tabIndex={0}
      className={cn("player-progress-bar relative flex items-center h-5 cursor-pointer", className)}
      onMouseDown={handleMouseDown}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
      {/* Buffered */}
      <div
        ref={bufferedRef}
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/40"
        style={{ width: "0%" }}
      />
      {/* Played */}
      <div
        ref={playedRef}
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: "0%" }}
      />
      {/* Thumb */}
      <div
        ref={thumbRef}
        className="absolute z-10 rounded-full bg-primary shadow-sm pointer-events-none w-4 h-4"
        style={{ top: "50%", left: "0%", transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
};

// ─── CurrentTime ─────────────────────────────────────────────────────────────

PlayerControls.CurrentTime = function CurrentTime({ className, ...props }: ComponentProps<"div">) {
  const playerApi = usePlayerStoreApi();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      playerApi.subscribe(
        (s) => void (ref.current && (ref.current.textContent = formatTime(s.currentTime))),
      ),
    [playerApi],
  );
  return <div ref={ref} className={className} {...props} />;
};

// ─── RemainingTime ────────────────────────────────────────────────────────────

PlayerControls.RemainingTime = function RemainingTime({
  className,
  ...props
}: ComponentProps<"div">) {
  const playerApi = usePlayerStoreApi();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      playerApi.subscribe(
        (s) =>
          void (
            ref.current &&
            (ref.current.textContent = formatTime(Math.max(0, s.duration - s.currentTime)))
          ),
      ),
    [playerApi],
  );
  return <div ref={ref} className={className} {...props} />;
};

// ─── Duration ─────────────────────────────────────────────────────────────────

PlayerControls.Duration = function Duration({ className, ...props }: ComponentProps<"div">) {
  const playerApi = usePlayerStoreApi();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      playerApi.subscribe(
        (s) => void (ref.current && (ref.current.textContent = formatTime(s.duration))),
      ),
    [playerApi],
  );
  return <div ref={ref} className={className} {...props} />;
};

// ─── Subtitles ────────────────────────────────────────────────────────────────

interface SubtitlesControlProps extends Omit<ComponentProps<"button">, "onClick"> {
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
}

PlayerControls.Subtitles = function SubtitlesControl({
  className,
  children,
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
  ...props
}: SubtitlesControlProps) {
  const activeExternalTrackId = usePlayerStore((s) => s.activeExternalTrackId);

  return (
    <SubtitlesPanel
      imdbId={imdbId}
      tmdbId={tmdbId}
      season={season}
      episode={episode}
      fileName={fileName}
      onSelectTrack={onSelectTrack}
      onClearSelection={onClearSelection}
      onDelayChange={onDelayChange}
      onFontSizeChange={onFontSizeChange}
      onVerticalPosChange={onVerticalPosChange}
      trigger={
        <button
          type="button"
          aria-label="Subtitles"
          className={cn("flex items-center gap-2", className)}
          style={{ opacity: activeExternalTrackId ? 1 : 0.7 }}
          {...props}
        >
          <Subtitles size={20} strokeWidth={1.5} />
          {children}
        </button>
      }
    />
  );
};

// ─── Quality ──────────────────────────────────────────────────────────────────

PlayerControls.Quality = function Quality({
  className,
  onQualityChange,
  ...props
}: ComponentProps<"div"> & { onQualityChange?: (level: number) => void }) {
  const [open, setOpen] = useState(false);
  const qualityLevels = usePlayerStore((s) => s.qualityLevels);
  const activeQualityLevel = usePlayerStore((s) => s.activeQualityLevel);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (qualityLevels.length <= 1) return null;

  const activeLevel = qualityLevels.find((l) => l.index === activeQualityLevel);
  const label = activeQualityLevel === -1 ? "Auto" : (activeLevel?.name ?? "Auto");

  return (
    <div ref={containerRef} className={cn("relative", className)} {...props}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-white text-sm font-medium hover:opacity-80 transition-opacity"
        aria-label="Video quality"
        aria-expanded={open}
      >
        <Settings size={20} strokeWidth={1.5} />
        <span>{label}</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg py-1 min-w-28 border border-white/10 shadow-xl">
          <button
            type="button"
            className={cn(
              "w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors",
              activeQualityLevel === -1 ? "text-white font-medium" : "text-white/70",
            )}
            onClick={() => {
              onQualityChange?.(-1);
              setOpen(false);
            }}
          >
            Auto
          </button>
          {qualityLevels.map((level) => (
            <button
              key={level.index}
              type="button"
              className={cn(
                "w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors",
                activeQualityLevel === level.index ? "text-white font-medium" : "text-white/70",
              )}
              onClick={() => {
                onQualityChange?.(level.index);
                setOpen(false);
              }}
            >
              {level.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { PlayerControls };
