// Haalt de gegevens voor de boodschappenlijst uit de database en geeft ze aan
// de pure berekening in lib/boodschappenlijst.ts. Gebruikt door de pagina's en
// routes van de eigenaar (en later door de deellink).

import { prisma } from "@/lib/prisma";
import { berekenLijst, type LijstSectie } from "@/lib/boodschappenlijst";

const MAX_SLEUTEL = 200;

export interface LijstStand {
  secties: LijstSectie[];
  afgevinkt: string[];
}

export const MAX_EIGEN_REGELS = 100;
export const MAX_EIGEN_TEKST = 80;

export async function laadLijst(): Promise<LijstStand> {
  const [items, eigen, vinkjes] = await Promise.all([
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
    prisma.lijstVink.findMany({ select: { sleutel: true } }),
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

  // Alleen vinkjes van regels die nu op de lijst staan; de rest blijft in de
  // tabel staan voor als het recept terugkomt, tot "Nieuwe week".
  const opLijst = new Set(secties.flatMap((s) => s.regels.map((r) => r.sleutel)));
  const afgevinkt = vinkjes.map((v) => v.sleutel).filter((k) => opLijst.has(k));

  return { secties, afgevinkt };
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

export type VinkResultaat = { ok: true } | { ok: false; status: number; fout: string };

// Zet of haalt een vinkje weg. Aanzetten mag alleen voor een regel die nu op de lijst staat.
export async function zetVink(sleutel: unknown, aan: unknown): Promise<VinkResultaat> {
  if (typeof sleutel !== "string" || !sleutel || sleutel.length > MAX_SLEUTEL || typeof aan !== "boolean") {
    return { ok: false, status: 400, fout: "Ongeldige aanvraag" };
  }
  if (aan) {
    const { secties } = await laadLijst();
    const staatOpLijst = secties.some((s) => s.regels.some((r) => r.sleutel === sleutel));
    if (!staatOpLijst) return { ok: false, status: 400, fout: "Deze regel staat niet op de lijst" };
    await prisma.lijstVink.upsert({ where: { sleutel }, update: {}, create: { sleutel } });
  } else {
    await prisma.lijstVink.deleteMany({ where: { sleutel } });
  }
  return { ok: true };
}
