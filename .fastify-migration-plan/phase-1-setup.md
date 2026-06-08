# Phase 1 — Setup: Shared DB Package + Fastify Infrastructure

## Goal
Create the `packages/db` shared package and set up Fastify with all middleware, error handling, and the frontend API client. No routes are migrated yet; the app continues to work exactly as before.

## Scope

### 1. Create `packages/db`

New package at `packages/db/` that centralises the Drizzle schema and DB instance, so both `apps/owlite` and `apps/api` share the same SQLite file without duplicating schema definitions.

**Files to create:**

- `packages/db/package.json`
  ```json
  {
    "name": "@owlite/db",
    "version": "0.0.1",
    "main": "src/index.ts",
    "exports": { ".": "./src/index.ts" },
    "dependencies": {
      "better-sqlite3": "^12",
      "drizzle-orm": "^0.45"
    },
    "devDependencies": {
      "@types/better-sqlite3": "^7",
      "typescript": "^5"
    }
  }
  ```

- `packages/db/tsconfig.json` — extend root tsconfig, include `src/**/*.ts`

- `packages/db/src/schema.ts` — **move** the contents of `apps/owlite/db/schema.ts` here verbatim (tables: `subtitles`, `profiles`, `profilePreferences`, `profileProgress`, `profileContinueWatching`, `profileSubtitles`)

- `packages/db/src/index.ts`
  ```typescript
  import Database from "better-sqlite3";
  import { drizzle } from "drizzle-orm/better-sqlite3";
  import path from "path";
  import * as schema from "./schema";

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "owlite.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  export const db = drizzle(sqlite, { schema });
  export * from "./schema";
  ```

**Files to modify:**

- `apps/owlite/db/schema.ts` → replace body with `export * from "@owlite/db"` (keep file for backward-compat imports inside owlite)
- `apps/owlite/db/index.ts` → replace body with `export { db } from "@owlite/db"`
- `apps/owlite/package.json` → add `"@owlite/db": "workspace:*"`, remove `drizzle-orm` and `better-sqlite3` direct deps (they are now transitive)
- `pnpm-workspace.yaml` — ensure `packages/*` is in the packages list (already is)

### 2. Add dependencies to `apps/api`

**`apps/api/package.json`** — add to `dependencies`:
```json
{
  "@fastify/cookie": "^9",
  "@fastify/cors": "^9",
  "@fastify/multipart": "^8",
  "@fastify/type-provider-zod": "^4",
  "@owlite/db": "workspace:*",
  "zod": "^3"
}
```
Move `"@owlite/types"` from `devDependencies` → `dependencies`.

### 3. Refactor `apps/api/src/index.ts`

Extract Socket.io logic into a plugin so `index.ts` stays as a thin registration file:

- **Create `apps/api/src/plugins/socket-io.ts`** — move all Socket.io event handling and in-memory maps here; export as `fp(...)` fastify-plugin
- **Create `apps/api/src/plugins/cors.ts`** — register `@fastify/cors` with `origin: '*'`
- **Create `apps/api/src/plugins/cookies.ts`** — register `@fastify/cookie`
- **Create `apps/api/src/plugins/error-handler.ts`** — `setErrorHandler` that maps `ZodError` → 400 `{ error: { code: 'bad_request', ... } }`, HTTP errors → their status code, all others → 500. Always returns `{ error: { code, message } }` shape.
- **Update `apps/api/src/index.ts`** — register all plugins then call `server.listen`

### 4. Add shared API types to `packages/types`

**Create `packages/types/src/api.ts`**:
```typescript
export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "not_found"
  | "internal_server_error"
  | "could_not_resolve";

export type ApiError = { error: { code: ApiErrorCode; message: string } };
```
Export from `packages/types/src/index.ts`.

### 5. Create frontend API client

**Create `apps/owlite/services/api-client.ts`**:

```typescript
import { request } from "./request";
// import all types needed from @owlite/types

const getApiBaseUrl = () =>
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:8080")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");

const url = (path: string) => `${getApiBaseUrl()}${path}`;

export const apiClient = {
  // Namespaces will be filled in per migration phase
};
```

### 6. Add Next.js rewrites

**Update `apps/owlite/next.config.ts`**:
```typescript
rewrites: async () => ({
  fallback: [
    { source: "/api/:path*", destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:8080"}/:path*` },
  ],
}),
```
This is the backward-compatibility bridge: any `/api/*` request that doesn't match a Next.js route is forwarded to Fastify. As Next.js routes are deleted, Fastify picks them up automatically.

### 7. Environment variables

**`apps/owlite/.env.local`** (add):
```
NEXT_PUBLIC_API_URL=http://localhost:8080
API_INTERNAL_URL=http://localhost:8080
DB_PATH=./data/owlite.db
```

**`apps/api/.env.local`** (create):
```
DB_PATH=../owlite/data/owlite.db
```
Both processes point to the same physical SQLite file.

## Verification
- `pnpm install` succeeds
- `pnpm typecheck` passes across all packages
- `pnpm -F api dev` starts without errors; `GET http://localhost:8080/` returns 404 (no routes yet, expected)
- `pnpm -F owlite dev` still works exactly as before (rewrites not yet exercised)
