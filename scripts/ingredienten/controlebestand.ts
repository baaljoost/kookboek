// Maakt data/omzetting/controle.csv uit export.json, bronnen.json en
// data/producten.json. Gebruikt de database niet.
//
// Een bestaand controle.csv wordt niet overschreven (daar zit jouw nakijkwerk
// in), tenzij je --overschrijven meegeeft.
//
//   npx tsx scripts/ingredienten/controlebestand.ts [--overschrijven]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { maakControleRijen, rijenNaarTabel } from "./controle";
import { naarCsv } from "./csv";
import { draai, leesJson, leesProductLijst, stop, uitvoerPad, vlag } from "./gedeeld";
import type { BronBestand, ExportBestand } from "./soorten";

draai(async () => {
  const exportBestand = leesJson<ExportBestand>(uitvoerPad("export.json"), "Draai eerst exporteer.ts.");
  const bronPad = uitvoerPad("bronnen.json");
  const bronnen: BronBestand = existsSync(bronPad) ? JSON.parse(readFileSync(bronPad, "utf8")) : {};
  if (!existsSync(bronPad)) console.log("Let op: bronnen.json ontbreekt; er wordt niet met bronpagina's vergeleken.\n");

  const pad = uitvoerPad("controle.csv");
  if (existsSync(pad) && !vlag("overschrijven")) {
    stop(`${pad} bestaat al. Daar kan jouw nakijkwerk in zitten. Gebruik --overschrijven om het te vervangen.`);
  }

  const rijen = maakControleRijen(exportBestand, bronnen, leesProductLijst());
  writeFileSync(pad, naarCsv(rijenNaarTabel(rijen)));

  const akkoord = rijen.filter((r) => r.akkoord === "ja").length;
  const metBron = rijen.filter((r) => r.bronregel).length;
  const metProduct = rijen.filter((r) => r.product).length;
  console.log(`Export van ${exportBestand.gemaaktOp} (database ${exportBestand.databaseHost})`);
  console.log(`${rijen.length} regels in ${pad}`);
  console.log(`  akkoord "ja" (zeker):   ${akkoord}`);
  console.log(`  twijfel (akkoord leeg): ${rijen.length - akkoord}`);
  console.log(`  met bronregel:          ${metBron}`);
  console.log(`  met product:            ${metProduct}`);

  // Soorten twijfel, zodat je weet waar het nakijkwerk zit
  const soorten = new Map<string, number>();
  for (const rij of rijen) {
    for (const t of rij.twijfel.split(" | ").filter(Boolean)) {
      const soort = t.split(":")[0];
      soorten.set(soort, (soorten.get(soort) ?? 0) + 1);
    }
  }
  if (soorten.size) {
    console.log("\nTwijfel per soort:");
    for (const [soort, aantal] of [...soorten].sort((a, b) => b[1] - a[1])) console.log(`  ${String(aantal).padStart(4)}  ${soort}`);
  }

  // Namen zonder product, meest voorkomend eerst: kandidaten voor data/producten.json
  const zonder = new Map<string, number>();
  for (const rij of rijen) if (!rij.product) zonder.set(rij.naam.toLowerCase(), (zonder.get(rij.naam.toLowerCase()) ?? 0) + 1);
  const top = [...zonder].sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (top.length) {
    console.log(`\nZonder product: ${rijen.length - metProduct} regels, ${zonder.size} verschillende namen. Meest voorkomend:`);
    for (const [naam, aantal] of top) console.log(`  ${String(aantal).padStart(4)}  ${naam}`);
  }

  console.log('\nNakijken: pas voorgestelde waarden aan waar nodig en zet "ja" in de kolom akkoord.');
  console.log("Regels zonder \"ja\" blijven ongewijzigd.");
});
