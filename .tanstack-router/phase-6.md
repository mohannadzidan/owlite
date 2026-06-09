# Phase 6 — Environment Variables

> **Before starting:** Read `.tanstack-router/context.md` fully. Phase 2 must be complete (env vars are touched there too).
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Ensure all environment variables are correctly named for Vite (`VITE_` prefix instead of `NEXT_PUBLIC_`) and that `.env` files are in place.

---

## Background

Vite exposes env vars to client code only if they start with `VITE_`. Variables without this prefix are available in `vite.config.ts` (Node context) but NOT in browser code.

Next.js used `NEXT_PUBLIC_` prefix for the same purpose. All references must be updated.

---

## Variable Mapping

| owlite variable | web variable | Where used |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `VITE_API_URL` | `services/api-client.ts`, `services/tmdb.service.ts` |
| `API_INTERNAL_URL` | *(remove — server-only, not needed)* | Was used for SSR, now dead |
| `TMDB_API_KEY` | *(remove — server-only, fastify handles it)* | Was used by Next.js middleware proxy |

---

## Step 1 — Create .env files

Create `apps/web/.env.development`:
```
VITE_API_URL=http://192.168.1.100:8080
```

Create `apps/web/.env.production`:
```
VITE_API_URL=/
```

The production value `/` means the API is served from the same origin as the frontend (typical setup where fastify serves the built static files).

Create `apps/web/.env.example`:
```
VITE_API_URL=http://localhost:8080
```

Add `.env.development` and `.env.production` to `.gitignore` if they contain machine-specific values. `.env.example` should be committed.

---

## Step 2 — Audit all env var usages

Search `apps/web/src/` for remaining `NEXT_PUBLIC_` or `process.env`:

```
grep -r "NEXT_PUBLIC_" apps/web/src/
grep -r "process.env" apps/web/src/
```

Every hit must be replaced with `import.meta.env.VITE_*`.

Known files that reference the API URL (from Phase 2):
- `src/services/api-client.ts` — `getApiBaseUrl()` function
- `src/services/tmdb.service.ts` — custom fetch that builds proxy URL

---

## Step 3 — TypeScript env var typing

Add a type declaration file so TypeScript knows about the env vars.

Create `apps/web/src/env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

This makes `import.meta.env.VITE_API_URL` fully typed (string, not `string | undefined`) and gives autocomplete.

---

## Verification

1. `pnpm --filter web typecheck` — no `import.meta.env` type errors
2. `grep -r "NEXT_PUBLIC_" apps/web/src/` — zero results
3. `grep -r "process.env" apps/web/src/` — zero results (unless in Node-only config files)
4. Start dev server (`pnpm --filter web dev`) and check Network tab — API calls should go to `http://192.168.1.100:8080` (the value in `.env.development`)
