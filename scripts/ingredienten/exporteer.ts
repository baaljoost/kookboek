// Schrijft alle ingrediëntregels naar data/omzetting/export.json, herstelt
// kapotte splitsingen en parset elke regel opnieuw. Leest alleen.
//
//   npx tsx scripts/ingredienten/exporteer.ts

import { KANDIDAAT_EENHEDEN } from "../../lib/eenheden";
import { draai, leesProductLijst, schrijfJson, uitvoerPad, verbind } from "./gedeeld";
import { herstelRegel, maakWoordenlijst } from "./herstel";
import { naarOpgeslagen, type ExportBestand, type ExportRecept } from "./soorten";

const db = verbind();

draai(async () => {
  const bekend = maakWoordenlijst(leesProductLijst());

  const kandidaatVan = new Map<string, string>();
  for (const e of KANDIDAAT_EENHEDEN) {
    for (const woord of [e.code, e.enkelvoud, e.meervoud, ...e.nl, ...e.en]) kandidaatVan.set(woord, e.code);
  }
  const kandidaatTelling: Record<string, number> = {};

  const recepten = await db.prisma.recept.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      titel: true,
      herkomstUrl: true,
      ingredienten: { orderBy: [{ volgorde: "asc" }, { id: "asc" }], include: { product: { select: { naam: true } } } },
    },
  });

  let open = 0;
  let omgezet = 0;
  let twijfel = 0;

  const uit: ExportRecept[] = recepten.map((recept) => ({
    id: recept.id,
    slug: recept.slug,
    titel: recept.titel,
    herkomstUrl: recept.herkomstUrl,
    ingredienten: recept.ingredienten.map((ing) => {
      const alOmgezet = ing.oorspronkelijkeTekst != null;
      const herstel = alOmgezet
        ? null
        : herstelRegel({ hoeveelheid: ing.hoeveelheid, eenheid: ing.eenheid, naam: ing.naam, notitie: ing.notitie }, bekend);

      if (herstel) {
        open++;
        if (herstel.twijfel.length) twijfel++;
        // Eenheden die nog niet op de lijst staan: tel hoe vaak ze voorkomen
        if (herstel.voorstel.hoeveelheid != null && herstel.voorstel.eenheid == null) {
          const eersteWoord = herstel.voorstel.naam.toLowerCase().match(/^[\p{L}]+/u)?.[0] ?? "";
          const code = kandidaatVan.get(eersteWoord);
          if (code) kandidaatTelling[code] = (kandidaatTelling[code] ?? 0) + 1;
        }
      } else {
        omgezet++;
      }

      return {
        id: ing.id,
        volgorde: ing.volgorde,
        hoeveelheid: naarOpgeslagen(ing.hoeveelheid),
        eenheid: ing.eenheid,
        naam: ing.naam,
        notitie: ing.notitie,
        oorspronkelijkeTekst: ing.oorspronkelijkeTekst,
        product: ing.product?.naam ?? null,
        herstel,
      };
    }),
  }));

  const bestand: ExportBestand = {
    gemaaktOp: new Date().toISOString(),
    databaseHost: db.host,
    recepten: uit,
    kandidaatTelling,
  };
  const pad = uitvoerPad("export.json");
  schrijfJson(pad, bestand);

  console.log(`\n${recepten.length} recepten, ${open + omgezet} ingrediëntregels`);
  console.log(`  nog om te zetten: ${open} (waarvan ${twijfel} met twijfel vóór bronvergelijking)`);
  console.log(`  al omgezet:       ${omgezet}`);

  const kandidaten = Object.entries(kandidaatTelling).sort((a, b) => b[1] - a[1]);
  if (kandidaten.length) {
    console.log("\nEenheden die nog niet op de lijst staan (3× of vaker = toevoegen, zie lib/eenheden.ts):");
    for (const [code, aantal] of kandidaten) console.log(`  ${code.padEnd(10)} ${aantal}×${aantal >= 3 ? "  ← toevoegen" : ""}`);
  }

  console.log(`\nExport geschreven naar ${pad}`);
  console.log("Er is niets in de database gewijzigd.");
}, db);
