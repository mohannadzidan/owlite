# Phase 3 — Backend API Route

## Pre-requisites

**Read `.recommendation-engine/context.md` before starting.** Phases 1 and 2 must be complete.

## Goal

Expose the recommendations service via a new Fastify route in `apps/api/src/routes/profiles.ts`.

## Steps

### 1. Add the route to `apps/api/src/routes/profiles.ts`

Study the existing routes in the file first to match the exact pattern used (reply types, error handling, profile existence check).

Add:

```typescript
// GET /profiles/:profileId/recommendations
fastify.get<{ Params: { profileId: string } }>(
  "/:profileId/recommendations",
  async (request, reply) => {
    const profile = getProfileById(request.params.profileId);
    if (!profile) return reply.status(404).send({ error: "Profile not found" });
    const payload = await getRecommendations(request.params.profileId);
    return reply.send(payload);
  },
);
```

Import `getRecommendations` from `../services/recommendations.service`.

### 2. Error handling

If `getRecommendations` throws (e.g. TMDB unreachable), catch and return a graceful empty payload rather than a 500 — the frontend should never crash due to a failed recommendations call:

```typescript
try {
  const payload = await getRecommendations(request.params.profileId);
  return reply.send(payload);
} catch {
  return reply.send({ becauseYouWatched: [], topPicks: [], topCategories: [] });
}
```

### 3. Verify

- `pnpm typecheck` must pass
- Start the API and curl the endpoint:
  ```
  curl http://localhost:<port>/api/v1/profiles/<profileId>/recommendations
  ```
  Confirm it returns valid JSON matching `RecommendationsPayload`.

## Context update

After completing, update `.recommendation-engine/context.md`:

- Mark Phase 3 as ✅ Done
- Note the exact base URL / prefix used in the API (confirm `/api/v1/profiles/...` is correct)
- Document any route registration pattern differences you discovered vs what the context assumed
