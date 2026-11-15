// Past de regels uit controle.csv met akkoord "ja" toe op de database.
//
// Proefrun is de standaard: het script toont wat er zou gebeuren en schrijft
// niets. Schrijven gebeurt alleen met --uitvoeren --host=<database-host>.
//
//   npx tsx scripts/ingredienten/toepassen.ts
//   npx tsx scripts/ingredienten/toepassen.ts --uitvoeren --host=<host>
//   npx tsx scripts/ingredienten/toepassen.ts --terugdraaien=<bestand> [--uitvoeren --host=<host>]
//
// - Regels worden gezocht op recept-slug en volgorde; kloppen de oude
//   waarden niet meer (recept bewerkt sinds de export), dan blijft de regel staan.
// - Regels die al zijn omgezet worden overgeslagen: twee keer draaien is veilig.
// - Vóór het schrijven komt er een terugdraaibestand in data/omzetting/.
// - Alleen ingrediënten worden bijgewerkt; updatedAt van recepten verandert niet.

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { leesControle } from "./controle";
import { draai, leesJson, magSchrijven, optie, schrijfJson, stop, tijdstempel, uitvoerPad, verbind, type Database } from "./gedeeld";
import { dieetVerschillen, maakPlan, maakTerugdraaiPlan, type DbRegel, type Overgeslagen } from "./plan";
import { uitOpgeslagen, type RegelWaarden, type TerugdraaiBestand, type Wijziging } from "./soorten";

const db = verbind();

async function leesRegels(database: Database): Promise<DbRegel[]> {
  const regels = await database.prisma.ingredient.findMany({
    include: { recept: { select: { slug: true, titel: true } } },
    orderBy: [{ receptId: "asc" }, { volgorde: "asc" }, { id: "asc" }],
  });
  return regels.map((r) => ({
    id: r.id,
    slug: r.recept.slug,
    titel: r.recept.titel,
    volgorde: r.volgorde,
    hoeveelheid: r.hoeveelheid,
    eenheid: r.eenheid,
    naam: r.naam,
    notitie: r.notitie,
    oorspronkelijkeTekst: r.oorspronkelijkeTekst,
    productId: r.productId,
  }));
}

function toonOvergeslagen(overgeslagen: Overgeslagen[]) {
  if (!overgeslagen.length) return;
  const perReden = new Map<string, Overgeslagen[]>();
  for (const o of overgeslagen) perReden.set(o.reden, [...(perReden.get(o.reden) ?? []), o]);
  console.log(`\nOvergeslagen: ${overgeslagen.length}`);
  for (const [reden, lijst] of perReden) {
    console.log(`  ${lijst.length}× ${reden}`);
    for (const o of lijst.slice(0, 15)) console.log(`      ${o.slug} #${o.volgorde}: ${o.naam}`);
    if (lijst.length > 15) console.log(`      … en ${lijst.length - 15} andere`);
  }
}

// Schrijf één set waarden naar één regel. `alleenAls` beschermt tegen een
// wijziging tussen lezen en schrijven.
async function schrijfRegel(database: Database, id: number, waarden: RegelWaarden, alleenAls: { oorspronkelijkeTekst: string | null }) {
  const hoeveelheid = uitOpgeslagen(waarden.hoeveelheid);
  const ongeldig = hoeveelheid != null && Number.isNaN(hoeveelheid);
  const uitkomst = await database.prisma.ingredient.updateMany({
    where: { id, oorspronkelijkeTekst: alleenAls.oorspronkelijkeTekst },
    data: {
      hoeveelheid: ongeldig ? null : hoeveelheid,
      eenheid: waarden.eenheid,
      naam: waarden.naam,
      notitie: waarden.notitie,
      oorspronkelijkeTekst: waarden.oorspronkelijkeTekst,
      productId: waarden.productId,
    },
  });
  // Een ongeldige oude waarde (NaN) exact terugzetten kan alleen met SQL
  if (ongeldig && uitkomst.count === 1) {
    await database.prisma.$executeRaw`UPDATE "Ingredient" SET "hoeveelheid" = 'NaN'::float8 WHERE "id" = ${id}`;
  }
  return uitkomst.count;
}

