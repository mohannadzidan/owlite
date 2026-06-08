# Phase 7 — Cleanup: Delete Next.js API Routes

## Goal
Remove all remaining Next.js API route handlers, the rewrite bridge, and unused dependencies. Fastify is now the sole backend. Wire the frontend services directly to `apiClient`.

## Prerequisites
All prior phases completed and verified:
- [ ] Phase 2: Profiles routes live in Fastify
- [ ] Phase 3: Profile data routes live in Fastify
- [ ] Phase 4: Subtitles routes live in Fastify
- [ ] Phase 5: Media routes live in Fastify
- [ ] Phase 6: Mappings + Observability routes live in Fastify

## Step 1 — Delete Next.js API route files

Remove the entire `apps/owlite/app/api/` directory. All routes it contained are now in Fastify:

```
apps/owlite/app/api/
├── profiles/route.ts                ← deleted in Phase 2
├── profiles/[id]/route.ts           ← deleted in Phase 2
├── profiles/[id]/select/route.ts    ← deleted in Phase 2
├── profile/preferences/route.ts     ← deleted in Phase 3
├── profile/progress/route.ts        ← deleted in Phase 3
├── profile/continue-watching/route.ts ← deleted in Phase 3
├── profile/subtitles/route.ts       ← deleted in Phase 3
├── subtitles/list/route.ts          ← deleted in Phase 4
├── subtitles/search/route.ts        ← deleted in Phase 4
├── subtitles/download/route.ts      ← deleted in Phase 4
├── subtitles/stream/route.ts        ← deleted in Phase 4
├── subtitles/upload/route.ts        ← deleted in Phase 4
├── sources/route.ts                 ← deleted in Phase 5
├── play/route.ts                    ← deleted in Phase 5
├── stream/route.ts                  ← deleted in Phase 5
├── hls-proxy/route.ts               ← deleted in Phase 5
├── hls-segment/route.ts             ← deleted in Phase 5
├── mappings/route.ts                ← deleted in Phase 6
├── client-errors/route.ts           ← deleted in Phase 6
└── client-logs/route.ts             ← deleted in Phase 6
```

If prior phases were done correctly, all these files are already gone. Verify the directory is empty/deleted.

## Step 2 — Remove Next.js rewrites

**`apps/owlite/next.config.ts`** — remove the `rewrites` block added in Phase 1:

```typescript
// Before
const nextConfig: NextConfig = {
  images: { ... },
  allowedDevOrigins: ["192.168.1.100"],
  rewrites: async () => ({
    fallback: [{ source: "/api/:path*", destination: "..." }],
  }),
};

// After
const nextConfig: NextConfig = {
  images: { ... },
  allowedDevOrigins: ["192.168.1.100"],
};
```

## Step 3 — Wire frontend services to `apiClient`

Replace direct fetch calls in `apps/owlite/services/api.service.ts` and `profile.service.ts` with the `apiClient` methods added throughout the migration:

**`apps/owlite/services/api.service.ts`** — rewrite all exports to delegate to `apiClient`:
```typescript
import { apiClient } from "./api-client";

export const sources = {
  list: apiClient.media.sources,
  play: apiClient.media.play,
};

export const subtitles = {
  search: apiClient.subtitles.search,
  downloadUrl: apiClient.subtitles.downloadUrl,
  streamUrl: apiClient.subtitles.streamUrl,
};

export const mappings = {
  list: apiClient.mappings.list,
  create: apiClient.mappings.create,
  update: apiClient.mappings.update,
  remove: apiClient.mappings.remove,
};

export const observability = {
  reportError: apiClient.observability.reportError,
  reportLog: apiClient.observability.reportLog,
};
```

**`apps/owlite/services/profile.service.ts`** — rewrite to delegate to `apiClient.profiles`, `apiClient.preferences`, etc. Remove all direct `fetch`/`request` calls to `/api/profile/*`.

## Step 4 — Remove unused dependencies from `apps/owlite`

In `apps/owlite/package.json`, remove (if still present and no longer used):
- `better-sqlite3` and `@types/better-sqlite3` — now in `packages/db`
- `drizzle-orm` — now in `packages/db`
- Any other server-only packages that were only used in route handlers

Run `pnpm install` after updating.

## Step 5 — Clean up `apps/owlite/db/`

The `apps/owlite/db/` directory now only re-exports from `@owlite/db`. Verify:
- `apps/owlite/db/index.ts` contains only `export { db } from "@owlite/db"`
- `apps/owlite/db/schema.ts` contains only `export * from "@owlite/db"`
- The `apps/owlite/db/migrations/` directory can be kept for reference, or moved to `packages/db/migrations/`

## Step 6 — Remove migration plan directory (optional)

Once the migration is complete and verified, you may delete `.fastify-migration-plan/` from the repo.

## Final Verification Checklist

### Type safety
- [ ] `pnpm typecheck` passes with zero errors across all packages

### Build
- [ ] `pnpm build` succeeds for `apps/owlite` (Next.js)
- [ ] `pnpm build` succeeds for `apps/api` (Fastify)

### Runtime smoke test (run both servers: `pnpm dev`)
- [ ] Profile selection page loads, profiles listed correctly
- [ ] Create / rename / delete a profile
- [ ] Select a profile → `owlite_profile` cookie set
- [ ] Preferences page loads and saves changes
- [ ] Continue watching list populated after watching content
- [ ] Progress tracked and resumed correctly
- [ ] Subtitle search returns results
- [ ] Upload a subtitle, confirm it appears in the list
- [ ] Play a movie/episode via each source
- [ ] HLS stream plays without errors
- [ ] Local file stream works with seeking
- [ ] Mappings CRUD round-trip works
- [ ] Client errors/logs reach the Fastify logger (check terminal output)

### No Next.js API routes remain
- [ ] `apps/owlite/app/api/` directory is empty or deleted
- [ ] No `rewrites` in `next.config.ts`
- [ ] Zero requests hit Next.js for `/api/*` paths (confirm in browser DevTools Network tab — all `/api/*` requests go directly to port 8080 or via a reverse proxy)

### Code quality
- [ ] `pnpm fmt` passes
- [ ] `pnpm lint` passes
