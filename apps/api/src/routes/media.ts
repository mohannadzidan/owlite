import fp from "fastify-plugin";
import fs from "fs";
import path from "path";
import * as mediaService from "../services/media.service";
import type { ResolveParams } from "@owlite/types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ALLOWED_ROOTS = (process.env.MEDIA_ROOTS ?? "").split(",").filter(Boolean);

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
};

interface ProxyPayload {
  u: string;
  r: string;
}

function isSafePath(filePath: string): boolean {
  if (ALLOWED_ROOTS.length === 0) return true;
  const resolved = path.resolve(filePath);
  return ALLOWED_ROOTS.some((root) => resolved.startsWith(path.resolve(root)));
}

function decode(p: string): ProxyPayload | null {
  try {
    return JSON.parse(Buffer.from(p, "base64url").toString("utf-8")) as ProxyPayload;
  } catch {
    return null;
  }
}

function encode(u: string, r: string): string {
  return Buffer.from(JSON.stringify({ u, r })).toString("base64url");
}

export default fp(async (fastify) => {
  // GET /sources
  fastify.get("/sources", async () => {
    return mediaService.listSources();
  });

  // POST /play
  fastify.post("/play", async (req, reply) => {
    const body = req.body as { source_id: string } & ResolveParams;
    const userAgent = req.headers["user-agent"] ?? "";
    const { source_id, ...resolveParams } = body;

    if (!source_id) {
      return reply
        .code(400)
        .send({ error: { code: "bad_request", message: "source_id required" } });
    }

    try {
      const result = await mediaService.resolveMedia(source_id, {
        ...(resolveParams as ResolveParams),
        userAgent,
      });
      return result;
    } catch (err: any) {
      if (err.statusCode === 404)
        return reply.code(404).send({ error: { code: "not_found", message: err.message } });
      if (err.statusCode === 422)
        return reply
          .code(422)
          .send({ error: { code: "could_not_resolve", message: err.message } });
      throw err;
    }
  });

  // GET /stream?path= — local file streaming with Range support
  fastify.get("/stream", async (req, reply) => {
    const { path: filePath } = req.query as { path?: string };

    if (!filePath) {
      return reply.code(400).send({ error: { code: "bad_request", message: "Missing path" } });
    }
    if (!isSafePath(filePath)) {
      return reply.code(403).send({ error: { code: "forbidden", message: "Forbidden" } });
    }
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: { code: "not_found", message: "File not found" } });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      reply.code(206).headers({
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
      });
      return reply.send(fs.createReadStream(filePath, { start, end }));
    }

    reply.headers({
      "Content-Length": String(stat.size),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    return reply.send(fs.createReadStream(filePath));
  });

  // GET /hls-proxy?p= — proxy HLS master manifest, rewrite segment URLs
  fastify.get("/hls-proxy", async (req, reply) => {
    const { p } = req.query as { p?: string };
    if (!p) return reply.code(400).send("Missing p");

    const data = decode(p);
    if (!data?.u) return reply.code(400).send("Bad request");

    const { u: manifestUrl, r: referer } = data;

    let upstream: Response;
    try {
      upstream = await fetch(manifestUrl, {
        headers: {
          "User-Agent": UA,
          ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return reply.code(502).send("Proxy fetch failed");
    }

    if (!upstream.ok) return reply.code(upstream.status).send("CDN error");

    const body = await upstream.text();
    const rewritten = body
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return line;
        let abs: string;
        try {
          abs = new URL(t, manifestUrl).href;
        } catch {
          abs = t;
        }
        const enc = encode(abs, referer);
        return abs.includes(".m3u8") ? `/api/hls-proxy?p=${enc}` : `/api/hls-segment?p=${enc}`;
      })
      .join("\n");

    reply.headers({
      "Content-Type": "application/x-mpegURL",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    return reply.send(rewritten);
  });

  // GET /hls-segment?p= — proxy HLS segments with Range passthrough
  fastify.get("/hls-segment", async (req, reply) => {
    const { p } = req.query as { p?: string };
    if (!p) return reply.code(400).send("Missing p");

    const data = decode(p);
    if (!data?.u) return reply.code(400).send("Bad request");

    const { u: segmentUrl, r: referer } = data;
    const rangeHeader = req.headers.range;

    let upstream: Response;
    try {
      upstream = await fetch(segmentUrl, {
        headers: {
          "User-Agent": UA,
          ...(referer ? { Referer: referer, Origin: "https://brightpathsignals.com" } : {}),
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return reply.code(502).send("Proxy fetch failed");
    }

    if (!upstream.ok && upstream.status !== 206) {
      return reply.code(upstream.status).send("CDN error");
    }

    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) reply.header(h, v);
    }
    if (!upstream.headers.has("accept-ranges")) reply.header("accept-ranges", "bytes");
    reply.header("Access-Control-Allow-Origin", "*");

    reply.code(upstream.status);
    return reply.send(Buffer.from(await upstream.arrayBuffer()));
  });
});
