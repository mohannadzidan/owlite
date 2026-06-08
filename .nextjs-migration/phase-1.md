# Phase 1: Backend — TMDB Proxy + HLS URL Fix

> Read `context.md` before starting. Update `context.md` after completing this phase.

## Goal

Move the TMDB API proxy from Next.js middleware to the Fastify backend, and fix the circular HLS proxy URL dependency. After this phase the backend is ready to serve all proxy needs directly; the frontend changes come in later phases.

## Why first

All other phases depend on the frontend calling fastify for TMDB data. This backend change has zero frontend impact and can be deployed/tested independently.

---

## Changes

### 1. Create `apps/api/src/routes/tmdb.ts`

New Fastify route that proxies `/tmdb/*` → `https://api.themoviedb.org/*` with the TMDB Bearer token injected server-side.

```ts
import { FastifyInstance } from "fastify";

export default async function tmdbPlugin(fastify: FastifyInstance) {
  fastify.get("/tmdb/*", async (request, reply) => {
    const wildcard = (request.params as { "*": string })["*"];
    const search = request.url.includes("?") ? "?" + request.url.split("?")[1] : "";
    const upstreamUrl = `https://api.themoviedb.org/${wildcard}${search}`;

    const res = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        Accept: "application/json",
      },
    });

    const body = await res.text();
    reply
      .status(res.status)
      .header("Content-Type", res.headers.get("Content-Type") ?? "application/json")
      .send(body);
  });
}
```

Make sure `TMDB_API_KEY` is available in `apps/api` environment (add to `.env` if not already present).

### 2. Register in `apps/api/src/routes/index.ts`

```ts
import tmdbPlugin from "./tmdb";

export async function registerRoutes(fastify: FastifyInstance) {
  // ... existing registrations ...
  await fastify.register(tmdbPlugin);
}
```

### 3. Fix HLS embedded segment URLs — `apps/api/src/routes/media.ts` line 159

```ts
// Before
return abs.includes(".m3u8") ? `/api/hls-proxy?p=${enc}` : `/api/hls-segment?p=${enc}`;

// After
return abs.includes(".m3u8") ? `/hls-proxy?p=${enc}` : `/hls-segment?p=${enc}`;
```

**Why this works:** The browser fetches the HLS manifest from `{NEXT_PUBLIC_API_URL}/hls-proxy?...`. Relative URLs `/hls-proxy` and `/hls-segment` in the manifest resolve against the same fastify origin — no absolute URL or env var needed.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/routes/tmdb.ts` | Create — new TMDB proxy route |
| `apps/api/src/routes/index.ts` | Register `tmdbPlugin` |
| `apps/api/src/routes/media.ts` | Fix embedded HLS segment URL prefix |

---

## Verification

1. Start `apps/api` dev server
2. `curl "http://localhost:8080/tmdb/3/movie/550"` — should return Fight Club JSON from TMDB
3. Play an HLS stream in the player — check Network tab that segment requests go to `{API_URL}/hls-segment?...` not `/api/hls-segment?...`
4. `pnpm typecheck` in `apps/api`

---

## After Completing This Phase

Update `context.md` → add "Phase 1 — Completed" section with date and any deviations.
