"use client";

import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useSubtitlePreference(tmdbId: number, season?: number, episode?: number) {
  const key = ["profile/subtitles", tmdbId, season ?? null, episode ?? null];
  const { data, mutate } = useSWR(key, () => profileService.getSubtitles(tmdbId, season, episode));

  const saveSubtitlePreference = (subtitleUrl: string) => {
    void profileService.saveSubtitles(tmdbId, subtitleUrl, season, episode);
    void mutate(subtitleUrl, { revalidate: false });
  };

  return { subtitleUrl: data ?? null, saveSubtitlePreference };
}
