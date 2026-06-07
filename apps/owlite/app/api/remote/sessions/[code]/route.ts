import { getPairingSession } from "@/lib/remote-sessions.server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = getPairingSession(code);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.paired) {
    return NextResponse.json({ paired: false });
  }
  return NextResponse.json({
    paired: true,
    pairId: session.paired.pairId,
    initiatorDeviceId: session.paired.initiatorDeviceId,
    initiatorName: session.paired.initiatorName,
  });
}
