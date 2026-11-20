import { NextRequest, NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { laadMandje, voegToeAanMandje } from "@/lib/weekMandje";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

const GEEN_CACHE = { "Cache-Control": "no-store" };

// Het mandje via de deellink. Een onbekende of oude code geeft 404.
export async function GET(_request: NextRequest, { params }: Params) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404, headers: GEEN_CACHE });
  }
  return NextResponse.json(await laadMandje(), { headers: GEEN_CACHE });
}

// Recept in het mandje via de deellink; alleen goedgekeurde recepten.
export async function POST(request: NextRequest, { params }: Params) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  let body: { receptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const r = await voegToeAanMandje(body.receptId, true);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ receptId: r.receptId, porties: r.porties }, { status: 201 });
}
