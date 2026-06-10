import cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export default fp(async function cookiesPlugin(server: FastifyInstance) {
  await server.register(cookie);
});
