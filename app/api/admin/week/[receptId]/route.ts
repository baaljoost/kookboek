import { NextRequest, NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { haalUitMandje, zetPortiesInMandje } from "@/lib/weekMandje";

type Params = { params: Promise<{ receptId: string }> };

// Porties van een recept in het mandje wijzigen.
export async function PUT(request: NextRequest, { params }: Params) {
  const nee = await eisLogin();
  if (nee) return nee;

  let body: { porties?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const r = await zetPortiesInMandje((await params).receptId, body.porties);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ receptId: r.receptId, porties: r.porties });
}

// Recept uit het mandje halen.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const nee = await eisLogin();
  if (nee) return nee;

  const r = await haalUitMandje((await params).receptId);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ ok: true });
}
