import { FastifyInstance } from "fastify";
import fs from "fs";
import "@fastify/multipart";
import * as subtitleService from "../services/subtitle.service";
import { SubtitlesUploadRequest } from "@owlite/types";

export default async function (fastify: FastifyInstance) {
  // GET /subtitles/list?tmdb_id=&season=&episode=
  fastify.get("/subtitles/list", async (req) => {
    const { tmdb_id, season, episode } = req.query as Record<string, string | undefined>;
    if (!tmdb_id) {
      throw Object.assign(new Error("Missing tmdb_id"), { status: 400 });
    }
    return subtitleService.listSubtitles(
      Number(tmdb_id),
      season !== undefined ? Number(season) : undefined,
      episode !== undefined ? Number(episode) : undefined,
    );
  });

  // PATCH /subtitles/list  (toggle favorite)
  fastify.patch("/subtitles/list", async (req) => {
    const body = req.body as
      | { id: number; isFavorite: boolean }
      | { batchId: string; isFavorite: boolean };
    subtitleService.setFavorite(body);
    return { ok: true };
  });

  // DELETE /subtitles/list
  fastify.delete("/subtitles/list", async (req) => {
    const body = req.body as { id?: number; batchId?: string };
    if (!body.id && !body.batchId) {
      throw Object.assign(new Error("Provide id or batchId"), { status: 400 });
    }
    return subtitleService.deleteSubtitle(body);
  });

  // POST /subtitles/search
  fastify.post("/subtitles/search", async (req) => {
    return subtitleService.searchSubtitles(
      req.body as import("../services/subtitle.service").SubtitleSearchParams,
    );
  });

  // GET /subtitles/download?file_id=&tmdb_id=&season=&episode=&language=
  fastify.get("/subtitles/download", async (req, reply) => {
    const { file_id, tmdb_id, season, episode, language } = req.query as Record<
      string,
      string | undefined
    >;
    if (!file_id || !/^\d+$/.test(file_id)) {
      return reply.code(400).send({ error: { code: "bad_request", message: "Invalid file_id" } });
    }
    const result = await subtitleService.downloadSubtitle(Number(file_id), {
      tmdbId: tmdb_id ? Number(tmdb_id) : null,
      season: season ? Number(season) : null,
      episode: episode ? Number(episode) : null,
      language: language ?? null,
    });
    return reply.code(201).send(result);
  });

  // GET /subtitles/stream?cache_key=  — Range-aware file streaming
  fastify.get("/subtitles/stream", async (req, reply) => {
    const { cache_key } = req.query as { cache_key?: string };
    if (!cache_key) {
      return reply.code(400).send({ error: { code: "bad_request", message: "Missing cache_key" } });
    }
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

  // POST /subtitles/upload
  fastify.post("/subtitles/upload", async (req, reply) => {
    const result = await subtitleService.uploadSubtitle(req.body as SubtitlesUploadRequest);
    return reply.code(201).send(result);
  });
}
