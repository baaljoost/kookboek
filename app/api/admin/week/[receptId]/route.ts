import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eisLogin } from "@/lib/auth";
import { geldigeReceptId, geldigePorties } from "@/lib/weekMandje";

type Params = { params: Promise<{ receptId: string }> };

// Porties van een recept in het mandje wijzigen.
export async function PUT(request: NextRequest, { params }: Params) {
  const nee = await eisLogin();
  if (nee) return nee;

  const receptId = geldigeReceptId((await params).receptId);
  if (!receptId) return NextResponse.json({ error: "Ongeldig recept" }, { status: 400 });

  let body: { porties?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const porties = geldigePorties(body.porties);
  if (!porties) return NextResponse.json({ error: "Ongeldig aantal porties" }, { status: 400 });

  const { count } = await prisma.weekItem.updateMany({ where: { receptId }, data: { porties } });
  if (count === 0) return NextResponse.json({ error: "Recept staat niet in het mandje" }, { status: 404 });
  return NextResponse.json({ receptId, porties });
}

// Recept uit het mandje halen.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const nee = await eisLogin();
  if (nee) return nee;

  const receptId = geldigeReceptId((await params).receptId);
  if (!receptId) return NextResponse.json({ error: "Ongeldig recept" }, { status: 400 });

  await prisma.weekItem.deleteMany({ where: { receptId } });
  return NextResponse.json({ ok: true });
}
