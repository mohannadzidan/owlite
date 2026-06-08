# Phase 5 — Media Routes

## Goal
Migrate media source resolution, playback, local file streaming, and HLS proxy endpoints. The sources plugin registry (currently in `apps/owlite/lib/sources/`) must move to `apps/api` since source resolution must happen server-side.

## Routes to migrate
| Method | Next.js path | Fastify path |
|--------|-------------|-------------|
| GET    | /api/sources | /sources |
| POST   | /api/play | /play |
| GET    | /api/stream | /stream |
| GET    | /api/hls-proxy | /hls-proxy |
| GET    | /api/hls-segment | /hls-segment |

## Files to move

### Move sources registry to `apps/api`
- Move `apps/owlite/lib/sources/` → `apps/api/src/lib/sources/`
  - This includes the registry file and all individual source plugin files (e.g. `streamimdb.ts`, `local.ts`)
- Move `apps/owlite/services/streamimdb.service.ts` → `apps/api/src/services/streamimdb.service.ts`
- The `VideoSource` and `ResolveParams` types currently in `apps/owlite/lib/types.ts` should be **moved to `packages/types/src/media.ts`** so both frontend and backend can use them

## Files to create

### `apps/api/src/services/media.service.ts`
```typescript
import { sourcesRegistry } from "../lib/sources/registry";
import type { ResolveParams, PlayResponse } from "@owlite/types";

export function listSources(tmdbId: number, mediaType: "movie" | "tv") {
  return sourcesRegistry
    .filter(source => source.has({ tmdb_id: tmdbId, media_type: mediaType }))
    .map(source => ({ id: source.id, name: source.name }));
}

export async function resolveMedia(sourceId: string, params: ResolveParams): Promise<PlayResponse> {
  const source = sourcesRegistry.find(s => s.id === sourceId);
  if (!source) throw Object.assign(new Error("Source not found"), { statusCode: 404 });
  return source.resolve(params);
}
```

### `apps/api/src/routes/media.ts`
```typescript
import fp from "fastify-plugin";
import fs from "fs";
import path from "path";
import * as mediaService from "../services/media.service";

export default fp(async (fastify) => {

  // GET /sources?tmdb_id=&media_type=
  fastify.get("/sources", async (req) => {
    const { tmdb_id, media_type } = req.query as any;
    return mediaService.listSources(Number(tmdb_id), media_type);
  });

  // POST /play
  fastify.post("/play", async (req, reply) => {
    const { source_id, ...params } = req.body as any;
    try {
      const result = await mediaService.resolveMedia(source_id, params);
      return result;
    } catch (err: any) {
      if (err.statusCode === 404)
        return reply.code(404).send({ error: { code: "not_found", message: err.message } });
      if (err.message?.includes("resolve"))
        return reply.code(422).send({ error: { code: "could_not_resolve", message: err.message } });
      throw err;
    }
  });

  // GET /stream?path=  — local file streaming with Range support
  fastify.get("/stream", async (req, reply) => {
    const { path: filePath } = req.query as any;
    // Security: ensure path is under allowed roots (read from env/config)
    if (!isAllowedPath(filePath)) {
      return reply.code(403).send({ error: { code: "bad_request", message: "Forbidden" } });
    }
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: { code: "not_found", message: "File not found" } });
    }
    const stat = fs.statSync(filePath);
    const rangeHeader = req.headers.range;
    const mimeType = getMimeType(filePath); // detect from extension

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      reply.code(206).headers({
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": mimeType,
      });
      return reply.send(fs.createReadStream(filePath, { start, end }));
    }

    reply.headers({ "Content-Type": mimeType, "Accept-Ranges": "bytes", "Content-Length": stat.size });
    return reply.send(fs.createReadStream(filePath));
  });

  // GET /hls-proxy?url=  — proxy HLS master manifest, rewrite segment URLs
  fastify.get("/hls-proxy", async (req, reply) => {
    const { url: manifestUrl } = req.query as any;
    const response = await fetch(manifestUrl as string, { headers: getProxyHeaders(manifestUrl) });
    if (!response.ok) return reply.code(502).send({ error: { code: "internal_server_error", message: "Upstream error" } });
    let manifest = await response.text();
    // Rewrite segment URLs to point through /hls-segment proxy
    manifest = rewriteManifest(manifest, manifestUrl);
    reply.headers({ "Content-Type": "application/vnd.apple.mpegurl" });
    return reply.send(manifest);
  });

  // GET /hls-segment?url=  — proxy HLS segments with Range passthrough
  fastify.get("/hls-segment", async (req, reply) => {
    const { url: segmentUrl } = req.query as any;
    const headers = getProxyHeaders(segmentUrl);
    if (req.headers.range) headers["Range"] = req.headers.range;
    const response = await fetch(segmentUrl as string, { headers });
    reply.code(response.ok ? 200 : response.status);
    response.headers.forEach((value, key) => {
      if (["content-type", "content-length", "content-range", "accept-ranges"].includes(key))
        reply.header(key, value);
    });
    return reply.send(Buffer.from(await response.arrayBuffer()));
  });
});
```

Utility functions `isAllowedPath`, `getMimeType`, `rewriteManifest`, `getProxyHeaders` are extracted from the current Next.js handlers.

## Files to modify

- **`apps/api/src/routes/index.ts`** — add `await fastify.register(mediaPlugin)`
- **`packages/types/src/media.ts`** — add `VideoSource` and `ResolveParams` interfaces (moved from `apps/owlite/lib/types.ts`)
- **`packages/types/src/index.ts`** — export the new types
- **`apps/owlite/lib/types.ts`** — re-export `VideoSource` and `ResolveParams` from `@owlite/types` to preserve any existing imports

## Files to delete (after verification)
- `apps/owlite/app/api/sources/route.ts`
- `apps/owlite/app/api/play/route.ts`
- `apps/owlite/app/api/stream/route.ts`
- `apps/owlite/app/api/hls-proxy/route.ts`
- `apps/owlite/app/api/hls-segment/route.ts`
- `apps/owlite/lib/sources/` (moved to apps/api)
- `apps/owlite/services/streamimdb.service.ts` (moved to apps/api)

## Frontend API client additions

Add to `apps/owlite/services/api-client.ts`:
```typescript
media: {
  sources: (tmdbId: number, mediaType: "movie" | "tv") =>
    request("GET", url(`/sources?tmdb_id=${tmdbId}&media_type=${mediaType}`)),
  play: (params: { source_id: string } & ResolveParams) =>
    request<PlayResponse>("POST", url("/play"), params),
  streamUrl: (filePath: string) => url(`/stream?path=${encodeURIComponent(filePath)}`),
  hlsProxyUrl: (manifestUrl: string) => url(`/hls-proxy?url=${encodeURIComponent(manifestUrl)}`),
},
```

## Verification
- `GET /sources?tmdb_id=550&media_type=movie` returns list of available sources
- `POST /play` with valid params returns a `PlayResponse` (direct_video or hls)
- Local file stream: seek to a timestamp using Range header, confirm 206 response
- HLS stream plays from start to end in the player without buffering errors
- `pnpm typecheck` passes
