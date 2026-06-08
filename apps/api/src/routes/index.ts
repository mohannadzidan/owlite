import { FastifyInstance } from "fastify";
import profilesPlugin from "./profiles";
import profileDataPlugin from "./profile-data";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(profilesPlugin);
  await fastify.register(profileDataPlugin);
}
