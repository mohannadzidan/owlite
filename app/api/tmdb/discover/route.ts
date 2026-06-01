import { NextResponse } from "next/server";
import { discover } from "@/services/tmdb.service";

export async function GET() {
  try {
    const results = await discover.trending();
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
