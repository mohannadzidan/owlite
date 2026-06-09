# Migration Context: Next.js (apps/owlite) → Pure React + TanStack Router (apps/web)

> **STRICT RULE — ALWAYS ENFORCE:**
> This file is the **shared knowledge base** for this migration. Every phase executor MUST read this file before starting their phase. After each successful phase completion, this file MUST be updated to reflect:
> - New information discovered during implementation
> - Corrected assumptions or outdated information
> - New patterns established that future phases should follow
> - State of the migration (which phases are done, what works, what was tricky)
>
> Treat it as a living document. A stale context is a dangerous context.

---

## Repository Layout

```
apps/
  owlite/          ← Next.js 16 App Router frontend (SOURCE — being migrated FROM)
  api/             ← Fastify backend (Node.js) — unchanged
  web/             ← Pure React + TanStack Router (TARGET — being migrated TO)
packages/
  types/           ← Shared TypeScript types (@owlite/types)
```

Root tooling: `pnpm` workspaces, `turbo` for build pipeline.

---

## Source App: apps/owlite

### What it is

A Next.js 16 (App Router) media streaming frontend for Android TV (Chrome 81). No auth — personal media server on LAN.

### Migration status

All Next.js server-side concerns have been **fully stripped** (phases 1–4 of the previous migration plan):
- No Server Components fetching data
- No Route Handlers
- No middleware proxy
- No server actions
- Profile session moved to `sessionStorage` (key: `owlite_profile`)
- TMDB proxy moved to fastify at `/tmdb/*`
- HLS proxy URLs fixed to resolve to fastify origin

The app is now a **pure client-side React SPA running inside a Next.js shell**. Every page component is `"use client"`.

### Directory structure

```
apps/owlite/
├── app/
│   ├── layout.tsx                          ← Root layout: fonts, providers, flex-gap script
│   ├── page.tsx                            ← Home page (thin wrapper → HomeClient)
│   ├── home-client.tsx                     ← Home content using useContinueWatching()
│   ├── hero.tsx                            ← Hero banner component
│   ├── poster-card.tsx                     ← Movie/show poster card
│   ├── globals.css                         ← Global CSS (scrollbar hiding, etc.)
│   ├── loading.tsx                         ← Home loading skeleton
│   ├── profiles/
│   │   ├── layout.tsx
│   │   └── page.tsx                        ← Profile selection, uses setClientProfileId()
│   ├── (maxi)/                             ← Route group (no URL segment)
│   │   ├── layout.tsx                      ← Maxi layout: Navigation, ProfileGuard
│   │   ├── media/movie/[id]/
│   │   │   ├── page.tsx                    ← Movie detail, SWR fetching TMDB data
│   │   │   └── loading.tsx
│   │   ├── media/tv/[id]/
│   │   │   ├── page.tsx                    ← TV detail, useSearchParams() for ?season
│   │   │   ├── episodes-list.tsx
│   │   │   └── loading.tsx
│   │   ├── media/[type]/[id]/subtitles/
│   │   │   └── page.tsx                    ← Subtitle management
│   │   ├── remote/
│   │   │   ├── page.tsx                    ← Remote control main
│   │   │   └── controls/page.tsx           ← Remote controls
│   │   └── settings/
│   │       └── page.tsx
│   └── player/[type]/[id]/
│       ├── page.tsx                        ← Player page
│       ├── player.tsx                      ← Main player component (HLS.js)
│       ├── player-controls.tsx
│       ├── player-store.ts                 ← Zustand store for player state
│       ├── select-source-page.tsx
│       ├── subtitle-overlay.tsx
│       ├── subtitles-panel.tsx
│       └── loading.tsx
├── components/
│   ├── ui/                                 ← shadcn/ui components (40+ files)
│   ├── navigation.tsx
│   ├── profile-guard.tsx                   ← Client-side route protection
│   ├── remote/                             ← Remote control components
│   │   ├── remote-control-provider.tsx     ← Socket.io context
│   │   ├── device-list.tsx
│   │   ├── device-item.tsx
│   │   ├── pairing-dialog.tsx
│   │   ├── trackpad.tsx
│   │   └── cursor-overlay.tsx
│   ├── typography/
│   │   ├── heading.tsx
│   │   └── muted.tsx
│   └── [many others]
├── hooks/
│   ├── use-continue-watching.ts            ← SWR hook for continue-watching list
│   ├── use-mobile.ts
│   ├── use-navigation-bar-right-item.ts
│   ├── use-profile-guard.ts                ← useEffect + router.replace("/profiles")
│   ├── use-profile-preferences.ts          ← SWR hook for profile preferences
│   ├── use-progress.ts                     ← SWR hook for video progress
│   └── use-subtitle-preference.ts
├── lib/
│   ├── profile-id.ts                       ← getClientProfileId / setClientProfileId / clearClientProfileId (sessionStorage)
│   ├── utils.ts                            ← cn() = clsx + tailwind-merge
│   ├── connection-manager.ts
│   ├── device-identity.ts
│   ├── filename-parser.ts
│   ├── profile-types.ts
│   ├── remote-messages.ts
│   ├── cursor-manager.ts
│   ├── navigation-bar-store.ts             ← Zustand
│   ├── remote-control-store.ts             ← Zustand
│   ├── shortcuts-storage.ts
│   ├── pairings-storage.ts
│   ├── q.ts
│   ├── read-text-file.ts
│   ├── srt-to-vtt.ts
│   ├── trackpad-gesture.ts
│   ├── observability.ts
│   ├── paths.ts
│   ├── types.ts
│   ├── constants/                          ← 2 files
│   └── shortcuts/                          ← 5 files, Zustand-based shortcut system
├── services/
│   ├── api-client.ts                       ← REST client, uses NEXT_PUBLIC_API_URL
│   ├── api.service.ts
│   ├── tmdb.service.ts                     ← TMDB, client uses /tmdb proxy on fastify
│   ├── profile.service.ts
│   ├── cursor.service.ts
│   └── request.ts
├── instrumentation-client.ts               ← core-js import, WeakRef polyfill, error reporting
├── postcss-flex-gap-polyfill.cjs           ← custom PostCSS plugin (flex-gap for Chrome 81)
├── postcss.config.mjs
├── tailwind.config.ts                      ← Tailwind v3 config with custom theme + plugins
├── components.json                         ← shadcn/ui config
├── .env.development
├── .env.production
└── .env.example
```

