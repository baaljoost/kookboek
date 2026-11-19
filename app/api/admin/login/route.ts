import { NextRequest, NextResponse } from "next/server";
import { checkPassword, sessieCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let wachtwoord: unknown;
  try {
    ({ wachtwoord } = await request.json());
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  let correct = false;
  let cookie;
  try {
    correct = checkPassword(wachtwoord);
    if (correct) cookie = await sessieCookie();
  } catch {
    // ADMIN_PASSWORD of SESSION_SECRET ontbreekt: nooit inloggen
    return NextResponse.json({ error: "Serverfout" }, { status: 500 });
  }

  if (!correct || !cookie) {
    return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.naam, cookie.waarde, cookie.opties);
  return response;
}
