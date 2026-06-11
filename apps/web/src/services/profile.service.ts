import { apiClient } from "./api-client";
import type {
  ContinueWatchingEntry,
  PreferencesRecord,
  Profile,
  ProgressRecord,
} from "@/lib/profile-types";
import type { RecommendationsPayload } from "@owlite/types";

export const profileService = {
  // Profiles
  listProfiles: (): Promise<Profile[]> =>
    apiClient.profiles.list().then((r) => ("error" in r ? Promise.reject(r) : r)),
  createProfile: (name: string): Promise<Profile> =>
    apiClient.profiles.create(name).then((r) => ("error" in r ? Promise.reject(r) : r)),
  updateProfile: (id: string, update: { name?: string; avatarSeed?: string }): Promise<void> =>
    apiClient.profiles.update(id, update).then(() => {}),
  deleteProfile: (id: string): Promise<void> => apiClient.profiles.delete(id).then(() => {}),

  // Preferences
  getPreferences: (profileId: string): Promise<PreferencesRecord> =>
    apiClient.preferences.get(profileId).then((r) => ("error" in r ? Promise.reject(r) : r)),
  patchPreferences: (profileId: string, update: Partial<PreferencesRecord>): Promise<void> =>
    apiClient.preferences.patch(profileId, update).then(() => {}),

  // Continue watching
  getContinueWatching: (profileId: string): Promise<ContinueWatchingEntry[]> =>
    apiClient.continueWatching.list(profileId).then((r) => ("error" in r ? Promise.reject(r) : r)),
  saveContinueWatching: (profileId: string, entry: ContinueWatchingEntry): Promise<void> =>
    apiClient.continueWatching.add(profileId, entry).then(() => {}),
  removeContinueWatching: (profileId: string, tmdbId: number): Promise<void> =>
    apiClient.continueWatching.remove(profileId, tmdbId).then(() => {}),

  // Progress
  getProgress: (
    profileId: string,
    tmdbId: number,
    season?: number,
    episode?: number,
  ): Promise<ProgressRecord | null> =>
    apiClient.progress
      .get(profileId, { tmdbId, season, episode })
      .then((r) => (r && "error" in r ? null : r)),
  patchProgress: (
    profileId: string,
    tmdbId: number,
    update: Partial<ProgressRecord>,
    season?: number,
    episode?: number,
  ): Promise<void> =>
    apiClient.progress.patch(profileId, { tmdbId, season, episode }, update).then(() => {}),

  // Recommendations
  getRecommendations: (profileId: string): Promise<RecommendationsPayload> =>
    apiClient.recommendations.get(profileId).then((r) => ("error" in r ? Promise.reject(r) : r)),

  // Subtitles
  getSubtitles: (
    profileId: string,
    tmdbId: number,
    season?: number,
    episode?: number,
  ): Promise<string | null> =>
    apiClient.profileSubtitles
      .get(profileId, { tmdbId, season, episode })
      .then((r) => ("error" in r ? null : r.subtitleUrl)),
  saveSubtitles: (
    profileId: string,
    tmdbId: number,
    subtitleUrl: string,
    season?: number,
    episode?: number,
  ): Promise<void> =>
    apiClient.profileSubtitles
      .patch(profileId, { tmdbId, season, episode, subtitleUrl })
      .then(() => {}),
};
