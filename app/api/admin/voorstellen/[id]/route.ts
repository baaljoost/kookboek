import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maakSlug } from "@/lib/slug";

interface Ingredient {
  hoeveelheid?: string | number;
  eenheid?: string;
  naam: string;
  notitie?: string;
}

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
  ingredienten?: Ingredient[];
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

// POST = goedkeuren: maak echt recept aan
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const voorstelId = parseInt(id);

  try {
    const voorstel = await prisma.voorgesteldRecept.findUnique({
      where: { id: voorstelId },
    });

    if (!voorstel) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }

    const data = voorstel.receptData as unknown as ReceptData;
    const slug = await uniekeSlug(maakSlug(data.titel));

    await prisma.$transaction(async (tx) => {
      const recept = await tx.recept.create({
        data: {
          titel: data.titel,
          slug,
          categorie: data.categorie as never,
          porties: data.porties ?? null,
          bereidingstijd: data.bereidingstijd ?? null,
          herkomstNaam: data.herkomstNaam ?? null,
          herkomstUrl: data.herkomstUrl ?? null,
        },
      });

      if (data.ingredienten?.length) {
        await tx.ingredient.createMany({
          data: data.ingredienten.map((ing, i) => ({
            receptId: recept.id,
            volgorde: i,
            naam: ing.naam,
            hoeveelheid:
              ing.hoeveelheid != null
                ? parseFloat(String(ing.hoeveelheid)) || null
                : null,
            eenheid: ing.eenheid ?? null,
            notitie: ing.notitie ?? null,
          })),
        });
      }

      if (data.stappen?.length) {
        await tx.stap.createMany({
          data: data.stappen.map((stap, i) => ({
            receptId: recept.id,
            volgorde: i,
            tekst: stap.tekst,
          })),
        });
      }

      await tx.voorgesteldRecept.delete({ where: { id: voorstelId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

// DELETE = afwijzen: verwijder het voorstel
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.voorgesteldRecept.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
