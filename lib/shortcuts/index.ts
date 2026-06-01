import { comboUtils } from "./combo-utils";

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
  import("./store")
    .then(({ shortcutsStore }) => {
      window.addEventListener(
        "keyup",
        (e) => {
          if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") {
            // ignore modifier key releases to prevent conflicts with assistive technologies
            return;
          }
          shortcutsStore.getState().dispatch(e);
          console.log(
            e.key,
            shortcutsStore.getState().lastCombo,
            comboUtils.serialise(shortcutsStore.getState().lastCombo!),
          );
        },
        true,
      );
    })
    .catch(() => {});
};
