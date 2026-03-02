import { NextRequest, NextResponse } from "next/server";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";

export async function POST(request: NextRequest) {
  const { aan } = await request.json();
  const response = NextResponse.json({ ok: true });

  if (aan) {
    response.cookies.set(MODUS_COOKIE, MODUS_BEHEERDER, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    response.cookies.delete(MODUS_COOKIE);
  }

  return response;
}
