# Plan: Migrate Next.js API Routes to Fastify Backend

## Overview

Migrate all 20 REST API routes from `apps/owlite/app/api/` to `apps/api` (Fastify). The DB (SQLite/Drizzle) moves to a shared `packages/db` package. A typed API client is added to the frontend. Migration is incremental — each phase leaves the app fully working.

## Phase Files

Detailed per-phase plans live in `.fastify-migration-plan/` in the project root:

| Phase | File | Scope |
|-------|------|-------|
| 1 | `phase-1-setup.md` | `packages/db`, Fastify plugins/middleware, frontend API client, Next.js rewrites bridge |
| 2 | `phase-2-profiles.md` | `/profiles` + `/profiles/:id[/select]` (5 routes) |
| 3 | `phase-3-profile-data.md` | `/profile/preferences`, `/progress`, `/continue-watching`, `/subtitles` (9 routes) |
| 4 | `phase-4-subtitles.md` | `/subtitles/list|search|download|stream|upload` (7 routes, multipart + Range streaming) |
| 5 | `phase-5-media.md` | `/sources`, `/play`, `/stream`, `/hls-proxy`, `/hls-segment` (5 routes) |
| 6 | `phase-6-mappings-observability.md` | `/mappings` CRUD + `/client-errors|logs` (6 routes) |
| 7 | `phase-7-cleanup.md` | Delete Next.js routes, remove rewrites, wire `apiClient`, clean deps |

## Key Architecture Decisions

- **`packages/db`** — new shared package; both apps import `db` and schema from `@owlite/db`; DB path via `DB_PATH` env var pointing to the same SQLite file
- **Rewrite bridge** — `apps/owlite/next.config.ts` rewrites `/api/:path*` → Fastify; removed in Phase 7
- **`apiClient`** — `apps/owlite/services/api-client.ts` factory that uses `API_INTERNAL_URL` (SSR) or `NEXT_PUBLIC_API_URL` (browser) as base URL; wraps existing `request()` util
- **Fastify plugins** — one `fp(...)` plugin per domain in `apps/api/src/routes/`; Zod schemas inline; `requireProfile` hook for authenticated routes
- **Services stay pure** — all DB/IO logic in `apps/api/src/services/`; route handlers only call services
