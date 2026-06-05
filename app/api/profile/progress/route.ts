import { db } from "@/db";
import { profileProgress } from "@/db/schema";
import { ProgressRecord } from "@/lib/profile-types";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId() {
  const cookieStore = await cookies();
  return cookieStore.get("owlite_profile")?.value ?? null;
}

function buildWhere(profileId: string, tmdbId: number, season?: number, episode?: number) {
  const conditions = [
    eq(profileProgress.profileId, profileId),
    eq(profileProgress.tmdbId, tmdbId),
    season !== undefined ? eq(profileProgress.season, season) : isNull(profileProgress.season),
    episode !== undefined ? eq(profileProgress.episode, episode) : isNull(profileProgress.episode),
  ];
  return and(...conditions);
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
    .from(profileProgress)
    .where(buildWhere(profileId, tmdbId, season, episode))
    .get();

  if (!row) return NextResponse.json(null);
  return NextResponse.json({ total: row.total, watched: row.watched } satisfies ProgressRecord);
}

export async function PATCH(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const season = searchParams.has("season") ? Number(searchParams.get("season")) : undefined;
  const episode = searchParams.has("episode") ? Number(searchParams.get("episode")) : undefined;

  const update = (await request.json()) as Partial<ProgressRecord>;
  const now = new Date();

  const existing = await db
    .select()
    .from(profileProgress)
    .where(buildWhere(profileId, tmdbId, season, episode))
    .get();

  if (existing) {
    await db
      .update(profileProgress)
      .set({
        ...(update.total !== undefined ? { total: update.total } : {}),
        ...(update.watched !== undefined ? { watched: update.watched } : {}),
        updatedAt: now,
      })
      .where(buildWhere(profileId, tmdbId, season, episode));
  } else {
    await db.insert(profileProgress).values({
      profileId,
      tmdbId,
      season: season ?? null,
      episode: episode ?? null,
      total: update.total ?? 0,
      watched: update.watched ?? 0,
      updatedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
