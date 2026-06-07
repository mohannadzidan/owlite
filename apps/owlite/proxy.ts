import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect to /profiles if no profile cookie is set (skip API, static, and profiles routes)
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/profiles") &&
    pathname !== "/favicon.ico"
  ) {
    if (!request.cookies.get("owlite_profile")) {
      return NextResponse.redirect(new URL("/profiles", request.url));
    }
  }

  // Proxy TMDB API requests
  if (pathname.startsWith("/api/proxy/tmdb")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${process.env.TMDB_API_KEY}`);

    const externalApiUrl =
      "https://api.themoviedb.org" +
      pathname.slice("/api/proxy/tmdb".length) +
      request.nextUrl.search;
    return NextResponse.rewrite(externalApiUrl, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
