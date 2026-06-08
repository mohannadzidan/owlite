# Phase 3 — Profile Data Routes

## Goal
Migrate the authenticated `/api/profile/*` endpoints that require the `owlite_profile` cookie. Introduces a reusable `requireProfile` hook shared by all profile-data routes.

## Routes to migrate
| Method | Next.js path | Fastify path |
|--------|-------------|-------------|
| GET    | /api/profile/preferences | /profile/preferences |
| PATCH  | /api/profile/preferences | /profile/preferences |
| GET    | /api/profile/progress | /profile/progress |
| PATCH  | /api/profile/progress | /profile/progress |
| GET    | /api/profile/continue-watching | /profile/continue-watching |
| POST   | /api/profile/continue-watching | /profile/continue-watching |
| DELETE | /api/profile/continue-watching | /profile/continue-watching |
| GET    | /api/profile/subtitles | /profile/subtitles |
| PATCH  | /api/profile/subtitles | /profile/subtitles |

## Files to create

### `apps/api/src/hooks/require-profile.ts`
A Fastify `onRequest` hook that reads the `owlite_profile` cookie and attaches the profile ID to the request:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";

// Augment FastifyRequest to carry profileId
declare module "fastify" {
  interface FastifyRequest {
    profileId: string;
  }
}

export async function requireProfile(req: FastifyRequest, reply: FastifyReply) {
  const profileId = req.cookies?.owlite_profile;
  if (!profileId) {
    return reply.code(401).send({ error: { code: "unauthorized", message: "No profile selected" } });
  }
  req.profileId = profileId;
}
```

### `apps/api/src/services/profile.service.ts` — additions
Extend the file created in Phase 2 with these functions (ported from the Next.js route handlers):

**Preferences:**
```typescript
export function getPreferences(profileId: string): PreferencesRecord { ... }
export function patchPreferences(profileId: string, patch: Partial<PreferencesRecord>): void { ... }
```
Default preferences shape matches `apps/owlite/app/api/profile/preferences/route.ts`.

**Progress:**
```typescript
export function getProgress(profileId: string, tmdbId: number, season?: number, episode?: number): ProgressRecord | null { ... }
export function patchProgress(profileId: string, patch: ProgressRecord): void { ... }
```

**Continue Watching:**
```typescript
export function getContinueWatching(profileId: string): ContinueWatchingEntry[] { ... }
export function addContinueWatching(profileId: string, entry: ContinueWatchingEntry): void { ... }
export function removeContinueWatching(profileId: string, tmdbId: number): void { ... }
```

**Profile Subtitles (selected URL per episode):**
```typescript
export function getProfileSubtitles(profileId: string, tmdbId: number, season?: number, episode?: number): string | null { ... }
export function saveProfileSubtitles(profileId: string, tmdbId: number, season: number | undefined, episode: number | undefined, subtitleUrl: string): void { ... }
```

### `apps/api/src/routes/profile-data.ts`
Single plugin for all authenticated profile endpoints. All routes use `preHandler: [requireProfile]`:

```typescript
import fp from "fastify-plugin";
import { requireProfile } from "../hooks/require-profile";
import * as profileService from "../services/profile.service";

export default fp(async (fastify) => {
  fastify.addHook("onRequest", requireProfile); // applies to all routes in this plugin scope

  fastify.get("/profile/preferences", async (req) =>
    profileService.getPreferences(req.profileId)
  );

  fastify.patch("/profile/preferences", async (req) => {
    profileService.patchPreferences(req.profileId, req.body as any);
    return { ok: true };
  });

  // ... repeat pattern for /progress, /continue-watching, /subtitles
});
```

## Files to modify

- **`apps/api/src/routes/index.ts`** — add `await fastify.register(profileDataPlugin)`
- **`apps/api/src/index.ts`** — ensure `@fastify/cookie` is registered before routes (Phase 1)

## Files to delete (after verification)
- `apps/owlite/app/api/profile/preferences/route.ts`
- `apps/owlite/app/api/profile/progress/route.ts`
- `apps/owlite/app/api/profile/continue-watching/route.ts`
- `apps/owlite/app/api/profile/subtitles/route.ts`

## Frontend API client additions

Add to `apps/owlite/services/api-client.ts`:
```typescript
preferences: {
  get: () => request<PreferencesRecord>("GET", url("/profile/preferences")),
  patch: (patch: Partial<PreferencesRecord>) => request<{ ok: boolean }>("PATCH", url("/profile/preferences"), patch),
},
progress: {
  get: (params: { tmdb_id: number; season?: number; episode?: number }) =>
    request<ProgressRecord | null>("GET", url(`/profile/progress?${new URLSearchParams(params as any)}`)),
  patch: (data: ProgressRecord) => request<{ ok: boolean }>("PATCH", url("/profile/progress"), data),
},
continueWatching: {
  list: () => request<ContinueWatchingEntry[]>("GET", url("/profile/continue-watching")),
  add: (entry: ContinueWatchingEntry) => request<{ ok: boolean }>("POST", url("/profile/continue-watching"), entry),
  remove: (tmdbId: number) => request<{ ok: boolean }>("DELETE", url("/profile/continue-watching"), { tmdb_id: tmdbId }),
},
profileSubtitles: {
  get: (params: { tmdb_id: number; season?: number; episode?: number }) =>
    request<{ subtitleUrl: string | null }>("GET", url(`/profile/subtitles?${new URLSearchParams(params as any)}`)),
  patch: (data: { tmdb_id: number; season?: number; episode?: number; subtitleUrl: string }) =>
    request<{ ok: boolean }>("PATCH", url("/profile/subtitles"), data),
},
```

## Verification
- Requests without cookie return 401
- Preferences round-trip: set a preference, reload page, confirm it persists
- Progress updates correctly for a movie and a TV episode
- Continue-watching list adds/removes entries
- `pnpm typecheck` passes
