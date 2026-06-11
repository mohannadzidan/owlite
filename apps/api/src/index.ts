import fastify from "fastify";
import fastifyEnv from "@fastify/env";
import fastifyIO from "fastify-socket.io";
import fastifyMultipart from "@fastify/multipart";
import corsPlugin from "./plugins/cors";
import cookiesPlugin from "./plugins/cookies";
import errorHandlerPlugin from "./plugins/error-handler";
import socketIoPlugin from "./plugins/socket-io";
import { registerRoutes } from "./routes";
import { scheduleTmdbCacheCleanup } from "./lib/tmdb-cache";

const server = fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

server.register(fastifyEnv, {
  dotenv: true,
  schema: {
    type: "object",
    required: ["OPENSUBTITLES_API_KEY", "TMDB_API_KEY"],
  },
});

server.register(fastifyIO, {
  path: "/api/v1/socket.io",
  cors: { origin: "*" },
});

server.register(fastifyMultipart);
server.register(corsPlugin);
server.register(cookiesPlugin);
server.register(errorHandlerPlugin);
server.register(socketIoPlugin);

registerRoutes(server);

scheduleTmdbCacheCleanup();

server.listen({ port: 8080, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
