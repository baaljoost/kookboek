import { NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { haalCode, vernieuwCode, zorgVoorCode } from "@/lib/deelLink";

export const dynamic = "force-dynamic";

// De huidige code, of null als er nog geen link is.
export async function GET() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json({ code: await haalCode() }, { headers: { "Cache-Control": "no-store" } });
}

// De huidige code; bestaat er nog geen link, dan wordt die gemaakt. Verandert
// nooit een bestaande code (dat doet POST).
export async function PUT() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json({ code: await zorgVoorCode() }, { headers: { "Cache-Control": "no-store" } });
}

// Maak de link, of vervang de code. De oude code werkt daarna niet meer.
export async function POST() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json({ code: await vernieuwCode() }, { headers: { "Cache-Control": "no-store" } });
}
