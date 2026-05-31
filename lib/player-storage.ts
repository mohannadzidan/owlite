// ─── Helpers ──────────────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or disabled — silently ignore
  }
}

// ─── Preferences (user-wide) ──────────────────────────────────────────────────

export const PlayerPrefs = {
  qualityLevel: {
    get: (): number => read("player.qualityLevel", -1),
    set: (v: number) => write("player.qualityLevel", v),
  },
  subtitleLanguage: {
    get: (): string | null => read("player.subtitleLanguage", null),
    set: (v: string | null) => write("player.subtitleLanguage", v),
  },
  subtitleFontSize: {
    get: (): number => read("player.subtitleFontSize", 75),
    set: (v: number) => write("player.subtitleFontSize", v),
  },
  subtitleVerticalPosition: {
    get: (): number => read("player.subtitleVerticalPosition", 5),
    set: (v: number) => write("player.subtitleVerticalPosition", v),
  },
};

// ─── Per-title progress ───────────────────────────────────────────────────────

export interface TitleProgress {
  /** Resume position in seconds */
  time?: number;
  /** ID of the last selected subtitle track */
  subtitleTrackId?: string;
  /** Download URL of the last selected subtitle (served from server cache) */
  subtitleDownloadUrl?: string;
}

export const TitleStorage = {
  get: (titleId: string): TitleProgress => read(`player.title.${titleId}`, {}),
  patch: (titleId: string, update: Partial<TitleProgress>): void => {
    const current = TitleStorage.get(titleId);
    write(`player.title.${titleId}`, { ...current, ...update });
  },
};

// ─── Title ID builder ─────────────────────────────────────────────────────────

export function buildTitleId(
  tmdbId: number | undefined,
  season: number | undefined,
  episode: number | undefined,
): string | null {
  if (!tmdbId) return null;
  if (season != null && episode != null) return `tv:${tmdbId}:s${season}e${episode}`;
  return `movie:${tmdbId}`;
}
