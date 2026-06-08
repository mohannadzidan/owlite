# Phase 3: Convert Server Components to Client Components

> Read `context.md` before starting. Update `context.md` after completing this phase.

## Goal

Convert all Server Components to client components. After this phase, no page fetches data on the server; all data loading is done client-side via SWR.

Also update `tmdb.service.ts` to point the client-side TMDB proxy at the fastify `/tmdb/*` route (Phase 1 prerequisite).

---

## Changes

### 1. Update `apps/owlite/services/tmdb.service.ts` — client proxy URL

Change the client-side proxy path from the Next.js middleware path to fastify:

```ts
// Before
return fetch("/api/proxy/tmdb" + url.pathname + url.search, oldRequest);

// After
return fetch(
  (process.env.NEXT_PUBLIC_API_URL ?? "") + "/tmdb" + url.pathname + url.search,
  oldRequest
);
```

The `NEXT_PUBLIC_API_URL` is already available client-side (prefixed with `NEXT_PUBLIC_`).

### 2. Convert `apps/owlite/app/page.tsx` → client component

Remove server-side cookie read, API fetch, and `<SWRConfig fallback>`. The existing SWR hooks (`useContinueWatching`, `useProfilePreferences`) fetch on mount and handle their own loading states.

```tsx
"use client";
import HomeClient from "./home-client";

export default function HomePage() {
  return <HomeClient />;
}
```

**Before implementing:** Read `app/home-client.tsx` to confirm it handles `undefined` / loading state for continueWatching and preferences gracefully. If it assumes pre-populated SWR fallback data, add a loading guard or skeleton in `HomeClient`.

### 3. Convert `apps/owlite/app/(maxi)/media/movie/[id]/page.tsx` → client component

Replace `async` server fetch with SWR. Add loading and not-found states:

```tsx
"use client";
import useSWR from "swr";
import { notFound } from "next/navigation";
import { tmdb } from "@/services/tmdb.service";
// ... other imports unchanged

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const numId = Number(params.id);
  const { data: details, isLoading } = useSWR(
    !isNaN(numId) ? ["tmdb/movie", numId] : null,
    () => tmdb.movies.details(numId, ["credits"])
  );

  if (isNaN(numId)) notFound();
  if (isLoading) return <LoadingSkeleton />;
  if (!details || "error" in details) notFound();

  // ... rest of JSX unchanged
}
```

Add a `<LoadingSkeleton />` component (inline or extracted) — at minimum a full-screen dark div with a spinner.

Note: `params` in client components with Next.js App Router is no longer a `Promise` — it's directly `{ id: string }`. Remove the `await params` call.

### 4. Convert `apps/owlite/app/(maxi)/media/tv/[id]/page.tsx` → client component

Same pattern as movie page. Fetch `tmdb.tvShows.details(numId, ["credits", "episode_groups"])` via SWR.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/owlite/services/tmdb.service.ts` | Client proxy URL → `{NEXT_PUBLIC_API_URL}/tmdb/*` |
| `apps/owlite/app/page.tsx` | Remove server fetch + SWRConfig, become thin client wrapper |
| `apps/owlite/app/(maxi)/media/movie/[id]/page.tsx` | Convert to client component with SWR |
| `apps/owlite/app/(maxi)/media/tv/[id]/page.tsx` | Convert to client component with SWR |

---

## Verification

1. Navigate to a movie detail page — confirm TMDB data loads (check Network: requests go to `{API_URL}/tmdb/...`)
2. Navigate to a TV detail page — same check
3. Home page loads continue-watching and preferences from fastify API
4. `pnpm typecheck` in `apps/owlite` — no errors

---

## After Completing This Phase

Update `context.md` → add "Phase 3 — Completed" section with date and any deviations. Note whether `HomeClient` needed changes to handle the no-fallback-data case.
