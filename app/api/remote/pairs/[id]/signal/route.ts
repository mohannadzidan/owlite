import { drainPairSignals, pushPairSignal } from "@/lib/remote-sessions.server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const from = req.nextUrl.searchParams.get("from") as "initiator" | "acceptor" | null;
  if (from !== "initiator" && from !== "acceptor") {
    return NextResponse.json({ error: "from must be initiator or acceptor" }, { status: 400 });
  }
  const signals = drainPairSignals(id, from);
  return NextResponse.json({ signals });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as { from: "initiator" | "acceptor"; data: object };
  if (body.from !== "initiator" && body.from !== "acceptor") {
    return NextResponse.json({ error: "from must be initiator or acceptor" }, { status: 400 });
  }
  pushPairSignal(id, body.from, body.data);
  return NextResponse.json({ ok: true });
}
