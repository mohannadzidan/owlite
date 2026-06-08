# Project Context & Migration State

## Monorepo Layout

```
owlite/
  apps/
    owlite/          # Next.js 16 (App Router) frontend — personal media server for Android TV
    api/             # Fastify backend — Socket.io remote-control server (being extended to host all API routes)
  packages/
    types/           # @owlite/types — shared TypeScript types (media, profile, remote, remote-socket, api)
    db/              # @owlite/db — NEW in Phase 1; shared Drizzle/SQLite schema and db instance
```

Package manager: pnpm with workspaces. Build orchestration: Turborepo.

---

## apps/owlite

- Next.js 16, App Router, React 19, TypeScript, Tailwind CSS 3, shadcn/ui
- Targets Chrome 81 (Android TV) — no modern browser APIs assumed
- **No remaining Next.js API routes** — all migrated to Fastify (phase 6 complete)
- DB access via `db/index.ts` (re-exports `db` from `@owlite/db`) and `db/schema.ts` (re-exports schema from `@owlite/db`)
- Services in `services/` are plain functions (no framework imports); `request.ts` is the base HTTP util — signature: `request<T>(url, init?)` matching `fetch`
- `services/api-client.ts` — typed API client with namespaces: `profiles` (Phase 2), `preferences`, `progress`, `continueWatching`, `profileSubtitles` (Phase 3), `subtitles` (Phase 4), `media` (Phase 5), `mappings` (Phase 6), `observability` (Phase 6); a `json(method, body?)` helper builds `RequestInit` with JSON headers; exports `url()` and `request()` helpers
  - `media` namespace: `sources()` GET, `play(params)` POST, `streamUrl(filePath)` returns direct URL, `hlsProxyUrl(p)` returns direct URL, `hlsSegmentUrl(p)` returns direct URL
  - `mappings` namespace: `list()` GET, `create(mapping)` POST, `update(tmdbId, patch)` PUT, `remove(tmdbId)` DELETE — keyed by `tmdb_id` (not array index)
  - `observability` namespace: `reportError(payload)` POST `/client-errors`, `reportLog(payload)` POST `/client-logs`
- `services/api.service.ts` — **legacy** service file using `/api/...` path prefix; still exists but `mappings` and `observability` exports here are unused by any component; will be deleted in Phase 7
- `services/opensubtitles.service.ts` — **deleted** in Phase 4 (moved to `apps/api/src/services/`)
- `services/streamimdb.service.ts` — **deleted** in Phase 5 (moved to `apps/api/src/services/`)
- `lib/sources/` — **deleted** in Phase 5 (moved to `apps/api/src/lib/sources/`)
- `lib/hlsParser.ts`, `lib/hlsStreamSelector.ts` — **remain in owlite** (api has its own copies in `src/lib/`)
- `lib/types.ts` — re-exports `PlayResponse`, `SubtitleTrack`, `VideoSource`, `ResolveParams`, `LocalMapping` all from `@owlite/types` (no local definitions remain)
- `lib/srt-to-vtt.ts` and `lib/filename-parser.ts` — **remain in owlite** (the api package has its own copies in `src/lib/`)
- State: TanStack Query for server state, Zustand for UI state
- `next.config.ts` has a fallback rewrite: `/api/:path*` → `http://localhost:8080/:path*` (the Fastify bridge added in Phase 1; to be removed in Phase 7)

## apps/api

- Fastify 4, Socket.io, TypeScript, compiled with SWC
- `src/index.ts` — bootstrap: registers plugins, then calls `registerRoutes(server)`, then `server.listen`
- `src/plugins/` — four plugins added in Phase 1:
  - `socket-io.ts` — all Socket.io pairing/session logic (extracted from old monolithic index.ts)
  - `cors.ts` — `@fastify/cors` origin: '*'
  - `cookies.ts` — `@fastify/cookie`
  - `error-handler.ts` — Zod-like error → 400, HTTP errors → status code, fallback → 500; shape: `{ error: { code, message } }`
