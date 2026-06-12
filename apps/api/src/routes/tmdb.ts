import { FastifyInstance } from "fastify";
import { cachedFetch } from "../lib/tmdb-cache";

export default async function tmdbPlugin(fastify: FastifyInstance) {
  fastify.get("/tmdb/*", async (request, reply) => {
    const wildcard = (request.params as { "*": string })["*"];
    const search = request.url.includes("?") ? "?" + request.url.split("?")[1] : "";
    const upstreamUrl = `https://api.themoviedb.org/${wildcard}${search}`;

    const { status, headers, body, fromCache } = await cachedFetch(
      upstreamUrl,
      `Bearer ${process.env.TMDB_API_KEY}`,
    );

    reply
      .status(status)
      .header("Content-Type", headers["content-type"] ?? "application/json")
      .header("x-cache", fromCache ? "HIT" : "MISS")
      .send(body);
  });
}
