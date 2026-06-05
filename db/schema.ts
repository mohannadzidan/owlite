import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

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
