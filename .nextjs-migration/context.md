# Migration Context: Next.js → Pure React Client

> **IMPORTANT:** This file MUST be updated after implementing each phase. Add a "## Phase N — Completed" section summarizing what was done, what changed, and any surprises or deviations from the plan.

---

## Goal

Eliminate all Next.js server-side concerns from `apps/owlite` so the app becomes pure client-side React. The end-state should be a standard React SPA that could be served from any static host or Vite dev server. This prepares for a future migration off Next.js entirely.

No proxies, no Route Handlers, no Server Components, no server actions. Just client components and the existing Fastify backend (`apps/api`).

---

## Repository Layout

```
apps/
  owlite/          ← Next.js 16 App Router frontend
  api/             ← Fastify backend (Node.js)
packages/
  types/           ← Shared TypeScript types (@owlite/types)
```

---

## Frontend: `apps/owlite`

### Key directories

| Path | Purpose |
|------|---------|
| `app/` | App Router pages and route handlers |
| `components/` | React components (UI, player, remote) |
| `hooks/` | Custom SWR hooks for client data fetching |
| `lib/` | Utilities, Zustand stores, constants |
| `services/` | API client layer (api-client.ts, tmdb.service.ts, etc.) |

### Data fetching stack

- **SWR 2.4.1** — all client-side data fetching (not TanStack Query)
- **Zustand** — pure UI state (player store, etc.)
- **Server Components** — currently used for initial data fetch + HTML render (being eliminated)

### Environment variables

| Var | Used by | Value (dev) |
|-----|---------|-------------|
| `TMDB_API_KEY` | Server-side TMDB calls, proxy middleware | JWT token |
| `NEXT_PUBLIC_API_URL` | Client-side calls to fastify | `http://192.168.1.100:8080` |
| `API_INTERNAL_URL` | Server-side calls to fastify | `http://localhost:8080` |

In production, `NEXT_PUBLIC_API_URL=/` (relative, fastify handles routing).

### Request routing

`services/api-client.ts` has a `getApiBaseUrl()` that returns:
- `API_INTERNAL_URL` when `typeof window === "undefined"` (server-side)
- `NEXT_PUBLIC_API_URL` when in browser

After the migration, only the browser path matters.

---

## Backend: `apps/api`

Fastify server. Route files in `apps/api/src/routes/`:
- `profiles.ts` — CRUD for profiles, preferences, progress, continue-watching, subtitle prefs
- `media.ts` — `/stream`, `/hls-proxy`, `/hls-segment`, `/play`, `/sources`
- `subtitles.ts` — subtitle search, list, upload, download, stream
- `mappings.ts` — tmdb→local file mappings
- `observability.ts` — `/client-errors`, `/client-logs`

All routes registered in `apps/api/src/routes/index.ts`.

---

## Current Server-Side Concerns to Eliminate

### 1. Session / Profile cookie (`owlite_profile`)

**Current flow:**
1. User picks profile on `/profiles` page
2. Client calls `POST /api/session` with `{profileId}`
3. Next.js Route Handler (`app/api/session/route.ts`) sets `owlite_profile` cookie
4. Middleware (`proxy.ts`) reads cookie; redirects to `/profiles` if missing
5. Server Components read cookie via `await cookies()` to pre-fetch data

**Target:** Store profile ID in `sessionStorage` under key `owlite_profile`. Client-side redirect guard replaces middleware.

**Key file:** `lib/profile-id.ts` — currently reads from `document.cookie`. Needs `set`/`clear` exports added, reads from sessionStorage.

### 2. Server Components

| File | What it does server-side |
|------|--------------------------|
| `app/page.tsx` | Reads cookie, fetches continueWatching + preferences, wraps in `<SWRConfig fallback>` |
| `app/(maxi)/media/movie/[id]/page.tsx` | Fetches TMDB movie details + credits |
| `app/(maxi)/media/tv/[id]/page.tsx` | Fetches TMDB TV details + credits + episode_groups |

After migration: these become client components using SWR hooks.

### 3. Next.js middleware proxy (`proxy.ts`)

Two proxy rewrites:
- `/api/proxy/tmdb/*` → `https://api.themoviedb.org/*` (injects TMDB API key)
- `/api/hls-proxy` → forwards to fastify `/hls-proxy` (redundant — fastify already has this)

**Target:** TMDB proxy moves to fastify (`/tmdb/*` route). HLS proxy path in embedded manifest URLs updated from `/api/hls-proxy` → `/hls-proxy`.

### 4. Route Handler (`app/api/session/route.ts`)

Simple cookie set/delete. Deleted once profile ID moves to sessionStorage.

---

## Critical Circular Dependency: HLS Proxy URLs

Fastify's `/hls-proxy` route rewrites HLS manifest segment URLs to `/api/hls-proxy?p=...` and `/api/hls-segment?p=...` (line 159 of `apps/api/src/routes/media.ts`). These currently hit the Next.js middleware, which forwards to fastify.

After removing middleware, these embedded URLs break. Fix: change to `/hls-proxy?p=...` and `/hls-segment?p=...` (relative, resolves to fastify origin since that's where the manifest was fetched from).

---

## Client-Side TMDB Proxy (current)

`services/tmdb.service.ts` custom fetch:
- Server-side: calls TMDB API directly
- Client-side: rewrites URL to `/api/proxy/tmdb` + path → hits Next.js middleware → proxied to TMDB

After migration: client-side rewrites to `{NEXT_PUBLIC_API_URL}/tmdb` + path → hits fastify TMDB proxy route.

---

## Profile Guard (current)

Handled by `proxy.ts` middleware — checks `owlite_profile` cookie on every non-API, non-static request.

After migration: replaced by `hooks/use-profile-guard.ts` client hook calling `useEffect` + `router.replace("/profiles")`.

---

## Phase Completion Log

> Add a section here after each phase is implemented:
>
> ### Phase 1 — Completed (date)
> What was done, any deviations, files changed beyond the plan.
>
> ### Phase 2 — Completed (date)
> ...
