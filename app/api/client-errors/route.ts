import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, type ClientErrorPayload } from "@/lib/observability";

export async function POST(request: NextRequest) {
  let payload: ClientErrorPayload | null = null;

  try {
    payload = (await request.json()) as ClientErrorPayload;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON payload" } },
      { status: 400 },
    );
  }

  if (!payload?.sessionId || !payload?.message || !payload?.type || !payload?.timestamp) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid error payload" } },
      { status: 400 },
    );
  }

  const cookieSessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = payload.sessionId || cookieSessionId || "unknown";

  if (process.env.NODE_ENV === "development")
    console.error("[client-error]", {
      sessionId,
      type: payload.type,
      message: payload.message,
      stack: payload.stack,
      filename: payload.filename,
      lineno: payload.lineno,
      colno: payload.colno,
      url: payload.url,
      userAgent: payload.userAgent,
      timestamp: payload.timestamp,
      cookieSessionId,
    });

  return new NextResponse(null, { status: 204 });
}
