import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await db.select().from(profiles).where(eq(profiles.id, id)).get();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const response = NextResponse.json(profile);
  response.cookies.set("owlite_profile", id, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  return response;
}
