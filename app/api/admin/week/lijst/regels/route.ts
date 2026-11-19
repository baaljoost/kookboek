import { NextRequest, NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { laadLijst, voegEigenRegelToe } from "@/lib/lijstData";

// Eigen regel toevoegen; antwoordt met de nieuwe lijst.
export async function POST(request: NextRequest) {
  const nee = await eisLogin();
  if (nee) return nee;

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
