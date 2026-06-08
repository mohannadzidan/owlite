# Phase 6 — Mappings & Observability Routes

## Goal
Migrate the local file-to-TMDB mappings CRUD and the client-side error/log collection endpoints. These are the simplest routes and the last before the cleanup phase.

## Routes to migrate
| Method | Next.js path | Fastify path |
|--------|-------------|-------------|
| GET    | /api/mappings | /mappings |
| POST   | /api/mappings | /mappings |
| PUT    | /api/mappings | /mappings |
| DELETE | /api/mappings | /mappings |
| POST   | /api/client-errors | /client-errors |
| POST   | /api/client-logs | /client-logs |

## Files to create

### `apps/api/src/services/mapping.service.ts`
Wraps the JSON file operations currently in `apps/owlite/app/api/mappings/route.ts`:

```typescript
import fs from "fs";
import path from "path";
import type { LocalMapping } from "@owlite/types";

const MAPPINGS_FILE = path.join(process.cwd(), "data", "local_mappings.json");

function readMappings(): LocalMapping[] {
  if (!fs.existsSync(MAPPINGS_FILE)) return [];
  return JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8")) as LocalMapping[];
}

function writeMappings(mappings: LocalMapping[]): void {
  fs.mkdirSync(path.dirname(MAPPINGS_FILE), { recursive: true });
  fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

export function listMappings(): LocalMapping[] {
  return readMappings();
}

export function createMapping(mapping: LocalMapping): LocalMapping {
  const mappings = readMappings();
  mappings.push(mapping);
  writeMappings(mappings);
  return mapping;
}

export function updateMapping(tmdbId: number, patch: Partial<LocalMapping>): boolean {
  const mappings = readMappings();
  const idx = mappings.findIndex(m => m.tmdb_id === tmdbId);
  if (idx === -1) return false;
  mappings[idx] = { ...mappings[idx], ...patch };
  writeMappings(mappings);
  return true;
}

export function deleteMapping(tmdbId: number): boolean {
  const mappings = readMappings();
  const filtered = mappings.filter(m => m.tmdb_id !== tmdbId);
  if (filtered.length === mappings.length) return false;
  writeMappings(filtered);
  return true;
}
```

### `apps/api/src/routes/mappings.ts`

```typescript
import fp from "fastify-plugin";
import * as mappingService from "../services/mapping.service";

export default fp(async (fastify) => {
  fastify.get("/mappings", async () => mappingService.listMappings());

  fastify.post("/mappings", async (req, reply) => {
    const mapping = mappingService.createMapping(req.body as any);
    return reply.code(201).send(mapping);
  });

  fastify.put("/mappings", async (req, reply) => {
    const { tmdb_id, ...patch } = req.body as any;
    const updated = mappingService.updateMapping(Number(tmdb_id), patch);
    if (!updated) return reply.code(404).send({ error: { code: "not_found", message: "Mapping not found" } });
    return { ok: true };
  });

  fastify.delete("/mappings", async (req, reply) => {
    const { tmdb_id } = req.body as any;
    const deleted = mappingService.deleteMapping(Number(tmdb_id));
    if (!deleted) return reply.code(404).send({ error: { code: "not_found", message: "Mapping not found" } });
    return { ok: true };
  });
});
```

### `apps/api/src/routes/observability.ts`
Simple log/error collection — just writes to stdout/a logger; returns 204 immediately:

```typescript
import fp from "fastify-plugin";

export default fp(async (fastify) => {
  fastify.post("/client-errors", async (req, reply) => {
    fastify.log.error({ source: "client", payload: req.body }, "Client error reported");
    return reply.code(204).send();
  });

  fastify.post("/client-logs", async (req, reply) => {
    fastify.log.info({ source: "client", payload: req.body }, "Client log reported");
    return reply.code(204).send();
  });
});
```

## Types to add

Add `LocalMapping` to `packages/types/src/media.ts` (or a new `packages/types/src/mappings.ts`):
```typescript
export type LocalMapping = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  local_path: string;
  episode_pattern?: string;
};
```
Export from `packages/types/src/index.ts`.

## Files to modify

- **`apps/api/src/routes/index.ts`** — add `await fastify.register(mappingsPlugin)` and `await fastify.register(observabilityPlugin)`

## Files to delete (after verification)
- `apps/owlite/app/api/mappings/route.ts`
- `apps/owlite/app/api/client-errors/route.ts`
- `apps/owlite/app/api/client-logs/route.ts`

## Frontend API client additions

Add to `apps/owlite/services/api-client.ts`:
```typescript
mappings: {
  list: () => request<LocalMapping[]>("GET", url("/mappings")),
  create: (mapping: LocalMapping) => request<LocalMapping>("POST", url("/mappings"), mapping),
  update: (tmdbId: number, patch: Partial<LocalMapping>) =>
    request<{ ok: boolean }>("PUT", url("/mappings"), { tmdb_id: tmdbId, ...patch }),
  remove: (tmdbId: number) => request<{ ok: boolean }>("DELETE", url("/mappings"), { tmdb_id: tmdbId }),
},
observability: {
  reportError: (payload: unknown) => request("POST", url("/client-errors"), payload),
  reportLog: (payload: unknown) => request("POST", url("/client-logs"), payload),
},
```

## Verification
- Create a mapping → appears in list → update it → delete it
- Client error report returns 204 with empty body
- Client log report returns 204 with empty body
- `pnpm typecheck` passes
- All 6 routes respond correctly through the rewrite bridge
