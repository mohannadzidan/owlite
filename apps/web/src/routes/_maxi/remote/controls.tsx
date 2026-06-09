import { createFileRoute, Link } from "@tanstack/react-router";
import { Trackpad } from "@/components/remote/trackpad";
import { connectionManager } from "@/lib/connection-manager";
import { type ConnectionType, useRemoteControlStore } from "@/lib/remote-control-store";
import type { RemoteMessage } from "@/lib/remote-messages";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FastForward,
  Keyboard,
  Play,
  Rewind,
  SkipForward,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState, type ElementType } from "react";

export const Route = createFileRoute("/_maxi/remote/controls")({
  validateSearch: (search) => ({
    pairId: typeof search.pairId === "string" ? search.pairId : undefined,
  }),
  component: ControlsPage,
});

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

function ControlsInner() {
  const { pairId } = Route.useSearch();

  const pairings = useRemoteControlStore((s) => s.pairings);
  const pairing =
    pairings.find((p) => p.pairId === pairId && p.role === "initiator") ??
    pairings.find((p) => p.role === "initiator" && p.status === "connected");

  const [textInputActive, setTextInputActive] = useState(false);
  const [tvInputValue, setTvInputValue] = useState("");
  const [typingMode, setTypingMode] = useState(false);
  const [typingKey, setTypingKey] = useState(0);
  const lastValueRef = useRef("");

  useEffect(() => {
    connectionManager.setMessageHandler((_pairId, msg: RemoteMessage) => {
      if (msg.type === "text_input_focused") {
        setTvInputValue(msg.currentValue);
        setTextInputActive(true);
        lastValueRef.current = msg.currentValue;
        setTypingKey((k) => k + 1);
      } else if (msg.type === "text_input_blurred") {
        setTextInputActive(false);
        setTypingMode(false);
      }
    });
    return () => connectionManager.clearMessageHandler();
  }, []);

  useEffect(() => {
    if (pairing?.status !== "connected") {
      setTextInputActive(false);
      setTypingMode(false);
    }
  }, [pairing?.status]);

  function send(shortcutId: string) {
    if (!pairing) return;
    connectionManager.sendRemoteMessage(pairing.pairId, { type: "remote_action", shortcutId });
  }

  function sendMsg(msg: RemoteMessage) {
    if (!pairing) return;
    connectionManager.sendRemoteMessage(pairing.pairId, msg);
  }

  function handleTypingKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMsg({ type: "remote_key", key: "Enter" });
    } else if (e.key === "Escape") {
      e.preventDefault();
      dismissTyping();
    }
  }

  function dismissTyping() {
    setTypingMode(false);
    lastValueRef.current = "";
  }

  if (!pairing || pairing.status !== "connected") {
    return (
      <main className="pt-16 flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-muted-foreground text-sm text-center px-8">
          {pairing
            ? "Device is offline. Waiting for reconnection…"
            : "No controllable device paired."}
        </p>
        <Link to="/remote" className="text-sm text-primary underline">
          Go to Remote Control
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-16 flex flex-col h-screen overflow-hidden px-5 pb-6 gap-4 relative">
      <div className="shrink-0 flex items-center justify-between">
        <p className="font-semibold text-sm truncate">{pairing.peerDeviceName}</p>
        <ConnectionBadge connectionType={pairing.connectionType} latencyMs={pairing.latencyMs} />
      </div>

      <div className="shrink-0 flex items-center justify-center gap-5">
        <div className="flex flex-col items-center bg-card rounded-[2rem] px-5 py-5 gap-3 w-[4.5rem]">
          <PillBtn icon={ChevronUp} onPress={() => send("player.subtitlesDelayIncrease")} />
          <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Sub
          </span>
          <PillBtn icon={ChevronDown} onPress={() => send("player.subtitlesDelayDecrease")} />
        </div>

        <button
          onClick={() => send("player.togglePlay")}
          className="w-[5.5rem] h-[5.5rem] rounded-full bg-card border flex items-center justify-center shrink-0 hover:bg-card/80 active:scale-95 transition-all"
        >
          <Play className="h-9 w-9 text-primary" />
        </button>

        <div className="flex flex-col items-center bg-card rounded-[2rem] px-5 py-5 gap-3 w-[4.5rem]">
          <PillBtn icon={FastForward} onPress={() => send("player.skipForward")} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Skip
          </span>
          <PillBtn icon={Rewind} onPress={() => send("player.skipBackward")} />
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-3xl border relative">
        <Trackpad pairId={pairing.pairId} className="h-full rounded-3xl border-0" />

        {textInputActive && !typingMode && (
          <button
            onClick={() => {
              lastValueRef.current = tvInputValue;
              setTypingKey((k) => k + 1);
              setTypingMode(true);
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card border px-3 py-1.5 rounded-full text-xs font-medium shadow-sm active:scale-95 transition-all select-none"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Tap to type
          </button>
        )}
      </div>

      <div className="shrink-0 grid grid-cols-4 gap-2">
        <ActionBtn label="A−" onPress={() => send("player.subtitlesFontDecrease")} />
        <ActionBtn label="A+" onPress={() => send("player.subtitlesFontIncrease")} />
        <ActionBtn
          icon={ChevronLeft}
          label="Back"
          onPress={() => sendMsg({ type: "remote_key", key: "BrowserBack" })}
        />
        <ActionBtn icon={SkipForward} label="Next ep" onPress={() => send("player.nextEpisode")} />
      </div>

      {typingMode && (
        <div className="absolute inset-x-0 bottom-0 bg-background border-t px-4 py-3 flex items-center gap-3">
          <input
            key={typingKey}
            autoFocus
            type="text"
            defaultValue={tvInputValue}
            placeholder="Type here…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            onKeyDown={handleTypingKeyDown}
            onChange={(e) => {
              const newVal = e.currentTarget.value;
              const lastVal = lastValueRef.current;
              if (newVal.length > lastVal.length) {
                const inserted = (e.nativeEvent as InputEvent).data ?? newVal.slice(lastVal.length);
                if (inserted) sendMsg({ type: "remote_text", text: inserted });
              } else if (newVal.length < lastVal.length) {
                const n = lastVal.length - newVal.length;
                for (let i = 0; i < n; i++) sendMsg({ type: "remote_key", key: "Backspace" });
              }
              lastValueRef.current = newVal;
            }}
          />
          <button
            onClick={dismissTyping}
            className="text-sm text-primary font-medium px-2 py-1 active:opacity-70 transition-opacity select-none"
          >
            Done
          </button>
        </div>
      )}
    </main>
  );
}

function ControlsPage() {
  return (
    <Suspense>
      <ControlsInner />
    </Suspense>
  );
}
