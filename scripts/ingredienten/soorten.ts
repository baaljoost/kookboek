// Gedeelde vormen van de bestanden in data/omzetting/.

import type { Herstel } from "./herstel";

// JSON kent geen NaN; een ongeldig opgeslagen hoeveelheid staat als "NaN".
export type OpgeslagenGetal = number | null | "NaN";

export function naarOpgeslagen(waarde: number | null | undefined): OpgeslagenGetal {
  if (waarde == null) return null;
  return Number.isNaN(waarde) ? "NaN" : waarde;
}

export function uitOpgeslagen(waarde: OpgeslagenGetal): number | null {
  return waarde === "NaN" ? NaN : waarde;
}

// NaN telt als leeg; verder gelijk binnen een kleine marge.
export function zelfdeGetal(a: number | null | undefined, b: number | null | undefined): boolean {
  const leegA = a == null || Number.isNaN(a);
  const leegB = b == null || Number.isNaN(b);
  if (leegA || leegB) return leegA && leegB;
  return Math.abs((a as number) - (b as number)) < 1e-6;
}

export interface ExportRegel {
  id: number;
  volgorde: number;
  hoeveelheid: OpgeslagenGetal;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string | null; // gevuld = al omgezet
  product: string | null; // naam van het gekoppelde product
  herstel: Herstel | null; // null bij regels die al zijn omgezet
}

export interface ExportRecept {
  id: number;
  slug: string;
  titel: string;
  herkomstUrl: string | null;
  ingredienten: ExportRegel[];
}

export interface ExportBestand {
  gemaaktOp: string;
  databaseHost: string;
  recepten: ExportRecept[];
  // Hoe vaak een eenheid die nog niet op de lijst staat voorkomt (takje, plak…)
  kandidaatTelling: Record<string, number>;
}

export interface BronPagina {
  opgehaaldOp: string;
  status: "ok" | "geen-recept" | "fout";
  melding?: string;
  regels: string[];
}

export type BronBestand = Record<string, BronPagina>;

export interface RegelWaarden {
  hoeveelheid: OpgeslagenGetal;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string | null;
  productId: number | null;
}

export interface Wijziging {
  id: number;
  slug: string;
  volgorde: number;
  oud: RegelWaarden;
  nieuw: RegelWaarden;
}

export interface TerugdraaiBestand {
  gemaaktOp: string;
  databaseHost: string;
  wijzigingen: Wijziging[];
}
