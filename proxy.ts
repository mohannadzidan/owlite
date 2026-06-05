import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  // 1. Target only your API proxy paths
  if (request.nextUrl.pathname.startsWith("/api/proxy/tmdb")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${process.env.TMDB_API_KEY}`);

    const externalApiUrl =
      "https://api.themoviedb.org" +
      request.nextUrl.pathname.slice("/api/proxy/tmdb".length) +
      request.nextUrl.search;
    return NextResponse.rewrite(externalApiUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/proxy/tmdb/:path*"], // Match both /api/tmdb/* and /api/proxy/tmdb/*
};
