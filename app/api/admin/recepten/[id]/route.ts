import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Categorie } from "@prisma/client";

interface ReceptPayload {
  titel: string;
  categorie: Categorie;
  porties: number | null;
  bereidingstijd: number | null;
  beoordeling: number | null;
  herkomstNaam: string;
  herkomstUrl: string;
  tags: string[];
  ingredienten: {
    hoeveelheid: string;
    eenheid: string;
    naam: string;
    notitie: string;
  }[];
  stappen: { tekst: string }[];
  fotos: { url: string; altTekst: string }[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receptId = parseInt(id);
  const body: ReceptPayload = await request.json();

  // Tags aanmaken of ophalen
  const tagIds = await Promise.all(
    body.tags.map(async (naam) => {
      const tag = await prisma.tag.upsert({
        where: { naam },
        update: {},
        create: { naam },
      });
      return tag.id;
    })
  );

  // Verwijder gerelateerde data en maak opnieuw aan
  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { receptId } }),
    prisma.stap.deleteMany({ where: { receptId } }),
    prisma.foto.deleteMany({ where: { receptId } }),
    prisma.receptTag.deleteMany({ where: { receptId } }),
  ]);

  const recept = await prisma.recept.update({
    where: { id: receptId },
    data: {
      titel: body.titel,
      categorie: body.categorie,
      porties: body.porties,
      bereidingstijd: body.bereidingstijd,
      beoordeling: body.beoordeling,
      herkomstNaam: body.herkomstNaam || null,
      herkomstUrl: body.herkomstUrl || null,
      ingredienten: {
        create: body.ingredienten.map((ing, i) => ({
          volgorde: i,
          hoeveelheid: ing.hoeveelheid ? parseFloat(ing.hoeveelheid) : null,
          eenheid: ing.eenheid || null,
          naam: ing.naam,
          notitie: ing.notitie || null,
        })),
      },
      stappen: {
        create: body.stappen.map((stap, i) => ({
          volgorde: i,
          tekst: stap.tekst,
        })),
      },
      fotos: {
        create: body.fotos.map((foto, i) => ({
          volgorde: i,
          url: foto.url,
          altTekst: foto.altTekst || null,
        })),
      },
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  });

  return NextResponse.json({ id: recept.id, slug: recept.slug });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.recept.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
