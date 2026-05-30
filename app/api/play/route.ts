import { NextRequest, NextResponse } from "next/server";
import { getSourceById } from "@/lib/sources/registry";
import type { ResolveParams } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { source_id: string } & ResolveParams;
  const { source_id, ...resolveParams } = body;

  if (!source_id) return NextResponse.json({ error: "source_id required" }, { status: 400 });

  const source = getSourceById(source_id);
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const result = await source.resolve(resolveParams);
  if (!result)
    return NextResponse.json({ error: "Source could not resolve media" }, { status: 422 });

  return NextResponse.json(result);
}
