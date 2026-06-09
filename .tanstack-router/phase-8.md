# Phase 8 — Workspace Integration & Final Cleanup

> **Before starting:** Read `.tanstack-router/context.md` fully. Phases 1–7 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`. Mark migration as complete.

## Goal

Ensure `apps/web` is fully wired into the monorepo (workspace, turbo pipeline, shared types). Clean up any scaffolding leftovers. Final end-to-end verification.

---

## Step 1 — Verify pnpm workspace

Check `pnpm-workspace.yaml` at the repo root includes `apps/*`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

If `apps/web` is under `apps/`, it's already included. Confirm `@owlite/types` resolves by checking that `pnpm install` at the root picks up the workspace link.

---

## Step 2 — Verify @owlite/types dependency

`apps/web/package.json` should have:
```json
"dependencies": {
  "@owlite/types": "workspace:*",
  ...
}
```

Check `packages/types/package.json` for the exported package name. Import a type from it in one of the service files to confirm it resolves.

---

## Step 3 — Add turbo tasks

Check the root `turbo.json`. If it defines tasks like `build`, `dev`, `typecheck` — these should automatically apply to `apps/web` since turbo reads all workspace packages.

If the root `package.json` scripts have `--filter` flags that name `owlite` specifically, add `web` to them as well (or use `--filter=web`).

---

## Step 4 — Clean up scaffold artifacts

Remove from `apps/web/`:
- `public/logo192.png`, `public/logo512.png` — replace with owlite's favicon/assets
- `public/manifest.json` — update with correct app name ("Owlite")
- `README.md` — remove or update
- `src/router.tsx` — this file conflicts with `src/main.tsx` (both define a router). Keep only one. The scaffold created both; `main.tsx` should be the entry point, `router.tsx` is redundant — delete it.

Copy owlite's `public/` assets (favicon, any icons) to `apps/web/public/`.

---

## Step 5 — Update index.html title and meta

In `apps/web/index.html`:
- Update `<title>` from `"web"` to `"Owlite"`
- Add `<meta name="theme-color" content="#000000">`
- Ensure Google Fonts `<link>` tags are present (from Phase 1/4)
- Ensure flex-gap detection script is present (from Phase 1)

---

## Step 6 — Remove duplicate router definition

The scaffold has both `src/main.tsx` and `src/router.tsx` creating routers. Delete `src/router.tsx`. `src/main.tsx` is the canonical entry point.

---

## Step 7 — Add typecheck and fmt scripts

Ensure `apps/web/package.json` has scripts consistent with the monorepo:
```json
"scripts": {
  "dev": "vite dev --port 3000",
  "build": "vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "generate-routes": "tsr generate",
  "test": "vitest run"
}
```

The monorepo root uses `pnpm typecheck` which runs `typecheck` in all workspaces.

---

## Step 8 — Final end-to-end smoke test

With the fastify API running (`pnpm --filter api dev` or equivalent):

1. `pnpm --filter web dev` — starts on port 3000
2. Open `http://localhost:3000` → redirects to `/profiles` (ProfileGuard working)
3. Select a profile → redirects to `/` (home page)
4. Home page shows continue-watching and/or media grid (SWR data loading)
5. Click a movie → navigates to `/media/movie/{id}`, TMDB data loads
6. Click Play → navigates to `/player/movie/{id}`, HLS stream starts
7. Open remote control page → websocket connects
8. Open settings page → renders
9. Test browser back button throughout
10. `pnpm --filter web build` — production build succeeds, no errors

---

## Step 9 — Chrome 81 smoke test

If you have access to an Android TV device or can emulate Chrome 81:

1. Serve the production build: `pnpm --filter web preview`
2. Open in Chrome 81 (or set Chrome's UA + disable modern CSS features in DevTools)
3. Verify:
   - Page renders (no blank screen from JS errors)
   - Flex layouts look correct (no overlapping elements from missing gap support)
   - Video playback works (HLS.js handles this)
   - No console errors about `WeakRef is not defined`

---

## Migration Complete Checklist

- [ ] Phase 1: Tailwind v3, PostCSS, all deps
- [ ] Phase 2: lib/, services/, hooks/ copied and env vars renamed
- [ ] Phase 3: components/ copied, next/ imports replaced
- [ ] Phase 4: All routes created, app fully navigable
- [ ] Phase 5: Polyfills in place (core-js, WeakRef, flex-gap)
- [ ] Phase 6: .env files created, VITE_API_URL in use everywhere
- [ ] Phase 7: Observability (error/log beacons) wired up
- [ ] Phase 8: Workspace integrated, scaffold cleaned, smoke tests pass
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] `pnpm build` passes for apps/web
- [ ] Chrome 81 smoke test passes
