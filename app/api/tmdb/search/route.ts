import { type NextRequest, NextResponse } from "next/server";
import { search } from "@/services/tmdb.service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await search.multi(q);
    if ("error" in results)
      return NextResponse.json(
        { error: { code: "upstream_error", message: results.error.message } },
        { status: 502 },
      );
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: { code: "internal_error", message } }, { status: 500 });
  }
}
