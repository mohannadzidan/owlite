"use client";

import { ContinueWatchingEntry } from "@/lib/profile-types";
import { getClientProfileId } from "@/lib/profile-id";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useContinueWatching() {
  const profileId = getClientProfileId();
  const key = profileId ? `profile/${profileId}/continue-watching` : null;
  const { data, mutate } = useSWR(key, () => profileService.getContinueWatching(profileId!), {
    fallbackData: [],
  });

  const saveContinueWatching = (entry: ContinueWatchingEntry) => {
    if (!profileId) return;
    void profileService.saveContinueWatching(profileId, entry);
    void mutate(
      (current) => {
        const filtered = (current ?? []).filter((e) => e.id !== entry.id);
        return [entry, ...filtered];
      },
      { revalidate: false },
    );
  };

  const removeContinueWatching = (tmdbId: number) => {
    if (!profileId) return;
    void profileService.removeContinueWatching(profileId, tmdbId);
    void mutate((current) => (current ?? []).filter((e) => e.id !== tmdbId), {
      revalidate: false,
    });
  };

  return { continueWatching: data ?? [], saveContinueWatching, removeContinueWatching };
}
