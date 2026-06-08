import { DEFAULT_PREFERENCES, PreferencesRecord } from "@/lib/profile-types";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import HomeClient from "./home-client";
import { apiClient } from "@/services/api-client";
import { InferSuccessResponse } from "@/services/request";

export default async function HomePage() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("owlite_profile")?.value;

  let continueWatching: InferSuccessResponse<typeof apiClient.continueWatching.list> = [];
  let preferences: PreferencesRecord = DEFAULT_PREFERENCES;
  if (profileId) {
    const [cwRows, prefRow] = await Promise.all([
      apiClient.continueWatching.list(profileId!),
      apiClient.preferences.get(profileId!),
    ]);
    if ("error" in cwRows || "error" in prefRow) {
      console.error("Error fetching profile data", {
        cwError: "error" in cwRows ? cwRows.error : null,
        prefError: "error" in prefRow ? prefRow.error : null,
      });
      return <div className="p-4">Error loading profile data</div>;
    }
    continueWatching = cwRows;
    preferences = prefRow ? (prefRow as PreferencesRecord) : DEFAULT_PREFERENCES;
  }

  return (
    <SWRConfig
      value={{
        fallback: {
          [`profile/${profileId}/continue-watching`]: continueWatching,
          [`profile/${profileId}/preferences`]: preferences,
        },
      }}
    >
      <HomeClient />
    </SWRConfig>
  );
}
