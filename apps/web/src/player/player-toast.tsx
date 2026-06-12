import { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Subtitles,
  ChevronsRight,
  Loader2,
  ALargeSmall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerUIStore, type ToastIconType } from "./player-ui-store";

const TOAST_DURATION_MS = 2000;

function ToastIcon({ iconType }: { iconType: ToastIconType }) {
  const cls = "w-[1.8vw] h-[1.8vw] shrink-0";
  switch (iconType) {
    case "play":
      return <Play className={cls} fill="currentColor" strokeWidth={0} />;
    case "pause":
      return <Pause className={cls} fill="currentColor" strokeWidth={0} />;
    case "skipForward":
      return <RotateCw className={cls} />;
    case "skipBackward":
      return <RotateCcw className={cls} />;
    case "subtitleDelay":
      return <Subtitles className={cls} />;
    case "subtitleFont":
      return <ALargeSmall className={cls} />;
    case "buffering":
      return <Loader2 className={cn(cls, "animate-spin")} />;
    case "subtitles":
      return <Subtitles className={cls} />;
    case "nextEpisode":
      return <ChevronsRight className={cls} />;
  }
}

export function PlayerToastLayer() {
  const controlsVisible = usePlayerUIStore((s) => s.controlsVisible);
  const toast = usePlayerUIStore((s) => s.toast);
  const dismissToast = usePlayerUIStore((s) => s.dismissToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast || toast.persistent) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismissToast, TOAST_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, dismissToast]);

  if (!toast) return null;

  const visible = !controlsVisible;

  return (
    <div
      className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20",
        "flex items-center gap-[0.8vw]",
        "bg-black/60 text-white",
        "rounded-full px-[1.4vw] pl-[0.6vw] py-[0.6vw]",
        "text-[1.4vw] font-medium tracking-wide",
        "transition-opacity duration-200 pointer-events-none select-none",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="p-2 rounded-full bg-white/20">
        <ToastIcon iconType={toast.iconType} />
      </span>
      {toast.message && <span className="font-bold">{toast.message}</span>}
    </div>
  );
}
