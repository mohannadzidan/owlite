import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { name?: string; avatarSeed?: string };
  const update: Partial<typeof profiles.$inferInsert> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.avatarSeed !== undefined) update.avatarSeed = body.avatarSeed;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  await db.update(profiles).set(update).where(eq(profiles.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(profiles).where(eq(profiles.id, id));
  return NextResponse.json({ ok: true });
}
