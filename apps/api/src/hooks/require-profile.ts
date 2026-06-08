import { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    profileId: string;
  }
}

export async function requireProfile(req: FastifyRequest, reply: FastifyReply) {
  const profileId = req.cookies?.owlite_profile;
  if (!profileId) {
    return reply
      .code(401)
      .send({ error: { code: "unauthorized", message: "No profile selected" } });
  }
  req.profileId = profileId;
}
