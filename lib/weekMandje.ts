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

export async function aantalInMandje(): Promise<number> {
  return prisma.weekItem.count();
}

export async function receptIdsInMandje(): Promise<number[]> {
  const items = await prisma.weekItem.findMany({ select: { receptId: true } });
  return items.map((i) => i.receptId);
}
