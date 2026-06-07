import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import type { LocalMapping } from "@/lib/types";

const MAPPINGS_PATH = path.join(process.cwd(), "data", "local_mappings.json");

function readMappings(): LocalMapping[] {
  try {
    return JSON.parse(fs.readFileSync(MAPPINGS_PATH, "utf-8")) as LocalMapping[];
  } catch {
    return [];
  }
}

function writeMappings(mappings: LocalMapping[]) {
  fs.mkdirSync(path.dirname(MAPPINGS_PATH), { recursive: true });
  fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(mappings, null, 2));
}

export async function GET() {
  return NextResponse.json(readMappings());
}

export async function POST(request: NextRequest) {
  let body: LocalMapping;
  try {
    body = (await request.json()) as LocalMapping;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }
  if (!body?.tmdb_id || !body?.media_type || !body?.local_path) {
    return NextResponse.json(
      {
        error: { code: "bad_request", message: "tmdb_id, media_type, and local_path are required" },
      },
      { status: 400 },
    );
  }
  const mappings = readMappings();
  mappings.push(body);
  writeMappings(mappings);
  return NextResponse.json(body, { status: 201 });
}

export async function PUT(request: NextRequest) {
  let body: LocalMapping & { index: number };
  try {
    body = (await request.json()) as LocalMapping & { index: number };
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }
  const { index, ...mapping } = body;
  if (typeof index !== "number" || isNaN(index)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "index is required" } },
      { status: 400 },
    );
  }
  const mappings = readMappings();
  if (index < 0 || index >= mappings.length) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Mapping not found" } },
      { status: 404 },
    );
  }
  mappings[index] = mapping;
  writeMappings(mappings);
  return NextResponse.json(mapping);
}

export async function DELETE(request: NextRequest) {
  const indexParam = request.nextUrl.searchParams.get("index");
  const index = Number(indexParam);
  if (indexParam === null || isNaN(index)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "index is required" } },
      { status: 400 },
    );
  }
  const mappings = readMappings();
  if (index < 0 || index >= mappings.length) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Mapping not found" } },
      { status: 404 },
    );
  }
  mappings.splice(index, 1);
  writeMappings(mappings);
  return NextResponse.json({ ok: true });
}
