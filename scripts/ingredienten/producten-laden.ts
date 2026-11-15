// Zet de producten en synoniemen uit data/producten.json in de database.
// Voegt alleen toe: bestaande producten (ook hun afdeling en "altijd in
// huis") en bestaande synoniemen blijven zoals ze zijn.
//
// Proefrun is de standaard; schrijven alleen met --uitvoeren --host=<host>.
//
//   npx tsx scripts/ingredienten/producten-laden.ts
//   npx tsx scripts/ingredienten/producten-laden.ts --uitvoeren --host=<host>

import { normaliseerNaam } from "../../lib/productKoppeling";
import { synoniemenVoorOpslag } from "../../lib/productLijst";
import { draai, leesProductLijst, magSchrijven, verbind } from "./gedeeld";

const db = verbind();

draai(async () => {
  const lijst = leesProductLijst();
  const schrijven = magSchrijven(db);

  const bestaand = await db.prisma.product.findMany({ select: { id: true, naam: true } });
  const synoniemen = await db.prisma.productSynoniem.findMany({ select: { tekst: true, productId: true } });
  const idVanNaam = new Map(bestaand.map((p) => [normaliseerNaam(p.naam), p.id]));
  const naamVanId = new Map(bestaand.map((p) => [p.id, p.naam]));
  const eigenaarVanSynoniem = new Map(synoniemen.map((s) => [s.tekst, s.productId]));

  let nieuweProducten = 0;
  let nieuweSynoniemen = 0;
  const botsingen: string[] = [];

  for (const product of lijst) {
    const sleutel = normaliseerNaam(product.naam);

    // Een productnaam mag niet al synoniem van een ander product zijn
    const alsSynoniem = eigenaarVanSynoniem.get(sleutel);
    if (!idVanNaam.has(sleutel) && alsSynoniem !== undefined) {
      botsingen.push(`product "${product.naam}" is in de database al synoniem van "${naamVanId.get(alsSynoniem)}"`);
      continue;
    }

    let id = idVanNaam.get(sleutel);
    if (id === undefined) {
      nieuweProducten++;
      if (schrijven) {
        const gemaakt = await db.prisma.product.create({
          data: { naam: product.naam, afdeling: product.afdeling, altijdInHuis: product.altijdInHuis },
        });
        id = gemaakt.id;
        idVanNaam.set(sleutel, id);
        naamVanId.set(id, product.naam);
      }
    }

    const toevoegen: string[] = [];
    for (const tekst of synoniemenVoorOpslag(product)) {
      const eigenaar = eigenaarVanSynoniem.get(tekst);
      const alsProduct = idVanNaam.get(tekst);
      if (eigenaar !== undefined) {
        if (eigenaar !== id) botsingen.push(`synoniem "${tekst}" van "${product.naam}" wijst in de database al naar "${naamVanId.get(eigenaar)}"`);
        continue;
      }
      if (alsProduct !== undefined && alsProduct !== id) {
        botsingen.push(`synoniem "${tekst}" van "${product.naam}" is in de database een eigen product`);
        continue;
      }
      toevoegen.push(tekst);
    }
    nieuweSynoniemen += toevoegen.length;
    if (schrijven && id !== undefined && toevoegen.length) {
      await db.prisma.productSynoniem.createMany({ data: toevoegen.map((tekst) => ({ tekst, productId: id as number })) });
      for (const tekst of toevoegen) eigenaarVanSynoniem.set(tekst, id);
    }
  }

  console.log(`\ndata/producten.json: ${lijst.length} producten`);
  console.log(`In de database:      ${bestaand.length} producten, ${synoniemen.length} synoniemen`);
  console.log(`${schrijven ? "Toegevoegd" : "Toe te voegen"}: ${nieuweProducten} producten, ${nieuweSynoniemen} synoniemen`);
  if (botsingen.length) {
    console.log(`\nOvergeslagen (${botsingen.length}), de database gaat voor:`);
    for (const b of botsingen) console.log(`  - ${b}`);
  }

  if (schrijven) {
    console.log("\nKlaar. Bestaande producten en synoniemen zijn niet gewijzigd.");
  } else {
    console.log("\nProefrun: er is niets geschreven.");
    console.log(`Echt laden: npx tsx scripts/ingredienten/producten-laden.ts --uitvoeren --host=${db.host}`);
  }
}, db);
