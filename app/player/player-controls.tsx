import { ComponentProps, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
  Settings,
} from "lucide-react";
import { usePlayerStore } from "./player-store";
import { SubtitlesPanel } from "./subtitles-panel";

// ─── Utility ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

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
  return (
    <div
      className={cn("player-controls-overlay z-10", className)}
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
      {children}
    </div>
  );
}

// ─── PlayPause ────────────────────────────────────────────────────────────────

PlayerControls.PlayPause = function PlayPause({ className, ...props }: ComponentProps<"button">) {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const isPlaying = playbackState === "playing";

  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      className={className}
      onClick={togglePlay}
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
        "relative flex flex-col items-center justify-center gap-0.5 w-[20vh] rounded-full p-10",
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
  ...props
}: ComponentProps<"button">) {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const isPlaying = playbackState === "playing";
  return (
    <ScreenButton
      icon={isPlaying ? Pause : Play}
      className={className}
      onClick={togglePlay}
      {...props}
    />
  );
};

// ─── ScreenRewind ─────────────────────────────────────────────────────────────

interface SkipComponentProps extends ComponentProps<"button"> {
  /** Seconds to skip (default: 10) */
  seconds?: number;
  /** Called when the keyboard shortcut triggers the action */
  onKeyboardTrigger?: () => void;
}

