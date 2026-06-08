import { apiClient } from "./api-client";
import type {
  ContinueWatchingEntry,
  PreferencesRecord,
  Profile,
  ProgressRecord,
} from "@/lib/profile-types";

export const profileService = {
  // Profiles
  listProfiles: (): Promise<Profile[]> =>
    apiClient.profiles.list().then((r) => ("error" in r ? Promise.reject(r) : r)),
  createProfile: (name: string): Promise<Profile> =>
    apiClient.profiles.create(name).then((r) => ("error" in r ? Promise.reject(r) : r)),
  updateProfile: (id: string, update: { name?: string; avatarSeed?: string }): Promise<void> =>
    apiClient.profiles.update(id, update).then(() => {}),
  deleteProfile: (id: string): Promise<void> => apiClient.profiles.delete(id).then(() => {}),
  selectProfile: (id: string): Promise<Profile> =>
    apiClient.profiles.select(id).then((r) => ("error" in r ? Promise.reject(r) : r)),

  // Preferences
  getPreferences: (): Promise<PreferencesRecord> =>
    apiClient.preferences.get().then((r) => ("error" in r ? Promise.reject(r) : r)),
  patchPreferences: (update: Partial<PreferencesRecord>): Promise<void> =>
    apiClient.preferences.patch(update).then(() => {}),

  // Continue watching
  getContinueWatching: (): Promise<ContinueWatchingEntry[]> =>
    apiClient.continueWatching.list().then((r) => ("error" in r ? Promise.reject(r) : r)),
  saveContinueWatching: (entry: ContinueWatchingEntry): Promise<void> =>
    apiClient.continueWatching.add(entry).then(() => {}),
  removeContinueWatching: (tmdbId: number): Promise<void> =>
    apiClient.continueWatching.remove(tmdbId).then(() => {}),

  // Progress
  getProgress: (
    tmdbId: number,
    season?: number,
    episode?: number,
  ): Promise<ProgressRecord | null> =>
    apiClient.progress.get({ tmdbId, season, episode }).then((r) => (r && "error" in r ? null : r)),
  patchProgress: (
    tmdbId: number,
    update: Partial<ProgressRecord>,
    season?: number,
    episode?: number,
  ): Promise<void> => apiClient.progress.patch({ tmdbId, season, episode }, update).then(() => {}),

  // Subtitles
  getSubtitles: (tmdbId: number, season?: number, episode?: number): Promise<string | null> =>
    apiClient.profileSubtitles
      .get({ tmdbId, season, episode })
      .then((r) => ("error" in r ? null : r.subtitleUrl)),
  saveSubtitles: (
    tmdbId: number,
    subtitleUrl: string,
    season?: number,
    episode?: number,
  ): Promise<void> =>
    apiClient.profileSubtitles.patch({ tmdbId, season, episode, subtitleUrl }).then(() => {}),
};
