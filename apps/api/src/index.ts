import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
const server = fastify();

server.register(fastifyIO);

server.listen({ port: 8080 }, (err, address) => {

  server.io.on("connection", (socket) => {
    console.log("a user connected");  
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
  
  if (err) {
    console.error(err);
    process.exit(1);
  }

});
