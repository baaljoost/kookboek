// Neemt het goedgekeurde koppelplan over in data/producten.json, zodat
// toekomstige imports de nieuwe producten en synoniemen herkennen. Raakt de
// database niet aan.
//
//   npx tsx scripts/ingredienten/producten-json-bijwerken.ts [--proef]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AFDELINGEN } from "../../lib/afdelingen";
import { normaliseerNaam } from "../../lib/productKoppeling";
import { valideerProductLijst, type ProductDefinitie } from "../../lib/productLijst";
import { bouwPlan } from "./koppelplan";
import { stop, uitvoerPad, vlag } from "./gedeeld";

const PAD = join(process.cwd(), "data", "producten.json");

// Zelfde opmaak als het bestaande bestand: één product per regel.
export function schrijfLijst(lijst: ProductDefinitie[]): string {
  const j = (x: unknown) => JSON.stringify(x);
  const regels = lijst.map(
    (p) => `  {"naam": ${j(p.naam)}, "afdeling": ${j(p.afdeling)}, "altijdInHuis": ${p.altijdInHuis}, "synoniemen": [${p.synoniemen.map(j).join(", ")}]}`
  );
  return "[\n" + regels.join(",\n") + "\n]\n";
}

const origineel = readFileSync(PAD, "utf8");
const lijst: ProductDefinitie[] = JSON.parse(origineel);
if (schrijfLijst(lijst) !== origineel) stop("data/producten.json heeft een andere opmaak dan verwacht; niets aangepast.");

// Producten die via de beheerpagina in de database kwamen maar nog niet in het bestand staan
const momentopname = JSON.parse(readFileSync(uitvoerPad("ongekoppeld.json"), "utf8")) as { producten: ProductDefinitie[] };
const alInBestand = new Set(lijst.map((p) => p.naam));
const toegevoegdUitDb: string[] = [];
for (const p of momentopname.producten) {
  if (alInBestand.has(p.naam)) continue;
  lijst.push({ naam: p.naam, afdeling: p.afdeling, altijdInHuis: p.altijdInHuis, synoniemen: p.synoniemen });
  alInBestand.add(p.naam);
  toegevoegdUitDb.push(p.naam);
}

const plan = bouwPlan(alInBestand);
const perNaam = new Map(lijst.map((p) => [p.naam, p]));

// Verplaatsingen: eerst weghalen bij het oude product
let verwijderd = 0;
for (const v of plan.verplaats) {
  const van = perNaam.get(v.van);
  if (!van) stop(`product "${v.van}" staat niet in producten.json`);
  const voor = van.synoniemen.length;
  van.synoniemen = van.synoniemen.filter((s) => normaliseerNaam(s) !== v.synoniem);
  if (van.synoniemen.length === voor) console.log(`  let op: "${v.synoniem}" stond niet bij "${v.van}" in het bestand`);
  else verwijderd++;
}

// Nieuwe producten achteraan, op afdelingsvolgorde
const volgorde = new Map(AFDELINGEN.map((a, i) => [a.code, i]));
const nieuw = [...plan.nieuweProducten].sort(
  (a, b) => (volgorde.get(a.afdeling) ?? 99) - (volgorde.get(b.afdeling) ?? 99) || a.naam.localeCompare(b.naam, "nl")
);
for (const p of nieuw) {
  const def: ProductDefinitie = { naam: p.naam, afdeling: p.afdeling, altijdInHuis: p.altijdInHuis, synoniemen: [] };
  lijst.push(def);
  perNaam.set(p.naam, def);
}

// Synoniemen erbij
let toegevoegd = 0;
for (const [product, set] of plan.synoniemen) {
  const def = perNaam.get(product);
  if (!def) stop(`product "${product}" staat niet in de lijst`);
  const aanwezig = new Set(def.synoniemen.map(normaliseerNaam));
  for (const tekst of [...set].sort((a, b) => a.localeCompare(b, "nl"))) {
    if (aanwezig.has(tekst)) continue;
    def.synoniemen.push(tekst);
    aanwezig.add(tekst);
    toegevoegd++;
  }
}

const fouten = valideerProductLijst(lijst);
if (fouten.length) {
  console.error("Botsingen in de nieuwe lijst, er is niets geschreven:");
  for (const f of fouten) console.error("  - " + f);
  process.exit(1);
}

console.log(`Producten: ${perNaam.size - nieuw.length - toegevoegdUitDb.length} → ${lijst.length}`);
console.log(`  uit de database overgenomen: ${toegevoegdUitDb.join(", ") || "-"}`);
console.log(`  nieuw: ${nieuw.length}, synoniemen verplaatst: ${verwijderd}, synoniemen toegevoegd: ${toegevoegd}`);
if (vlag("proef")) {
  console.log("Proef: niets geschreven.");
} else {
  writeFileSync(PAD, schrijfLijst(lijst));
  console.log("data/producten.json bijgewerkt.");
}
