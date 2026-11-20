// Leest de ingrediënten zonder product en de productlijst (met synoniemen)
// naar data/omzetting/ongekoppeld.json. Leest alleen, schrijft niets in de
// database.
//
//   npx tsx scripts/ingredienten/ongekoppeld-lezen.ts

import { koppelGroep } from "../../lib/productKoppeling";
import { draai, schrijfJson, uitvoerPad, verbind } from "./gedeeld";

const db = verbind();

draai(async () => {
  const [ongekoppeld, producten] = await Promise.all([
    db.prisma.ingredient.findMany({
      where: { productId: null },
      select: { id: true, naam: true, recept: { select: { slug: true } } },
      orderBy: { id: "asc" },
    }),
    db.prisma.product.findMany({
      select: { naam: true, afdeling: true, altijdInHuis: true, synoniemen: { select: { tekst: true } } },
      orderBy: { naam: "asc" },
    }),
  ]);

  const groepen = new Map<string, { sleutel: string; aantal: number; namen: Set<string>; recepten: Set<string> }>();
  for (const ing of ongekoppeld) {
    const sleutel = koppelGroep(ing.naam);
    if (!sleutel) continue;
    const g = groepen.get(sleutel) ?? { sleutel, aantal: 0, namen: new Set(), recepten: new Set() };
    g.aantal++;
    g.namen.add(ing.naam);
    g.recepten.add(ing.recept.slug);
    groepen.set(sleutel, g);
  }

  schrijfJson(uitvoerPad("ongekoppeld.json"), {
    gelezenOp: new Date().toISOString(),
    databaseHost: db.host,
    aantalIngredienten: ongekoppeld.length,
    groepen: [...groepen.values()]
      .map((g) => ({ sleutel: g.sleutel, aantal: g.aantal, namen: [...g.namen], recepten: [...g.recepten] }))
      .sort((a, b) => b.aantal - a.aantal || a.sleutel.localeCompare(b.sleutel, "nl")),
    producten: producten.map((p) => ({
      naam: p.naam,
      afdeling: p.afdeling,
      altijdInHuis: p.altijdInHuis,
      synoniemen: p.synoniemen.map((s) => s.tekst),
    })),
  });
  console.log(`${ongekoppeld.length} ingrediënten, ${groepen.size} groepen, ${producten.length} producten.`);
});
