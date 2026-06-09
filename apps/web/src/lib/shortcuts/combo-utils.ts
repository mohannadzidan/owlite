import type { ComboUtils, KeyCombo } from "./types";

function normaliseKey(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === " " || lower === "spacebar") return "space";
  return lower;
}

const KEY_DISPLAY: Record<string, string> = {
  space: "Space",
  arrowleft: "←",
  arrowright: "→",
  arrowup: "↑",
  arrowdown: "↓",
  enter: "Enter",
  escape: "Esc",
  backspace: "Backspace",
  tab: "Tab",
  delete: "Del",
};

export const comboUtils: ComboUtils = {
  serialise(combo) {
    const parts: string[] = [];
    if (combo.ctrl) parts.push("ctrl");
    if (combo.shift) parts.push("shift");
    if (combo.alt) parts.push("alt");
    if (combo.meta) parts.push("meta");
    parts.push(normaliseKey(combo.key));
    return parts.join("+");
  },

  deserialise(raw) {
    const parts = raw.split("+");
    const key = parts[parts.length - 1];
    if (!key) return null;
    return {
      key,
      ctrl: parts.includes("ctrl") || undefined,
      shift: parts.includes("shift") || undefined,
      alt: parts.includes("alt") || undefined,
      meta: parts.includes("meta") || undefined,
    };
  },

  format(combo) {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

    const mods: string[] = [];
    if (combo.ctrl) mods.push(isMac ? "⌃" : "Ctrl");
    if (combo.shift) mods.push(isMac ? "⇧" : "Shift");
    if (combo.alt) mods.push(isMac ? "⌥" : "Alt");
    if (combo.meta) mods.push(isMac ? "⌘" : "Meta");

    const normKey = normaliseKey(combo.key);
    const keyDisplay =
      KEY_DISPLAY[normKey] ?? (normKey.length === 1 ? normKey.toUpperCase() : normKey);

    const all = [...mods, keyDisplay];
    return isMac ? all.join("") : all.join("+");
  },

  matches(event, combo) {
    return (
      normaliseKey(event.key) === normaliseKey(combo.key) &&
      !!event.ctrlKey === !!combo.ctrl &&
      !!event.shiftKey === !!combo.shift &&
      !!event.altKey === !!combo.alt &&
      !!event.metaKey === !!combo.meta
    );
  },

  isEditableTarget(event) {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
  },
};

export function eventToCombo(event: KeyboardEvent): KeyCombo {
  return {
    key: event.key,
    ctrl: event.ctrlKey || undefined,
    shift: event.shiftKey || undefined,
    alt: event.altKey || undefined,
    meta: event.metaKey || undefined,
  };
}
