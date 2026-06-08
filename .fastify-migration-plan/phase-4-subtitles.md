# Phase 4 — Subtitles Routes

## Goal
Migrate all subtitle-related endpoints. This phase involves file I/O, multipart uploads, external API calls (OpenSubtitles), and HTTP Range request streaming.

## Routes to migrate
| Method | Next.js path | Fastify path |
|--------|-------------|-------------|
| GET    | /api/subtitles/list | /subtitles/list |
| PATCH  | /api/subtitles/list | /subtitles/list |
| DELETE | /api/subtitles/list | /subtitles/list |
| POST   | /api/subtitles/search | /subtitles/search |
| GET    | /api/subtitles/download | /subtitles/download |
| GET    | /api/subtitles/stream | /subtitles/stream |
| POST   | /api/subtitles/upload | /subtitles/upload |

## Files to move/create

### Move service files to `apps/api`
- Move `apps/owlite/services/opensubtitles.service.ts` → `apps/api/src/services/opensubtitles.service.ts` (no logic changes)

### `apps/api/src/services/subtitle.service.ts`
Extract all DB + file I/O logic from the Next.js handlers. Key functions:

```typescript
// List subtitles for a tmdb item
export function listSubtitles(tmdbId: number, season?: number, episode?: number): SubtitleRow[] { ... }

// Toggle favorite flag on a subtitle
export function setFavorite(id: number, isFavorite: boolean): void { ... }

// Delete subtitle record + file from disk
export function deleteSubtitle(id: number): void { ... }

// Search: local DB first, then OpenSubtitles API
export async function searchSubtitles(params: SubtitleSearchParams): Promise<SubtitleTrack[]> { ... }

// Download from OpenSubtitles: fetch → convert SRT→VTT → write to cache → insert DB record
export async function downloadSubtitle(fileId: number): Promise<{ cacheKey: string }> { ... }

// Return the absolute path to a cached subtitle file (validated against CACHE_DIR)
export function resolveSubtitleCachePath(cacheKey: string): string { ... }

// Validate + persist an uploaded subtitle file
export async function uploadSubtitle(params: UploadParams): Promise<SubtitleRow> { ... }
```

The cache directory path: `path.join(process.cwd(), "cache", "subtitles")` — same as in the Next.js handlers.

### `apps/api/src/routes/subtitles.ts`

```typescript
import fp from "fastify-plugin";
import fs from "fs";
import path from "path";
import * as subtitleService from "../services/subtitle.service";

export default fp(async (fastify) => {

  // GET /subtitles/list?tmdb_id=&season=&episode=
  fastify.get("/subtitles/list", async (req) => {
    const { tmdb_id, season, episode } = req.query as any;
    return subtitleService.listSubtitles(Number(tmdb_id), season ? Number(season) : undefined, episode ? Number(episode) : undefined);
  });

  // PATCH /subtitles/list  (toggle favorite)
  fastify.patch("/subtitles/list", async (req) => {
    const { id, isFavorite } = req.body as any;
    subtitleService.setFavorite(Number(id), Boolean(isFavorite));
    return { ok: true };
  });

  // DELETE /subtitles/list
  fastify.delete("/subtitles/list", async (req) => {
    const { id } = req.body as any;
    subtitleService.deleteSubtitle(Number(id));
    return { ok: true };
  });

  // POST /subtitles/search
  fastify.post("/subtitles/search", async (req) => {
    return subtitleService.searchSubtitles(req.body as any);
  });

  // GET /subtitles/download?file_id=
  fastify.get("/subtitles/download", async (req, reply) => {
    const { file_id } = req.query as any;
    const result = await subtitleService.downloadSubtitle(Number(file_id));
    return reply.code(201).send(result);
  });

  // GET /subtitles/stream?cache_key=  — Range-aware file streaming
  fastify.get("/subtitles/stream", async (req, reply) => {
    const { cache_key } = req.query as any;
    const filePath = subtitleService.resolveSubtitleCachePath(cache_key);
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: { code: "not_found", message: "Subtitle not found" } });
    }
    const stat = fs.statSync(filePath);
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      reply.code(206).headers({
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "text/vtt",
      });
      return reply.send(fs.createReadStream(filePath, { start, end }));
    }
    reply.headers({ "Content-Type": "text/vtt", "Accept-Ranges": "bytes" });
    return reply.send(fs.createReadStream(filePath));
  });

  // POST /subtitles/upload  — multipart
  fastify.post("/subtitles/upload", async (req, reply) => {
    const parts = req.parts();
    const fields: Record<string, string> = {};
    const files: Array<{ filename: string; buffer: Buffer }> = [];

    for await (const part of parts) {
      if (part.type === "field") {
        fields[part.fieldname] = part.value as string;
      } else {
        files.push({ filename: part.filename, buffer: await part.toBuffer() });
      }
    }

    const result = await subtitleService.uploadSubtitle({ fields, files });
    return reply.code(201).send(result);
  });
});
```

## Files to modify

- **`apps/api/src/index.ts`** — register `@fastify/multipart` before routes
- **`apps/api/src/routes/index.ts`** — add `await fastify.register(subtitlesPlugin)`

## Files to delete (after verification)
- `apps/owlite/app/api/subtitles/list/route.ts`
- `apps/owlite/app/api/subtitles/search/route.ts`
- `apps/owlite/app/api/subtitles/download/route.ts`
- `apps/owlite/app/api/subtitles/stream/route.ts`
- `apps/owlite/app/api/subtitles/upload/route.ts`
- `apps/owlite/services/opensubtitles.service.ts` (moved to api)

## Frontend API client additions

Add to `apps/owlite/services/api-client.ts`:
```typescript
subtitles: {
  list: (params: { tmdb_id: number; season?: number; episode?: number }) =>
    request("GET", url(`/subtitles/list?${new URLSearchParams(params as any)}`)),
  search: (params: SubtitleSearchParams) =>
    request("POST", url("/subtitles/search"), params),
  downloadUrl: (fileId: number) => url(`/subtitles/download?file_id=${fileId}`),
  streamUrl: (cacheKey: string) => url(`/subtitles/stream?cache_key=${encodeURIComponent(cacheKey)}`),
  upload: (formData: FormData) =>
    fetch(url("/subtitles/upload"), { method: "POST", body: formData }).then(r => r.json()),
  setFavorite: (id: number, isFavorite: boolean) =>
    request("PATCH", url("/subtitles/list"), { id, isFavorite }),
  delete: (id: number) => request("DELETE", url("/subtitles/list"), { id }),
},
```

## Verification
- Upload a `.srt` file → confirm it's stored in `cache/subtitles/` and appears in the list
- Search OpenSubtitles → results returned (or graceful empty if no API key)
- Stream a subtitle in the player → VTT content delivered correctly
- Range request returns 206 with correct Content-Range header
- Favorite toggle updates the DB record
- `pnpm typecheck` passes
