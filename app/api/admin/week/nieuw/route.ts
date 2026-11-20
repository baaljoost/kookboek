import { NextResponse } from "next/server";
import { eisLogin } from "@/lib/auth";
import { startNieuweWeek } from "@/lib/weekMandje";

// "Nieuwe week": zie startNieuweWeek.
export async function POST() {
  const nee = await eisLogin();
  if (nee) return nee;
  return NextResponse.json({ ok: true, bewaard: await startNieuweWeek() });
}
