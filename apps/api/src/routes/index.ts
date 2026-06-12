import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";
import subtitlesPlugin from "./subtitles";
import mediaPlugin from "./media";
import mappingsPlugin from "./mappings";
import observabilityPlugin from "./observability";
import tmdbPlugin from "./tmdb";
import tmdbImagesPlugin from "./tmdb-images";

export async function registerRoutes(fastify: FastifyInstance) {
  const opts = { prefix: "/api/v1" };
  await fastify.register(profilesPlugin, opts);
  await fastify.register(subtitlesPlugin, opts);
  await fastify.register(mediaPlugin, opts);
  await fastify.register(mappingsPlugin, opts);
  await fastify.register(observabilityPlugin, opts);
  await fastify.register(tmdbPlugin, opts);
  await fastify.register(tmdbImagesPlugin);
}
