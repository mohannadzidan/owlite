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
  fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(mappings, null, 2));
}

export async function GET() {
  return NextResponse.json(readMappings());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LocalMapping;
  const mappings = readMappings();
  mappings.push(body);
  writeMappings(mappings);
  return NextResponse.json(body, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as LocalMapping & { index: number };
  const { index, ...mapping } = body;
  const mappings = readMappings();
  mappings[index] = mapping;
  writeMappings(mappings);
  return NextResponse.json(mapping);
}

export async function DELETE(request: NextRequest) {
  const index = Number(request.nextUrl.searchParams.get("index"));
  const mappings = readMappings();
  mappings.splice(index, 1);
  writeMappings(mappings);
  return NextResponse.json({ ok: true });
}
