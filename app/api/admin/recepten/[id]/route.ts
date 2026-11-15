import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Categorie } from "@prisma/client";
import { verwerkIngredienten, type IngredientInvoer } from "@/lib/ingredientInvoer";
import { laadProductIndex } from "@/lib/productKoppeling";

interface ReceptPayload {
  titel: string;
  categorie: Categorie;
  porties: number | null;
  bereidingstijd: number | null;
  beoordeling: number | null;
  herkomstNaam: string;
  herkomstUrl: string;
  ingebrachtDoor: string | null;
  tags: string[];
  benodigdheden?: string[];
  ingredienten: IngredientInvoer[];
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

  // Alles in één transactie: mislukt het aanmaken, dan blijven de oude
  // ingrediënten, stappen en foto's staan.
  const recept = await prisma.$transaction(
    async (tx) => {
      // Bestaande regels ophalen vóór het verwijderen, zodat oorspronkelijke
      // tekst en productkoppeling bewaard blijven.
      const bestaande = await tx.ingredient.findMany({ where: { receptId } });
      const ingredienten = verwerkIngredienten(body.ingredienten, await laadProductIndex(tx), bestaande);

      // Tags aanmaken of ophalen
      const tagIds: number[] = [];
      for (const naam of body.tags) {
        const tag = await tx.tag.upsert({ where: { naam }, update: {}, create: { naam } });
        tagIds.push(tag.id);
      }

      // Verwijder gerelateerde data en maak opnieuw aan
      await tx.ingredient.deleteMany({ where: { receptId } });
      await tx.stap.deleteMany({ where: { receptId } });
      await tx.foto.deleteMany({ where: { receptId } });
      await tx.receptTag.deleteMany({ where: { receptId } });

      return tx.recept.update({
        where: { id: receptId },
        data: {
          titel: body.titel,
          categorie: body.categorie,
          porties: body.porties,
          bereidingstijd: body.bereidingstijd,
          beoordeling: body.beoordeling,
          herkomstNaam: body.herkomstNaam || null,
          herkomstUrl: body.herkomstUrl || null,
          ingebrachtDoor: body.ingebrachtDoor || null,
          benodigdheden: body.benodigdheden ?? [],
          ingredienten: { create: ingredienten },
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
    },
    { timeout: 20000 }
  );

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
