import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import fastifyMultipart from "@fastify/multipart";
import corsPlugin from "./plugins/cors";
import cookiesPlugin from "./plugins/cookies";
import errorHandlerPlugin from "./plugins/error-handler";
import socketIoPlugin from "./plugins/socket-io";
import { registerRoutes } from "./routes";

const server = fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

server.register(fastifyIO, {
  path: "/api/socket.io",
  cors: { origin: "*" },
});

server.register(fastifyMultipart);
server.register(corsPlugin);
server.register(cookiesPlugin);
server.register(errorHandlerPlugin);
server.register(socketIoPlugin);

registerRoutes(server);

server.listen({ port: 8080, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
