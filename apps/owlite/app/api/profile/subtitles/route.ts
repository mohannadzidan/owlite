import { db } from "@/db";
import { profileSubtitles } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId() {
  const cookieStore = await cookies();
  return cookieStore.get("owlite_profile")?.value ?? null;
}

function buildWhere(profileId: string, tmdbId: number, season?: number, episode?: number) {
  return and(
    eq(profileSubtitles.profileId, profileId),
    eq(profileSubtitles.tmdbId, tmdbId),
    season !== undefined ? eq(profileSubtitles.season, season) : isNull(profileSubtitles.season),
    episode !== undefined
      ? eq(profileSubtitles.episode, episode)
      : isNull(profileSubtitles.episode),
  );
}

export async function GET(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const season = searchParams.has("season") ? Number(searchParams.get("season")) : undefined;
  const episode = searchParams.has("episode") ? Number(searchParams.get("episode")) : undefined;

  const row = await db
    .select()
    .from(profileSubtitles)
    .where(buildWhere(profileId, tmdbId, season, episode))
    .get();

  return NextResponse.json(row?.subtitleUrl ?? null);
}

export async function PATCH(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const season = searchParams.has("season") ? Number(searchParams.get("season")) : undefined;
  const episode = searchParams.has("episode") ? Number(searchParams.get("episode")) : undefined;

  const { subtitleUrl } = (await request.json()) as { subtitleUrl: string };

  await db
    .insert(profileSubtitles)
    .values({
      profileId,
      tmdbId,
      season: season ?? null,
      episode: episode ?? null,
      subtitleUrl,
    })
    .onConflictDoUpdate({
      target: [
        profileSubtitles.profileId,
        profileSubtitles.tmdbId,
        profileSubtitles.season,
        profileSubtitles.episode,
      ],
      set: { subtitleUrl },
    });

  return NextResponse.json({ ok: true });
}
