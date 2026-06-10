import cors from "@fastify/cors";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export default fp(async function corsPlugin(server: FastifyInstance) {
  await server.register(cors, { origin: "*" });
});
