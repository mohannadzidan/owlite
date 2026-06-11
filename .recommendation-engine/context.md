# Recommendation Engine — Shared Context

> **STRICT RULE — ALWAYS ENFORCE:**
> This file is the **shared knowledge base** for this migration. Every phase executor MUST read this file before starting their phase. After each successful phase completion, this file MUST be updated to reflect:
>
> - Any new information that can help in faster onboarding for implementing the plan and better context on the project (from the current conversation and information you already discovered during implementation **no explicit extra work needed to gather the info, just update with what you found**, not based on assumptions).
> - New information discovered during implementation
> - Corrected assumptions or outdated information
> - New patterns established that future phases should follow
> - State of the migration (which phases are done, what works, what was tricky)
>
> Treat it as a living document. A stale context is a dangerous context.

---

## Migration State

| Phase                          | Status         | Notes                                                                                               |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------------------------- |
| Phase 1 — Shared Types         | ✅ Done        | `packages/types/src/recommendations.ts` created; exported from index                                |
| Phase 2 — Backend Service      | ✅ Done        | `apps/api/src/services/recommendations.service.ts` created; exports `getRecommendations(profileId)` |
| Phase 3 — Backend API Route    | ✅ Done        | `GET /api/v1/profiles/:profileId/recommendations` added to `apps/api/src/routes/profiles.ts`        |
| Phase 4 — Frontend Integration | ⬜ Not started |                                                                                                     |

---

## Project Overview

**Owlite** is a personal media server for Android TV (Chrome 81 target). It is a **monorepo** with:

- `apps/api` — Fastify backend, SQLite via Drizzle ORM (`better-sqlite3`)
- `apps/web` — Vite + React frontend, TanStack Router
- `packages/types` — shared TypeScript types consumed by both apps

**Important:** The CLAUDE.md says "Next.js 16 App Router" but the actual code uses **TanStack Router** on the frontend and **Fastify** on the backend. There are no Server Components, Server Actions, or Next.js route handlers. Ignore the Next.js references in CLAUDE.md — trust the actual code.

---

## Relevant Files

### Database schema

`apps/api/src/db/schema.ts`

Key tables:

- **`profileContinueWatching`** — `{ profileId, tmdbId, type: 'movie'|'tv', lastWatch (unix ms), name, overview, backdropPath, posterPath, season?, episode? }`. Unique on `(profileId, tmdbId)`.
- **`profileProgress`** — `{ profileId, tmdbId, season?, episode?, total: real, watched: real, updatedAt }`. Unique on `(profileId, tmdbId, season, episode)`. No `type` field.

The join between these two is `tmdbId`. `profileContinueWatching` provides `type`; `profileProgress` provides `watched/total` ratio.

### Backend service

`apps/api/src/services/profile.service.ts`

- `getContinueWatching(profileId)` → `ContinueWatchingEntry[]` (ordered by `lastWatch` desc)
- All DB queries use Drizzle ORM: `db.select().from(table).where(…).all()`

### Backend routes

`apps/api/src/routes/profiles.ts` — all profile endpoints. New recommendation route goes here.

### TMDB proxy

`apps/api/src/routes/tmdb.ts` — wildcard `GET /tmdb/*` that forwards to `https://api.themoviedb.org/` with `Authorization: Bearer ${TMDB_API_KEY}`. The env var `TMDB_API_KEY` is available in the API process.

For the recommendations service (server-side TMDB calls), use `fetch` directly with Bearer auth — do NOT call the app's own proxy. Example:

