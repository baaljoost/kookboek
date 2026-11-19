import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eisLogin } from "@/lib/auth";
import { geldigeReceptId } from "@/lib/weekMandje";

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
  const receptId = geldigeReceptId(body.receptId);
  if (!receptId) return NextResponse.json({ error: "Ongeldig recept" }, { status: 400 });

  const recept = await prisma.recept.findUnique({
    where: { id: receptId },
    select: { id: true, porties: true },
  });
  if (!recept) return NextResponse.json({ error: "Recept niet gevonden" }, { status: 404 });

  const item = await prisma.weekItem.upsert({
    where: { receptId },
    update: {},
    create: { receptId, porties: recept.porties && recept.porties > 0 ? recept.porties : null },
  });
  return NextResponse.json({ receptId: item.receptId, porties: item.porties }, { status: 201 });
}
