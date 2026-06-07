import { db } from "@/db";
import { profilePreferences } from "@/db/schema";
import { DEFAULT_PREFERENCES, PreferencesRecord } from "@/lib/profile-types";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId() {
  const cookieStore = await cookies();
  return cookieStore.get("owlite_profile")?.value ?? null;
}

export async function GET() {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db
    .select()
    .from(profilePreferences)
    .where(eq(profilePreferences.profileId, profileId))
    .get();
  if (!row) return NextResponse.json(DEFAULT_PREFERENCES);
  return NextResponse.json(JSON.parse(row.data) as PreferencesRecord);
}

export async function PATCH(request: NextRequest) {
  const profileId = await getProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update = (await request.json()) as Partial<PreferencesRecord>;

  const existing = await db
    .select()
    .from(profilePreferences)
    .where(eq(profilePreferences.profileId, profileId))
    .get();
  const current: PreferencesRecord = existing
    ? (JSON.parse(existing.data) as PreferencesRecord)
    : DEFAULT_PREFERENCES;
  const merged = { ...current, ...update };

  await db
    .insert(profilePreferences)
    .values({ profileId, data: JSON.stringify(merged) })
    .onConflictDoUpdate({
      target: profilePreferences.profileId,
      set: { data: JSON.stringify(merged) },
    });

  return NextResponse.json({ ok: true });
}
