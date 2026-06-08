import fp from "fastify-plugin";
import * as mappingService from "../services/mapping.service";

export default fp(async (fastify) => {
  fastify.get("/mappings", async () => mappingService.listMappings());

  fastify.post("/mappings", async (req, reply) => {
    const mapping = mappingService.createMapping(req.body as Parameters<typeof mappingService.createMapping>[0]);
    return reply.code(201).send(mapping);
  });

  fastify.put("/mappings", async (req, reply) => {
    const { tmdb_id, ...patch } = req.body as { tmdb_id: number } & Record<string, unknown>;
    const updated = mappingService.updateMapping(Number(tmdb_id), patch);
    if (!updated)
      return reply.code(404).send({ error: { code: "not_found", message: "Mapping not found" } });
    return { ok: true };
  });

  fastify.delete("/mappings", async (req, reply) => {
    const { tmdb_id } = req.body as { tmdb_id: number };
    const deleted = mappingService.deleteMapping(Number(tmdb_id));
    if (!deleted)
      return reply.code(404).send({ error: { code: "not_found", message: "Mapping not found" } });
    return { ok: true };
  });
});
