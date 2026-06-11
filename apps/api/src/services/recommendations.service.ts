import { db, profileContinueWatching, profileProgress, profileRecommendations } from "../db/index";
import { eq, desc, and, isNull } from "drizzle-orm";
import type { RecommendationItem, RecommendationsPayload } from "@owlite/types";
import { cachedTmdbGet } from "../lib/tmdb-cache";

const TMDB_BASE = "https://api.themoviedb.org/3";
const RECOMMENDATIONS_TTL_MS = 24 * 60 * 60 * 1000;

function tmdbGet<T>(path: string): Promise<T> {
  const url = `${TMDB_BASE}${path}`;
  const auth = `Bearer ${process.env.TMDB_API_KEY}`;
  return cachedTmdbGet<T>(url, auth);
}

// Minimal inline TMDB types

type TmdbGenre = { id: number; name: string };

type TmdbCastMember = { id: number; known_for_department: string };
type TmdbCrewMember = { id: number; job: string };
type TmdbCreatedBy = { id: number };

type TmdbMovieDetails = {
  id: number;
  title: string;
  poster_path: string | null;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  original_language: string;
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
};

type TmdbTvDetails = {
  id: number;
  name: string;
  poster_path: string | null;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  original_language: string;
  created_by?: TmdbCreatedBy[];
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
};

type TmdbRecommendationsPage = {
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type?: string;
    poster_path: string | null;
    genre_ids?: number[];
    original_language?: string;
  }>;
};

type TmdbGenreListResponse = { genres: TmdbGenre[] };

type TasteProfile = {
  genres: Map<number, number>;
  people: Map<number, number>;
  languages: Map<string, number>;
};

function implicitRating(ratio: number): number {
  if (ratio >= 0.9) return 1.0;
  if (ratio >= 0.5) return 0.7;
  if (ratio >= 0.2) return 0.3;
  return -0.5;
}

function daysSince(unixMs: number): number {
  return (Date.now() - unixMs) / (1000 * 60 * 60 * 24);
}

