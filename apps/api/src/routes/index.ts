import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";
import profileDataPlugin from "./profile-data";
import subtitlesPlugin from "./subtitles";
import mediaPlugin from "./media";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(profilesPlugin);
  await fastify.register(profileDataPlugin);
  await fastify.register(subtitlesPlugin);
  await fastify.register(mediaPlugin);
}
