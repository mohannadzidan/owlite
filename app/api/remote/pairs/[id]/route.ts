import { db } from "@/db";
import { remotePairings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(remotePairings).where(eq(remotePairings.id, id));
  return NextResponse.json({ ok: true });
}
