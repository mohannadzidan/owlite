import { registerHeartbeat } from "@/lib/remote-sessions.server";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  registerHeartbeat(id);
  return NextResponse.json({ ok: true });
}
