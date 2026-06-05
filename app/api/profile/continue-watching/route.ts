import { db } from "@/db";
import { profileContinueWatching } from "@/db/schema";
import { ContinueWatchingEntry } from "@/lib/profile-types";
import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId() {
  const cookieStore = await cookies();
  return cookieStore.get("owlite_profile")?.value ?? null;
}

function rowToEntry(row: typeof profileContinueWatching.$inferSelect): ContinueWatchingEntry {
  const base = {
    id: row.tmdbId,
    lastWatch: row.lastWatch,
    name: row.name,
    overview: row.overview,
    backdrop_path: row.backdropPath,
    poster_path: row.posterPath ?? undefined,
  };
  if (row.type === "tv") {
    return { ...base, type: "tv", season: row.season!, episode: row.episode! };
  }
  return { ...base, type: "movie", poster_path: row.posterPath ?? null };
}

export async function GET() {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(profileContinueWatching)
    .where(eq(profileContinueWatching.profileId, profileId))
    .orderBy(desc(profileContinueWatching.lastWatch));

  return NextResponse.json(rows.map(rowToEntry));
}

export async function POST(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = (await request.json()) as ContinueWatchingEntry;

  await db
    .insert(profileContinueWatching)
    .values({
      profileId,
      tmdbId: entry.id,
      type: entry.type,
      lastWatch: entry.lastWatch,
      name: entry.name,
      overview: entry.overview,
      backdropPath: entry.backdrop_path,
      posterPath: entry.poster_path ?? null,
      season: entry.type === "tv" ? entry.season : null,
      episode: entry.type === "tv" ? entry.episode : null,
    })
    .onConflictDoUpdate({
      target: [profileContinueWatching.profileId, profileContinueWatching.tmdbId],
      set: {
        type: entry.type,
        lastWatch: entry.lastWatch,
        name: entry.name,
        overview: entry.overview,
        backdropPath: entry.backdrop_path,
        posterPath: entry.poster_path ?? null,
        season: entry.type === "tv" ? entry.season : null,
        episode: entry.type === "tv" ? entry.episode : null,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get("tmdbId"));

  await db
    .delete(profileContinueWatching)
    .where(
      and(
        eq(profileContinueWatching.profileId, profileId),
        eq(profileContinueWatching.tmdbId, tmdbId),
      ),
    );

  return NextResponse.json({ ok: true });
}
