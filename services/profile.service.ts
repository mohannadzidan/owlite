import {
  ContinueWatchingEntry,
  DEFAULT_PREFERENCES,
  PreferencesRecord,
  Profile,
  ProgressRecord,
} from "@/lib/profile-types";

function buildProgressParams(tmdbId: number, season?: number, episode?: number) {
  const p = new URLSearchParams({ tmdbId: String(tmdbId) });
  if (season !== undefined) p.set("season", String(season));
  if (episode !== undefined) p.set("episode", String(episode));
  return p.toString();
}

export const profileService = {
  // Profiles
  listProfiles: (): Promise<Profile[]> => fetch("/api/profiles").then((r) => r.json()),
  createProfile: (name: string): Promise<Profile> =>
    fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json()),
  updateProfile: (id: string, update: { name?: string; avatarSeed?: string }): Promise<void> =>
    fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).then(() => {}),
  deleteProfile: (id: string): Promise<void> =>
    fetch(`/api/profiles/${id}`, { method: "DELETE" }).then(() => {}),
  selectProfile: (id: string): Promise<Profile> =>
    fetch(`/api/profiles/${id}/select`, { method: "POST" }).then((r) => r.json()),

  // Preferences
  getPreferences: (): Promise<PreferencesRecord> =>
    fetch("/api/profile/preferences")
      .then((r) => r.json())
      .catch(() => DEFAULT_PREFERENCES),
  patchPreferences: (update: Partial<PreferencesRecord>): Promise<void> =>
    fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).then(() => {}),

  // Continue watching
  getContinueWatching: (): Promise<ContinueWatchingEntry[]> =>
    fetch("/api/profile/continue-watching").then((r) => r.json()),
  saveContinueWatching: (entry: ContinueWatchingEntry): Promise<void> =>
    fetch("/api/profile/continue-watching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).then(() => {}),
  removeContinueWatching: (tmdbId: number): Promise<void> =>
    fetch(`/api/profile/continue-watching?tmdbId=${tmdbId}`, { method: "DELETE" }).then(() => {}),

  // Progress
  getProgress: (
    tmdbId: number,
    season?: number,
    episode?: number,
  ): Promise<ProgressRecord | null> =>
    fetch(`/api/profile/progress?${buildProgressParams(tmdbId, season, episode)}`).then((r) =>
      r.json(),
    ),
  patchProgress: (
    tmdbId: number,
    update: Partial<ProgressRecord>,
    season?: number,
    episode?: number,
  ): Promise<void> =>
    fetch(`/api/profile/progress?${buildProgressParams(tmdbId, season, episode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).then(() => {}),

  // Subtitles
  getSubtitles: (tmdbId: number, season?: number, episode?: number): Promise<string | null> =>
    fetch(`/api/profile/subtitles?${buildProgressParams(tmdbId, season, episode)}`).then((r) =>
      r.json(),
    ),
  saveSubtitles: (
    tmdbId: number,
    subtitleUrl: string,
    season?: number,
    episode?: number,
  ): Promise<void> =>
    fetch(`/api/profile/subtitles?${buildProgressParams(tmdbId, season, episode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitleUrl }),
    }).then(() => {}),
};
