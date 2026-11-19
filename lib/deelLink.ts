// De geheime deellink voor de boodschappenlijst: /lijst/<code>.
// Wie de code kent kan de lijst bekijken, afvinken en eigen regels toevoegen,
// maar niet het mandje wijzigen. Vernieuwen maakt een nieuwe code; de oude
// werkt dan direct niet meer.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const LINK_ID = 1;
const CODE_BYTES = 24; // 192 bits, 32 tekens base64url

export function maakCode(): string {
  return randomBytes(CODE_BYTES).toString("base64url");
}

export async function haalCode(): Promise<string | null> {
  const rij = await prisma.deelLink.findUnique({ where: { id: LINK_ID }, select: { code: true } });
  return rij?.code ?? null;
}

// Maakt de link, of vervangt de code door een nieuwe.
export async function vernieuwCode(): Promise<string> {
  const code = maakCode();
  await prisma.deelLink.upsert({
    where: { id: LINK_ID },
    update: { code, vernieuwdOp: new Date() },
    create: { id: LINK_ID, code },
  });
  return code;
}

// Klopt de code met de huidige? Vergelijkt in constante tijd.
export async function controleerCode(code: unknown): Promise<boolean> {
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(code)) return false;
  const huidig = await haalCode();
  if (!huidig) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(huidig);
  return a.length === b.length && timingSafeEqual(a, b);
}
