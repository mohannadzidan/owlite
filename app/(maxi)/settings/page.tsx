"use client";

import { Keyboard, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SHORTCUTS, SHORTCUTS_SCOPES } from "@/lib/constants/shortcuts";
import { useShortcutStore, comboUtils } from "@/lib/shortcuts";
import type { KeyCombo, Shortcut } from "@/lib/shortcuts";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Metadata ──────────────────────────────────────────────────────────────────

const SCOPE_ORDER = Object.values(SHORTCUTS_SCOPES).sort((a, b) => b - a);

const SCOPE_META: Record<number, { name: string; description: string }> = {
  [SHORTCUTS_SCOPES.player]: {
    name: "Video Player",
    description: "Active while watching movies and TV shows in the player",
  },
  [SHORTCUTS_SCOPES.modals]: {
    name: "General",
    description: "Active anywhere in the app at all times",
  },
  [SHORTCUTS_SCOPES.detailsScreen]: {
    name: "Details Screen",
    description: "Active on movie and TV show detail pages",
  },
};

const SHORTCUT_LABELS: Record<string, string> = {
  "sidebar.toggle": "Open Command Menu",
  "player.togglePlay": "Play / Pause",
  "player.skipBackward": "Skip Backward",
  "player.skipForward": "Skip Forward",
  "player.nextEpisode": "Next Episode",
  "player.subtitlesDelayIncrease": "Subtitle Delay +",
  "player.subtitlesDelayDecrease": "Subtitle Delay −",
  "player.subtitlesFontIncrease": "Subtitle Font Size +",
  "player.subtitlesFontDecrease": "Subtitle Font Size −",
};

const DEFAULT_COMBOS: Record<string, KeyCombo> = Object.fromEntries(
  SHORTCUTS.map((s) => [s.id, s.combo]),
);

// ── ComboDisplay ──────────────────────────────────────────────────────────────

function ComboDisplay({ combo }: { combo: KeyCombo }) {
  const formatted = comboUtils.format(combo);
  const parts = formatted.split("+").filter(Boolean);
  return (
    <div className="flex items-center gap-1 shrink-0">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-muted px-2.5 font-mono text-sm font-medium text-foreground select-none"
        >
          {part}
        </kbd>
      ))}
    </div>
  );
}

// ── CaptureOverlay ────────────────────────────────────────────────────────────

