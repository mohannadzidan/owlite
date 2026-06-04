import { Shortcut } from "../shortcuts";

export const SHORTCUTS_SCOPES = {
  player: 10,
  modals: 100,
  detailsScreen: 2,
} as const;

export const SHORTCUTS: Shortcut[] = [
  {
    id: "sidebar.toggle",
    scope: SHORTCUTS_SCOPES.modals,
    combo: { key: "k", ctrl: true },
    activeInInputs: false,
  },
  {
    id: "player.togglePlay",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: " " },
    activeInInputs: false,
  },
  {
    id: "player.skipBackward",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowLeft" },
    activeInInputs: false,
  },
  {
    id: "player.skipForward",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowRight" },
    activeInInputs: false,
  },
  {
    id: "player.nextEpisode",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowRight", ctrl: true },
    activeInInputs: false,
  },
  {
    id: "player.subtitlesDelayIncrease",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowUp", ctrl: true },
    activeInInputs: false,
  },
  {
    id: "player.subtitlesDelayDecrease",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowDown", ctrl: true },
    activeInInputs: false,
  },
  {
    id: "player.subtitlesFontIncrease",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowUp", shift: true },
    activeInInputs: false,
  },
  {
    id: "player.subtitlesFontDecrease",
    scope: SHORTCUTS_SCOPES.player,
    combo: { key: "ArrowDown", shift: true },
    activeInInputs: false,
  },
] as const;

export function getDefaultBindings() {
  const bindings: Record<string, Shortcut> = {};
  for (const shortcut of SHORTCUTS) {
    bindings[shortcut.id] = shortcut;
  }
  return bindings;
}