- `src/utils.ts` — `generateCode()` helper used by socket-io plugin
- `src/routes/index.ts` — central `registerRoutes(fastify)` function; import and register all route plugins here
- `src/routes/profiles.ts` — Phase 2: all 5 profile routes as an `fp(...)` plugin
- `src/services/profile.service.ts` — Phase 2: pure DB functions for profiles (`listProfiles`, `getProfileById`, `createProfile`, `updateProfile`, `deleteProfile`)
- `src/routes/profile-data.ts` — Phase 3: preferences, progress, continue-watching, profile-subtitles routes
- `src/services/profile-data.service.ts` — Phase 3: pure DB functions for profile data
- `src/routes/subtitles.ts` — Phase 4: all 7 subtitle routes as an `fp(...)` plugin (list GET/PATCH/DELETE, search POST, download GET, stream GET with Range, upload POST json)
- `src/services/subtitle.service.ts` — Phase 4: DB + file I/O functions (`listSubtitles`, `setFavorite`, `deleteSubtitle`, `searchSubtitles`, `downloadSubtitle`, `resolveSubtitleCachePath`, `uploadSubtitle`)
- `src/services/opensubtitles.service.ts` — Phase 4: OpenSubtitles API client (moved from owlite; uses native fetch, no owlite `request.ts` dependency); exports `subtitles.search`, `downloads.link`, `HttpError`
- `src/lib/srt-to-vtt.ts` — Phase 4: SRT→VTT converter (moved from `apps/owlite/lib/`)
- `src/lib/filename-parser.ts` — Phase 4: subtitle filename parser wrapping `@ctrl/video-filename-parser` (moved from `apps/owlite/lib/`)
- `src/lib/hlsParser.ts` — Phase 5: HLS master playlist parser (moved from `apps/owlite/lib/`)
- `src/lib/hlsStreamSelector.ts` — Phase 5: HLS stream scorer; selects best stream by time/resolution/codec compatibility (moved from `apps/owlite/lib/`)
- `src/lib/sources/registry.ts` — Phase 5: video source registry; `getSources()` and `getSourceById(id)` (moved from `apps/owlite/lib/sources/`); currently contains only `streamImdbSource`
- `src/lib/sources/streamimdb.source.ts` — Phase 5: StreamIMDb `VideoSource` plugin; `resolve()` returns `{ type: "hls", master_manifest_url: "/api/hls-proxy?p=<base64url>" }`; URL points through the Next.js rewrite bridge (still `/api/` prefix, not direct Fastify)
- `src/services/streamimdb.service.ts` — Phase 5: StreamIMDb API client using native fetch (moved from `apps/owlite/services/`; owlite's `request()` helper replaced with `fetch`); exports `streams.urls()`, `streams.fetcher()`, `streams.referer()`
- `src/services/media.service.ts` — Phase 5: `listSources()` returns all sources (id/name/description), `resolveMedia(sourceId, params)` throws `{ statusCode: 404 }` or `{ statusCode: 422 }` on failure
- `src/routes/media.ts` — Phase 5: `/sources` GET, `/play` POST, `/stream` GET (Range-aware local file streaming with `MEDIA_ROOTS` env guard), `/hls-proxy` GET (base64url `p` param, rewrites segment URLs), `/hls-segment` GET (proxies with Range passthrough); all as one `fp(...)` plugin
- `src/routes/mappings.ts` — Phase 6: GET/POST/PUT/DELETE `/mappings`; PUT and DELETE identify the mapping by `tmdb_id` in the request body
- `src/services/mapping.service.ts` — Phase 6: reads/writes `data/local_mappings.json` in `process.cwd()`; exports `listMappings`, `createMapping`, `updateMapping(tmdbId, patch)`, `deleteMapping(tmdbId)`
- `src/routes/observability.ts` — Phase 6: POST `/client-errors` (logs at error level) and POST `/client-logs` (logs at info level); both return 204
- `@fastify/multipart` is registered in `src/index.ts` before routes; route files import `"@fastify/multipart"` for type augmentation of `req.parts()`
- `@ctrl/video-filename-parser` added to `apps/api/package.json` dependencies
- Runs on port 8080

## packages/db (@owlite/db)

Created in Phase 1. Contains:
- `src/schema.ts` — all Drizzle table definitions: `subtitles`, `profiles`, `profilePreferences`, `profileProgress`, `profileContinueWatching`, `profileSubtitles`
- `src/index.ts` — creates a `better-sqlite3` connection (path from `DB_PATH` env var, default `./data/owlite.db`), enables WAL mode, exports `db` and all schema symbols

Both `apps/owlite` and `apps/api` will share this package, pointing at the same SQLite file via env vars.

## packages/types (@owlite/types)

- `src/api.ts` — NEW in Phase 1: `ApiErrorCode`, `ApiError`, `SubtitlesUploadRequest` types
- `src/media.ts` — pre-existing + Phase 4 additions: `SubtitleFileRow`, `SubtitleEntry`, `SubtitleTrack`, `PlayResponse` + Phase 5 additions: `VideoSource`, `ResolveParams` interfaces + Phase 6 addition: `LocalMapping`
- `src/profile.ts`, `src/remote.ts`, `src/remote-socket.ts` — pre-existing

---

## Environment Variables

### apps/owlite/.env.development
```
TMDB_API_KEY=...
OPENSUBTITLES_API_KEY=...
NEXT_PUBLIC_API_URL=http://192.168.1.100:8080   # browser-side Fastify URL
API_INTERNAL_URL=http://localhost:8080           # SSR-side Fastify URL (added Phase 1)
DB_PATH=./data/owlite.db                        # added Phase 1
```

### apps/api/.env.development (created Phase 1)
```
DB_PATH=../owlite/data/owlite.db   # points at same SQLite file as owlite
```

---

## Migration Plan State

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | **Done** | packages/db, Fastify plugins, api-client stub, Next.js rewrite bridge |
| 2 | **Done** | `/profiles` + `/profiles/:id[/select]` (5 routes) |
| 3 | **Done** | `/profile/preferences`, `/progress`, `/continue-watching`, `/subtitles` (9 routes) |
| 4 | **Done** | `/subtitles/list|search|download|stream|upload` (7 routes) |
| 5 | **Done** | `/sources`, `/play`, `/stream`, `/hls-proxy`, `/hls-segment` (5 routes) |
| 6 | **Done** | `/mappings` CRUD + `/client-errors|logs` (6 routes) |
| 7 | Pending | Delete Next.js routes, remove rewrites, wire apiClient, clean deps |

The rewrite bridge in `next.config.ts` means each phase can delete Next.js routes one-by-one and Fastify picks them up automatically — no big-bang cutover.

## Key Conventions to Follow

- Route handlers: one `fp(...)` Fastify plugin per domain in `apps/api/src/routes/`
- Business logic: plain service functions in `apps/api/src/services/` — no Fastify imports
- Zod schemas inline in route files; use `schema.parse(req.body)` (not inline schema declaration) because `@fastify/type-provider-zod` is not used
- `requireProfile` hook for routes that need an active profile (to be created in Phase 3)
- Frontend: add namespace methods to `apiClient` in `apps/owlite/services/api-client.ts` as each phase lands
- `api-client.ts` uses a `json(method, body?)` helper to build `RequestInit`; `request()` takes `(url, init?)` matching the `fetch` signature
- `@fastify/type-provider-zod` was intentionally omitted — the published v1 requires Fastify v5 + Zod v4, which conflicts with the current stack (Fastify v4, Zod v3); add it only after upgrading Fastify
- `drizzle-orm` must be in `apps/api/package.json` dependencies (added in Phase 2, version `^0.45` to match `packages/db`)
- DB `createdAt` columns use `{ mode: "timestamp" }` so Drizzle returns a `Date` — map to milliseconds (`.getTime()`) when converting to `Profile` type (which uses `createdAt: number`)
- For `@fastify/multipart` route type augmentation: add `import "@fastify/multipart"` at the top of the route file so TypeScript sees `req.parts()` — the plugin must also be registered in `src/index.ts` before routes
- Drizzle with `better-sqlite3` is synchronous — use `.all()`, `.get()`, `.run()` instead of `await` on queries in `apps/api` services
- HLS proxy URL scheme: both `/hls-proxy` and `/hls-segment` use a single `p` query param containing base64url-encoded JSON `{ u: string, r: string }` (url + referer). `encode`/`decode` helpers live in `apps/api/src/routes/media.ts`. The `streamimdb.source.ts` generates `master_manifest_url` as `/api/hls-proxy?p=...` (with `/api/` prefix) so it routes through the Next.js rewrite bridge — this will need updating in Phase 7 cleanup
- **Never edit files under `.next/`** — it is auto-generated by Next.js dev server and must not be manually modified. Stale route references in `.next/dev/types/validator.ts` are resolved automatically when the dev server restarts and regenerates the file
- Types shared between the Fastify service layer and the Next.js frontend should live in `packages/types` (e.g. `SubtitleFileRow`, `SubtitleEntry`). Do not import types from Next.js route files in frontend components