### Key patterns

**Profile session:** `sessionStorage` key `owlite_profile`. Access via `lib/profile-id.ts` exports.

**API base URL:** `services/api-client.ts` reads `process.env.NEXT_PUBLIC_API_URL`. In the browser this resolves to fastify. After migration this becomes `import.meta.env.VITE_API_URL`.

**TMDB proxy:** client-side `tmdb.service.ts` rewrites TMDB URLs to `{API_URL}/tmdb/{path}` — fastify handles the actual proxy to `api.themoviedb.org`. No TMDB key in frontend.

**Polyfills:**
1. `core-js/stable` — ES2017+ for Chrome 81
2. WeakRef shim — inline in instrumentation-client.ts
3. `postcss-flex-gap-polyfill.cjs` — converts `gap` to `margin` fallbacks for Chrome 81 (which lacks flex gap, added in Chrome 84)
4. Flex-gap detection inline script in `<head>` — adds `.no-flex-gap` class to `<html>` if gap not supported; the PostCSS plugin generates `.no-flex-gap` rules

**Styling:** Tailwind CSS v3 (MUST stay v3 for Chrome 81 compatibility). Uses `cn()` from `lib/utils.ts` everywhere. Theme tokens from `tailwind.config.ts`. Custom Radix `data-*` attribute variants registered as Tailwind plugins.

---

## Target App: apps/web

### Current state (scaffold only)

```
apps/web/
├── index.html
├── package.json          ← React 19, Tailwind v4 (!), TanStack Router latest, Vite 8
├── vite.config.ts        ← uses @tailwindcss/vite plugin (v4 approach)
├── tsconfig.json         ← target ES2022, strict
├── tsr.config.json
└── src/
    ├── main.tsx
    ├── router.tsx
    ├── styles.css        ← @import "tailwindcss" (v4 syntax)
    └── routes/
        ├── __root.tsx
        └── index.tsx
```

### Problems to fix before migrating UI

