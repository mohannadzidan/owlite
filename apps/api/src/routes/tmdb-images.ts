import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs/promises";
import path from "path";

const CACHE_ROOT =
  process.env.TMDB_IMAGE_CACHE_PATH || path.join(process.cwd(), "cache", "tmdb-images");

const ALLOWED_SIZES = new Set([
  "w45",
  "w92",
  "w154",
  "w185",
  "w300",
  "w342",
  "w500",
  "w780",
  "w1280",
  "h632",
  "original",
]);

// Matches TMDB image filenames: alphanumeric/dash/underscore + extension
const FILE_PATH_RE = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|svg|webp)$/;

type ImageParams = { size: string; "*": string };

async function imageHandler(req: FastifyRequest<{ Params: ImageParams }>, reply: FastifyReply) {
  const { size } = req.params;
  const filePath = req.params["*"];

  if (!ALLOWED_SIZES.has(size) || !FILE_PATH_RE.test(filePath)) {
    return reply.code(400).send();
  }

  const finalPath = path.join(CACHE_ROOT, "images", "tmdb", size, filePath);

  // Serve from disk cache on HIT
  try {
    const data = await fs.readFile(finalPath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    return reply
      .header("Content-Type", contentType)
      .header("Cache-Control", "public, max-age=604800")
      .header("x-cache", "HIT")
      .send(data);
  } catch {
    // File not in cache — fall through to fetch
  }

  // MISS: fetch from TMDB and cache atomically
  const upstream = await fetch(`https://image.tmdb.org/t/p/${size}/${filePath}`);
  if (!upstream.ok) return reply.code(502).send();

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  const finalDir = path.dirname(finalPath);
  const tmpPath = `${finalPath}.tmp.${process.pid}.${Date.now()}`;
  try {
    await fs.mkdir(finalDir, { recursive: true });
    await fs.writeFile(tmpPath, buffer, { mode: 0o644 });
    await fs.rename(tmpPath, finalPath);
  } catch {
    await fs.unlink(tmpPath).catch(() => {});
  }

  return reply
    .header("Content-Type", contentType)
    .header("Cache-Control", "public, max-age=604800")
    .header("x-cache", "MISS")
    .send(buffer);
}

export default async function tmdbImagesPlugin(fastify: FastifyInstance) {
  fastify.get<{ Params: ImageParams }>("/images/tmdb/:size/*", imageHandler);
}