async function terugdraaien(bestandsnaam: string) {
  const pad = isAbsolute(bestandsnaam) ? bestandsnaam : existsSync(bestandsnaam) ? bestandsnaam : join(uitvoerPad(""), bestandsnaam);
  const bestand = leesJson<TerugdraaiBestand>(pad, "Geef de naam van een terugdraaibestand uit data/omzetting/.");
  if (bestand.databaseHost !== db.host) {
    stop(`Dit terugdraaibestand hoort bij database ${bestand.databaseHost}, niet bij ${db.host}.`);
  }
  const schrijven = magSchrijven(db);
  const plan = maakTerugdraaiPlan(bestand.wijzigingen, await leesRegels(db));

  console.log(`\nTerugdraaibestand van ${bestand.gemaaktOp}: ${bestand.wijzigingen.length} regels`);
  console.log(`  terug te zetten:    ${plan.herstellen.length}`);
  console.log(`  al teruggezet:      ${plan.alTeruggedraaid}`);
  toonOvergeslagen(plan.overgeslagen);

  if (!schrijven) {
    console.log("\nProefrun: er is niets geschreven.");
    console.log(`Echt terugdraaien: voeg toe  --uitvoeren --host=${db.host}`);
    return;
  }
  let teruggezet = 0;
  for (const w of plan.herstellen) {
    teruggezet += await schrijfRegel(db, w.id, w.oud, { oorspronkelijkeTekst: w.nieuw.oorspronkelijkeTekst });
  }
  console.log(`\nTeruggezet: ${teruggezet} van ${plan.herstellen.length} regels.`);
}

async function toepassen() {
  const pad = optie("bestand") ?? uitvoerPad("controle.csv");
  if (!existsSync(pad)) stop(`${pad} bestaat niet. Draai eerst controlebestand.ts.`);
  const rijen = leesControle(readFileSync(pad, "utf8"));
  const schrijven = magSchrijven(db);

  const regels = await leesRegels(db);
  const producten = await db.prisma.product.findMany({ select: { id: true, naam: true } });
  const plan = maakPlan(rijen, regels, producten);

  console.log(`\n${pad}: ${rijen.length} regels`);
  console.log(`  zonder akkoord (blijven ongewijzigd): ${plan.zonderAkkoord}`);
  console.log(`  ${schrijven ? "om te zetten" : "zou worden omgezet"}:                 ${plan.wijzigingen.length}`);
  if (Object.keys(plan.telling).length) {
    console.log("\nPer soort wijziging (een regel kan in meerdere soorten vallen):");
    for (const [soort, aantal] of Object.entries(plan.telling).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(aantal).padStart(5)}  ${soort}`);
    }
  }
  toonOvergeslagen(plan.overgeslagen);

  const verschillen = dieetVerschillen(regels, plan.wijzigingen, new Map(producten.map((p) => [p.id, p.naam])));
  const jaNee = (b: boolean) => (b ? "ja" : "nee");
  console.log(`\nDieetfilter: bij ${verschillen.length} recepten verandert de uitkomst`);
  for (const v of verschillen) {
    const delen = [
      v.vegetarisch && `vegetarisch ${jaNee(v.vegetarisch[0])} → ${jaNee(v.vegetarisch[1])}`,
      v.vegan && `vegan ${jaNee(v.vegan[0])} → ${jaNee(v.vegan[1])}`,
    ].filter(Boolean);
    console.log(`  ${v.titel} (${v.slug}): ${delen.join(", ")}`);
  }

  if (!schrijven) {
    console.log("\nProefrun: er is niets geschreven.");
    console.log(`Echt toepassen: npx tsx scripts/ingredienten/toepassen.ts --uitvoeren --host=${db.host}`);
    return;
  }
  if (plan.wijzigingen.length === 0) {
    console.log("\nNiets om te wijzigen; er is niets geschreven.");
    return;
  }

  // Eerst het terugdraaibestand, dan pas schrijven
  const terugPad = uitvoerPad(`terugdraaien-${tijdstempel()}.json`);
  const terug: TerugdraaiBestand = { gemaaktOp: new Date().toISOString(), databaseHost: db.host, wijzigingen: plan.wijzigingen };
  schrijfJson(terugPad, terug);
  console.log(`\nTerugdraaibestand: ${terugPad}`);

  let geschreven = 0;
  const gemist: Wijziging[] = [];
  for (const w of plan.wijzigingen) {
    // Alleen als de regel nog niet is omgezet (oorspronkelijkeTekst leeg)
    const aantal = await schrijfRegel(db, w.id, w.nieuw, { oorspronkelijkeTekst: null });
    if (aantal === 1) geschreven++;
    else gemist.push(w);
  }
  console.log(`Omgezet: ${geschreven} van ${plan.wijzigingen.length} regels.`);
  if (gemist.length) {
    console.log(`Niet geschreven (tijdens de run gewijzigd): ${gemist.map((w) => `${w.slug} #${w.volgorde}`).join(", ")}`);
  }
  console.log(`Terugdraaien: npx tsx scripts/ingredienten/toepassen.ts --terugdraaien=${terugPad} --uitvoeren --host=${db.host}`);
}

draai(async () => {
  const terug = optie("terugdraaien");
  if (process.argv.includes("--terugdraaien") && !terug) stop("Geef het bestand mee: --terugdraaien=<bestand>");
  if (terug) await terugdraaien(terug);
  else await toepassen();
}, db);
