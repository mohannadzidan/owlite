# Phase 4: Remove Middleware — Client-Side Profile Guard

> Read `context.md` before starting. Update `context.md` after completing this phase.

## Goal

Strip the `proxy.ts` Next.js middleware entirely and replace its profile redirect logic with a client-side guard hook. After this phase, Next.js has no server-side logic — no Server Components, no Route Handlers, no middleware. The app is pure client-side React running on Next.js as a static shell.

---

## Changes

### 1. Create `apps/owlite/hooks/use-profile-guard.ts`

```ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientProfileId } from "@/lib/profile-id";

export function useProfileGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!getClientProfileId()) {
      router.replace("/profiles");
    }
  }, [router]);
}
```

### 2. Call `useProfileGuard()` in the protected layout

Open `apps/owlite/app/(maxi)/layout.tsx`. This is already a client component (has sticky header detection logic). Add `useProfileGuard()` at the top of the component:

```tsx
import { useProfileGuard } from "@/hooks/use-profile-guard";

export default function MaxiLayout({ children }: { children: React.ReactNode }) {
  useProfileGuard();
  // ... rest unchanged
}
```

This protects all `(maxi)` routes (home, movie/TV detail, remote, settings, etc.) without protecting `/profiles` itself.

### 3. Strip `proxy.ts`

Remove all logic from `proxy.ts` and export a no-op:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Or delete it entirely if `middleware.ts` (the entry point for Next.js middleware) imports it — check and update accordingly.

**Check:** Find `middleware.ts` in `apps/owlite/` root — it likely imports from `proxy.ts`. If so, either empty out `middleware.ts` or delete both files.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/owlite/hooks/use-profile-guard.ts` | Create — client-side redirect guard |
| `apps/owlite/app/(maxi)/layout.tsx` | Call `useProfileGuard()` |
| `apps/owlite/proxy.ts` | Strip to no-op (or delete) |
| `apps/owlite/middleware.ts` | Empty out or delete (if exists) |

---

## Verification

1. Clear sessionStorage, navigate to `/` — should redirect to `/profiles` immediately
2. Select a profile, navigate to `/` — should show home page
3. Open DevTools → Network — confirm no requests to `/api/proxy/tmdb` or `/api/session`
4. Check that `proxy.ts` / `middleware.ts` no longer interferes with any route
5. `pnpm typecheck` in `apps/owlite` — no errors
6. `pnpm fmt` — formatting pass across both `apps/owlite` and `apps/api`

---

## Final State

After this phase the migration is complete. The app:
- Has zero server-side data fetching
- Has zero Route Handlers
- Has zero middleware proxy logic
- Stores profile ID in `sessionStorage`
- Guards routes client-side

To fully migrate off Next.js in the future: replace `next/navigation` router hooks with React Router or TanStack Router, replace `next/image` with plain `<img>`, and serve the built output as a static SPA.

---

## After Completing This Phase

Update `context.md` → add "Phase 4 — Completed" section with date and any deviations. Mark the full migration as complete.
