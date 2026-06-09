
import type { ProgressRecord } from "@/lib/profile-types";
import { getClientProfileId } from "@/lib/profile-id";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useProgress(tmdbId: number, season?: number, episode?: number) {
  const profileId = getClientProfileId();
  const key = profileId
    ? ["profile/progress", profileId, tmdbId, season ?? null, episode ?? null]
    : null;
  const { data, mutate } = useSWR(key, () =>
    profileService.getProgress(profileId!, tmdbId, season, episode),
  );

  const patchProgress = (update: Partial<ProgressRecord>) => {
    if (!profileId) return;
    void profileService.patchProgress(profileId, tmdbId, update, season, episode);
    void mutate((current) => ({ total: 0, watched: 0, ...current, ...update }), {
      revalidate: false,
    });
  };

  return { progress: data ?? null, patchProgress };
}
