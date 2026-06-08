# Phase 2: Session — Cookie → sessionStorage

> Read `context.md` before starting. Update `context.md` after completing this phase.

## Goal

Replace the cookie-based profile session with `sessionStorage`. After this phase, selecting a profile writes to `sessionStorage` instead of calling `/api/session`, and the profile ID is read from `sessionStorage` everywhere on the client.

`sessionStorage` is intentionally tab-scoped — opening a new tab will prompt profile selection again, which is the desired behavior for the eventual pure-React migration.

---

## Changes

### 1. Rewrite `apps/owlite/lib/profile-id.ts`

```ts
const KEY = "owlite_profile";

export function getClientProfileId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem(KEY) ?? undefined;
}

export function setClientProfileId(id: string): void {
  sessionStorage.setItem(KEY, id);
}

export function clearClientProfileId(): void {
  sessionStorage.removeItem(KEY);
}
```

### 2. Update `apps/owlite/app/profiles/page.tsx` — `handleSelect`

Replace the fetch call to `/api/session` with a direct sessionStorage write:

```ts
// Before
const handleSelect = async (id: string) => {
  if (managing) return;
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId: id }),
  });
  router.push("/");
};

// After
const handleSelect = (id: string) => {
  if (managing) return;
  setClientProfileId(id);
  router.push("/");
};
```

Import `setClientProfileId` from `@/lib/profile-id`.

### 3. Delete `apps/owlite/app/api/session/route.ts`

This Route Handler is no longer needed. Delete the file and the `app/api/session/` directory.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/owlite/lib/profile-id.ts` | Rewrite — use sessionStorage, export set/clear |
| `apps/owlite/app/profiles/page.tsx` | Use `setClientProfileId()`, remove fetch to `/api/session` |
| `apps/owlite/app/api/session/route.ts` | Delete |

---

## Notes

- At this point the middleware (`proxy.ts`) still reads the cookie for its redirect check — that still works during this phase since both old (cookie) and new (sessionStorage) sessions can coexist until Phase 4 removes the middleware.
- The server-side `app/page.tsx` still reads the cookie too — it will get `undefined` profileId, which it handles gracefully (shows empty state). The client SWR hooks will pick up the sessionStorage value correctly.
- If there's any "log out" or profile-switching code that calls `DELETE /api/session`, update it to call `clearClientProfileId()` instead.

---

## Verification

1. Open the app, navigate to `/profiles`
2. Select a profile — confirm redirect to `/`
3. Open DevTools → Application → Session Storage → confirm `owlite_profile` key is set
4. Confirm no request to `/api/session` in Network tab
5. `pnpm typecheck` in `apps/owlite` — no errors

---

## After Completing This Phase

Update `context.md` → add "Phase 2 — Completed" section with date and any deviations.
