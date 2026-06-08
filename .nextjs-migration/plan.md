# Plan: Eliminate Server Components — Pure Client React + Fastify Backend

## Context

The goal is to remove all Next.js server-side concerns (Server Components, Route Handlers, middleware proxy) from `apps/owlite` so the app is pure client-side React. This prepares for a future migration away from Next.js entirely.

Key changes:
- Profile ID moves from cookies → `sessionStorage`
- Profile redirect guard moves from middleware → client-side hook
- Server Components become client components with SWR
- `/api/session` Route Handler is deleted
- TMDB proxy moves from Next.js middleware → fastify (`apps/api`)
- `proxy.ts` middleware is stripped down to no-ops

---

## Changes

### 1. Add TMDB proxy to fastify (`apps/api/src/routes/tmdb.ts`)

Create a new route file that proxies `/tmdb/*` → `https://api.themoviedb.org/*` with `Authorization: Bearer {TMDB_API_KEY}` header. Register it in `apps/api/src/routes/index.ts`.

```ts
fastify.get("/tmdb/*", async (request, reply) => {
  const path = (request.params as { "*": string })["*"];
  const url = `https://api.themoviedb.org/${path}${request.url.includes("?") ? "?" + request.url.split("?")[1] : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
  });
  reply.status(res.status).send(await res.text());
});
```

### 2. Update `services/tmdb.service.ts` — point client proxy at fastify

Change the client-side proxy path from `/api/proxy/tmdb` to use `NEXT_PUBLIC_API_URL + /tmdb`:

```ts
return fetch(
  (process.env.NEXT_PUBLIC_API_URL ?? "") + "/tmdb" + url.pathname + url.search,
  oldRequest
);
```

### 3. Replace `lib/profile-id.ts` — use sessionStorage

```ts
const KEY = "owlite_profile";

export function getClientProfileId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(KEY) ?? undefined;
}

export function setClientProfileId(id: string): void {
  sessionStorage.setItem(KEY, id);
}

export function clearClientProfileId(): void {
  sessionStorage.removeItem(KEY);
}
```

### 4. Update `app/profiles/page.tsx` — write to sessionStorage instead of `/api/session`

Replace `handleSelect`:
```ts
const handleSelect = (id: string) => {
  if (managing) return;
  setClientProfileId(id);
  router.push("/");
};
```

Remove the `fetch("/api/session", ...)` call entirely.

### 5. Delete `app/api/session/route.ts`

No longer needed — session is managed client-side in sessionStorage.

### 6. Convert `app/page.tsx` → client component

Remove the server-side data fetching and `<SWRConfig fallback>`. Replace with a simple client component that lets the existing SWR hooks (`useContinueWatching`, `useProfilePreferences`) fetch on mount:

```tsx
"use client";
import HomeClient from "./home-client";
export default function HomePage() {
  return <HomeClient />;
}
```

The SWR hooks already handle loading/error states, so no additional loading UI is needed here unless `HomeClient` assumes fallback data. Check `home-client.tsx` to confirm it handles the initial undefined state gracefully.

### 7. Convert `app/(maxi)/media/movie/[id]/page.tsx` → client component

Replace server-side `tmdb.movies.details(...)` with a client-side SWR fetch. Add a loading skeleton and 404 handling client-side.

```tsx
"use client";
import useSWR from "swr";
import { tmdb } from "@/services/tmdb.service";
import { notFound } from "next/navigation";

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const numId = Number(params.id);
  const { data: details, isLoading } = useSWR(
    !isNaN(numId) ? ["movie", numId] : null,
    () => tmdb.movies.details(numId, ["credits"])
  );
  if (isNaN(numId)) notFound();
  if (isLoading) return <LoadingSkeleton />;
  if (!details || "error" in details) notFound();
  // ... rest of existing JSX unchanged
}
```

Do the same for `app/(maxi)/media/tv/[id]/page.tsx`.

### 8. Fix HLS proxy URLs in fastify (`apps/api/src/routes/media.ts`)

The fastify `/hls-proxy` route embeds segment/manifest URLs back as `/api/hls-proxy?p=...` and `/api/hls-segment?p=...` — these currently hit the Next.js proxy middleware. After removing the middleware, these relative paths must point directly to fastify.

Change line 159 in `media.ts`:
```ts
// Before
return abs.includes(".m3u8") ? `/api/hls-proxy?p=${enc}` : `/api/hls-segment?p=${enc}`;
// After
return abs.includes(".m3u8") ? `/hls-proxy?p=${enc}` : `/hls-segment?p=${enc}`;
```

Since the browser fetches the manifest from `{NEXT_PUBLIC_API_URL}/hls-proxy?...`, relative URLs `/hls-proxy` and `/hls-segment` resolve against the same fastify origin. No additional config needed.

Also update `api-client.ts` `hlsProxyUrl` — currently `url("/hls-proxy?p=...")` already calls `getApiBaseUrl()` which is `NEXT_PUBLIC_API_URL`, so this **already points at fastify directly** and requires no change. The Next.js `/api/hls-proxy` middleware path was only needed because the embedded manifest URLs used it; fixing `media.ts` above closes the loop.

### 9. Strip `proxy.ts` middleware

Remove:
- The profile cookie check + redirect logic
- The `/api/proxy/tmdb` rewrite
- The `/api/hls-proxy` rewrite (now handled directly by fastify)

Add a client-side redirect guard instead. Create `hooks/use-profile-guard.ts`:

```ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientProfileId } from "@/lib/profile-id";

export function useProfileGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!getClientProfileId()) router.replace("/profiles");
  }, [router]);
}
```

Call `useProfileGuard()` in the root layout client component (or a wrapper in `app/(maxi)/layout.tsx`).

---

## Files to Modify

| File | Action |
|------|--------|
| `apps/api/src/routes/tmdb.ts` | Create — TMDB proxy route |
| `apps/api/src/routes/index.ts` | Register tmdb route |
| `apps/api/src/routes/media.ts` | Fix embedded HLS segment URLs (`/api/hls-proxy` → `/hls-proxy`) |
| `apps/owlite/services/tmdb.service.ts` | Client proxy URL → fastify `/tmdb/*` |
| `apps/owlite/lib/profile-id.ts` | Switch cookie → sessionStorage, add set/clear exports |
| `apps/owlite/app/profiles/page.tsx` | Use `setClientProfileId()`, remove fetch to `/api/session` |
| `apps/owlite/app/api/session/route.ts` | Delete |
| `apps/owlite/app/page.tsx` | Remove server fetching, become thin client wrapper |
| `apps/owlite/app/(maxi)/media/movie/[id]/page.tsx` | Convert to client component with SWR |
| `apps/owlite/app/(maxi)/media/tv/[id]/page.tsx` | Convert to client component with SWR |
| `apps/owlite/proxy.ts` | Remove redirect + proxy logic (or delete if no other middleware) |
| `apps/owlite/hooks/use-profile-guard.ts` | Create — client-side redirect guard |
| `apps/owlite/app/(maxi)/layout.tsx` | Call `useProfileGuard()` |

---

## Verification

1. `pnpm typecheck` — no errors in owlite or api packages
2. Start both `apps/api` and `apps/owlite` dev servers
3. Navigate to `/` without a profile set → should redirect to `/profiles`
4. Select a profile → stored in sessionStorage, redirected to `/`
5. Movie detail page loads TMDB data client-side (check Network tab — requests go to fastify `/tmdb/*`)
6. Continue watching and preferences load from fastify API
7. Open a new tab → redirected to `/profiles` again (sessionStorage is tab-scoped, confirming no cross-tab leakage)
8. `pnpm fmt` — formatting pass
