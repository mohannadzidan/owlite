import { db } from "@/db";
import { profileContinueWatching, profilePreferences } from "@/db/schema";
import { DEFAULT_PREFERENCES, PreferencesRecord } from "@/lib/profile-types";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import HomeClient from "./home-client";

export default async function HomePage() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get("owlite_profile")?.value;

  let continueWatching: ReturnType<typeof normalizeEntry>[] = [];
  let preferences: PreferencesRecord = DEFAULT_PREFERENCES;

  if (profileId) {
    const [cwRows, prefRow] = await Promise.all([
      db
        .select()
        .from(profileContinueWatching)
        .where(eq(profileContinueWatching.profileId, profileId))
        .orderBy(desc(profileContinueWatching.lastWatch)),
      db.select().from(profilePreferences).where(eq(profilePreferences.profileId, profileId)).get(),
    ]);

    continueWatching = cwRows.map(normalizeEntry);
    preferences = prefRow ? (JSON.parse(prefRow.data) as PreferencesRecord) : DEFAULT_PREFERENCES;
  }

  return (
    <SWRConfig
      value={{
        fallback: {
          "profile/continue-watching": continueWatching,
          "profile/preferences": preferences,
        },
      }}
    >
      <HomeClient />
    </SWRConfig>
  );
}

function normalizeEntry(row: typeof profileContinueWatching.$inferSelect) {
  const base = {
    id: row.tmdbId,
    lastWatch: row.lastWatch,
    name: row.name,
    overview: row.overview,
    backdrop_path: row.backdropPath,
    poster_path: row.posterPath ?? undefined,
  };
  if (row.type === "tv") {
    return { ...base, type: "tv" as const, season: row.season!, episode: row.episode! };
  }
  return { ...base, type: "movie" as const, poster_path: row.posterPath ?? null };
}
