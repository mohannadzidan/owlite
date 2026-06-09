export const Global = 0;

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface Shortcut {
  id: string;
  combo: KeyCombo;
  scope: number;
  activeInInputs?: boolean;
}

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutStore {
  shortcuts: Record<string, Shortcut>;
  activeScopes: number[];
  handlers: Record<number, Record<string, ShortcutHandler[]>>;
  comboIndex: Record<number, Record<string, string>>;
  lastCombo: KeyCombo | null;
  enabled: boolean;

  hasConflict(scope: number, combo: KeyCombo): string | null;
  register(shortcut: Shortcut): void;
  unregister(shortcut: Pick<Shortcut, "id" | "scope">): void;
  subscribe(scope: number, id: string, handler: ShortcutHandler): () => void;
  pushScope(scope: number): void;
  popScope(scope: number): void;
  disable(): void;
  enable(): void;
  dispatch(event: KeyboardEvent): void;
  triggerById(id: string): void;
}

export interface ComboUtils {
  serialise(combo: KeyCombo): string;
  deserialise(raw: string): KeyCombo | null;
  format(combo: KeyCombo): string;
  matches(event: KeyboardEvent, combo: KeyCombo): boolean;
  isEditableTarget(event: KeyboardEvent): boolean;
}

export interface UseShortcut {
  (scope: number, id: string, handler: ShortcutHandler, enabled?: boolean): void;
}

export interface UseShortcutScope {
  (scope: number): void;
}

export interface UseShortcutCombo {
  (id: string): { combo: KeyCombo; formatted: string } | null;
}
