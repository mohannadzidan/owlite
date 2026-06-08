import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";
import profileDataPlugin from "./profile-data";
import subtitlesPlugin from "./subtitles";
import mediaPlugin from "./media";
import mappingsPlugin from "./mappings";
import observabilityPlugin from "./observability";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(profilesPlugin);
  await fastify.register(profileDataPlugin, { prefix: "/profile" });
  await fastify.register(subtitlesPlugin);
  await fastify.register(mediaPlugin);
  await fastify.register(mappingsPlugin);
  await fastify.register(observabilityPlugin);
}
