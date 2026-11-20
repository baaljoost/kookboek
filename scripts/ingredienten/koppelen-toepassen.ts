// Past het goedgekeurde koppelplan toe op de database: nieuwe producten,
// verplaatste en nieuwe synoniemen, en het koppelen van de ingrediënten.
// Alles in één transactie; faalt iets, dan wordt niets geschreven.
//
// Proefrun is de standaard; schrijven alleen met --uitvoeren --host=<host>.
//
//   npx tsx scripts/ingredienten/koppelen-toepassen.ts
//   npx tsx scripts/ingredienten/koppelen-toepassen.ts --uitvoeren --host=<host>

import { koppelGroep, normaliseerNaam } from "../../lib/productKoppeling";
import { bouwPlan } from "./koppelplan";
import { draai, magSchrijven, schrijfJson, stop, tijdstempel, uitvoerPad, verbind } from "./gedeeld";

const db = verbind();

draai(async () => {
  const schrijven = magSchrijven(db);
  const { prisma } = db;

  const producten = await prisma.product.findMany({ select: { id: true, naam: true } });
  const synoniemen = await prisma.productSynoniem.findMany({ select: { tekst: true, productId: true } });
  const idVanNaam = new Map(producten.map((p) => [p.naam, p.id]));
  const naamVanId = new Map(producten.map((p) => [p.id, p.naam]));

  const plan = bouwPlan(new Set(producten.map((p) => p.naam)));

  // --- toestand in het geheugen naspelen en op botsingen controleren ----------
  const eigenaar = new Map<string, string>(); // genormaliseerde tekst → productnaam
  for (const p of producten) eigenaar.set(normaliseerNaam(p.naam), p.naam);
  for (const s of synoniemen) eigenaar.set(s.tekst, naamVanId.get(s.productId)!);

  const fouten: string[] = [];
  const teVerwijderen: { tekst: string; product: string }[] = [];
  let alVerplaatst = 0;
  for (const v of plan.verplaats) {
    if (eigenaar.get(v.synoniem) === v.naar) {
      alVerplaatst++; // eerder toegepast
      continue;
    }
    if (eigenaar.get(v.synoniem) !== v.van) {
      fouten.push(`synoniem "${v.synoniem}" hoort in de database niet bij "${v.van}" (maar bij "${eigenaar.get(v.synoniem) ?? "niemand"}")`);
      continue;
    }
    eigenaar.delete(v.synoniem);
    teVerwijderen.push({ tekst: v.synoniem, product: v.van });
  }

  for (const p of plan.nieuweProducten) {
    const n = normaliseerNaam(p.naam);
    const bezet = eigenaar.get(n);
    if (bezet) fouten.push(`nieuw product "${p.naam}" is al (synoniem van) "${bezet}"`);
    eigenaar.set(n, p.naam);
  }

  const teMaken: { tekst: string; product: string }[] = [];
  for (const [product, set] of plan.synoniemen) {
    for (const tekst of set) {
      const bezet = eigenaar.get(tekst);
      if (bezet && bezet !== product) fouten.push(`synoniem "${tekst}" voor "${product}" hoort al bij "${bezet}"`);
      else if (!bezet) {
        eigenaar.set(tekst, product);
        teMaken.push({ tekst, product });
      }
    }
  }

  // --- te koppelen ingrediënten bepalen ----------------------------------------
  const ongekoppeld = await prisma.ingredient.findMany({ where: { productId: null }, select: { id: true, naam: true } });
  const perGroep = new Map<string, number[]>();
  for (const ing of ongekoppeld) {
    const sleutel = koppelGroep(ing.naam);
    if (!perGroep.has(sleutel)) perGroep.set(sleutel, []);
    perGroep.get(sleutel)!.push(ing.id);
  }
  const koppelAanProduct = new Map<string, number[]>(); // productnaam → ingrediënt-id's
  const ontbreekt: string[] = [];
  let teKoppelen = 0;
  for (const g of plan.groepen) {
    const ids = perGroep.get(g.sleutel);
    if (!ids?.length) {
      ontbreekt.push(g.sleutel);
      continue;
    }
    if (!koppelAanProduct.has(g.product)) koppelAanProduct.set(g.product, []);
    koppelAanProduct.get(g.product)!.push(...ids);
    teKoppelen += ids.length;
  }

  // --- herkoppelen --------------------------------------------------------------
  const herkoppelRegels = await prisma.ingredient.findMany({
    where: { id: { in: plan.herkoppel.map((h) => h.id) } },
    select: { id: true, product: { select: { naam: true } } },
  });
  const huidig = new Map(herkoppelRegels.map((r) => [r.id, r.product?.naam ?? null]));
  const herkoppelen = plan.herkoppel.filter((h) => {
    if (huidig.get(h.id) === h.naar) return false; // eerder toegepast
    if (huidig.get(h.id) !== h.van) {
      console.log(`  herkoppelen overgeslagen: regel ${h.id} staat nu bij "${huidig.get(h.id) ?? "geen product"}", niet bij "${h.van}"`);
      return false;
    }
    return true;
  });

  // --- samenvatting ------------------------------------------------------------
  console.log(`\nNieuwe producten:        ${plan.nieuweProducten.length}`);
  console.log(`Synoniemen verplaatst:   ${teVerwijderen.length} (al eerder: ${alVerplaatst})`);
  console.log(`Synoniemen toegevoegd:   ${teMaken.length}`);
  console.log(`Groepen te koppelen:     ${plan.groepen.length - ontbreekt.length} (${teKoppelen} regels)`);
  console.log(`Regels herkoppelen:      ${herkoppelen.length}`);
  console.log(`Groepen overgeslagen (niet goedgekeurd): ${plan.overgeslagen.length}`);
  if (ontbreekt.length) console.log(`Groepen zonder ongekoppelde regels (inmiddels gekoppeld?): ${ontbreekt.join("; ")}`);
  if (fouten.length) {
    console.error("\nBotsingen, er wordt niets geschreven:");
    for (const f of fouten) console.error("  - " + f);
    process.exit(1);
  }
  if (!schrijven) {
    console.log("\nProefrun: er is niets geschreven. Gebruik --uitvoeren --host=<host> om toe te passen.");
    return;
  }

  // --- terugdraaibestand vooraf -----------------------------------------------------
  const terugdraaiPad = uitvoerPad(`terugdraaien-koppelen-${tijdstempel()}.json`);
  schrijfJson(terugdraaiPad, {
    gemaaktOp: new Date().toISOString(),
    databaseHost: db.host,
    nieuweProducten: plan.nieuweProducten.map((p) => p.naam),
    verwijderdeSynoniemen: teVerwijderen,
    nieuweSynoniemen: teMaken,
    gekoppeld: [...koppelAanProduct].flatMap(([product, ids]) => ids.map((id) => ({ id, product, was: null }))),
    herkoppeld: herkoppelen.map((h) => ({ id: h.id, product: h.naar, was: h.van })),
  });
  console.log(`\nTerugdraaibestand: ${terugdraaiPad}`);

  // --- schrijven, één transactie ----------------------------------------------------
  await prisma.$transaction(
    async (tx) => {
      const id = new Map(idVanNaam);
      for (const p of plan.nieuweProducten) {
        const gemaakt = await tx.product.create({ data: { naam: p.naam, afdeling: p.afdeling, altijdInHuis: p.altijdInHuis } });
        id.set(p.naam, gemaakt.id);
      }
      for (const s of teVerwijderen) {
        const r = await tx.productSynoniem.deleteMany({ where: { tekst: s.tekst, productId: id.get(s.product)! } });
        if (r.count !== 1) throw new Error(`synoniem "${s.tekst}" van "${s.product}": ${r.count} verwijderd, verwacht 1`);
      }
      await tx.productSynoniem.createMany({ data: teMaken.map((s) => ({ tekst: s.tekst, productId: id.get(s.product)! })) });
      for (const [product, ids] of koppelAanProduct) {
        const r = await tx.ingredient.updateMany({ where: { id: { in: ids }, productId: null }, data: { productId: id.get(product)! } });
        if (r.count !== ids.length) throw new Error(`"${product}": ${r.count} van ${ids.length} regels gekoppeld`);
      }
      for (const h of herkoppelen) {
        const r = await tx.ingredient.updateMany({ where: { id: h.id, productId: id.get(h.van)! }, data: { productId: id.get(h.naar)! } });
        if (r.count !== 1) throw new Error(`regel ${h.id} herkoppelen mislukt`);
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  );
  console.log("Klaar: alles toegepast.");
}, db);

void stop;
