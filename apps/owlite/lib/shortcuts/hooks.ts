"use client";

import { useEffect, useRef } from "react";
import { useShortcutStore } from "./store";
import { comboUtils } from "./combo-utils";
import type { KeyCombo, ShortcutHandler } from "./types";

export function useShortcut(
  scope: number,
  id: string,
  handler: ShortcutHandler,
  enabled = true,
): void {
  const subscribe = useShortcutStore((s) => s.subscribe);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const stable: ShortcutHandler = (e) => handlerRef.current(e);
    return subscribe(scope, id, stable);
  }, [scope, id, enabled, subscribe]);
}

export function useShortcutScope(scope: number): void {
  const pushScope = useShortcutStore((s) => s.pushScope);
  const popScope = useShortcutStore((s) => s.popScope);

  useEffect(() => {
    pushScope(scope);
    return () => popScope(scope);
  }, [scope, pushScope, popScope]);
}

export function useShortcutCombo(id: string): { combo: KeyCombo; formatted: string } | null {
  const combo = useShortcutStore((s) => s.shortcuts[id]?.combo ?? null);
  if (!combo) return null;
  return { combo, formatted: comboUtils.format(combo) };
}
