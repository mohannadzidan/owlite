
import { createTrackpadGesture, type TrackpadGesture } from "@/lib/trackpad-gesture";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface TrackpadProps {
  pairId: string;
  className?: string;
}

const DEFAULT_TV_W = 1920;
const DEFAULT_TV_H = 1080;

export function Trackpad({ pairId, className }: TrackpadProps) {
  const pairing = useRemoteControlStore((s) => s.pairings.find((p) => p.pairId === pairId));
  const tvW = pairing?.peerScreenWidth ?? DEFAULT_TV_W;
  const tvH = pairing?.peerScreenHeight ?? DEFAULT_TV_H;

  const containerRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<TrackpadGesture | null>(null);

  useEffect(() => {
    const gesture = createTrackpadGesture(containerRef.current!, { pairId, tvW, tvH });
    gestureRef.current = gesture;
    return () => {
      gesture.destroy();
      gestureRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push prop changes into the gesture engine without re-attaching listeners
  useEffect(() => {
    gestureRef.current?.update({ pairId, tvW, tvH });
  }, [pairId, tvW, tvH]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 w-full touch-none select-none rounded-2xl bg-muted/40 active:bg-muted/60 cursor-none",
        className,
      )}
    >
      <div className="h-full w-full flex items-center justify-center pointer-events-none">
        <p className="text-muted-foreground/30 text-sm select-none">trackpad</p>
      </div>
    </div>
  );
}
