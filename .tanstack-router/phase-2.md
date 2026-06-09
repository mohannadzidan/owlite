# Phase 2 — Copy lib/, services/, hooks/

> **Before starting:** Read `.tanstack-router/context.md` fully. Phase 1 must be complete.
> **After completing:** Update the Phase Completion Log in `context.md`.

## Goal

Copy the framework-agnostic shared code (lib, services, hooks) from `apps/owlite` into `apps/web/src/`. Make the minimal changes needed for the Vite environment (env var naming, router API).

---

## Step 1 — Copy lib/

Copy the entire `apps/owlite/lib/` directory → `apps/web/src/lib/`.

```
cp -r apps/owlite/lib/ apps/web/src/lib/
```

### Files to verify after copy

**`src/lib/utils.ts`** — must export `cn()`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**`src/lib/profile-id.ts`** — reads/writes `sessionStorage` with key `owlite_profile`. No changes needed.

**`src/lib/observability.ts`** — calls `apiClient` or uses `NEXT_PUBLIC_API_URL`. If it references `process.env.NEXT_PUBLIC_API_URL`, update to `import.meta.env.VITE_API_URL`.

All Zustand stores in lib/ (navigation-bar-store.ts, remote-control-store.ts, shortcuts/) — no changes needed, Zustand is framework-agnostic.

---

## Step 2 — Copy services/

Copy the entire `apps/owlite/services/` directory → `apps/web/src/services/`.

### Required changes

**`src/services/api-client.ts`**

Find all occurrences of `process.env.NEXT_PUBLIC_API_URL` and replace with `import.meta.env.VITE_API_URL`.

The `getApiBaseUrl()` function in api-client.ts currently has two branches:
- `typeof window === "undefined"` (server) → `API_INTERNAL_URL`
- browser → `NEXT_PUBLIC_API_URL`

After migration the server branch is dead code. Simplify:
```ts
function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? ''
}
```

**`src/services/tmdb.service.ts`**

Same env var rename: `process.env.NEXT_PUBLIC_API_URL` → `import.meta.env.VITE_API_URL`.

The client-side URL rewrite in tmdb.service.ts changes TMDB API URLs to `{API_URL}/tmdb/{path}`. This should work as-is once the env var is renamed.

**Other service files** — scan for `process.env` usage. Replace any `NEXT_PUBLIC_*` env var with the `VITE_*` equivalent.

---

## Step 3 — Copy hooks/

Copy the entire `apps/owlite/hooks/` directory → `apps/web/src/hooks/`.

### Required changes

**`src/hooks/use-profile-guard.ts`**

This hook uses `useRouter` from `next/navigation`. Replace with TanStack Router:

```ts
// Before (Next.js)
import { useRouter } from 'next/navigation'
const router = useRouter()
router.replace('/profiles')

// After (TanStack Router)
import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({ to: '/profiles', replace: true })
```

**Other hooks** — scan for any `next/navigation` imports and replace per the mapping table in `context.md`.

SWR hooks (`use-continue-watching.ts`, `use-profile-preferences.ts`, `use-progress.ts`, `use-subtitle-preference.ts`) — no changes needed, they use `apiClient` from services directly.

---

## Step 4 — Add .env files

Copy and rename:
- `apps/owlite/.env.development` → `apps/web/.env.development`
- `apps/owlite/.env.production` → `apps/web/.env.production`
- `apps/owlite/.env.example` → `apps/web/.env.example`

In each file, rename `NEXT_PUBLIC_API_URL` → `VITE_API_URL`.

Remove `API_INTERNAL_URL` and `TMDB_API_KEY` — these are server-only vars not needed in the client app.

Example `.env.development`:
```
VITE_API_URL=http://192.168.1.100:8080
```

---

## Verification

1. `pnpm --filter web typecheck` — no errors in lib/, services/, hooks/
2. Check that `cn()` is importable from `@/lib/utils`
3. Check that `getClientProfileId()` is importable from `@/lib/profile-id`
4. Check that `apiClient` is importable from `@/services/api-client`
