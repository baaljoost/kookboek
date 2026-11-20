// Het mandje: kleine hulpfuncties voor de server.

import { prisma } from "@/lib/prisma";

export const MAX_PORTIES = 99;

export function geldigeReceptId(waarde: unknown): number | null {
  const n = typeof waarde === "string" ? Number(waarde) : waarde;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

export function geldigePorties(waarde: unknown): number | null {
  return typeof waarde === "number" && Number.isInteger(waarde) && waarde >= 1 && waarde <= MAX_PORTIES
    ? waarde
    : null;
}

export async function receptIdsInMandje(): Promise<number[]> {
  const items = await prisma.weekItem.findMany({ select: { receptId: true } });
  return items.map((i) => i.receptId);
}

export interface MandjeItem {
  receptId: number;
  slug: string;
  titel: string;
  fotoUrl: string | null;
  standaardPorties: number | null;
  porties: number | null;
}

// Het mandje zoals de weekpagina en de deellink het tonen.
export async function laadMandje(): Promise<MandjeItem[]> {
  const items = await prisma.weekItem.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      recept: {
        select: {
          id: true,
          slug: true,
          titel: true,
          porties: true,
          fotos: { orderBy: { volgorde: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
  return items.map((i) => ({
    receptId: i.recept.id,
    slug: i.recept.slug,
    titel: i.recept.titel,
    fotoUrl: i.recept.fotos[0]?.url ?? null,
    standaardPorties: i.recept.porties && i.recept.porties > 0 ? i.recept.porties : null,
    porties: i.porties,
  }));
}

export type MandjeResultaat<T = object> = ({ ok: true } & T) | { ok: false; status: number; fout: string };

// Recept in het mandje; opnieuw aanroepen verandert niets. Via de deellink
// (`alleenGoedgekeurd`) mogen alleen goedgekeurde recepten erin, net als in de
// zoeklijst; de eigenaar mag alles.
export async function voegToeAanMandje(
  waarde: unknown,
  alleenGoedgekeurd: boolean
): Promise<MandjeResultaat<{ receptId: number; porties: number | null }>> {
  const receptId = geldigeReceptId(waarde);
  if (!receptId) return { ok: false, status: 400, fout: "Ongeldig recept" };
  const recept = await prisma.recept.findUnique({
    where: { id: receptId },
    select: { id: true, porties: true, goedgekeurd: true },
  });
  if (!recept || (alleenGoedgekeurd && !recept.goedgekeurd)) {
    return { ok: false, status: 404, fout: "Recept niet gevonden" };
  }
  const item = await prisma.weekItem.upsert({
    where: { receptId },
    update: {},
    create: { receptId, porties: recept.porties && recept.porties > 0 ? recept.porties : null },
  });
  return { ok: true, receptId: item.receptId, porties: item.porties };
}

export async function zetPortiesInMandje(
  receptIdWaarde: unknown,
  portiesWaarde: unknown
): Promise<MandjeResultaat<{ receptId: number; porties: number }>> {
  const receptId = geldigeReceptId(receptIdWaarde);
  if (!receptId) return { ok: false, status: 400, fout: "Ongeldig recept" };
  const porties = geldigePorties(portiesWaarde);
  if (!porties) return { ok: false, status: 400, fout: "Ongeldig aantal porties" };
  const { count } = await prisma.weekItem.updateMany({ where: { receptId }, data: { porties } });
  if (count === 0) return { ok: false, status: 404, fout: "Recept staat niet in het mandje" };
  return { ok: true, receptId, porties };
}

export async function haalUitMandje(receptIdWaarde: unknown): Promise<MandjeResultaat> {
  const receptId = geldigeReceptId(receptIdWaarde);
  if (!receptId) return { ok: false, status: 400, fout: "Ongeldig recept" };
  await prisma.weekItem.deleteMany({ where: { receptId } });
  return { ok: true };
}

// "Nieuwe week": bewaar de recepten van deze week in de geschiedenis en leeg het
// mandje en de eigen regels, en wis de vinkjes. Alles in één transactie, met
// voor alle regels dezelfde datum.
export async function startNieuweWeek(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const items = await tx.weekItem.findMany({
      orderBy: { createdAt: "asc" },
      include: { recept: { select: { titel: true } } },
    });
    if (items.length > 0) {
      const afgerondOp = new Date();
      await tx.weekGeschiedenis.createMany({
        data: items.map((i) => ({
          afgerondOp,
          receptId: i.receptId,
          receptTitel: i.recept.titel,
          porties: i.porties,
        })),
      });
    }
    await tx.weekItem.deleteMany();
    await tx.lijstRegel.deleteMany();
    await tx.lijstVink.deleteMany();
    return items.length;
  });
}

export interface ZoekRecept {
  receptId: number;
  slug: string;
  titel: string;
  fotoUrl: string | null;
  standaardPorties: number | null;
}

// De goedgekeurde recepten voor het zoekveld "Recept toevoegen".
export async function laadZoekRecepten(): Promise<ZoekRecept[]> {
  const alle = await prisma.recept.findMany({
    where: { goedgekeurd: true },
    orderBy: { titel: "asc" },
    select: { id: true, slug: true, titel: true, porties: true, fotos: { orderBy: { volgorde: "asc" }, take: 1, select: { url: true } } },
  });
  return alle.map((r) => ({
    receptId: r.id,
    slug: r.slug,
    titel: r.titel,
    fotoUrl: r.fotos[0]?.url ?? null,
    standaardPorties: r.porties && r.porties > 0 ? r.porties : null,
  }));
}
