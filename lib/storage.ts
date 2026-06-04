import { getDefaultBindings } from "./constants/shortcuts";
import { Shortcut } from "./shortcuts";

// ─── Key types ────────────────────────────────────────────────────────────────

type UsageIndexKey = "u";
type UsageIndex = Record<string, number>;

type ProgressRecordKey = `prg.${number}.${number}.${number}` | `prg.${number}`;
export type ProgressRecord = {
  total: number;
  watched: number;
};

type ContinueWatchingKey = `cnt`;
export type ContinueWatchingRecord = Array<
  | {
      id: number;
      type: "movie";
      lastWatch: number;
      name: string;
      overview: string;
      backdrop_path: string;
      poster_path: string | null;
    }
  | {
      id: number;
      type: "tv";
      lastWatch: number;
      name: string;
      overview: string;
      backdrop_path: string;
      poster_path?: string;
      season: number;
      episode: number;
    }
>;

type SubtitlesRecordKey = `sub.${number}.${number}.${number}` | `sub.${number}`;
type SubtitlesRecord = string;

type PreferencesKey = `pref`;
type PreferencesRecord = {
  autoplay: boolean;
  showContinueWatching: boolean;
  bindings: Record<string, Shortcut>;
  // Player prefs
  qualityLevel: number;
  subtitleLanguage: string | null;
  subtitleFontSize: number;
  subtitleVerticalPosition: number;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const getDefaultPreferences = (): PreferencesRecord => ({
  autoplay: true,
  showContinueWatching: true,
  bindings: getDefaultBindings(),
  qualityLevel: -1,
  subtitleLanguage: null,
  subtitleFontSize: 75,
  subtitleVerticalPosition: 5,
});

// ─── Key builders ─────────────────────────────────────────────────────────────

const keys = {
  usageIndex: (): UsageIndexKey => "u",
  progress: (tmdbId: number, season?: number, episode?: number): ProgressRecordKey => {
    if (season !== undefined && episode !== undefined) {
      return `prg.${tmdbId}.${season}.${episode}`;
    }
    return `prg.${tmdbId}`;
  },
  subtitles: (tmdbId: number, season?: number, episode?: number): SubtitlesRecordKey => {
    if (season !== undefined && episode !== undefined) {
      return `sub.${tmdbId}.${season}.${episode}`;
    }
    return `sub.${tmdbId}`;
  },
  continueWatching: (): ContinueWatchingKey => "cnt",
  preferences: (): PreferencesKey => "pref",
};

// ─── Internal read / write ────────────────────────────────────────────────────

const usageIndex: UsageIndex =
  typeof window !== "undefined" ? JSON.parse(localStorage.getItem(keys.usageIndex()) ?? "{}") : {};

const read = <T>(key: string, recordUsage: boolean = true): T | null => {
  if (recordUsage) {
    usageIndex[key] = Date.now();
    localStorage.setItem(keys.usageIndex(), JSON.stringify(usageIndex));
  }
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Error parsing localStorage item with key "${key}":`, e);
    localStorage.removeItem(key);
    return null;
  }
};

const write = (key: string, value: unknown, recordUsage: boolean = true) => {
  if (recordUsage) {
    usageIndex[key] = Date.now();
    localStorage.setItem(keys.usageIndex(), JSON.stringify(usageIndex));
  }
  localStorage.setItem(key, JSON.stringify(value));
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const storage = {
  // Watch progress (total/watched counts for UI badges)
  saveProgress: (tmdbId: number, progress: ProgressRecord, season?: number, episode?: number) =>
    write(keys.progress(tmdbId, season, episode), progress),

  getProgress: (tmdbId: number, season?: number, episode?: number) =>
    read<ProgressRecord>(keys.progress(tmdbId, season, episode)),

  // Subtitle file URLs per title
  saveSubtitles: (tmdbId: number, subtitles: SubtitlesRecord, season?: number, episode?: number) =>
    write(keys.subtitles(tmdbId, season, episode), subtitles),

  getSubtitles: (tmdbId: number, season?: number, episode?: number) =>
    read<SubtitlesRecord>(keys.subtitles(tmdbId, season, episode)),

  // Continue-watching list (capped at 5)
  saveContinueWatching: (entry: ContinueWatchingRecord[number]) => {
    const current = read<ContinueWatchingRecord>(keys.continueWatching()) ?? [];
    const filtered = current.filter((e) => e.id !== entry.id);
    write(keys.continueWatching(), [entry, ...filtered].slice(0, 5));
  },

  getContinueWatching: () => read<ContinueWatchingRecord>(keys.continueWatching()) ?? [],

  // User preferences (shortcuts bindings + player settings)
  savePreferences: (preferences: PreferencesRecord) =>
    write(keys.preferences(), preferences, false),

  patchPreferences: (update: Partial<PreferencesRecord>) => {
    const current = storage.getPreferences();
    write(keys.preferences(), { ...current, ...update }, false);
  },

  getPreferences: (): PreferencesRecord =>
    read<PreferencesRecord>(keys.preferences(), false) ?? getDefaultPreferences(),

  patchProgress: (
    tmdbId: number,
    update: Partial<ProgressRecord>,
    season?: number,
    episode?: number,
  ): void => {
    const current = storage.getProgress(tmdbId, season, episode) ?? { total: 0, watched: 0 };
    write(keys.progress(tmdbId, season, episode), { ...current, ...update });
  },
};

export const getUsedStorageSize = () => {
  let totalSize = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      totalSize += new Blob([key]).size + new Blob([localStorage[key]]).size;
    }
  }
  return totalSize / 1024;
};
