import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";
import profileDataPlugin from "./profile-data";
import subtitlesPlugin from "./subtitles";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(profilesPlugin);
  await fastify.register(profileDataPlugin);
  await fastify.register(subtitlesPlugin);
}
