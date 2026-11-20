import { NextResponse } from "next/server";
import { controleerCode } from "@/lib/deelLink";
import { startNieuweWeek } from "@/lib/weekMandje";

// "Nieuwe week" via de deellink: zelfde gedrag als voor de eigenaar. De
// bevestiging gebeurt in de browser.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await controleerCode((await params).code))) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bewaard: await startNieuweWeek() });
}
