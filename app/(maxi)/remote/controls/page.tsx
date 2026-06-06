"use client";

import { Trackpad } from "@/components/remote/trackpad";
import { connectionManager } from "@/lib/connection-manager";
import { type ConnectionType, useRemoteControlStore } from "@/lib/remote-control-store";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, FastForward, Play, Rewind, SkipForward } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ElementType } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ConnectionBadge({
  connectionType,
  latencyMs,
}: {
  connectionType?: ConnectionType;
  latencyMs?: number;
}) {
  const dotColor =
    connectionType === "lan"
      ? "bg-emerald-500"
      : connectionType === "relay"
        ? "bg-destructive"
        : "bg-yellow-500";
  const label =
    connectionType === "lan" ? "LAN" : connectionType === "relay" ? "Relay" : "Internet";

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
      {connectionType && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
      {connectionType && <span className="text-foreground/60">{label}</span>}
      <span>{latencyMs != null ? `${latencyMs} ms` : "-- ms"}</span>
    </div>
  );
}

// ── Pill button ───────────────────────────────────────────────────────────────

function PillBtn({
  icon: Icon,
  label,
  onPress,
}: {
  icon?: ElementType<{ className?: string }>;
  label?: string;
  onPress: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onClick={onPress}
      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-foreground hover:bg-muted active:scale-90 transition-all select-none"
    >
      {Icon ? <Icon className="h-5 w-5" /> : label}
    </button>
  );
}

// ── Small action button ───────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  label,
  className,
  onPress,
}: {
  icon?: ElementType<{ className?: string }>;
  label?: string;
  className?: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl bg-card py-4 px-3",
        "text-sm font-medium text-foreground hover:bg-card/80 active:scale-95 transition-all select-none",
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label && <span>{label}</span>}
    </button>
  );
}

// ── Controls inner ────────────────────────────────────────────────────────────

function ControlsInner() {
  const searchParams = useSearchParams();
  const pairId = searchParams.get("pairId");

  const pairings = useRemoteControlStore((s) => s.pairings);
  const pairing =
    pairings.find((p) => p.pairId === pairId && p.role === "initiator") ??
    pairings.find((p) => p.role === "initiator" && p.status === "connected");

  function send(shortcutId: string) {
    if (!pairing) return;
    connectionManager.sendRemoteMessage(pairing.pairId, { type: "remote_action", shortcutId });
  }

  if (!pairing || pairing.status !== "connected") {
    return (
      <main className="pt-16 flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-muted-foreground text-sm text-center px-8">
          {pairing
            ? "Device is offline. Waiting for reconnection…"
            : "No controllable device paired."}
        </p>
        <Link href="/remote" className="text-sm text-primary underline">
          Go to Remote Control
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-16 flex flex-col h-screen overflow-hidden px-5 pb-6 gap-4">
      {/* Device info row */}
      <div className="shrink-0 flex items-center justify-between">
        <p className="font-semibold text-sm truncate">{pairing.peerDeviceName}</p>
        <ConnectionBadge connectionType={pairing.connectionType} latencyMs={pairing.latencyMs} />
      </div>

      {/* ── Top controls: [Sub pill] · [Play/Pause] · [Skip pill] ── */}
      <div className="shrink-0 flex items-center justify-center gap-5">
        {/* Sub delay pill */}
        <div className="flex flex-col items-center bg-card rounded-[2rem] px-5 py-5 gap-3 w-[4.5rem]">
          <PillBtn icon={ChevronUp} onPress={() => send("player.subtitlesDelayIncrease")} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sub
          </span>
          <PillBtn icon={ChevronDown} onPress={() => send("player.subtitlesDelayDecrease")} />
        </div>

        {/* Play / Pause — the central prominent button */}
        <button
          onClick={() => send("player.togglePlay")}
          className="w-[5.5rem] h-[5.5rem] rounded-full bg-card flex items-center justify-center shrink-0 hover:bg-card/80 active:scale-95 transition-all shadow-[0_0_30px_hsl(var(--primary)/0.25)]"
          style={{ border: "2px solid hsl(var(--primary) / 0.35)" }}
        >
          <Play className="h-9 w-9 text-primary" />
        </button>

        {/* Skip pill */}
        <div className="flex flex-col items-center bg-card rounded-[2rem] px-5 py-5 gap-3 w-[4.5rem]">
          <PillBtn icon={FastForward} onPress={() => send("player.skipForward")} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Skip
          </span>
          <PillBtn icon={Rewind} onPress={() => send("player.skipBackward")} />
        </div>
      </div>

      {/* ── Trackpad with gradient ring ── */}
      <div
        className="flex-1 min-h-0 p-[2px] rounded-3xl"
        style={{
          background:
            "linear-gradient(160deg, hsl(var(--primary) / 0.65) 0%, transparent 45%, hsl(var(--primary) / 0.35) 100%)",
        }}
      >
        <Trackpad pairId={pairing.pairId} className="h-full rounded-[calc(1.5rem-2px)] border-0" />
      </div>

      {/* ── Bottom row: font size + next episode ── */}
      <div className="shrink-0 grid grid-cols-4 gap-2">
        <ActionBtn label="A−" onPress={() => send("player.subtitlesFontDecrease")} />
        <ActionBtn label="A+" onPress={() => send("player.subtitlesFontIncrease")} />
        <ActionBtn
          icon={SkipForward}
          label="Next ep"
          className="col-span-2"
          onPress={() => send("player.nextEpisode")}
        />
      </div>
    </main>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ControlsPage() {
  return (
    <Suspense>
      <ControlsInner />
    </Suspense>
  );
}
