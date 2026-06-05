import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get("owlite_profile");
  if (!cookie) {
    return NextResponse.redirect(new URL("/profiles", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|profiles).*)"],
};
