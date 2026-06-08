import fp from "fastify-plugin";
import { requireProfile } from "../hooks/require-profile";
import * as profileService from "../services/profile.service";

export default fp(async (fastify) => {
  fastify.addHook("onRequest", async (request, reply) => {
    // Custom logic (e.g., checking tokens, adding custom logs, etc.)
    request.log.info("Running custom hook!");
  });
  fastify.get("/profile/preferences", async (req) => profileService.getPreferences(req.profileId));

  fastify.patch("/profile/preferences", async (req) => {
    profileService.patchPreferences(req.profileId, req.body as Record<string, unknown>);
    return { ok: true };
  });

  fastify.get("/profile/progress", async (req) => {
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    return profileService.getProgress(
      req.profileId,
      Number(tmdbId),
      season !== undefined ? Number(season) : undefined,
      episode !== undefined ? Number(episode) : undefined,
    );
  });

  fastify.patch("/profile/progress", async (req) => {
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    profileService.patchProgress(
      req.profileId,
      Number(tmdbId),
      season !== undefined ? Number(season) : undefined,
      episode !== undefined ? Number(episode) : undefined,
      req.body as Record<string, unknown>,
    );
    return { ok: true };
  });

  fastify.get("/profile/continue-watching", async (req) =>
    profileService.getContinueWatching(req.profileId),
  );

  fastify.post("/profile/continue-watching", async (req) => {
    profileService.addContinueWatching(req.profileId, req.body as never);
    return { ok: true };
  });

  fastify.delete("/profile/continue-watching", async (req) => {
    const { tmdbId } = req.query as { tmdbId: string };
    profileService.removeContinueWatching(req.profileId, Number(tmdbId));
    return { ok: true };
  });

  fastify.get("/profile/subtitles", async (req) => {
    const { tmdbId, season, episode } = req.query as {
      tmdbId: string;
      season?: string;
      episode?: string;
    };
    const subtitleUrl = profileService.getProfileSubtitles(
      req.profileId,
      Number(tmdbId),
      season !== undefined ? Number(season) : undefined,
      episode !== undefined ? Number(episode) : undefined,
    );
    return { subtitleUrl };
  });

  fastify.patch("/profile/subtitles", async (req) => {
    const { tmdbId, season, episode, subtitleUrl } = req.body as {
      tmdbId: number;
      season?: number;
      episode?: number;
      subtitleUrl: string;
    };
    profileService.saveProfileSubtitles(req.profileId, tmdbId, season, episode, subtitleUrl);
    return { ok: true };
  });
});
