// Koppelt een ingrediëntnaam aan een product.
//
// Alleen exacte overeenkomst na normaliseren, geen benaderend zoeken:
// "kokosmelk" wordt nooit aan "melk" gekoppeld. Dezelfde functies worden
// gebruikt door de imports, de beheerpagina en het omzetscript.

import type { Prisma, PrismaClient } from "@prisma/client";

// Kleine letters, geen accenten, geen haakjes of leestekens.
// "Crème fraîche (volle)" → "creme fraiche", "pinda's" → "pindas".
export function normaliseerNaam(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Woorden die niet veranderen welk product je koopt: maat, versheid en
// snijwijze. Bewust geen woorden als "rode", "gedroogde", "gerookte",
// "volle" of "gehakt": die maken er een ander product van.
const BIJWOORDEN = new Set([
  // Nederlands
  "grote", "groot", "kleine", "klein", "middelgrote", "middelgroot", "flinke", "flink",
  "dikke", "dunne", "verse", "vers", "rijpe", "rijp", "biologische", "biologisch",
  "fijngehakte", "fijngehakt", "grofgehakte", "grofgehakt", "gehakte",
  "fijngesneden", "gesneden", "gesnipperde", "gesnipperd", "fijngesnipperde", "fijngesnipperd",
  "geraspte", "geraspt", "geperste", "geperst", "geschilde", "geschild",
  "gewassen", "ontpitte", "ontpit", "gehalveerde", "gehalveerd",
  "optioneel", "eventueel", "een",
  // Engels
  "large", "small", "medium", "fresh", "ripe", "organic",
  "finely", "roughly", "thinly", "freshly",
  "chopped", "minced", "diced", "sliced", "grated", "peeled", "crushed", "halved",
  "optional", "a", "an",
]);

// Woordgroepen die hetzelfde doen.
const BIJZINNEN = [
  "in blokjes", "in plakjes", "in ringen", "in stukjes", "in reepjes", "in partjes",
  "naar smaak", "op kamertemperatuur", "to taste", "at room temperature",
];

// Genormaliseerde naam zonder maat-, versheids- en snijwoorden.
// "1 grote ui" heeft naam "grote ui" en sleutel "ui".
export function koppelSleutel(tekst: string): string {
  let naam = ` ${normaliseerNaam(tekst)} `;
  for (const zin of BIJZINNEN) naam = naam.replace(` ${zin} `, " ");
  const woorden = naam.split(" ").filter((w) => w && !BIJWOORDEN.has(w));
  return woorden.join(" ");
}

// Sleutel waarop "nog te koppelen" ingrediënten groepeert. Dezelfde tekst
// wordt synoniem zodra de groep aan een product is gekoppeld.
export function koppelGroep(naam: string): string {
  return koppelSleutel(naam) || normaliseerNaam(naam);
}

// Genormaliseerde tekst → product. T is een product-id (database) of een
// productnaam (omzetscript, dat zonder database werkt).
export type ProductIndex<T> = Map<string, T>;

export interface ProductVoorIndex<T> {
  sleutel: T;
  naam: string;
  synoniemen: string[];
}

export function bouwProductIndex<T>(producten: ProductVoorIndex<T>[]): ProductIndex<T> {
  const index: ProductIndex<T> = new Map();
  // Eerst alle namen, dan de synoniemen: een naam wint altijd.
  for (const p of producten) index.set(normaliseerNaam(p.naam), p.sleutel);
  for (const p of producten) {
    for (const synoniem of p.synoniemen) {
      const tekst = normaliseerNaam(synoniem);
      if (tekst && !index.has(tekst)) index.set(tekst, p.sleutel);
    }
  }
  return index;
}

// Zoek een ingrediëntnaam op. Eerst de hele genormaliseerde naam, daarna
// zonder maat- en snijwoorden. Niets gevonden → null.
export function zoekProduct<T>(index: ProductIndex<T>, naam: string): T | null {
  const genormaliseerd = normaliseerNaam(naam);
  if (!genormaliseerd) return null;
  const direct = index.get(genormaliseerd);
  if (direct !== undefined) return direct;
  const sleutel = koppelSleutel(naam);
  if (!sleutel || sleutel === genormaliseerd) return null;
  return index.get(sleutel) ?? null;
}

type Db = PrismaClient | Prisma.TransactionClient;

export async function laadProductIndex(db: Db): Promise<ProductIndex<number>> {
  const producten = await db.product.findMany({
    select: { id: true, naam: true, synoniemen: { select: { tekst: true } } },
  });
  return bouwProductIndex(
    producten.map((p) => ({
      sleutel: p.id,
      naam: p.naam,
      synoniemen: p.synoniemen.map((s) => s.tekst),
    }))
  );
}
