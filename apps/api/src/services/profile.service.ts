import {
  db,
  profiles,
  profilePreferences,
  profileProgress,
  profileContinueWatching,
  profileSubtitles,
} from "../db/index";
import { eq, asc, and, isNull, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  Profile,
  PreferencesRecord,
  ProgressRecord,
  ContinueWatchingEntry,
} from "@owlite/types";
import { DEFAULT_PREFERENCES } from "@owlite/types";

function toProfile(row: {
  id: string;
  name: string;
  avatarSeed: string;
  createdAt: Date;
}): Profile {
  return { ...row, createdAt: row.createdAt.getTime() };
}

export function listProfiles(): Profile[] {
  return db.select().from(profiles).orderBy(asc(profiles.createdAt)).all().map(toProfile);
}

export function getProfileById(id: string): Profile | undefined {
  const row = db.select().from(profiles).where(eq(profiles.id, id)).get();
  return row ? toProfile(row) : undefined;
}

export function createProfile(name: string): Profile {
  const id = randomUUID();
  const avatarSeed = randomUUID();
  const createdAt = new Date();
  db.insert(profiles).values({ id, name: name.trim(), avatarSeed, createdAt }).run();
  return { id, name: name.trim(), avatarSeed, createdAt: createdAt.getTime() };
}

export function updateProfile(id: string, patch: { name?: string; avatarSeed?: string }): boolean {
  const result = db.update(profiles).set(patch).where(eq(profiles.id, id)).run();
  return result.changes > 0;
}

export function deleteProfile(id: string): boolean {
  const result = db.delete(profiles).where(eq(profiles.id, id)).run();
  return result.changes > 0;
}

// Preferences

export function getPreferences(profileId: string): PreferencesRecord {
  const row = db
    .select()
    .from(profilePreferences)
    .where(eq(profilePreferences.profileId, profileId))
    .get();
  if (!row) return DEFAULT_PREFERENCES;
  return JSON.parse(row.data) as PreferencesRecord;
}

export function patchPreferences(profileId: string, patch: Partial<PreferencesRecord>): void {
  const current = getPreferences(profileId);
  const merged = { ...current, ...patch };
  db.insert(profilePreferences)
    .values({ profileId, data: JSON.stringify(merged) })
    .onConflictDoUpdate({
      target: profilePreferences.profileId,
      set: { data: JSON.stringify(merged) },
    })
    .run();
}

// Progress

function buildProgressWhere(profileId: string, tmdbId: number, season?: number, episode?: number) {
  return and(
    eq(profileProgress.profileId, profileId),
    eq(profileProgress.tmdbId, tmdbId),
    season !== undefined ? eq(profileProgress.season, season) : isNull(profileProgress.season),
    episode !== undefined ? eq(profileProgress.episode, episode) : isNull(profileProgress.episode),
  );
}

export function getProgress(
  profileId: string,
  tmdbId: number,
  season?: number,
  episode?: number,
): ProgressRecord | null {
  const row = db
    .select()
    .from(profileProgress)
    .where(buildProgressWhere(profileId, tmdbId, season, episode))
    .get();
  if (!row) return null;
  return { total: row.total, watched: row.watched };
}

export function patchProgress(
  profileId: string,
  tmdbId: number,
  season: number | undefined,
  episode: number | undefined,
  patch: Partial<ProgressRecord>,
): void {
  const now = new Date();
  const existing = db
    .select()
    .from(profileProgress)
    .where(buildProgressWhere(profileId, tmdbId, season, episode))
    .get();

  if (existing) {
    db.update(profileProgress)
      .set({
        ...(patch.total !== undefined ? { total: patch.total } : {}),
        ...(patch.watched !== undefined ? { watched: patch.watched } : {}),
        updatedAt: now,
      })
      .where(buildProgressWhere(profileId, tmdbId, season, episode))
      .run();
  } else {
    db.insert(profileProgress)
      .values({
        profileId,
        tmdbId,
        season: season ?? null,
        episode: episode ?? null,
        total: patch.total ?? 0,
        watched: patch.watched ?? 0,
        updatedAt: now,
      })
      .run();
  }
}

// Continue Watching

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

export function getContinueWatching(profileId: string): ContinueWatchingEntry[] {
  const rows = db
    .select()
    .from(profileContinueWatching)
    .where(eq(profileContinueWatching.profileId, profileId))
    .orderBy(desc(profileContinueWatching.lastWatch))
    .all();
  return rows.map(rowToEntry);
}

export function addContinueWatching(profileId: string, entry: ContinueWatchingEntry): void {
  console.log(
    `Saving continue watching for profile ${profileId}, tmdbId ${entry.id}, type ${entry.type}, season ${"season" in entry ? entry.season : "N/A"}, episode ${"episode" in entry ? entry.episode : "N/A"}, lastWatch ${new Date(entry.lastWatch).toISOString()}`,
  );
  db.insert(profileContinueWatching)
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
    })
    .run();
}

export function removeContinueWatching(profileId: string, tmdbId: number): void {
  db.delete(profileContinueWatching)
    .where(
      and(
        eq(profileContinueWatching.profileId, profileId),
        eq(profileContinueWatching.tmdbId, tmdbId),
      ),
    )
    .run();
}

// Profile Subtitles

function buildSubtitlesWhere(profileId: string, tmdbId: number, season?: number, episode?: number) {
  return and(
    eq(profileSubtitles.profileId, profileId),
    eq(profileSubtitles.tmdbId, tmdbId),
    season !== undefined ? eq(profileSubtitles.season, season) : isNull(profileSubtitles.season),
    episode !== undefined
      ? eq(profileSubtitles.episode, episode)
      : isNull(profileSubtitles.episode),
  );
}

export function getProfileSubtitles(
  profileId: string,
  tmdbId: number,
  season?: number,
  episode?: number,
): string | null {
  const row = db
    .select()
    .from(profileSubtitles)
    .where(buildSubtitlesWhere(profileId, tmdbId, season, episode))
    .get();
  return row?.subtitleUrl ?? null;
}

export function saveProfileSubtitles(
  profileId: string,
  tmdbId: number,
  season: number | undefined,
  episode: number | undefined,
  subtitleUrl: string,
): void {
  db.insert(profileSubtitles)
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
    })
    .run();
}
