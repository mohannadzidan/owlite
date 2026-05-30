import { type NextRequest, NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchMulti(q);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
