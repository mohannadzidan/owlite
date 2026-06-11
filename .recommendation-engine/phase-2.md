# Phase 2 — Backend Recommendations Service

## Pre-requisites

**Read `.recommendation-engine/context.md` before starting.** Phase 1 must be complete (shared types exist).

## Goal

Create `apps/api/src/services/recommendations.service.ts` — the core recommendation logic: taste profile building, seed selection, TMDB fetching, frequency ranking, and genre-based category rows.

## Steps

### 1. TMDB helper (internal to service)

All TMDB calls use `fetch` directly with Bearer auth — do NOT call the app's own proxy:

```typescript
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
```

Define minimal inline types for TMDB responses you need (genre list, keywords, credits, recommendations page). Do not use `any`.

### 2. `buildTasteProfile(profileId: string)`

```typescript
type TasteProfile = {
  genres: Map<number, number>; // genreId → score
  people: Map<number, number>; // personId → score
  languages: Map<string, number>; // iso_639_1 → score
};
```

Logic:

1. Query `profileContinueWatching` — last 50 entries ordered by `lastWatch` desc
2. For each entry, get the best progress ratio from `profileProgress`:
   - For movies: `season IS NULL AND episode IS NULL`
   - For TV shows: take the max `watched/total` across all episodes for that `tmdbId`
3. Compute `implicitRating` (see context.md table)
4. Compute `decayedWeight = implicitRating * Math.pow(0.998, daysSince(entry.lastWatch))`
5. Fetch TMDB details in parallel (batch of 10 at a time to avoid hammering the API):
   `GET /3/{type}/{id}?append_to_response=keywords,credits`
6. For each item:
   - Add `decayedWeight` to each of its `genre_ids`
   - For credits: add `decayedWeight * 1.5` for director (movies) or `created_by` (TV); add `decayedWeight * 0.5` for cast members (top 5 only)
   - Add `decayedWeight` to `original_language`
7. Return `TasteProfile`

### 3. `getSeeds(profileId: string)`

- Get all `profileContinueWatching` entries for profile
- Cross-reference with `profileProgress` to get engagement ratio
- Filter: ratio ≥ 0.5
- Sort by `lastWatch` desc
- Return `{ displaySeeds: first 2, recommendationSeeds: first 10, watchedIds: Set<number> }`

### 4. `getRecommendedItems(seeds, watchedIds, tasteProfile)`

- Fetch `/3/{type}/{id}/recommendations` for each of the 10 recommendation seeds in parallel
- Build `Map<id, { item: RawTmdbItem; count: number }>` (increment count for duplicates)
- Score each candidate: `score = count * (1 + profileScore(item, tasteProfile))`
  - `profileScore` = sum of matching genre/person/language scores from taste profile
- Filter: remove ids in `watchedIds`
- Sort by score desc, take top 20
- Return `RecommendationItem[]`

### 5. `getTopCategoryRows(tasteProfile, watchedIds)`

- Sort `tasteProfile.genres` by score desc, take top 2
- Fetch genre name lookup from `/3/genre/movie/list` and `/3/genre/tv/list` (merge both)
- For each top genre, call both:
  - `/3/discover/movie?with_genres={id}&sort_by=vote_average.desc&vote_count.gte=100`
  - `/3/discover/tv?with_genres={id}&sort_by=vote_average.desc&vote_count.gte=100`
- Score results against taste profile, filter watched, sort, take top 15
- Return `Array<{ genreName: string; items: RecommendationItem[] }>`

### 6. `getRecommendations(profileId: string): Promise<RecommendationsPayload>`

Main export that orchestrates all of the above:

```typescript
export async function getRecommendations(profileId: string): Promise<RecommendationsPayload> {
  const { displaySeeds, recommendationSeeds, watchedIds } = getSeeds(profileId);
  if (recommendationSeeds.length === 0) {
    return { becauseYouWatched: [], topPicks: [], topCategories: [] };
  }
  const [tasteProfile, ...becauseYouWatchedItems] = await Promise.all([
    buildTasteProfile(profileId),
    ...displaySeeds.map((seed) =>
      tmdbGet(
        `/${seed.type}/${seed.tmdbId}/recommendations`,
      ).then(/* map to RecommendationItem[] */),
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
      items: (becauseYouWatchedItems[i] ?? []).filter((item) => !watchedIds.has(item.id)),
    })),
    topPicks,
    topCategories,
  };
}
```

## Imports needed

```typescript
import { db, profileContinueWatching, profileProgress } from "../db/index";
import { eq, desc, and, isNull } from "drizzle-orm";
import type { RecommendationItem, RecommendationsPayload } from "@owlite/types";
```

## Verify

- `pnpm typecheck` — must pass, no `any` types

## Context update

After completing, update `.recommendation-engine/context.md`:

- Mark Phase 2 as ✅ Done
- Document any TMDB response shapes you had to define inline
- Note the actual batch strategy used and whether 0.998 decay felt right or needed adjusting
- Document any gotchas with Drizzle queries (e.g. how to get max ratio across TV episodes)