function addToMap(map: Map<number, number>, key: number, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function addToStrMap(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

async function processBatch<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function buildTasteProfile(profileId: string): Promise<TasteProfile> {
  const profile: TasteProfile = {
    genres: new Map(),
    people: new Map(),
    languages: new Map(),
  };

  const watched = db
    .select()
    .from(profileContinueWatching)
    .where(eq(profileContinueWatching.profileId, profileId))
    .orderBy(desc(profileContinueWatching.lastWatch))
    .limit(50)
    .all();

  if (watched.length === 0) return profile;

  // Get best progress ratio for each watched item
  const withRatios = watched.map((entry) => {
    let ratio = 0;
    if (entry.type === "movie") {
      const row = db
        .select()
        .from(profileProgress)
        .where(
          and(
            eq(profileProgress.profileId, profileId),
            eq(profileProgress.tmdbId, entry.tmdbId),
            isNull(profileProgress.season),
            isNull(profileProgress.episode),
          ),
        )
        .get();
      if (row && row.total > 0) ratio = row.watched / row.total;
    } else {
      // TV: max ratio across all episodes
      const rows = db
        .select()
        .from(profileProgress)
        .where(
          and(eq(profileProgress.profileId, profileId), eq(profileProgress.tmdbId, entry.tmdbId)),
        )
        .all();
      for (const row of rows) {
        if (row.total > 0) {
          const r = row.watched / row.total;
          if (r > ratio) ratio = r;
        }
      }
    }
    const rating = implicitRating(ratio);
    const decay = Math.pow(0.998, daysSince(entry.lastWatch));
    return { entry, weight: rating * decay };
  });

  await processBatch(withRatios, 10, async ({ entry, weight }) => {
    try {
      if (entry.type === "movie") {
        const details = await tmdbGet<TmdbMovieDetails>(
          `/movie/${entry.tmdbId}?append_to_response=credits`,
        );
        const genres = details.genres ?? [];
        for (const g of genres) addToMap(profile.genres, g.id, weight);
        addToStrMap(profile.languages, details.original_language, weight);
        if (details.credits) {
          for (const crew of details.credits.crew) {
            if (crew.job === "Director") addToMap(profile.people, crew.id, weight * 1.5);
          }
          for (const cast of details.credits.cast.slice(0, 5)) {
            addToMap(profile.people, cast.id, weight * 0.5);
          }
        }
      } else {
        const details = await tmdbGet<TmdbTvDetails>(
          `/tv/${entry.tmdbId}?append_to_response=credits`,
        );
        const genres = details.genres ?? [];
        for (const g of genres) addToMap(profile.genres, g.id, weight);
        addToStrMap(profile.languages, details.original_language, weight);
        if (details.created_by) {
          for (const creator of details.created_by) {
            addToMap(profile.people, creator.id, weight * 1.5);
          }
        }
        if (details.credits) {
          for (const cast of details.credits.cast.slice(0, 5)) {
            addToMap(profile.people, cast.id, weight * 0.5);
          }
        }
      }
    } catch {
      // Ignore individual TMDB failures — partial profile is fine
    }
  });

  return profile;
}

type SeedEntry = {
  tmdbId: number;
  type: "movie" | "tv";
  name: string;
  lastWatch: number;
};

type Seeds = {
  displaySeeds: SeedEntry[];
  recommendationSeeds: SeedEntry[];
  watchedIds: Set<number>;
};

function getSeeds(profileId: string): Seeds {
  const allWatched = db
    .select()
    .from(profileContinueWatching)
    .where(eq(profileContinueWatching.profileId, profileId))
    .orderBy(desc(profileContinueWatching.lastWatch))
    .all();

  const watchedIds = new Set(allWatched.map((e) => e.tmdbId));

  // Filter to seeds with ratio >= 0.5
  const seeds: SeedEntry[] = [];
  for (const entry of allWatched) {
    let ratio = 0;
    if (entry.type === "movie") {
      const row = db
        .select()
        .from(profileProgress)
        .where(
          and(
            eq(profileProgress.profileId, profileId),
            eq(profileProgress.tmdbId, entry.tmdbId),
            isNull(profileProgress.season),
            isNull(profileProgress.episode),
          ),
        )
        .get();
      if (row && row.total > 0) ratio = row.watched / row.total;
    } else {
      const rows = db
        .select()
        .from(profileProgress)
        .where(
          and(eq(profileProgress.profileId, profileId), eq(profileProgress.tmdbId, entry.tmdbId)),
        )
        .all();
      for (const row of rows) {
        if (row.total > 0) {
          const r = row.watched / row.total;
          if (r > ratio) ratio = r;
        }
      }
    }
    if (ratio >= 0.5) {
      seeds.push({
        tmdbId: entry.tmdbId,
        type: entry.type,
        name: entry.name,
        lastWatch: entry.lastWatch,
      });
    }
  }

  return {
    displaySeeds: seeds.slice(0, 2),
    recommendationSeeds: seeds.slice(0, 10),
    watchedIds,
  };
}

function profileScore(
  item: { genre_ids?: number[]; original_language?: string },
  tasteProfile: TasteProfile,
): number {
  let score = 0;
  for (const gid of item.genre_ids ?? []) {
    score += tasteProfile.genres.get(gid) ?? 0;
  }
  if (item.original_language) {
    score += tasteProfile.languages.get(item.original_language) ?? 0;
  }
  return score;
}

async function getRecommendedItems(
  seeds: SeedEntry[],
  watchedIds: Set<number>,
  tasteProfile: TasteProfile,
): Promise<RecommendationItem[]> {
  type RawCandidate = {
    id: number;
    title?: string;
    name?: string;
    media_type?: string;
    poster_path: string | null;
    genre_ids?: number[];
    original_language?: string;
  };

  const pages = await Promise.all(
    seeds.map((s) =>
      tmdbGet<TmdbRecommendationsPage>(`/${s.type}/${s.tmdbId}/recommendations`).catch(() => ({
        results: [] as TmdbRecommendationsPage["results"],
      })),
    ),
  );

  const candidateMap = new Map<number, { item: RawCandidate; count: number }>();
  for (const page of pages) {
    for (const item of page.results) {
      if (watchedIds.has(item.id)) continue;
      const existing = candidateMap.get(item.id);
      if (existing) {
        existing.count += 1;
      } else {
        candidateMap.set(item.id, { item, count: 1 });
      }
    }
  }

  return Array.from(candidateMap.values())
    .map(({ item, count }) => ({ item, score: count * (1 + profileScore(item, tasteProfile)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ item }) => ({
      id: item.id,
      media_type: (item.media_type === "tv" ? "tv" : "movie") as "movie" | "tv",
      title: item.title ?? item.name ?? "",
      poster_path: item.poster_path,
    }));
}

async function getTopCategoryRows(
  tasteProfile: TasteProfile,
  watchedIds: Set<number>,
): Promise<Array<{ genreName: string; items: RecommendationItem[] }>> {
  if (tasteProfile.genres.size === 0) return [];

  const topGenres = Array.from(tasteProfile.genres.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);

  // Fetch genre name lists
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbGet<TmdbGenreListResponse>("/genre/movie/list").catch(() => ({
      genres: [] as TmdbGenre[],
    })),
    tmdbGet<TmdbGenreListResponse>("/genre/tv/list").catch(() => ({ genres: [] as TmdbGenre[] })),
  ]);

  const genreNameMap = new Map<number, string>();
  for (const g of [...movieGenres.genres, ...tvGenres.genres]) {
    if (!genreNameMap.has(g.id)) genreNameMap.set(g.id, g.name);
  }

  const rows: Array<{ genreName: string; items: RecommendationItem[] }> = [];

  for (const genreId of topGenres) {
    const genreName = genreNameMap.get(genreId) ?? String(genreId);

    const [moviePage, tvPage] = await Promise.all([
      tmdbGet<TmdbRecommendationsPage>(
        `/discover/movie?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`,
      ).catch(() => ({ results: [] as TmdbRecommendationsPage["results"] })),
      tmdbGet<TmdbRecommendationsPage>(
        `/discover/tv?with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100`,
      ).catch(() => ({ results: [] as TmdbRecommendationsPage["results"] })),
    ]);

    const combined = [
      ...moviePage.results.map((r) => ({ ...r, media_type: "movie" as const })),
      ...tvPage.results.map((r) => ({ ...r, media_type: "tv" as const })),
    ];

    const items = combined
      .filter((r) => !watchedIds.has(r.id))
      .map((r) => ({ item: r, score: profileScore(r, tasteProfile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(({ item }) => ({
        id: item.id,
        media_type: item.media_type,
        title: item.title ?? item.name ?? "",
        poster_path: item.poster_path,
      }));

    rows.push({ genreName, items });
  }

  return rows;
}

async function computeRecommendations(profileId: string): Promise<RecommendationsPayload> {
  const { displaySeeds, recommendationSeeds, watchedIds } = getSeeds(profileId);

  if (recommendationSeeds.length === 0) {
    return { becauseYouWatched: [], topPicks: [], topCategories: [] };
  }

  const [tasteProfile, ...becauseYouWatchedPages] = await Promise.all([
    buildTasteProfile(profileId),
    ...displaySeeds.map((seed) =>
      tmdbGet<TmdbRecommendationsPage>(`/${seed.type}/${seed.tmdbId}/recommendations`).catch(
        () => ({ results: [] as TmdbRecommendationsPage["results"] }),
      ),
    ),
  ]);

  const [topPicks, topCategories] = await Promise.all([
    getRecommendedItems(recommendationSeeds, watchedIds, tasteProfile),
    getTopCategoryRows(tasteProfile, watchedIds),
  ]);

  return {
    becauseYouWatched: displaySeeds.map((seed, i) => ({
      seedTitle: seed.name,
      seedType: seed.type,
      seedId: seed.tmdbId,
      items: (becauseYouWatchedPages[i]?.results ?? [])
        .filter((r) => !watchedIds.has(r.id))
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          media_type: seed.type as "movie" | "tv",
          title: r.title ?? r.name ?? "",
          poster_path: r.poster_path,
        })),
    })),
    topPicks,
    topCategories,
  };
}

export async function getRecommendations(profileId: string): Promise<RecommendationsPayload> {
  const row = db
    .select()
    .from(profileRecommendations)
    .where(eq(profileRecommendations.profileId, profileId))
    .get();

  if (row && Date.now() - row.createdAt < RECOMMENDATIONS_TTL_MS) {
    return JSON.parse(row.payload) as RecommendationsPayload;
  }

  const payload = await computeRecommendations(profileId);

  db.insert(profileRecommendations)
    .values({ profileId, payload: JSON.stringify(payload), createdAt: Date.now() })
    .onConflictDoUpdate({
      target: profileRecommendations.profileId,
      set: { payload: JSON.stringify(payload), createdAt: Date.now() },
    })
    .run();

  return payload;
}
