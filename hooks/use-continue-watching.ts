"use client";

import { ContinueWatchingEntry } from "@/lib/profile-types";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useContinueWatching() {
  const { data, mutate } = useSWR("profile/continue-watching", profileService.getContinueWatching, {
    fallbackData: [],
  });

  const saveContinueWatching = (entry: ContinueWatchingEntry) => {
    void profileService.saveContinueWatching(entry);
    void mutate(
      (current) => {
        const filtered = (current ?? []).filter((e) => e.id !== entry.id);
        return [entry, ...filtered];
      },
      { revalidate: false },
    );
  };

  const removeContinueWatching = (tmdbId: number) => {
    void profileService.removeContinueWatching(tmdbId);
    void mutate((current) => (current ?? []).filter((e) => e.id !== tmdbId), { revalidate: false });
  };

  return { continueWatching: data ?? [], saveContinueWatching, removeContinueWatching };
}
