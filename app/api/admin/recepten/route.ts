import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maakSlug } from "@/lib/slug";
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
  // Van het formulier (tekstvelden) of van de browserextensie (uitvoer van
  // de importroute, oud of nieuw).
  ingredienten: IngredientInvoer[];
  stappen: { tekst: string }[];
  fotos: { url: string; altTekst: string }[];
}

export async function POST(request: NextRequest) {
  const body: ReceptPayload = await request.json();

  // Unieke slug genereren
  let slug = maakSlug(body.titel);
  const bestaand = await prisma.recept.findUnique({ where: { slug } });
  if (bestaand) slug = `${slug}-${Date.now()}`;

  const ingredienten = verwerkIngredienten(body.ingredienten, await laadProductIndex(prisma));

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

  const recept = await prisma.recept.create({
    data: {
      titel: body.titel,
      slug,
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

  return NextResponse.json({ id: recept.id, slug: recept.slug });
}
