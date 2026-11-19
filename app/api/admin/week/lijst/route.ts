import { NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { laadLijst } from "@/lib/lijstData";

export const dynamic = "force-dynamic";

// De berekende lijst met de afgevinkte sleutels.
export async function GET() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json(await laadLijst(), { headers: { "Cache-Control": "no-store" } });
}
