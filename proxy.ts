import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kookboek_admin";
const SESSION_VALUE = "authenticated";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laat de login pagina en login API altijd door
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE);
  if (cookie?.value !== SESSION_VALUE) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
