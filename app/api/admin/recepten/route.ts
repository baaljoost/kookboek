import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maakSlug } from "@/lib/slug";
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

export async function POST(request: NextRequest) {
  const body: ReceptPayload = await request.json();

  // Unieke slug genereren
  let slug = maakSlug(body.titel);
  const bestaand = await prisma.recept.findUnique({ where: { slug } });
  if (bestaand) slug = `${slug}-${Date.now()}`;

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
