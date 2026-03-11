import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Publiek endpoint – geen auth vereist
// Slaat een mislukte import-URL op zodat de admin deze kan bekijken
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, bron, naam } = body as { url?: string; bron?: string; naam?: string };

  if (!url) {
    return NextResponse.json({ error: "Geen URL opgegeven" }, { status: 400 });
  }

  await prisma.importMelding.create({
    data: { url, bron: bron ?? "onbekend", naam: naam ?? null },
  });

  return NextResponse.json({ ok: true });
}
