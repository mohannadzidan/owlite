import { DEFAULT_PREFERENCES } from "@/lib/profile-types";
import type { PreferencesRecord } from "@/lib/profile-types";
import { getClientProfileId } from "@/lib/profile-id";
import { profileService } from "@/services/profile.service";
import useSWR from "swr";

export function useProfilePreferences() {
  const profileId = getClientProfileId();
  const key = profileId ? `profile/${profileId}/preferences` : null;
  const { data, mutate } = useSWR(key, () => profileService.getPreferences(profileId!), {
    fallbackData: DEFAULT_PREFERENCES,
  });

  const patchPreferences = async (update: Partial<PreferencesRecord>) => {
    if (!profileId) return;
    await mutate(
      async (current) => {
        await profileService.patchPreferences(profileId, update);
        return { ...(current ?? DEFAULT_PREFERENCES), ...update };
      },
      { optimisticData: { ...(data ?? DEFAULT_PREFERENCES), ...update }, revalidate: false },
    );
  };

  return { preferences: data ?? DEFAULT_PREFERENCES, patchPreferences };
}
