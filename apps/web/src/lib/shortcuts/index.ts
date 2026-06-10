import { SHORTCUTS } from "../constants/shortcuts";
import { loadBindings, saveBindings } from "../shortcuts-storage";
import { shortcutsStore } from "./store";

export { Global } from "./types";
export type {
  KeyCombo,
  Shortcut,
  ShortcutHandler,
  ShortcutStore,
  ComboUtils,
  UseShortcut,
  UseShortcutScope,
  UseShortcutCombo,
} from "./types";
export { comboUtils } from "./combo-utils";
export { useShortcutStore } from "./store";
export { useShortcut, useShortcutScope, useShortcutCombo } from "./hooks";
export { SHORTCUTS_SCOPES as shortcutsScopes } from "../constants/shortcuts";

export const installShortcuts = () => {
  if (typeof window === "undefined") return;

  const storedBindings = loadBindings();
  SHORTCUTS.forEach((shortcut) => {
    shortcutsStore.getState().register(storedBindings[shortcut.id] ?? shortcut);
  });

  // persist shortcuts to localStorage whenever they change
  shortcutsStore.subscribe((state, prevState) => {
    if (state.shortcuts !== prevState.shortcuts) {
      saveBindings(state.shortcuts);
    }
  });
  window.addEventListener(
    "keyup",
    (e) => {
      if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") {
        // ignore modifier key releases to prevent conflicts with assistive technologies
        return;
      }
      shortcutsStore.getState().dispatch(e);
    },
    true,
  );
};
