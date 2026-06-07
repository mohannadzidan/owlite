export type Profile = {
  id: string;
  name: string;
  avatarSeed: string;
  createdAt: number;
};

export type PreferencesRecord = {
  autoplay: boolean;
  showContinueWatching: boolean;
  qualityLevel: number;
  subtitleLanguage: string | null;
  subtitleFontSize: number;
  subtitleVerticalPosition: number;
};

export const DEFAULT_PREFERENCES: PreferencesRecord = {
  autoplay: true,
  showContinueWatching: true,
  qualityLevel: -1,
  subtitleLanguage: null,
  subtitleFontSize: 75,
  subtitleVerticalPosition: 5,
};

export type ProgressRecord = {
  total: number;
  watched: number;
};

export type ContinueWatchingEntry =
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
    };
