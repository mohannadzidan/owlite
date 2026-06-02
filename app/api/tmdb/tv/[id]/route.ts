import { type NextRequest, NextResponse } from "next/server";
import { tv } from "@/services/tmdb.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const response = await tv.get(Number(id));

  if ("error" in response)
    return NextResponse.json(
      { error: { code: "upstream_error", message: response.error.message } },
      { status: 502 },
    );

  return NextResponse.json(response);
}
