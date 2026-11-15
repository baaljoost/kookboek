import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maakSlug } from "@/lib/slug";
import { verwerkIngredienten, type IngredientInvoer } from "@/lib/ingredientInvoer";
import { laadProductIndex } from "@/lib/productKoppeling";

interface Stap {
  tekst: string;
}

interface ReceptData {
  titel: string;
  categorie: string;
  porties?: number | null;
  bereidingstijd?: number | null;
  herkomstNaam?: string;
  herkomstUrl?: string;
  fotoUrl?: string;
  benodigdheden?: string[];
  ingredienten?: IngredientInvoer[];
  stappen?: Stap[];
}

async function uniekeSlug(basis: string): Promise<string> {
  let slug = basis;
  let teller = 1;
  while (await prisma.recept.findUnique({ where: { slug } })) {
    slug = `${basis}-${teller++}`;
  }
  return slug;
}

export async function POST(request: Request) {
  try {
    const { naam, bericht, receptData } = await request.json() as {
      naam: string;
      bericht: string;
      receptData: ReceptData;
    };

    if (!naam?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }
    if (!receptData?.titel?.trim()) {
      return NextResponse.json({ error: "Recepttitel is verplicht" }, { status: 400 });
    }

    const slug = await uniekeSlug(maakSlug(receptData.titel));
    const ingredienten = verwerkIngredienten(receptData.ingredienten, await laadProductIndex(prisma));

    await prisma.$transaction(async (tx) => {
      const recept = await tx.recept.create({
        data: {
          titel: receptData.titel,
          slug,
          categorie: receptData.categorie as never,
          porties: receptData.porties ?? null,
          bereidingstijd: receptData.bereidingstijd ?? null,
          herkomstNaam: receptData.herkomstNaam ?? null,
          herkomstUrl: receptData.herkomstUrl ?? null,
          benodigdheden: receptData.benodigdheden ?? [],
          ingebrachtDoor: naam.trim(),
          goedgekeurd: false,
          voorstelNaam: naam.trim(),
          voorstelBericht: bericht?.trim() ?? "",
          fotos: receptData.fotoUrl
            ? { create: [{ volgorde: 0, url: receptData.fotoUrl, altTekst: receptData.titel }] }
            : undefined,
        },
      });

      if (ingredienten.length) {
        await tx.ingredient.createMany({
          data: ingredienten.map((ing) => ({ ...ing, receptId: recept.id })),
        });
      }

      if (receptData.stappen?.length) {
        await tx.stap.createMany({
          data: receptData.stappen.map((stap, i) => ({
            receptId: recept.id,
            volgorde: i,
            tekst: stap.tekst,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
