# Phase 4 — Set Up TanStack Router File Structure (Routes)

> **Before starting:** Read `.tanstack-router/context.md` fully. Phases 1–3 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Create all route files under `apps/web/src/routes/` by adapting content from the owlite `app/` directory. Wire up root layout with all providers. After this phase the app should be fully navigable.

---

## TanStack Router Conventions (quick reference)

- Files named with `_` prefix (`_maxi.tsx`) = **pathless layout route** (applies layout, adds no URL segment)
- Files under `_maxi/` directory = children of the `_maxi` layout
- `$param` in filename = dynamic segment (e.g. `$id.tsx` → `/movie/123`)
- `Route.useParams()` = typed params for that specific route file
- `Route.useSearch()` = typed search params for that route
- `createRootRoute` = root, wraps everything
- `createFileRoute('/path')` = page route
- TanStack Router auto-generates `routeTree.gen.ts` — never edit it manually

---

## Step 1 — __root.tsx (Root Layout)

Replace `src/routes/__root.tsx` content with the owlite root layout converted to TanStack Router.

Source: `apps/owlite/app/layout.tsx`

Key elements to carry over:
1. **Providers**: `RemoteControlProvider`, `ProfileGuard`, `Toaster` (from sonner), `CursorOverlay`
2. **Font classes**: apply font CSS variables to `<html>` or `<body>` (the `className` owlite puts on `<html>`)
3. Remove `next/font` — fonts come from `<link>` tags in `index.html` (added in Phase 1)

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { RemoteControlProvider } from '@/components/remote/remote-control-provider'
import { ProfileGuard } from '@/components/profile-guard'
import { Toaster } from '@/components/ui/sonner'
import { CursorOverlay } from '@/components/remote/cursor-overlay'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <RemoteControlProvider>
      <ProfileGuard>
        <Outlet />
        <Toaster />
        <CursorOverlay />
      </ProfileGuard>
    </RemoteControlProvider>
  )
}
```

Remove TanStack Devtools from `__root.tsx` or keep in dev-only block — they were in the scaffold, not in owlite.

---

## Step 2 — Home route (index.tsx)

Source: `apps/owlite/app/page.tsx` + `apps/owlite/app/home-client.tsx` + `apps/owlite/app/hero.tsx` + `apps/owlite/app/poster-card.tsx`

Copy `home-client.tsx`, `hero.tsx`, `poster-card.tsx` to `apps/web/src/` (or into a `src/features/home/` subfolder — keep same structure as owlite for simplicity).

`src/routes/index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { HomeClient } from '@/home-client'

export const Route = createFileRoute('/')({ component: HomeClient })
```

Remove `"use client"` from copied files.

---

## Step 3 — Profiles route

Source: `apps/owlite/app/profiles/page.tsx`

Create `src/routes/profiles/index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'
// copy component from owlite profiles/page.tsx
```

No layout around profiles — it's outside `_maxi`.

---

## Step 4 — Maxi layout route

Source: `apps/owlite/app/(maxi)/layout.tsx`

Create `src/routes/_maxi.tsx` (pathless layout):
```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Navigation } from '@/components/navigation'

export const Route = createFileRoute('/_maxi')({
  component: MaxiLayout,
})

function MaxiLayout() {
  return (
    <div className="...">
      <Navigation />
      <Outlet />
    </div>
  )
}
```

Copy the exact JSX from owlite's `(maxi)/layout.tsx`.

---

## Step 5 — Media routes

### Movie detail

Source: `apps/owlite/app/(maxi)/media/movie/[id]/page.tsx`

Create `src/routes/_maxi/media/movie/$id.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_maxi/media/movie/$id')({
  component: MoviePage,
})

function MoviePage() {
  const { id } = Route.useParams()
  // copy body from owlite page.tsx, replace useParams() with Route.useParams()
}
```

### TV detail

Source: `apps/owlite/app/(maxi)/media/tv/[id]/page.tsx`

`src/routes/_maxi/media/tv/$id.tsx`:
- Uses `useSearchParams()` for `?season` query param
- In TanStack Router: define search schema in the route then use `Route.useSearch()`

```tsx
export const Route = createFileRoute('/_maxi/media/tv/$id')({
  validateSearch: (search) => ({
    season: search.season ? Number(search.season) : undefined,
  }),
  component: TvPage,
})

function TvPage() {
  const { id } = Route.useParams()
  const { season } = Route.useSearch()
  // ...
}
```

### Subtitles

Source: `apps/owlite/app/(maxi)/media/[type]/[id]/subtitles/page.tsx`

`src/routes/_maxi/media/$type/$id/subtitles.tsx`

---

## Step 6 — Remote routes

Source: `apps/owlite/app/(maxi)/remote/page.tsx` and `controls/page.tsx`

- `src/routes/_maxi/remote/index.tsx`
- `src/routes/_maxi/remote/controls.tsx`

---

## Step 7 — Settings route

Source: `apps/owlite/app/(maxi)/settings/page.tsx`

`src/routes/_maxi/settings.tsx`

---

## Step 8 — Player routes

Source: `apps/owlite/app/player/[type]/[id]/` (6 files)

Create `src/routes/player/$type/$id.tsx` for the page component.

Copy the co-located files (player.tsx, player-controls.tsx, player-store.ts, select-source-page.tsx, subtitle-overlay.tsx, subtitles-panel.tsx) to `src/player/` or directly alongside the route.

TanStack Router allows co-located non-route files — put support files in `src/features/player/` and import from the route file.

---

## Step 9 — Update "use client" removal

Remove `"use client"` from all newly copied app-level files (home-client, hero, poster-card, etc.) — same as Phase 3 requirement.

---

## Step 10 — Generate routes

After creating all route files, run:
```
pnpm --filter web generate-routes
```

This regenerates `routeTree.gen.ts`. The app won't compile until this is up to date.

---

## Verification

1. `pnpm --filter web generate-routes` — completes without error
2. `pnpm --filter web typecheck` — no errors
3. `pnpm --filter web dev` — dev server starts
4. Navigate to `/` — home page renders (may show loading states if API not running)
5. Navigate to `/profiles` — profile selection renders
6. Navigate to `/media/movie/123` — movie detail renders (or loading skeleton)
7. Navigate to `/player/movie/123` — player page renders
8. Verify browser back/forward navigation works
