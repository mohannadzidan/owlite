# Phase 4 — Frontend Integration

## Pre-requisites

**Read `.recommendation-engine/context.md` before starting.** Phases 1–3 must be complete and the API endpoint must be working.

## Goal

Wire the recommendations API into the frontend: add a service method, fetch in the route loader, and render the new rows on the homepage.

## Steps

### 1. `apps/web/src/services/profile.service.ts` — add `getRecommendations`

Read the existing file first to match the exact HTTP client pattern used (likely a `fetch` wrapper or a typed client). Then add:

```typescript
getRecommendations(profileId: string): Promise<RecommendationsPayload> {
  return this.get(`/profiles/${profileId}/recommendations`);
}
```

Import `RecommendationsPayload` from `@owlite/types`.

### 2. `apps/web/src/routes/index.tsx` — extend the loader

Add recommendations to the parallel `Promise.all`:

```typescript
const [discoverResult, continueWatching, recommendations] = await Promise.all([
  tmdb.trending.trending("all", "day"),
  profileId ? profileService.getContinueWatching(profileId) : Promise.resolve([]),
  profileId
    ? profileService.getRecommendations(profileId)
    : Promise.resolve({ becauseYouWatched: [], topPicks: [], topCategories: [] }),
]);
if ("error" in discoverResult) throw discoverResult;
return { discoverData: discoverResult, continueWatching, recommendations };
```

### 3. `apps/web/src/home-client.tsx` — render new rows

Read the file to understand how `useLoaderData` is destructured and how existing carousels are structured. Then:

**Destructure recommendations from loader data:**

```typescript
const {
  discoverData: initialDiscoverData,
  continueWatching: initialContinueWatching,
  recommendations,
} = useLoaderData({ from: "/" });
```

**Row order in the non-search view** (inside the `<div className="flex flex-col gap-10">`):

1. Continue Watching _(existing — keep as-is)_
2. "Because you watched X" rows (up to 2):

```tsx
{
  recommendations.becauseYouWatched.map(
    (row) =>
      row.items.length > 0 && (
        <section key={row.seedId} className="animate-in">
          <h2>Because you watched {row.seedTitle}</h2>
          <Carousel className="-mx-8">
            <CarouselContent className="px-8">
              {row.items.map((item) => (
                <CarouselItem key={item.id} className="basis-1/8">
                  <Link
                    to={item.media_type === "movie" ? "/media/movie/$id" : "/media/tv/$id"}
                    params={{ id: item.id.toString() }}
                  >
                    <PosterCard
                      posterPath={item.poster_path}
                      alt={item.title}
                      className="mx-auto"
                    />
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>
      ),
  );
}
```

3. "Top Picks for You" row:

```tsx
{
  recommendations.topPicks.length > 0 && (
    <section className="animate-in">
      <h2>Top Picks for You</h2>
      <Carousel className="-mx-8">…same pattern…</Carousel>
    </section>
  );
}
```

4. Genre category rows (up to 2):

```tsx
{
  recommendations.topCategories.map(
    (cat) =>
      cat.items.length > 0 && (
        <section key={cat.genreName} className="animate-in">
          <h2>More {cat.genreName}</h2>
          <Carousel className="-mx-8">…same pattern…</Carousel>
        </section>
      ),
  );
}
```

5. Trending Movies _(existing — keep as-is)_
6. Trending Series _(existing — keep as-is)_

### 4. Verify

- `pnpm typecheck` — must pass
- `pnpm fmt` — run this last (only once, at the very end of this phase)
- Start the full app (API + web). Open the homepage with a profile that has watch history.
- Confirm: "Because You Watched X" × 2, "Top Picks for You", and genre rows appear and contain valid poster images.
- Open a fresh profile (no history) — confirm no empty carousels or errors, page loads with only trending rows.

## Context update

After completing, update `.recommendation-engine/context.md`:

- Mark Phase 4 as ✅ Done (migration complete)
- Document the final homepage row order as actually implemented
- Note any loader type inference issues or TanStack Router specifics encountered
- Confirm the full flow works end-to-end