function CaptureOverlay({ shortcut, onClose }: { shortcut: Shortcut; onClose: () => void }) {
  const lastCombo = useShortcutStore((s) => s.lastCombo);
  const register = useShortcutStore((s) => s.register);
  const hasConflict = useShortcutStore((s) => s.hasConflict);
  const currentCombo = useShortcutStore((s) => s.shortcuts[shortcut.id]?.combo ?? shortcut.combo);
  const [conflict, setConflict] = useState<{ combo: KeyCombo; message: string } | null>(null);

  // Hold the lastCombo reference that existed when capture opened so we can ignore it.
  // Reference comparison works because eventToCombo() creates a new object on every keyup —
  // any key pressed AFTER capture opens will be a different reference than the stale value.
  // This also survives React StrictMode's double-mount (refs persist across the remount cycle).
  const staleComboRef = useRef(lastCombo);

  useEffect(() => {
    if (!lastCombo) return;
    if (lastCombo === staleComboRef.current) return; // ignore the value that was there on mount

    // Plain Escape cancels
    if (
      lastCombo.key === "Escape" &&
      !lastCombo.ctrl &&
      !lastCombo.shift &&
      !lastCombo.alt &&
      !lastCombo.meta
    ) {
      onClose();
      return;
    }

    // Same as current binding — close without change
    if (comboUtils.serialise(lastCombo) === comboUtils.serialise(currentCombo)) {
      onClose();
      return;
    }

    const conflictId = hasConflict(shortcut.scope, lastCombo);
    if (conflictId && conflictId !== shortcut.id) {
      const label = SHORTCUT_LABELS[conflictId] ?? conflictId;
      setConflict({ combo: lastCombo, message: `Already used by "${label}"` });
      return;
    }

    setConflict(null);
    register({ ...shortcut, combo: lastCombo });
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCombo]);

  const label = SHORTCUT_LABELS[shortcut.id] ?? shortcut.id;

  return (
    <Dialog open={!!shortcut} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Rebinding <b>{label}</b>
          </DialogTitle>
          <DialogDescription className="my-4">
            {conflict ? (
              <div className="flex flex-col items-center gap-3">
                <ComboDisplay combo={conflict.combo} />
                <p className="text-destructive text-sm text-center">{conflict.message}</p>
                <p className="text-muted-foreground/60 text-xs">Try a different combination</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-lg">
                Press any key combination…
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default" onClick={() => onClose?.()}>
              <Kbd>Esc</Kbd>
              cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ShortcutRow ───────────────────────────────────────────────────────────────

function ShortcutRow({
  shortcut,
  onCapture,
}: {
  shortcut: Shortcut;
  onCapture: (s: Shortcut) => void;
}) {
  const combo = useShortcutStore((s) => s.shortcuts[shortcut.id]?.combo ?? shortcut.combo);
  const register = useShortcutStore((s) => s.register);
  const label = SHORTCUT_LABELS[shortcut.id] ?? shortcut.id;
  const defaultCombo = DEFAULT_COMBOS[shortcut.id];
  const isModified =
    defaultCombo && comboUtils.serialise(combo) !== comboUtils.serialise(defaultCombo);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onCapture(shortcut)}
        className={cn(
          "flex-1 flex items-center justify-between gap-4 rounded-xl px-5 py-4 min-h-[3.5rem]",
          "bg-card hover:bg-accent focus-visible:bg-accent outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary ring-inset",
        )}
      >
        <span className="text-base font-medium text-left">{label}</span>
        <ComboDisplay combo={combo} />
      </button>
      {isModified && (
        <button
          type="button"
          title="Reset to default"
          onClick={() => register({ ...shortcut, combo: defaultCombo })}
          className={cn(
            "shrink-0 p-2.5 rounded-xl text-muted-foreground hover:text-foreground",
            "hover:bg-accent transition-colors",
            "focus-visible:ring-2 focus-visible:ring-primary outline-none",
          )}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── ScopeGroup ────────────────────────────────────────────────────────────────

function ScopeGroup({
  scope,
  shortcuts,
  onCapture,
}: {
  scope: number;
  shortcuts: Shortcut[];
  onCapture: (s: Shortcut) => void;
}) {
  const meta = SCOPE_META[scope];
  if (!meta || shortcuts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {meta.name}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-0.5">{meta.description}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {shortcuts.map((s) => (
          <ShortcutRow key={s.id} shortcut={s} onCapture={onCapture} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [capturing, setCapturing] = useState<Shortcut | null>(null);
  const disable = useShortcutStore((s) => s.disable);
  const enable = useShortcutStore((s) => s.enable);
  const register = useShortcutStore((s) => s.register);

  // Disable shortcuts while on this page so key events are available for capture
  useEffect(() => {
    disable();
    return () => enable();
  }, [disable, enable]);

  const shortcutsByScope = SCOPE_ORDER.reduce<Record<number, Shortcut[]>>((acc, scope) => {
    acc[scope] = SHORTCUTS.filter((s) => s.scope === scope);
    return acc;
  }, {});

  return (
    <>
      {capturing && <CaptureOverlay shortcut={capturing} onClose={() => setCapturing(null)} />}

      <div className="min-h-screen w-full container max-w-4xl mx-auto">
        {/* Top bar */}
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>

        {/* Content */}
        <div className="flex flex-col gap-12">
          <section className="flex flex-col gap-8">
            {/* Section header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Keyboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Shortcuts & Keyboard</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Click any shortcut to rebind it
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => SHORTCUTS.forEach((s) => register(s))}
                className={cn(
                  "shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors",
                  "px-3 py-2 rounded-lg hover:bg-accent",
                  "focus-visible:ring-2 focus-visible:ring-primary outline-none",
                )}
              >
                Reset all
              </button>
            </div>

            {/* Shortcut groups */}
            <div className="flex flex-col gap-8">
              {SCOPE_ORDER.map((scope) => (
                <ScopeGroup
                  key={scope}
                  scope={scope}
                  shortcuts={shortcutsByScope[scope] ?? []}
                  onCapture={setCapturing}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
