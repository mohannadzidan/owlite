CREATE TABLE `profile_continue_watching` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`type` text NOT NULL,
	`last_watch` integer NOT NULL,
	`name` text NOT NULL,
	`overview` text NOT NULL,
	`backdrop_path` text NOT NULL,
	`poster_path` text,
	`season` integer,
	`episode` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_continue_watching_unique` ON `profile_continue_watching` (`profile_id`,`tmdb_id`);--> statement-breakpoint
CREATE TABLE `profile_preferences` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`season` integer,
	`episode` integer,
	`total` real DEFAULT 0 NOT NULL,
	`watched` real DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_progress_unique` ON `profile_progress` (`profile_id`,`tmdb_id`,`season`,`episode`);--> statement-breakpoint
CREATE TABLE `profile_subtitles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`season` integer,
	`episode` integer,
	`subtitle_url` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_subtitles_unique` ON `profile_subtitles` (`profile_id`,`tmdb_id`,`season`,`episode`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatar_seed` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer NOT NULL,
	`file` text NOT NULL,
	`language` text(2) NOT NULL,
	`year` integer,
	`resolution` text,
	`source` text,
	`video_codec` text,
	`group` text,
	`season` integer,
	`episode` integer,
	`batch_id` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subtitles_file_unique` ON `subtitles` (`file`);