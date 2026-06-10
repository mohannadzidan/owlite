import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "./schema";
import { mkdirSync } from "fs";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "owlite.db");
mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

if (!process.env.NEXT_RUNTIME) {
  migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
}

export * from "./schema";
