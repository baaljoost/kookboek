import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

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
            hoeveelheid: ing.hoeveelheid != null ? parseFloat(String(ing.hoeveelheid)) || null : null,
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

      await tx.voorgesteldRecept.update({
        where: { id: voorstelId },
        data: { status: "GOEDGEKEURD" },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.voorgesteldRecept.update({
      where: { id: parseInt(id) },
      data: { status: "AFGEWEZEN" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
