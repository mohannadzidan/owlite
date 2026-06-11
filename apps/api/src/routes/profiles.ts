import { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../services/profile.service";
import * as profileService from "../services/profile.service";
import { getRecommendations } from "../services/recommendations.service";

const createBodySchema = z.object({ name: z.string().min(1).trim() });
const updateBodySchema = z.object({
  name: z.string().min(1).trim().optional(),
  avatarSeed: z.string().optional(),
});

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ error: { code: "not_found", message: "Profile not found" } });
}

export default async function (fastify: FastifyInstance) {
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
    if (!updated) return notFound(reply);
    return { ok: true };
  });

  fastify.delete("/profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteProfile(id);
    if (!deleted) return notFound(reply);
    return { ok: true };
  });

  // Profile-scoped data routes — profileId in path, no cookie dependency

  fastify.get("/profiles/:profileId/preferences", async (req) => {
    const { profileId } = req.params as { profileId: string };
    return profileService.getPreferences(profileId);
  });

  fastify.patch("/profiles/:profileId/preferences", async (req) => {
    const { profileId } = req.params as { profileId: string };
    profileService.patchPreferences(profileId, req.body as Record<string, unknown>);
    return { ok: true };
  });

  fastify.get("/profiles/:profileId/progress", async (req) => {
    const { profileId } = req.params as { profileId: string };
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    return profileService.getProgress(
      profileId,
      Number(tmdbId),
      !isNaN(Number(season)) ? Number(season) : undefined,
      !isNaN(Number(episode)) ? Number(episode) : undefined,
    );
  });

  fastify.patch("/profiles/:profileId/progress", async (req) => {
    const { profileId } = req.params as { profileId: string };
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    profileService.patchProgress(
      profileId,
      Number(tmdbId),
      !isNaN(Number(season)) ? Number(season) : undefined,
      !isNaN(Number(episode)) ? Number(episode) : undefined,
      req.body as Record<string, unknown>,
    );
    return { ok: true };
  });

  fastify.get("/profiles/:profileId/continue-watching", async (req) => {
    const { profileId } = req.params as { profileId: string };
    return profileService.getContinueWatching(profileId);
  });

  fastify.post("/profiles/:profileId/continue-watching", async (req) => {
    const { profileId } = req.params as { profileId: string };
    profileService.addContinueWatching(profileId, req.body as never);
    return { ok: true };
  });

  fastify.delete("/profiles/:profileId/continue-watching", async (req) => {
    const { profileId } = req.params as { profileId: string };
    const { tmdbId } = req.query as { tmdbId: string };
    profileService.removeContinueWatching(profileId, Number(tmdbId));
    return { ok: true };
  });

  fastify.get("/profiles/:profileId/subtitles", async (req) => {
    const { profileId } = req.params as { profileId: string };
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    const subtitleUrl = profileService.getProfileSubtitles(
      profileId,
      Number(tmdbId),
      !isNaN(Number(season)) ? Number(season) : undefined,
      !isNaN(Number(episode)) ? Number(episode) : undefined,
    );
    return { subtitleUrl };
  });

  fastify.get("/profiles/:profileId/recommendations", async (req) => {
    const { profileId } = req.params as { profileId: string };
    try {
      return await getRecommendations(profileId);
    } catch {
      return { becauseYouWatched: [], topPicks: [], topCategories: [] };
    }
  });

  fastify.patch("/profiles/:profileId/subtitles", async (req) => {
    const { profileId } = req.params as { profileId: string };
    const { tmdbId, season, episode, subtitleUrl } = req.body as {
      tmdbId: number;
      season?: number;
      episode?: number;
      subtitleUrl: string;
    };
    profileService.saveProfileSubtitles(profileId, tmdbId, season, episode, subtitleUrl);
    return { ok: true };
  });
}
