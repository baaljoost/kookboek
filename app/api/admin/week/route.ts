import { NextRequest, NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { laadMandje, voegToeAanMandje } from "@/lib/weekMandje";

export const dynamic = "force-dynamic";

// Het mandje, voor het opnieuw ophalen als je de pagina weer opent.
export async function GET() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json(await laadMandje(), { headers: { "Cache-Control": "no-store" } });
}

// Recept in het mandje. Opnieuw aanroepen verandert niets.
export async function POST(request: NextRequest) {
  const nee = await eisLogin();
  if (nee) return nee;

  let body: { receptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const r = await voegToeAanMandje(body.receptId, false);
  if (!r.ok) return NextResponse.json({ error: r.fout }, { status: r.status });
  return NextResponse.json({ receptId: r.receptId, porties: r.porties }, { status: 201 });
}
