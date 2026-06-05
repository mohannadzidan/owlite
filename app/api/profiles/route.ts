import { db } from "@/db";
import { profiles } from "@/db/schema";
import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = await db.select().from(profiles).orderBy(asc(profiles.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const id = randomUUID();
  const avatarSeed = randomUUID();
  const now = new Date();
  await db.insert(profiles).values({ id, name: body.name.trim(), avatarSeed, createdAt: now });
  return NextResponse.json({ id, name: body.name.trim(), avatarSeed, createdAt: now.getTime() });
}