PlayerControls.ScreenRewind = function ScreenRewind({
  className,
  seconds = 10,
  onKeyboardTrigger,
  ...props
}: SkipComponentProps) {
  const skip = usePlayerStore((s) => s.skip);
  const onKeyboardTriggerRef = useRef(onKeyboardTrigger);
  useEffect(() => {
    onKeyboardTriggerRef.current = onKeyboardTrigger;
  }, [onKeyboardTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        skip(-seconds);
        onKeyboardTriggerRef.current?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [skip, seconds]);
  return (
    <ScreenButton icon={RotateCcw} className={className} onClick={() => skip(-seconds)} {...props}>
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
  onKeyboardTrigger,
  ...props
}: SkipComponentProps) {
  const skip = usePlayerStore((s) => s.skip);
  const onKeyboardTriggerRef = useRef(onKeyboardTrigger);
  useEffect(() => {
    onKeyboardTriggerRef.current = onKeyboardTrigger;
  }, [onKeyboardTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        skip(seconds);
        onKeyboardTriggerRef.current?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [skip, seconds]);
  return (
    <ScreenButton icon={RotateCw} className={className} onClick={() => skip(seconds)} {...props}>
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
  style,
  ...props
}: ComponentProps<"div">) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const seek = usePlayerStore((s) => s.seek);

  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  // Use refs so document-level handlers always see latest values without re-subscribing
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const seekRef = useRef(seek);
  seekRef.current = seek;

  const getRatioFromX = (clientX: number): number | null => {
    const bar = barRef.current;
    if (!bar || !durationRef.current) return null;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const ratio = getRatioFromX(e.clientX);
      if (ratio !== null) {
        setDragRatio(ratio);
        seekRef.current(ratio * durationRef.current);
      }
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragRatio(null);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const ratio = getRatioFromX(e.clientX);
    if (ratio !== null) {
      setDragRatio(ratio);
      seek(ratio * duration);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const ratio = getRatioFromX(e.touches[0].clientX);
    if (ratio !== null) {
      setDragRatio(ratio);
      seek(ratio * duration);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const ratio = getRatioFromX(e.changedTouches[0].clientX);
    if (ratio !== null) seek(ratio * duration);
    setDragRatio(null);
  };

  const displayPct =
    dragRatio !== null ? dragRatio * 100 : duration > 0 ? (currentTime / duration) * 100 : 0;
  const buffPct = buffered * 100;

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuenow={Math.round(currentTime)}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      tabIndex={0}
      className={cn("player-progress-bar", className)}
      style={{ position: "relative", cursor: "pointer", height: 4, ...style }}
      onMouseDown={handleMouseDown}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") seek(currentTime + 5);
        if (e.key === "ArrowLeft") seek(currentTime - 5);
      }}
      {...props}
    >
      {/* Track */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.2)",
        }}
      />
      {/* Buffered */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${buffPct}%`,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.35)",
        }}
      />
      {/* Played */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${displayPct}%`,
          borderRadius: 9999,
          background: "var(--primary)",
        }}
      />
      {/* Thumb */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${displayPct}%`,
          transform: "translate(-50%, -50%)",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--primary)",
          boxShadow: "0 0 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

// ─── CurrentTime ─────────────────────────────────────────────────────────────

PlayerControls.CurrentTime = function CurrentTime({ className, ...props }: ComponentProps<"div">) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  return (
    <div className={className} {...props}>
      {formatTime(currentTime)}
    </div>
  );
};

// ─── RemainingTime ────────────────────────────────────────────────────────────

PlayerControls.RemainingTime = function RemainingTime({
  className,
  ...props
}: ComponentProps<"div">) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const remaining = Math.max(0, duration - currentTime);
  return (
    <div className={className} {...props}>
      {formatTime(remaining)}
    </div>
  );
};

// ─── Duration ─────────────────────────────────────────────────────────────────

PlayerControls.Duration = function Duration({ className, ...props }: ComponentProps<"div">) {
  const duration = usePlayerStore((s) => s.duration);
  return (
    <div className={className} {...props}>
      {formatTime(duration)}
    </div>
  );
};

// ─── Volume ───────────────────────────────────────────────────────────────────

PlayerControls.Volume = function Volume({ className, ...props }: ComponentProps<"button">) {
  const muted = usePlayerStore((s) => s.muted);
  const volume = usePlayerStore((s) => s.volume);
  const videoEl = usePlayerStore((s) => s.videoEl);

  const toggleMute = () => {
    if (videoEl) videoEl.muted = !muted;
  };

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute" : "Mute"}
      className={className}
      onClick={toggleMute}
      {...props}
    >
      {muted || volume === 0 ? (
        <VolumeX size={20} strokeWidth={1.5} />
      ) : (
        <Volume2 size={20} strokeWidth={1.5} />
      )}
    </button>
  );
};

// ─── Subtitles ────────────────────────────────────────────────────────────────

interface SubtitlesControlProps extends Omit<ComponentProps<"button">, "onClick"> {
  imdbId?: string;
  tmdbId?: number;
  season?: number;
  episode?: number;
  titleId?: string | null;
}

PlayerControls.Subtitles = function SubtitlesControl({
  className,
  children,
  imdbId,
  tmdbId,
  season,
  episode,
  titleId,
  ...props
}: SubtitlesControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeExternalTrackId = usePlayerStore((s) => s.activeExternalTrackId);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Subtitles"
        aria-expanded={open}
        className={cn("flex items-center gap-2", className)}
        style={{ opacity: activeExternalTrackId ? 1 : 0.7 }}
        onClick={() => setOpen((v) => !v)}
        {...props}
      >
        <Subtitles size={20} strokeWidth={1.5} />
        {children}
      </button>
      {open && (
        <SubtitlesPanel
          imdbId={imdbId}
          tmdbId={tmdbId}
          season={season}
          episode={episode}
          titleId={titleId}
        />
      )}
    </div>
  );
};

// ─── Quality ──────────────────────────────────────────────────────────────────

PlayerControls.Quality = function Quality({ className, ...props }: ComponentProps<"div">) {
  const [open, setOpen] = useState(false);
  const qualityLevels = usePlayerStore((s) => s.qualityLevels);
  const activeQualityLevel = usePlayerStore((s) => s.activeQualityLevel);
  const setQualityLevel = usePlayerStore((s) => s.setQualityLevel);
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

  if (qualityLevels.length === 0) return null;

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
              setQualityLevel(-1);
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
                setQualityLevel(level.index);
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
