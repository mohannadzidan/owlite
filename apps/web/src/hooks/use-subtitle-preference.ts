import { getClientProfileId } from "@/lib/profile-id";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useSubtitlePreference(tmdbId: number, season?: number, episode?: number) {
  const profileId = getClientProfileId();
  const key = profileId
    ? ["profile/subtitles", profileId, tmdbId, season ?? null, episode ?? null]
    : null;
  const { data, mutate } = useSWR(key, () =>
    profileService.getSubtitles(profileId!, tmdbId, season, episode),
  );

  const saveSubtitlePreference = (subtitleUrl: string) => {
    if (!profileId) return;
    void profileService.saveSubtitles(profileId, tmdbId, subtitleUrl, season, episode);
    void mutate(subtitleUrl, { revalidate: false });
  };

  return { subtitleUrl: data ?? null, saveSubtitlePreference };
}
