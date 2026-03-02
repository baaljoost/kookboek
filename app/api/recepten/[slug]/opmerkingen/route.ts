import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const recept = await prisma.recept.findUnique({ where: { slug }, select: { id: true } });
  if (!recept) return NextResponse.json({ error: "Recept niet gevonden" }, { status: 404 });

  const formData = await request.formData();
  const naam = (formData.get("naam") as string)?.trim();
  const bericht = (formData.get("bericht") as string)?.trim();
  const sterrenRaw = formData.get("sterren") as string | null;
  const sterren = sterrenRaw ? parseInt(sterrenRaw) : null;
  const fotoBestand = formData.get("foto") as File | null;

  if (!naam || !bericht) {
    return NextResponse.json({ error: "Naam en bericht zijn verplicht" }, { status: 400 });
  }

  let fotoUrl: string | null = null;
  if (fotoBestand && fotoBestand.size > 0) {
    const blob = await put(`opmerkingen/${Date.now()}-${fotoBestand.name}`, fotoBestand, {
      access: "public",
    });
    fotoUrl = blob.url;
  }

  const opmerking = await prisma.opmerking.create({
    data: {
      naam,
      bericht,
      sterren: sterren && sterren >= 1 && sterren <= 5 ? sterren : null,
      fotoUrl,
      receptId: recept.id,
    },
  });

  return NextResponse.json(opmerking, { status: 201 });
}
