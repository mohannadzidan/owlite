import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import corsPlugin from "./plugins/cors";
import cookiesPlugin from "./plugins/cookies";
import errorHandlerPlugin from "./plugins/error-handler";
import socketIoPlugin from "./plugins/socket-io";

const server = fastify({ logger: true });

server.register(fastifyIO, {
  path: "/api/socket.io",
  cors: { origin: "*" },
});

server.register(corsPlugin);
server.register(cookiesPlugin);
server.register(errorHandlerPlugin);
server.register(socketIoPlugin);

server.listen({ port: 8080, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
