import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eisLogin } from "@/lib/auth";
import { laadLijst } from "@/lib/lijstData";
import { geldigeReceptId } from "@/lib/weekMandje";

// Eigen regel verwijderen; antwoordt met de nieuwe lijst. Alleen voor de eigenaar.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const nee = await eisLogin();
  if (nee) return nee;

  const id = geldigeReceptId((await params).id); // zelfde controle: positief geheel getal
  if (!id) return NextResponse.json({ error: "Ongeldige regel" }, { status: 400 });

  await prisma.lijstRegel.deleteMany({ where: { id } });
  return NextResponse.json(await laadLijst());
}
