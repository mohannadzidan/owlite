# Plan: Migrate Owlite UI from Next.js to Pure React + TanStack Router (apps/web)

## Context

The owlite Next.js app has been stripped of all server-side concerns (phases 1–4 complete). It is now a pure client-side React app running inside a Next.js shell. The goal is to move it to `apps/web` (Vite + TanStack Router) to eliminate the Next.js dependency entirely.

Target stack: React 19, Vite, TanStack Router (file-based), SWR, Zustand, Tailwind CSS **v3** (must stay v3 for Chrome 81 compat), shadcn/ui components, same polyfills.

---

## Phase 1 — Fix apps/web Infrastructure

The scaffolded `apps/web` uses Tailwind v4 + `@tailwindcss/vite`. This must be replaced with Tailwind v3 + PostCSS to match the owlite browserslist target (`chrome 81`).

### 1.1 — Replace Tailwind v4 with v3

**package.json changes:**

- Remove: `@tailwindcss/vite@^4`, `tailwindcss@^4`, `@tailwindcss/typography@^0.5`
- Add: `tailwindcss@^3`, `autoprefixer`, `postcss`, `@tailwindcss/typography@^0.5` (v3-compatible)
- Add browserslist: `["chrome 81"]`

**vite.config.ts:** remove `tailwindcss()` plugin import/call.

**Add postcss.config.mjs** (copy pattern from owlite):

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**Add tailwind.config.ts** — copy `apps/owlite/tailwind.config.ts` verbatim (content paths will need updating to `./src/**`).

**src/styles.css** — replace `@import "tailwindcss"` with standard v3 directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Plus copy global custom CSS from `apps/owlite/app/globals.css`.

### 1.2 — Add postcss-flex-gap-polyfill

