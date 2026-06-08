import fp from "fastify-plugin";

export default fp(async (fastify) => {
  fastify.post("/client-errors", async (req, reply) => {
    fastify.log.error({ source: "client", payload: req.body }, "Client error reported");
    return reply.code(204).send();
  });

  fastify.post("/client-logs", async (req, reply) => {
    fastify.log.info({ source: "client", payload: req.body }, "Client log reported");
    return reply.code(204).send();
  });
});
