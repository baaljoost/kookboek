import { NextRequest, NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { haalUitMandje, zetPortiesInMandje } from "@/lib/weekMandje";

type Params = { params: Promise<{ code: string; receptId: string }> };

// Porties van een recept in het mandje wijzigen via de deellink.
export async function PUT(request: NextRequest, { params }: Params) {
  const { code, receptId } = await params;
  if (!(await controleerCode(code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  let body: { porties?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const r = await zetPortiesInMandje(receptId, body.porties);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ receptId: r.receptId, porties: r.porties });
}

// Recept uit het mandje halen via de deellink.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { code, receptId } = await params;
  if (!(await controleerCode(code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  const r = await haalUitMandje(receptId);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ ok: true });
}
