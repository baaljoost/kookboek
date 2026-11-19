import { NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { laadLijst } from "@/lib/lijstData";

export const dynamic = "force-dynamic";

const GEEN_CACHE = { "Cache-Control": "no-store" };

// De lijst via de deellink. Een onbekende of oude code geeft 404.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404, headers: GEEN_CACHE });
  }
  return NextResponse.json(await laadLijst(), { headers: GEEN_CACHE });
}
