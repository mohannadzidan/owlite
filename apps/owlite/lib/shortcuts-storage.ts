import { ShortcutStore } from "./shortcuts";

const KEY = "shortcuts_bindings";

export function loadBindings(): ShortcutStore["shortcuts"] {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as ShortcutStore["shortcuts"];
  } catch {
    return {};
  }
}

export function saveBindings(bindings: ShortcutStore["shortcuts"]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(bindings));
}
