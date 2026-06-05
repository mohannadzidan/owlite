import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtitles } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

export interface SubtitleFileRow {
  id: number;
  filename: string;
  language: string;
  season: number | null;
  episode: number | null;
  isFavorite: boolean;
  createdAt: string;
}

export type SubtitleEntry =
  | ({ kind: "single" } & SubtitleFileRow)
  | {
      kind: "batch";
      batchId: string;
      files: SubtitleFileRow[];
      language: string;
      createdAt: string;
    };

export async function GET(request: NextRequest) {
  const tmdbId = Number(request.nextUrl.searchParams.get("tmdb_id"));
  if (!tmdbId || isNaN(tmdbId)) {
    return NextResponse.json({ error: "Missing tmdb_id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(subtitles)
    .where(eq(subtitles.tmdbId, tmdbId))
    .orderBy(asc(subtitles.createdAt));

  const batchMap = new Map<string, SubtitleFileRow[]>();
  const entries: SubtitleEntry[] = [];

  for (const row of rows) {
    const fileRow: SubtitleFileRow = {
      id: row.id,
      filename: path.basename(row.file),
      language: row.language,
      season: row.season,
      episode: row.episode,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.batchId) {
      const existing = batchMap.get(row.batchId);
      if (existing) {
        existing.push(fileRow);
      } else {
        batchMap.set(row.batchId, [fileRow]);
      }
    } else {
      entries.push({ kind: "single", ...fileRow });
    }
  }

  for (const [batchId, files] of batchMap) {
    entries.push({
      kind: "batch",
      batchId,
      files,
      language: files[0].language,
      createdAt: files[0].createdAt,
    });
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ entries });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as
    | { id: number; isFavorite: boolean }
    | { batchId: string; isFavorite: boolean };

  if ("id" in body) {
    const { id, isFavorite } = body;
    if (isFavorite) {
      const [row] = await db.select().from(subtitles).where(eq(subtitles.id, id));
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const seasonCond =
        row.season != null ? eq(subtitles.season, row.season) : isNull(subtitles.season);
      const episodeCond =
        row.episode != null ? eq(subtitles.episode, row.episode) : isNull(subtitles.episode);
      await db
        .update(subtitles)
        .set({ isFavorite: false })
        .where(
          and(
            eq(subtitles.tmdbId, row.tmdbId),
            eq(subtitles.language, row.language),
            seasonCond,
            episodeCond,
          ),
        );
    }
    await db.update(subtitles).set({ isFavorite }).where(eq(subtitles.id, id));
    return NextResponse.json({ ok: true });
  }

  if ("batchId" in body) {
    const { batchId, isFavorite } = body;
    if (isFavorite) {
      const rows = await db.select().from(subtitles).where(eq(subtitles.batchId, batchId));
      for (const row of rows) {
        const seasonCond =
          row.season != null ? eq(subtitles.season, row.season) : isNull(subtitles.season);
        const episodeCond =
          row.episode != null ? eq(subtitles.episode, row.episode) : isNull(subtitles.episode);
        await db
          .update(subtitles)
          .set({ isFavorite: false })
          .where(
            and(
              eq(subtitles.tmdbId, row.tmdbId),
              eq(subtitles.language, row.language),
              seasonCond,
              episodeCond,
            ),
          );
        await db.update(subtitles).set({ isFavorite: true }).where(eq(subtitles.id, row.id));
      }
    } else {
      await db.update(subtitles).set({ isFavorite: false }).where(eq(subtitles.batchId, batchId));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide id or batchId" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as { id?: number; batchId?: string };
  const { id, batchId } = body;

  if (!id && !batchId) {
    return NextResponse.json({ error: "Provide id or batchId" }, { status: 400 });
  }

  const rows = id
    ? await db.select().from(subtitles).where(eq(subtitles.id, id))
    : await db.select().from(subtitles).where(eq(subtitles.batchId, batchId!));

  for (const row of rows) {
    try {
      fs.unlinkSync(row.file);
    } catch {
      // file already gone — continue with DB cleanup
    }
    await db.delete(subtitles).where(eq(subtitles.id, row.id));
  }

  return NextResponse.json({ deleted: rows.length });
}
