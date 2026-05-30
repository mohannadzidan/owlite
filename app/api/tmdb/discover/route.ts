import { NextResponse } from "next/server";
import { discoverTrending } from "@/lib/tmdb";

export async function GET() {
  try {
    const results = await discoverTrending();
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
