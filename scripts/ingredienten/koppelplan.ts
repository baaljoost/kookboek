// Leest de goedgekeurde CSV's en maakt er één plan van. Gebruikt door
// koppelen-toepassen.ts (database) en producten-json-bijwerken.ts (bestand),
// zodat beide exact hetzelfde doen. Raakt zelf niets aan.
//
// Bronnen in data/omzetting/:
//   koppelvoorstel.csv                      alleen rijen met akkoord = ja
//   koppelvoorstel-synoniemen-verplaatsen.csv   idem
//   herkoppelen.csv                         alle rijen (goedgekeurd per tabel)

import { readFileSync } from "node:fs";
import { isAfdelingCode } from "../../lib/afdelingen";
import { normaliseerNaam } from "../../lib/productKoppeling";
import { leesCsv } from "./csv";
import { stop, uitvoerPad } from "./gedeeld";

export interface NieuwProduct {
  naam: string;
  afdeling: string;
  altijdInHuis: boolean;
}

export interface Verplaatsing {
  synoniem: string; // genormaliseerd
  van: string;
  naar: string;
}

export interface Plan {
  nieuweProducten: NieuwProduct[];
  verplaats: Verplaatsing[];
  // product → genormaliseerde synoniemen die erbij komen (zonder de verplaatste)
  synoniemen: Map<string, Set<string>>;
  // groepssleutel (zie koppelGroep) → product
  groepen: { sleutel: string; product: string; aantal: number }[];
  herkoppel: { id: number; van: string; naar: string }[];
  overgeslagen: { groep: string; product: string; reden: string }[];
}

function tabel(bestand: string): Record<string, string>[] {
  const rijen = leesCsv(readFileSync(uitvoerPad(bestand), "utf8")).filter((r) => r.length > 1);
  const kop = rijen[0];
  return rijen.slice(1).map((r) => Object.fromEntries(kop.map((k, i) => [k, r[i] ?? ""])));
}

const isJa = (w: string | undefined) => (w ?? "").trim().toLowerCase() === "ja";

// bestaandeProducten: namen die al bestaan (database of producten.json)
export function bouwPlan(bestaandeProducten: Set<string>): Plan {
  const voorstel = tabel("koppelvoorstel.csv");
  const moves = tabel("koppelvoorstel-synoniemen-verplaatsen.csv");
  const herkoppelRijen = tabel("herkoppelen.csv");

  // Definities van nieuwe producten: uit de "nieuw"-rijen (ook als die rij
  // zelf niet is goedgekeurd) en uit verplaatsingen naar een nieuw product.
  const definitie = new Map<string, NieuwProduct>();
  const definieer = (naam: string, afdeling: string, altijdInHuis: boolean, bron: string) => {
    if (!isAfdelingCode(afdeling)) stop(`${bron}: onbekende afdeling "${afdeling}" voor "${naam}"`);
    if (!definitie.has(naam)) definitie.set(naam, { naam, afdeling, altijdInHuis });
  };
  for (const r of voorstel) {
    if (r.actie === "nieuw") definieer(r.product, r.afdeling, r.altijdInHuis.trim().toLowerCase() === "ja", `groep "${r.groep}"`);
  }
  for (const m of moves) {
    if (m.afdeling_nieuw_product) definieer(m.naar_product, m.afdeling_nieuw_product, false, `verplaatsing "${m.synoniem}"`);
  }

  const nodig = new Set<string>(); // producten waar iets aan gekoppeld wordt
  const synoniemen = new Map<string, Set<string>>();
  const voegSynoniemToe = (product: string, tekst: string) => {
    const n = normaliseerNaam(tekst);
    if (!n || n === normaliseerNaam(product)) return;
    if (!synoniemen.has(product)) synoniemen.set(product, new Set());
    synoniemen.get(product)!.add(n);
  };

  const verplaats: Verplaatsing[] = [];
  for (const m of moves) {
    if (!isJa(m.akkoord)) continue;
    verplaats.push({ synoniem: normaliseerNaam(m.synoniem), van: m.van_product, naar: m.naar_product });
    nodig.add(m.naar_product);
    voegSynoniemToe(m.naar_product, m.synoniem);
  }

  const groepen: Plan["groepen"] = [];
  const overgeslagen: Plan["overgeslagen"] = [];
  for (const r of voorstel) {
    if (r.actie !== "nieuw" && r.actie !== "koppelen") {
      continue; // "geen product"
    }
    if (!isJa(r.akkoord)) {
      overgeslagen.push({ groep: r.groep, product: r.product, reden: r.twijfel ? "twijfel, niet goedgekeurd" : "niet goedgekeurd" });
      continue;
    }
    groepen.push({ sleutel: r.groep, product: r.product, aantal: Number(r.aantal) });
    nodig.add(r.product);
    for (const s of r.synoniemen_toevoegen.split("|").map((x) => x.trim()).filter(Boolean)) voegSynoniemToe(r.product, s);
  }

  const herkoppel = herkoppelRijen.map((r) => ({ id: Number(r.ingredient_id), van: r.nu_product, naar: r.voorstel_product }));
  for (const h of herkoppel) nodig.add(h.naar);

  const nieuweProducten: NieuwProduct[] = [];
  for (const naam of nodig) {
    if (bestaandeProducten.has(naam)) continue;
    const d = definitie.get(naam);
    if (!d) stop(`product "${naam}" bestaat niet en heeft geen definitie (afdeling) in de CSV's.`);
    nieuweProducten.push(d);
  }
  nieuweProducten.sort((a, b) => a.afdeling.localeCompare(b.afdeling) || a.naam.localeCompare(b.naam, "nl"));

  return { nieuweProducten, verplaats, synoniemen, groepen, herkoppel, overgeslagen };
}
