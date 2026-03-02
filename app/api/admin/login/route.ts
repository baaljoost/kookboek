import { NextRequest, NextResponse } from "next/server";
import { checkPassword, SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { wachtwoord } = await request.json();

  let correct = false;
  try {
    correct = checkPassword(wachtwoord);
  } catch {
    return NextResponse.json({ error: "Serverfout" }, { status: 500 });
  }

  if (!correct) {
    return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Geen maxAge → sessie-cookie: verdwijnt als browser sluit
  });
  return response;
}
