import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const subtitles = sqliteTable("subtitles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tmdbId: integer("tmdb_id").notNull(),
  file: text("file").notNull().unique(),
  language: text("language", { length: 2 }).notNull(),
  year: integer("year"),
  resolution: text("resolution"),
  source: text("source"),
  videoCodec: text("video_codec"),
  group: text("group"),
  season: integer("season"),
  episode: integer("episode"),
  batchId: text("batch_id"),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatarSeed: text("avatar_seed").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const profilePreferences = sqliteTable("profile_preferences", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
});

export const profileProgress = sqliteTable(
  "profile_progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: text("profile_id").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    season: integer("season"),
    episode: integer("episode"),
    total: real("total").notNull().default(0),
    watched: real("watched").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("profile_progress_unique").on(t.profileId, t.tmdbId, t.season, t.episode)],
);

export const profileContinueWatching = sqliteTable(
  "profile_continue_watching",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: text("profile_id").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    type: text("type", { enum: ["movie", "tv"] }).notNull(),
    lastWatch: integer("last_watch").notNull(),
    name: text("name").notNull(),
    overview: text("overview").notNull(),
    backdropPath: text("backdrop_path").notNull(),
    posterPath: text("poster_path"),
    season: integer("season"),
    episode: integer("episode"),
  },
  (t) => [uniqueIndex("profile_continue_watching_unique").on(t.profileId, t.tmdbId)],
);

export const profileSubtitles = sqliteTable(
  "profile_subtitles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: text("profile_id").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    season: integer("season"),
    episode: integer("episode"),
    subtitleUrl: text("subtitle_url").notNull(),
  },
  (t) => [uniqueIndex("profile_subtitles_unique").on(t.profileId, t.tmdbId, t.season, t.episode)],
);
