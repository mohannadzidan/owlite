import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "owlite_profile";
const COOKIE_OPTIONS = { path: "/", httpOnly: false, sameSite: "lax" } as const;

export async function POST(req: NextRequest) {
  const { profileId } = (await req.json()) as { profileId: string };
  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }
  const store = await cookies();
  store.set(COOKIE_NAME, profileId, COOKIE_OPTIONS);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
