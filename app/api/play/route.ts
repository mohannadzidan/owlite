import { NextRequest, NextResponse } from "next/server";
import { getSourceById } from "@/lib/sources/registry";
import type { ResolveParams } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { source_id: string } & ResolveParams;
  const userAgent = request.headers.get("user-agent") ?? "";
  const { source_id, ...resolveParams } = body;
  if (!source_id)
    return NextResponse.json(
      { error: { code: "bad_request", message: "source_id required" } },
      { status: 400 },
    );

  const source = getSourceById(source_id);
  if (!source)
    return NextResponse.json(
      { error: { code: "not_found", message: "Source not found" } },
      { status: 404 },
    );

  const result = await source.resolve({ ...resolveParams, userAgent });
  if (!result)
    return NextResponse.json(
      { error: { code: "could_not_resolve", message: "Source could not resolve media" } },
      { status: 422 },
    );

  return NextResponse.json(result);
}