1. **Tailwind v4 → v3**: The scaffold uses Tailwind v4 (`@tailwindcss/vite`). The owlite UI was built for v3. Must downgrade.
2. **React 19**: OK, owlite already runs React 19.2.4.
3. **TypeScript target ES2022 → ES2017**: Match owlite for core-js polyfill coverage.
4. **Missing all UI dependencies**: No SWR, Zustand, Radix UI, HLS.js, socket.io-client, etc.
5. **No polyfills**: Need core-js, flex-gap PostCSS plugin.

---

## Next.js API → TanStack Router Equivalents

| Next.js | TanStack Router |
|---|---|
| `import Link from "next/link"` | `import { Link } from "@tanstack/react-router"` |
| `useRouter()` from `next/navigation` | `useNavigate()` from `@tanstack/react-router` |
| `router.push("/path")` | `navigate({ to: "/path" })` |
| `router.replace("/path")` | `navigate({ to: "/path", replace: true })` |
| `usePathname()` | `useLocation()` then `.pathname` |
| `useParams()` | `Route.useParams()` (per route file) |
| `useSearchParams()` | `Route.useSearch()` (per route file) |
| `notFound()` | `throw new NotFoundError()` or `navigate({ to: "/404" })` |
| `<Image>` from `next/image` | plain `<img>` |
| `next/font/google` | `<link>` tag in index.html |

---

## Route Mapping: Next.js App Router → TanStack Router

| Next.js file | TanStack Router file |
|---|---|
| `app/layout.tsx` | `src/routes/__root.tsx` |
| `app/page.tsx` | `src/routes/index.tsx` |
| `app/profiles/page.tsx` | `src/routes/profiles/index.tsx` |
| `app/(maxi)/layout.tsx` | `src/routes/_maxi.tsx` (pathless layout route) |
| `app/(maxi)/media/movie/[id]/page.tsx` | `src/routes/_maxi/media/movie/$id.tsx` |
| `app/(maxi)/media/tv/[id]/page.tsx` | `src/routes/_maxi/media/tv/$id.tsx` |
| `app/(maxi)/media/[type]/[id]/subtitles/page.tsx` | `src/routes/_maxi/media/$type/$id/subtitles.tsx` |
| `app/(maxi)/remote/page.tsx` | `src/routes/_maxi/remote/index.tsx` |
| `app/(maxi)/remote/controls/page.tsx` | `src/routes/_maxi/remote/controls.tsx` |
| `app/(maxi)/settings/page.tsx` | `src/routes/_maxi/settings.tsx` |
| `app/player/[type]/[id]/page.tsx` | `src/routes/player/$type/$id.tsx` |

**TanStack Router conventions:**
- Files named `_name.tsx` (underscore prefix) = **pathless layout route** (like Next.js route groups)
- Nested under `_maxi/` directory = layout applied, no URL segment added
- `$param` = dynamic segment (like `[param]` in Next.js)
- `Route.useParams()` returns typed params for that specific route

---

## Backend: apps/api

Fastify server. Relevant endpoints for the frontend:

| Endpoint | Purpose |
|---|---|
| `GET /profiles` | List profiles |
| `POST /profiles` | Create profile |
| `GET /profiles/:id/preferences` | Get preferences |
| `PATCH /profiles/:id/preferences` | Update preferences |
| `GET /profiles/:id/progress/:mediaId` | Get watch progress |
| `PATCH /profiles/:id/progress/:mediaId` | Update watch progress |
| `GET /profiles/:id/continue-watching` | Continue watching list |
| `GET /sources?type=&id=` | Get media sources |
| `GET /play?type=&id=&source=` | Get stream URL |
| `GET /hls-proxy` | HLS manifest proxy |
| `GET /hls-segment` | HLS segment proxy |
| `GET /tmdb/*` | TMDB API proxy (added in migration phase 1) |
| `GET/POST /subtitles/*` | Subtitle CRUD |
| `POST /client-errors` | Client error reporting |
| `POST /client-logs` | Client log reporting |

---

## apps/web Current State

### Installed dependencies (as of Phase 1)

