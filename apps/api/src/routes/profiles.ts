import fp from "fastify-plugin";
import { z } from "zod";
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getProfileById,
} from "../services/profile.service";

const createBodySchema = z.object({ name: z.string().min(1).trim() });
const updateBodySchema = z.object({
  name: z.string().min(1).trim().optional(),
  avatarSeed: z.string().optional(),
});

export default fp(async (fastify) => {
  fastify.get("/profiles", async () => listProfiles());

  fastify.post("/profiles", async (req, reply) => {
    const body = createBodySchema.parse(req.body);
    const profile = createProfile(body.name);
    return reply.code(201).send(profile);
  });

  fastify.patch("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = updateBodySchema.parse(req.body);
    const updated = updateProfile(id, patch);
    if (!updated)
      return reply
        .code(404)
        .send({ error: { code: "not_found", message: "Profile not found" } });
    return { ok: true };
  });

  fastify.delete("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteProfile(id);
    if (!deleted)
      return reply
        .code(404)
        .send({ error: { code: "not_found", message: "Profile not found" } });
    return { ok: true };
  });

  fastify.post("/profiles/:id/select", async (req, reply) => {
    const { id } = req.params as { id: string };
    const profile = getProfileById(id);
    if (!profile)
      return reply
        .code(404)
        .send({ error: { code: "not_found", message: "Profile not found" } });
    reply.setCookie("owlite_profile", id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
    return profile;
  });
});
