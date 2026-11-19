import { NextRequest, NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { zetVink } from "@/lib/lijstData";

// Vinkje zetten of weghalen via de deellink.
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
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
