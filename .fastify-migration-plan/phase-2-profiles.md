# Phase 2 — Profiles Routes

## Goal
Migrate profile management endpoints from Next.js to Fastify. The frontend continues to work unchanged via the rewrite bridge.

## Routes to migrate
| Method | Next.js path | Fastify path |
|--------|-------------|-------------|
| GET    | /api/profiles | /profiles |
| POST   | /api/profiles | /profiles |
| PATCH  | /api/profiles/[id] | /profiles/:id |
| DELETE | /api/profiles/[id] | /profiles/:id |
| POST   | /api/profiles/[id]/select | /profiles/:id/select |

## Files to create

### `apps/api/src/services/profile.service.ts`
Pure functions, no framework imports. Extract DB logic from the Next.js route handlers:

```typescript
import { db, profiles, profilePreferences } from "@owlite/db";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Profile } from "@owlite/types";

export function listProfiles(): Profile[] {
  return db.select().from(profiles).orderBy(asc(profiles.createdAt)).all();
}

export function getProfileById(id: string): Profile | undefined {
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

export function createProfile(name: string): Profile {
  const id = randomUUID();
  const avatarSeed = randomUUID();
  const createdAt = new Date();
  db.insert(profiles).values({ id, name: name.trim(), avatarSeed, createdAt }).run();
  return { id, name: name.trim(), avatarSeed, createdAt: createdAt.getTime() };
}

export function updateProfile(id: string, patch: { name?: string; avatarSeed?: string }): boolean {
  const result = db.update(profiles).set(patch).where(eq(profiles.id, id)).run();
  return result.changes > 0;
}

export function deleteProfile(id: string): boolean {
  const result = db.delete(profiles).where(eq(profiles.id, id)).run();
  return result.changes > 0;
}
```

### `apps/api/src/routes/profiles.ts`
Fastify plugin with all 5 routes:

```typescript
import fp from "fastify-plugin";
import { z } from "zod";
import { listProfiles, createProfile, updateProfile, deleteProfile, getProfileById } from "../services/profile.service";

const createBodySchema = z.object({ name: z.string().min(1).trim() });
const updateBodySchema = z.object({
  name: z.string().min(1).trim().optional(),
  avatarSeed: z.string().optional(),
});

export default fp(async (fastify) => {
  fastify.get("/profiles", async () => listProfiles());

  fastify.post("/profiles", {
    schema: { body: createBodySchema },
  }, async (req, reply) => {
    const profile = createProfile((req.body as any).name);
    return reply.code(201).send(profile);
  });

  fastify.patch("/profiles/:id", {
    schema: { body: updateBodySchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = updateProfile(id, req.body as any);
    if (!updated) return reply.code(404).send({ error: { code: "not_found", message: "Profile not found" } });
    return { ok: true };
  });

  fastify.delete("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteProfile(id);
    if (!deleted) return reply.code(404).send({ error: { code: "not_found", message: "Profile not found" } });
    return { ok: true };
  });

  fastify.post("/profiles/:id/select", async (req, reply) => {
    const { id } = req.params as { id: string };
    const profile = getProfileById(id);
    if (!profile) return reply.code(404).send({ error: { code: "not_found", message: "Profile not found" } });
    reply.setCookie("owlite_profile", id, { path: "/", httpOnly: false, sameSite: "lax" });
    return profile;
  });
});
```

### `apps/api/src/routes/index.ts`
Central route registration file (start it here; other phases add to it):

```typescript
import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(profilesPlugin);
}
```

## Files to modify

- **`apps/api/src/index.ts`** — call `registerRoutes(server)` after plugin registration
- **`apps/api/src/index.ts`** — ensure `@fastify/cookie` is registered before routes (already done in Phase 1)

## Files to delete (after verification)
- `apps/owlite/app/api/profiles/route.ts`
- `apps/owlite/app/api/profiles/[id]/route.ts`
- `apps/owlite/app/api/profiles/[id]/select/route.ts`

Only delete after confirming the rewrite + Fastify path works end-to-end.

## Frontend API client additions

Add to `apps/owlite/services/api-client.ts`:
```typescript
profiles: {
  list: () => request<Profile[]>("GET", url("/profiles")),
  create: (name: string) => request<Profile>("POST", url("/profiles"), { name }),
  update: (id: string, patch: { name?: string; avatarSeed?: string }) =>
    request<{ ok: boolean }>("PATCH", url(`/profiles/${id}`), patch),
  delete: (id: string) => request<{ ok: boolean }>("DELETE", url(`/profiles/${id}`)),
  select: (id: string) => request<Profile>("POST", url(`/profiles/${id}/select`)),
},
```

Keep `apps/owlite/services/profile.service.ts` unchanged — it still calls `/api/profiles` which the rewrite forwards to Fastify.

## Verification
- `GET http://localhost:8080/profiles` returns JSON array
- Create / update / delete profile via browser UI works
- Profile select sets `owlite_profile` cookie
- `pnpm typecheck` passes
- Deleting the Next.js route files does not break anything
