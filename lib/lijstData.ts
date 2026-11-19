// Haalt de gegevens voor de boodschappenlijst uit de database en geeft ze aan
// de pure berekening in lib/boodschappenlijst.ts. Gebruikt door de pagina's en
// routes van de eigenaar (en later door de deellink).

import { prisma } from "@/lib/prisma";
import { berekenLijst, type LijstSectie } from "@/lib/boodschappenlijst";

export interface LijstStand {
  secties: LijstSectie[];
  afgevinkt: string[];
}

export const MAX_EIGEN_REGELS = 100;
export const MAX_EIGEN_TEKST = 80;

export async function laadLijst(): Promise<LijstStand> {
  const [items, eigen] = await Promise.all([
    prisma.weekItem.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        recept: {
          select: {
            id: true,
            titel: true,
            porties: true,
            ingredienten: {
              orderBy: { volgorde: "asc" },
              select: {
                hoeveelheid: true,
                eenheid: true,
                naam: true,
                oorspronkelijkeTekst: true,
                product: { select: { id: true, naam: true, afdeling: true, altijdInHuis: true } },
              },
            },
          },
        },
      },
    }),
    prisma.lijstRegel.findMany({ orderBy: { id: "asc" }, select: { id: true, tekst: true } }),
  ]);

  const secties = berekenLijst(
    items.map((i) => ({
      receptId: i.recept.id,
      titel: i.recept.titel,
      porties: i.recept.porties,
      gekozenPorties: i.porties,
      ingredienten: i.recept.ingredienten,
    })),
    eigen
  );

  return { secties, afgevinkt: [] };
}

export type EigenRegelResultaat = { ok: true } | { ok: false; status: number; fout: string };

// Voegt een eigen regel toe, met grenzen aan lengte en aantal.
export async function voegEigenRegelToe(tekst: unknown): Promise<EigenRegelResultaat> {
  const schoon = typeof tekst === "string" ? tekst.replace(/\s+/g, " ").trim() : "";
  if (!schoon) return { ok: false, status: 400, fout: "Vul een regel in" };
  if (schoon.length > MAX_EIGEN_TEKST) {
    return { ok: false, status: 400, fout: `Maximaal ${MAX_EIGEN_TEKST} tekens` };
  }
  if ((await prisma.lijstRegel.count()) >= MAX_EIGEN_REGELS) {
    return { ok: false, status: 400, fout: "Er staan al te veel eigen regels op de lijst" };
  }
  await prisma.lijstRegel.create({ data: { tekst: schoon } });
  return { ok: true };
}