All UI/runtime deps are in `apps/web/package.json`. Key ones added:
- `radix-ui` (unified package, NOT individual `@radix-ui/*` — matches owlite)
- `swr`, `zustand`, `hls.js`, `socket.io-client`, `core-js`, `sonner`, `recharts`
- `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `vaul`, `input-otp`, `embla-carousel-react`
- `react-player`, `react-resizable-panels`, `date-fns`, `@ctrl/video-filename-parser`
- `@owlite/types` (workspace:*)
- devDeps: `tailwindcss@3.3.5`, `autoprefixer`, `postcss`, `tailwindcss-animate`

### Toolchain files present

| File | Purpose |
|---|---|
| `tailwind.config.ts` | Identical to owlite's — theme tokens, data-* variants, no-scrollbar util |
| `postcss.config.mjs` | Tailwind v3 + autoprefixer + flex-gap polyfill |
| `postcss-flex-gap-polyfill.cjs` | Flex gap fallback for Chrome 81 |
| `src/styles.css` | Tailwind v3 directives + all CSS variables from globals.css |
| `components.json` | shadcn/ui config (rsc: false, css: src/styles.css) |
| `index.html` | Google Fonts (Lato/Patrick Hand/Geist Mono) + flex-gap detection script |

### components/ Copy (Phase 3) — Notes

- Removed all `"use client"` directives (meaningless in Vite)
- Replaced `next/link` → `{ Link } from "@tanstack/react-router"` with `href` → `to`; dynamic route `to` values cast as `any` pending Phase 4 route registration
- Replaced `useRouter` → `useNavigate`, `usePathname` → `useLocation().pathname`, `router.back()` → `window.history.back()`
- `cursor-overlay.tsx`: removed `useRouter` entirely, uses `window.history.back()` directly
- Added missing deps: `react-day-picker`, `@base-ui/react`, `next-themes` (used by shadcn/ui components)
- Fixed `ComponentProps` imports to use `type` keyword (`verbatimModuleSyntax` requires it)
- All `to` path casts (`as any`) will be removed in Phase 4 once route types are generated

### Babel note (DO NOT create .babelrc for apps/web)

`apps/owlite` has a `.babelrc` with `@babel/preset-env` + `useBuiltIns: "usage"` + `corejs: 3` for automatic polyfill injection. **Vite does not use this** — it uses esbuild for transpilation. For apps/web:
- `build.target: 'chrome81'` in `vite.config.ts` handles syntax targeting via esbuild
- `core-js/stable` must be **explicitly imported** at the top of `src/main.tsx` (Phase 5) — no automatic injection

### tsconfig

- `target: ES2017`, `lib: ["ES2017", "DOM", "DOM.Iterable"]`
- Paths: `@/*` and `#/*` both map to `./src/*`
- `skipLibCheck: true` (needed — some deps lack type declarations)

---

## Phase Completion Log

*(Update this section after each phase is implemented and verified)*

### Infrastructure (Phase 1) — COMPLETE
All toolchain files in place, all deps installed, zero TS errors.

### lib/ + services/ + hooks/ Copy (Phase 2) — COMPLETE
Copied verbatim via `cp -r`. Changes made:
- `services/api-client.ts`: removed server branch, simplified `getApiBaseUrl()` to `import.meta.env.VITE_API_URL`
- `services/tmdb.service.ts`: removed server-side direct-call branch, replaced `process.env.NEXT_PUBLIC_API_URL` → `import.meta.env.VITE_API_URL`, removed `TMDB_API_KEY` (all calls proxied through fastify `/tmdb/*`)
- `lib/connection-manager.ts`: replaced `process.env.NEXT_PUBLIC_API_URL` → `import.meta.env.VITE_API_URL`
- `hooks/use-profile-guard.ts`: replaced `useRouter` from `next/navigation` with `useNavigate` from `@tanstack/react-router`; removed `"use client"` directive
- Added `tmdb-ts@^2.3.0` to `apps/web` deps
- Created `.env.development`, `.env.production`, `.env.example` with `VITE_API_URL` variable
- Zero TS errors after changes

### lib/ + services/ + hooks/ Copy (Phase 2) — COMPLETE
### components/ Copy (Phase 3) — COMPLETE
### Route Setup (Phase 4) — NOT STARTED
### Polyfills (Phase 5) — NOT STARTED
### Environment Variables (Phase 6) — NOT STARTED
### Observability (Phase 7) — NOT STARTED
### Workspace Integration (Phase 8) — NOT STARTED
