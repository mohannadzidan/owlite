import { createPairingSession, generateCode } from "@/lib/remote-sessions.server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { deviceId, deviceName } = (await req.json()) as {
    deviceId: string;
    deviceName: string;
  };
  if (!deviceId || !deviceName) {
    return NextResponse.json({ error: "deviceId and deviceName required" }, { status: 400 });
  }
  const code = generateCode();
  createPairingSession(code, deviceId, deviceName);
  return NextResponse.json({ code });
}
