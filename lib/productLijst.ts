// De productlijst in data/producten.json: vorm en controle.
// Het laden in de database gebeurt met scripts/ingredienten/producten-laden.ts.

import { isAfdelingCode } from "./afdelingen";
import { normaliseerNaam } from "./productKoppeling";

export interface ProductDefinitie {
  naam: string; // Nederlands, enkelvoud, kleine letters
  afdeling: string; // code uit lib/afdelingen.ts
  altijdInHuis: boolean;
  synoniemen: string[]; // meervoud, Engelse naam, spelvariant
}

// Geeft een lijst fouten terug; leeg betekent dat de lijst klopt.
// Een tekst mag maar naar één product wijzen, anders is koppelen niet eenduidig.
export function valideerProductLijst(lijst: ProductDefinitie[]): string[] {
  const fouten: string[] = [];
  const eigenaar = new Map<string, string>();

  for (const p of lijst) {
    if (!p.naam || p.naam !== p.naam.toLowerCase().trim()) {
      fouten.push(`"${p.naam}": naam moet kleine letters zijn zonder spaties eromheen`);
    }
    if (!isAfdelingCode(p.afdeling)) fouten.push(`"${p.naam}": onbekende afdeling "${p.afdeling}"`);
    if (typeof p.altijdInHuis !== "boolean") fouten.push(`"${p.naam}": altijdInHuis ontbreekt`);
    const sleutel = normaliseerNaam(p.naam);
    if (!sleutel) fouten.push(`"${p.naam}": naam is leeg na normaliseren`);
    if (eigenaar.has(sleutel)) fouten.push(`"${p.naam}": naam botst met product "${eigenaar.get(sleutel)}"`);
    eigenaar.set(sleutel, p.naam);
  }

  for (const p of lijst) {
    const eigen = new Set<string>();
    for (const synoniem of p.synoniemen ?? []) {
      const sleutel = normaliseerNaam(synoniem);
      if (!sleutel) {
        fouten.push(`"${p.naam}": synoniem "${synoniem}" is leeg na normaliseren`);
        continue;
      }
      if (sleutel === normaliseerNaam(p.naam) || eigen.has(sleutel)) continue; // dubbel binnen het product is onschuldig
      eigen.add(sleutel);
      const ander = eigenaar.get(sleutel);
      if (ander && ander !== p.naam) {
        fouten.push(`"${p.naam}": synoniem "${synoniem}" wijst ook naar "${ander}"`);
      } else {
        eigenaar.set(sleutel, p.naam);
      }
    }
  }
  return fouten;
}

// De synoniemen zoals ze in de database komen: genormaliseerd, zonder de
// productnaam zelf en zonder dubbelen.
export function synoniemenVoorOpslag(p: ProductDefinitie): string[] {
  const eigenNaam = normaliseerNaam(p.naam);
  const uit = new Set<string>();
  for (const synoniem of p.synoniemen ?? []) {
    const sleutel = normaliseerNaam(synoniem);
    if (sleutel && sleutel !== eigenNaam) uit.add(sleutel);
  }
  return [...uit];
}
