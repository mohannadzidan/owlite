import { createFileRoute } from "@tanstack/react-router";
import HomeClient from "@/home-client";
import FullScreenSpinner from "@/components/fullscreen-spinner";
import { tmdb } from "@/services/tmdb.service";
import { profileService } from "@/services/profile.service";
import { getClientProfileId } from "@/lib/profile-id";

export const Route = createFileRoute("/")({
  loader: async () => {
    const profileId = getClientProfileId();
    const [discoverResult, continueWatching] = await Promise.all([
      tmdb.trending.trending("all", "day"),
      profileId ? profileService.getContinueWatching(profileId) : Promise.resolve([]),
    ]);
    if ("error" in discoverResult) throw discoverResult;
    return { discoverData: discoverResult, continueWatching };
  },
  pendingComponent: FullScreenSpinner,
  component: HomeClient,
});
