import { NextRequest, NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { laadLijst, voegEigenRegelToe } from "@/lib/lijstData";

// Eigen regel toevoegen via de deellink. Verwijderen kan hier niet.
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  let body: { tekst?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const resultaat = await voegEigenRegelToe(body.tekst);
  if (!resultaat.ok) return NextResponse.json({ error: resultaat.fout }, { status: resultaat.status });
  return NextResponse.json(await laadLijst(), { status: 201 });
}
