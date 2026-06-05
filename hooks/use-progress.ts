"use client";

import { ProgressRecord } from "@/lib/profile-types";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useProgress(tmdbId: number, season?: number, episode?: number) {
  const key = ["profile/progress", tmdbId, season ?? null, episode ?? null];
  const { data, mutate } = useSWR(key, () => profileService.getProgress(tmdbId, season, episode));

  const patchProgress = (update: Partial<ProgressRecord>) => {
    void profileService.patchProgress(tmdbId, update, season, episode);
    void mutate((current) => ({ total: 0, watched: 0, ...current, ...update }), {
      revalidate: false,
    });
  };

  return { progress: data ?? null, patchProgress };
}