Copy `apps/owlite/postcss-flex-gap-polyfill.cjs` to `apps/web/` and register in `postcss.config.mjs` (same as owlite's `postcss.config.mjs`).

### 1.3 — Add all missing dependencies

Copy all relevant `dependencies` from `apps/owlite/package.json` to `apps/web/package.json`:

| Group                 | Packages                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Data fetching / state | `swr`, `zustand`                                                                                                                      |
| UI library            | all `@radix-ui/*` packages, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `vaul`, `input-otp`, `embla-carousel-react` |
| Icons                 | `lucide-react` (already present)                                                                                                      |
| Media                 | `hls.js`, `react-player`                                                                                                              |
| Remote/WS             | `socket.io-client`                                                                                                                    |
| Utilities             | `@ctrl/video-filename-parser`, `core-js`, `sonner`, `react-resizable-panels`, `recharts`, `date-fns`, `@tanstack/react-virtual`       |
| Notifications         | `sonner`                                                                                                                              |
| Fonts                 | none needed — inline via CSS                                                                                                          |

Also carry over `devDependencies`: `@types/node`.

### 1.4 — Update tsconfig.json

- Change `target` from `ES2022` → `ES2017` (matches owlite, required for core-js polyfill scope)
- Add `baseUrl: "."` (for `@/*` paths already present)

### 1.5 — Copy components.json (shadcn config)

Copy `apps/owlite/components.json` and adjust `tailwind.css` path to `src/styles.css`.

---

## Phase 2 — Copy Shared Code (lib/, services/, hooks/)

These directories are framework-agnostic and can be copied almost verbatim.

### 2.1 — Copy lib/

Copy all files from `apps/owlite/lib/` → `apps/web/src/lib/`.

One file needs updating: **`lib/utils.ts`** — verify `cn()` export is present (it's the `clsx` + `tailwind-merge` combinator used everywhere).

### 2.2 — Copy services/

Copy all files from `apps/owlite/services/` → `apps/web/src/services/`.

No changes needed — `api-client.ts` already uses `NEXT_PUBLIC_API_URL` env var and `tmdb.service.ts` uses the `/tmdb` proxy path. In Vite, env vars use `VITE_` prefix, so:

- Rename all `process.env.NEXT_PUBLIC_API_URL` → `import.meta.env.VITE_API_URL`
- Update `.env.development` / `.env.production` variable names accordingly

### 2.3 — Copy hooks/

Copy all files from `apps/owlite/hooks/` → `apps/web/src/hooks/`.

`use-profile-guard.ts` uses `useRouter` from `next/navigation` — update to TanStack Router equivalent (see Phase 4 replacements table).

---

## Phase 3 — Copy components/

Copy all files from `apps/owlite/components/` → `apps/web/src/components/`.

### Next.js API replacements within components

| next/\* import                           | Replacement                                                  |
| ---------------------------------------- | ------------------------------------------------------------ |
| `import Image from "next/image"`         | plain `<img>` tag                                            |
| `useRouter` from `next/navigation`       | `useNavigate` from `@tanstack/react-router`                  |
| `usePathname` from `next/navigation`     | `useLocation` from `@tanstack/react-router` then `.pathname` |
| `useParams` from `next/navigation`       | `Route.useParams()` (per-route) or `useParams` from router   |
| `useSearchParams` from `next/navigation` | `Route.useSearch()` (per-route)                              |
| `notFound()` from `next/navigation`      | `throw new NotFoundError()` or redirect                      |
| `Link` from `next/link`                  | `Link` from `@tanstack/react-router`                         |

Files known to use next/ APIs (audit each during copy):

- `components/profile-guard.tsx` — uses `useRouter`, `usePathname`
- `components/navigation.tsx` — likely uses `Link`, `usePathname`
- Any component using `next/image`

---

## Phase 4 — Set Up TanStack Router File Structure

Map Next.js App Router routes → TanStack Router file-based routes under `src/routes/`:

| Next.js path                                      | TanStack Router file                             |
| ------------------------------------------------- | ------------------------------------------------ |
| `app/layout.tsx`                                  | `src/routes/__root.tsx`                          |
| `app/page.tsx`                                    | `src/routes/index.tsx`                           |
| `app/profiles/page.tsx`                           | `src/routes/profiles/index.tsx`                  |
| `app/(maxi)/layout.tsx`                           | `src/routes/_maxi.tsx` (pathless layout)         |
| `app/(maxi)/media/movie/[id]/page.tsx`            | `src/routes/_maxi/media/movie/$id.tsx`           |
| `app/(maxi)/media/tv/[id]/page.tsx`               | `src/routes/_maxi/media/tv/$id.tsx`              |
| `app/(maxi)/media/[type]/[id]/subtitles/page.tsx` | `src/routes/_maxi/media/$type/$id/subtitles.tsx` |
| `app/(maxi)/remote/page.tsx`                      | `src/routes/_maxi/remote/index.tsx`              |
| `app/(maxi)/remote/controls/page.tsx`             | `src/routes/_maxi/remote/controls.tsx`           |
| `app/(maxi)/settings/page.tsx`                    | `src/routes/_maxi/settings.tsx`                  |
| `app/player/[type]/[id]/page.tsx`                 | `src/routes/player/$type/$id.tsx`                |

### \_\_root.tsx content

Copy providers from `app/layout.tsx`: `RemoteControlProvider`, `ProfileGuard`, `Toaster`, `CursorOverlay`.

Add the flex-gap detection inline script (from `app/layout.tsx`'s `<Script>` tag) — in Vite this goes into `index.html` as an inline `<script>`.

Font imports: replace `next/font/google` with a `<link>` tag in `index.html` for Google Fonts (Lato, Patrick Hand, Geist Mono).

### Route components

For each route, copy the component body from the Next.js page file. Remove the `"use client"` directive (not needed in Vite). Update `useSearchParams`, `useParams`, `notFound()` usages per the replacement table above.

TanStack Router pattern for dynamic params:

```tsx
// In route file
export const Route = createFileRoute("/media/movie/$id")({ component: MoviePage });
function MoviePage() {
  const { id } = Route.useParams();
  // ...
}
```

---

## Phase 5 — Polyfills & Browser Compat

### 5.1 — core-js entry point

Create `src/polyfills.ts`:

```ts
import "core-js/stable";
```

Import it at the very top of `src/main.tsx` (before any other import).

### 5.2 — WeakRef polyfill

Copy the WeakRef polyfill snippet from `apps/owlite/instrumentation-client.ts` into `src/polyfills.ts`.

### 5.3 — Flex-gap detection script

Add inline to `index.html` `<head>` (extracted from `app/layout.tsx`):

```html
<script>
  // detect flex gap support, add .no-flex-gap class if not supported
  var div = document.createElement("div");
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.rowGap = "1px";
  div.appendChild(document.createElement("div"));
  div.appendChild(document.createElement("div"));
  document.body.appendChild(div);
  var supported = div.scrollHeight === 1;
  document.body.removeChild(div);
  if (!supported) document.documentElement.classList.add("no-flex-gap");
</script>
```

### 5.4 — Vite build target

In `vite.config.ts`, add:

```ts
build: {
  target: "chrome81";
}
```

---

## Phase 6 — Environment Variables & .env Files

Copy `.env.development` and `.env.production` from `apps/owlite/` to `apps/web/`, renaming variables:

- `NEXT_PUBLIC_API_URL` → `VITE_API_URL`
- `TMDB_API_KEY` is server-only (fastify) — not needed in client app

Update all references in `src/services/` from `process.env.NEXT_PUBLIC_API_URL` → `import.meta.env.VITE_API_URL`.

---

## Phase 7 — Wire Up Observability (optional, keep parity)

The owlite `instrumentation-client.ts` registers global `window.onerror` and `console.error` interceptors that report to `POST /client-errors` and `POST /client-logs`. Copy this logic into `src/observability.ts` and import it in `src/main.tsx`.

---

## Phase 8 — Workspace Integration

In the monorepo root `pnpm-workspace.yaml`, ensure `apps/web` is already included (likely `apps/*`). Add `web` to the root `package.json` turbo pipeline if applicable.

Add `@owlite/types` as a dependency to `apps/web/package.json` (workspace protocol: `"@owlite/types": "workspace:*"`) — the services and hooks use these shared types.

---

## Critical Files to Modify

| File                                     | Change                                        |
| ---------------------------------------- | --------------------------------------------- |
| `apps/web/package.json`                  | Tailwind v3, all deps, browserslist           |
| `apps/web/vite.config.ts`                | remove tailwindcss() plugin, add build.target |
| `apps/web/index.html`                    | Google Fonts link, flex-gap script            |
| `apps/web/src/styles.css`                | v3 directives + globals from owlite           |
| `apps/web/tailwind.config.ts`            | copy from owlite, adjust content paths        |
| `apps/web/postcss.config.mjs`            | new file, v3 + flex-gap-polyfill              |
| `apps/web/postcss-flex-gap-polyfill.cjs` | copy from owlite                              |
| `apps/web/src/main.tsx`                  | add polyfill import, observability            |
| `apps/web/src/routes/__root.tsx`         | providers from owlite layout.tsx              |
| `apps/web/src/routes/`                   | all route files (new)                         |
| `apps/web/src/components/`               | copy from owlite/components/                  |
| `apps/web/src/lib/`                      | copy from owlite/lib/                         |
| `apps/web/src/services/`                 | copy from owlite/services/ (env var rename)   |
| `apps/web/src/hooks/`                    | copy from owlite/hooks/ (router API updates)  |

---

## Verification

1. `cd apps/web && pnpm install` — all deps resolve without conflicts
2. `pnpm --filter web typecheck` — zero TS errors
3. `pnpm --filter web dev` — dev server starts on port 3000
4. Open `http://localhost:3000` — profile selection renders, navigation works
5. Navigate to a media page — TMDB data loads via SWR
6. Navigate to player — HLS playback works
7. Open Chrome 81 (or DevTools emulation) — no JS errors, flex-gap layout correct
