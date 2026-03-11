import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kookboek_admin";
const SESSION_VALUE = "authenticated";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/importeer"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE);
  if (cookie?.value !== SESSION_VALUE) {
    // API-routes krijgen een 401 JSON (geen redirect, anders stuurt een 307
    // method-preserving redirect een POST naar de loginpagina → "server action not found")
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