```typescript
const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/recommendations`, {
  headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
});
```

### Frontend TMDB client

`apps/web/src/services/tmdb.service.ts` — uses `tmdb-ts` library, routes through the API proxy at `VITE_API_URL + "/api/v1/tmdb"`. Frontend TMDB calls are only for the existing homepage loader (trending) and search — the new recommendations data comes from the API endpoint, not from frontend TMDB calls.

### Frontend service

`apps/web/src/services/profile.service.ts` — thin HTTP wrapper around API endpoints. Follows existing patterns.

### Route loader

`apps/web/src/routes/index.tsx` — TanStack Router `loader`. Currently fetches `trending` + `continueWatching` in parallel. New recommendations fetch goes here.

### Homepage component

`apps/web/src/home-client.tsx` — renders: Continue Watching carousel, Trending Movies carousel, Trending Series carousel. New recommendation rows go between Continue Watching and Trending Movies.

### Shared types

`packages/types/src/profile.ts` — existing types (`Profile`, `ProgressRecord`, `ContinueWatchingEntry`, etc.). New recommendation types go in a new file `packages/types/src/recommendations.ts`, exported from the package index.

---

## Data Model for Recommendations

### Implicit rating per item

| Progress ratio (`watched/total`) | Implicit rating                    |
| -------------------------------- | ---------------------------------- |
| ≥ 0.9                            | 1.0 (strong positive — finished)   |
| 0.5 – 0.9                        | 0.7 (moderate positive)            |
| 0.2 – 0.5                        | 0.3 (mild interest)                |
| < 0.2                            | −0.5 (negative signal — abandoned) |

### Recency decay

`decay = 0.998^daysOld` — approximately 1-month half-life at 346 days. This gives a long-term profile that won't flip based on one week of watching.

**Item weight** = `implicitRating × recencyDecay`

### Taste profile aggregation

For each watched item (up to last 50 from `profileContinueWatching`):

1. Fetch TMDB details: `GET /3/{type}/{id}?append_to_response=keywords,credits`
2. Add `weight` to each genre, top cast members (lower weight), director/creator (higher weight), original language

### Candidate sources

1. **"Because You Watched X"** — TMDB `/3/{type}/{id}/recommendations` for top 2 recent seeds (ratio ≥ 0.5, sorted by `lastWatch` desc)
2. **"Top Picks for You"** — TMDB recommendations from last 10 seeds, merged, frequency-ranked, re-scored against taste profile
3. **Top Category rows (2)** — TMDB `/3/discover/{movie|tv}?with_genres={id}&sort_by=vote_average.desc&vote_count.gte=100` for top 2 genre scores in taste profile

All candidate sources: filter out tmdbIds already in `profileContinueWatching` (already watched).

---

## API Contract

### `GET /profiles/:profileId/recommendations`

Response type (`RecommendationsPayload`):

```typescript
{
  becauseYouWatched: Array<{
    seedTitle: string;
    seedType: 'movie' | 'tv';
    seedId: number;
    items: RecommendationItem[];
  }>;
  topPicks: RecommendationItem[];
  topCategories: Array<{ genreName: string; items: RecommendationItem[] }>;
}
```

Cold start (no seeds with ratio ≥ 0.5): all arrays empty.

---

## Homepage Row Order (target)

1. Continue Watching _(existing)_
2. "Because you watched [X]" × 2 _(new, conditional)_
3. "Top Picks for You" × 1 _(new, conditional)_
4. "More [Genre]" × 2 _(new, conditional)_
5. Trending Movies _(existing)_
6. Trending Series _(existing)_

---

## Discovered During Implementation

### DB / Drizzle patterns

- Schema tables (`profileContinueWatching`, `profileProgress`, etc.) are **re-exported from `apps/api/src/db/index.ts`** via `export * from "./schema"`. Import both `db` and the table refs from `"../db/index"`.
- `.all()` returns an array; `.get()` returns one row or `undefined`. There is no `.first()`.
- Drizzle has no aggregate helper for `MAX` in the better-sqlite3 adapter in this project — compute `max(watched/total)` across TV episodes by fetching all rows and reducing in JS.
- `lastWatch` is stored as a plain **unix milliseconds integer** (not a `Date`). Arithmetic like `Date.now() - entry.lastWatch` works directly. This is different from `createdAt` which uses `mode: "timestamp"` and comes back as a JS `Date`.
- `profileProgress` rows for TV shows have `season` and `episode` set; for movies they are `null`. Use `isNull(profileProgress.season)` in the where clause when querying a movie's progress row.

### TMDB response shapes to be aware of

- `/3/{type}/{id}/recommendations` results **do not reliably include `media_type`** in every item — infer it from the seed's type instead of trusting the field.
- `/3/discover/movie` and `/3/discover/tv` results **never include `media_type`** — add it manually after the fetch (e.g. `.map(r => ({ ...r, media_type: "movie" as const }))`).
- TMDB details endpoint with `?append_to_response=credits` returns `credits.cast` and `credits.crew` inline. TV details use `created_by` (array of `{ id, name }`) instead of a crew `Director` entry.
- Genre lists from `/3/genre/movie/list` and `/3/genre/tv/list` overlap in ids for shared genres — merge both into one `Map<id, name>` and skip duplicates.

### Error handling strategy

- Individual TMDB calls inside `buildTasteProfile` batches are wrapped in `try/catch` — a single failed item silently skips rather than aborting the whole profile build. This is intentional.
- `getRecommendedItems` and `getTopCategoryRows` use `.catch(() => ({ results: [] }))` on each parallel fetch so one failed seed doesn't reject the whole `Promise.all`.

### Fastify route registration pattern

- All routes are registered inside a single `export default async function(fastify: FastifyInstance)` in the route file — no separate plugin wrapping.
- Params are cast inline: `const { profileId } = req.params as { profileId: string }` — no generic type params on `fastify.get<...>()`.
- No profile existence check on profile-scoped data routes (preferences, progress, continue-watching, recommendations) — only the top-level `/profiles/:id` PATCH/DELETE use `notFound()`.
- The API mounts routes at prefix `/api/v1`, so the full URL is `GET /api/v1/profiles/:profileId/recommendations`.

### `packages/types` export pattern

- `packages/types/src/index.ts` uses bare `export * from "./module"` — just add a new line for any new file.

---

## Coding Conventions

- Drizzle ORM for all DB queries. Use `eq`, `and`, `desc`, `isNull` from `drizzle-orm`.
- No `any` — all TMDB responses should be typed (use `tmdb-ts` types if available, otherwise create minimal inline types).
- All new backend functions are pure service functions in `services/` — no Fastify/React imports.
- Use `cn()` from `@/lib/utils` for conditional classnames in frontend.
- Use existing `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` components from `components/ui/carousel` for new rows.
- Use existing `PosterCard` component for individual items.
- Use `Link` from `@tanstack/react-router` for navigation.
- `pnpm typecheck` must pass after every phase.
- `pnpm fmt` must be run at the end of the final phase.
