// Schrijft alle recepttabellen naar één JSON-bestand in data/omzetting/.
// Leest alleen. Werkt ook als het nieuwe schema nog niet is toegepast,
// omdat het de tabellen rechtstreeks uitleest.
//
//   npx tsx scripts/ingredienten/backup.ts

import { draai, schrijfJson, tijdstempel, uitvoerPad, verbind } from "./gedeeld";

const TABELLEN = [
  "Recept",
  "Ingredient",
  "Stap",
  "Foto",
  "Opmerking",
  "Tag",
  "ReceptTag",
  "VoorgesteldRecept",
  "ImportMelding",
  "Product",
  "ProductSynoniem",
];

const db = verbind();

draai(async () => {
  const aanwezig = await db.prisma.$queryRawUnsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()"
  );
  const bestaat = new Set(aanwezig.map((t) => t.table_name));

  const tabellen: Record<string, unknown[]> = {};
  for (const tabel of TABELLEN) {
    if (!bestaat.has(tabel)) {
      console.log(`  ${tabel.padEnd(18)} bestaat (nog) niet, overgeslagen`);
      continue;
    }
    const rijen = await db.prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${tabel}"`);
    tabellen[tabel] = rijen;
    console.log(`  ${tabel.padEnd(18)} ${rijen.length} rijen`);
  }

  const pad = uitvoerPad(`backup-${tijdstempel()}.json`);
  schrijfJson(pad, { gemaaktOp: new Date().toISOString(), databaseHost: db.host, tabellen });
  console.log(`\nBack-up geschreven naar ${pad}`);
  console.log("Er is niets in de database gewijzigd.");
}, db);
