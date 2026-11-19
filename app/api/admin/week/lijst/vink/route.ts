import { NextRequest, NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { zetVink } from "@/lib/lijstData";

// Vinkje zetten of weghalen.
export async function POST(request: NextRequest) {
  const nee = await eisLogin();
  if (nee) return nee;

  let body: { sleutel?: unknown; aan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const resultaat = await zetVink(body.sleutel, body.aan);
  if (!resultaat.ok) return NextResponse.json({ error: resultaat.fout }, { status: resultaat.status });
  return NextResponse.json({ ok: true });
}
