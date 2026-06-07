import { db } from "@/db";
import { remotePairings } from "@/db/schema";
import { acceptPairingSession, getPairingSession } from "@/lib/remote-sessions.server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { deviceId, deviceName } = (await req.json()) as {
    deviceId: string;
    deviceName: string;
  };

  const session = getPairingSession(code);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
  }
  if (session.paired) {
    return NextResponse.json({ error: "Session already used" }, { status: 409 });
  }

  const pairId = randomUUID();
  await db.insert(remotePairings).values({
    id: pairId,
    initiatorDeviceId: deviceId,
    initiatorName: deviceName,
    acceptorDeviceId: session.acceptorDeviceId,
    acceptorName: session.acceptorName,
    createdAt: Date.now(),
  });

  acceptPairingSession(code, pairId, deviceId, deviceName);

  return NextResponse.json({
    pairId,
    acceptorDeviceId: session.acceptorDeviceId,
    acceptorName: session.acceptorName,
  });
}
