import { create } from "zustand";
import { comboUtils, eventToCombo } from "./combo-utils";
import { Global } from "./types";
import type { Shortcut, ShortcutStore } from "./types";

function buildComboIndex(
  shortcuts: Record<string, Shortcut>,
): Record<number, Record<string, string>> {
  const index: Record<number, Record<string, string>> = {};
  for (const shortcut of Object.values(shortcuts)) {
    const { scope } = shortcut;
    if (!index[scope]) index[scope] = {};
    index[scope][comboUtils.serialise(shortcut.combo)] = shortcut.id;
  }
  return index;
}

export const shortcutsStore = create<ShortcutStore>((set, get) => ({
  shortcuts: {},
  activeScopes: [Global],
  handlers: {},
  comboIndex: {},
  lastCombo: null,
  enabled: true,

  hasConflict(scope, combo) {
    const comboStr = comboUtils.serialise(combo);
    return get().comboIndex[scope]?.[comboStr] ?? null;
  },

  register(shortcut) {
    set((state) => {
      const shortcuts = { ...state.shortcuts, [shortcut.id]: shortcut };
      return { shortcuts, comboIndex: buildComboIndex(shortcuts) };
    });
  },

  unregister({ id, scope }) {
    set((state) => {
      const { [id]: _, ...shortcuts } = state.shortcuts;
      const scopeHandlers = { ...state.handlers[scope] };
      delete scopeHandlers[id];
      return {
        shortcuts,
        comboIndex: buildComboIndex(shortcuts),
        handlers: { ...state.handlers, [scope]: scopeHandlers },
      };
    });
  },

  subscribe(scope, id, handler) {
    set((state) => {
      const scopeHandlers = { ...state.handlers[scope] };
      scopeHandlers[id] = [...(scopeHandlers[id] ?? []), handler];
      return { handlers: { ...state.handlers, [scope]: scopeHandlers } };
    });
    return () => {
      set((state) => {
        const scopeHandlers = { ...state.handlers[scope] };
        scopeHandlers[id] = (scopeHandlers[id] ?? []).filter((h) => h !== handler);
        return { handlers: { ...state.handlers, [scope]: scopeHandlers } };
      });
    };
  },

  pushScope(scope) {
    if (scope < 0) throw new Error(`Scope must be >= 0, got ${scope}`);
    set((state) => ({ activeScopes: [...state.activeScopes, scope] }));
  },

  popScope(scope) {
    if (scope === Global) return;
    set((state) => {
      const idx = state.activeScopes.lastIndexOf(scope);
      if (idx === -1) return state;
      const next = [...state.activeScopes];
      next.splice(idx, 1);
      return { activeScopes: next };
    });
  },

  disable() {
    set({ enabled: false });
  },

  enable() {
    set({ enabled: true });
  },

  dispatch(event) {
    const combo = eventToCombo(event);
    set({ lastCombo: combo });

    const state = get();
    if (!state.enabled) return;

    const comboStr = comboUtils.serialise(combo);
    const seen = new Set<number>();
    
    for (let i = state.activeScopes.length - 1; i >= 0; i--) {
      const scope = state.activeScopes[i];
      if (seen.has(scope)) continue;
      seen.add(scope);

      const shortcutId = state.comboIndex[scope]?.[comboStr];
      if (!shortcutId) continue;

      const shortcut = state.shortcuts[shortcutId];
      if (!shortcut) continue;

      const hasModifier = combo.ctrl || combo.shift || combo.alt || combo.meta;
      if (!hasModifier && !shortcut.activeInInputs && comboUtils.isEditableTarget(event)) {
        continue;
      }

      const handlers = state.handlers[scope]?.[shortcutId] ?? [];
      handlers.forEach((h) => h(event));
      break;
    }
  },

  triggerById(id) {
    const state = get();
    if (!state.enabled) return;
    const shortcut = state.shortcuts[id];
    if (!shortcut) return;
    // Bypasses scope and combo resolution — remote button presses are explicit commands
    const handlers = state.handlers[shortcut.scope]?.[id] ?? [];
    const syntheticEvent = new KeyboardEvent("keyup");
    handlers.forEach((h) => h(syntheticEvent));
  },
}));

export const useShortcutStore = shortcutsStore;

export const selectCombo = (id: string) => (state: ShortcutStore) =>
  state.shortcuts[id]?.combo ?? null;
