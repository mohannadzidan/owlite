import { useEffect, useRef, useState } from "react";
import { usePlayerStore, usePlayerStoreApi } from "./player-store";

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return Number(parts[0]) * 60 + parseFloat(parts[1]);
}

function parseVtt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeIdx = lines.findIndex((l) => l.includes(" --> "));
    if (timeIdx === -1) continue;
    const [startStr, endPart] = lines[timeIdx].split(" --> ");
    const start = parseTimestamp(startStr.trim());
    const end = parseTimestamp(endPart.trim().split(/\s/)[0]);
    const text = lines
      .slice(timeIdx + 1)
      .join("\n")
      .trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

export function SubtitleOverlay() {
  const playerApi = usePlayerStoreApi();
  const externalSubtitleUrl = usePlayerStore((s) => s.externalSubtitleUrl);
  const fontSize = usePlayerStore((s) => s.subtitleFontSize);
  const verticalPosition = usePlayerStore((s) => s.subtitleVerticalPosition);

  const [activeCue, setActiveCue] = useState<SubtitleCue | null>(null);
  const cuesRef = useRef<SubtitleCue[]>([]);

  useEffect(() => {
    if (!externalSubtitleUrl) {
      cuesRef.current = [];
      setActiveCue(null);
      return;
    }
    let cancelled = false;
    fetch(externalSubtitleUrl)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) cuesRef.current = parseVtt(text);
      })
      .catch(() => {
        if (!cancelled) cuesRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, [externalSubtitleUrl]);

  // Subscribe to the raw store to detect cue changes without causing per-tick re-renders.
  // React state is only updated when the active cue actually changes (every few seconds),
  // instead of on every timeupdate (~4Hz).
  useEffect(() => {
    let prevCue: SubtitleCue | null = null;
    return playerApi.subscribe((state) => {
      const adjustedTime = state.currentTime - state.subtitleDelay;
      const next =
        cuesRef.current.find((c) => adjustedTime >= c.start && adjustedTime <= c.end) ?? null;
      if (next !== prevCue) {
        prevCue = next;
        setActiveCue(next);
      }
    });
  }, [playerApi]);

  if (!activeCue) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: `${verticalPosition}%`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <p
        style={{
          backgroundColor: "rgba(0,0,0,0.15)",
          color: "white",
          padding: "3px 12px",
          borderRadius: 4,
          fontSize: `${(fontSize / 100) * 2}vw`,
          textAlign: "center",
          maxWidth: "80%",
          whiteSpace: "pre-line",
          lineHeight: 1.45,
        }}
      >
        {activeCue.text}
      </p>
    </div>
  );
}
