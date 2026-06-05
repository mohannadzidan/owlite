import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, type ClientLogPayload } from "@/lib/observability";

export async function POST(request: NextRequest) {
  let payload: ClientLogPayload | null = null;

  try {
    payload = (await request.json()) as ClientLogPayload;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON payload" } },
      { status: 400 },
    );
  }

  if (!payload?.sessionId || !payload?.method || !payload?.args || !payload?.timestamp) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid log payload" } },
      { status: 400 },
    );
  }

  const cookieSessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = payload.sessionId || cookieSessionId || "unknown";

  if (process.env.NODE_ENV === "development")
    console.info("[client-log]", {
      sessionId,
      method: payload.method,
      args: payload.args,
      url: payload.url,
      userAgent: payload.userAgent,
      timestamp: payload.timestamp,
      cookieSessionId,
    });

  return new NextResponse(null, { status: 204 });
}
