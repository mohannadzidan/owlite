"use client";

import { DEFAULT_PREFERENCES, PreferencesRecord } from "@/lib/profile-types";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useProfilePreferences() {
  const { data, mutate } = useSWR("profile/preferences", profileService.getPreferences, {
    fallbackData: DEFAULT_PREFERENCES,
  });

  const patchPreferences = async (update: Partial<PreferencesRecord>) => {
    await mutate(
      async (current) => {
        await profileService.patchPreferences(update);
        return { ...(current ?? DEFAULT_PREFERENCES), ...update };
      },
      { optimisticData: { ...(data ?? DEFAULT_PREFERENCES), ...update }, revalidate: false },
    );
  };

  return { preferences: data ?? DEFAULT_PREFERENCES, patchPreferences };
}
