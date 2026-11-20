// Zoekt ingrediënten die al aan een product gekoppeld zijn, maar volgens
// koppelvoorstel-synoniemen-verplaatsen.csv bij een ander product horen
// (en olijven/kaas per soort). Leest alleen, schrijft niets in de database.
// Schrijft data/omzetting/herkoppelen.csv.
//
//   npx tsx scripts/ingredienten/herkoppelen-lezen.ts

import { readFileSync } from "node:fs";
import { normaliseerNaam } from "../../lib/productKoppeling";
import { leesCsv, naarCsv } from "./csv";
import { draai, uitvoerPad, verbind } from "./gedeeld";

const db = verbind();

function bevat(tekst: string, frase: string): boolean {
  return ` ${tekst} `.includes(` ${frase} `);
}

function olijfSoort(t: string): string | null {
  if (bevat(t, "kalamata") || t.includes("kalamata")) return "kalamataolijven";
  if (t.includes("zwart") || bevat(t, "black")) return "zwarte olijven";
  if (t.includes("groen") || bevat(t, "green")) return "groene olijven";
  return null;
}

function kaasSoort(t: string): string | null {
  if (t.includes("extra belegen")) return "extra belegen kaas";
  if (t.includes("jong belegen")) return "jong belegen kaas";
  if (t.includes("belegen")) return "belegen kaas";
  if (t.includes("jonge") || bevat(t, "jong")) return "jonge kaas";
  if (t.includes("overjarig") || bevat(t, "oude") || bevat(t, "oud")) return "oude kaas";
  return null;
}

draai(async () => {
  const rijen = leesCsv(readFileSync(uitvoerPad("koppelvoorstel-synoniemen-verplaatsen.csv"), "utf8"));
  const kop = rijen[0];
  const kolom = (naam: string) => kop.indexOf(naam);
  const verplaats = rijen.slice(1).filter((r) => r.length > 1).map((r) => ({
    synoniem: r[kolom("synoniem")],
    van: r[kolom("van_product")],
    naar: r[kolom("naar_product")],
  }));

  const vanProducten = [...new Set([...verplaats.map((v) => v.van), "olijven", "kaas"])];
  const regels = await db.prisma.ingredient.findMany({
    where: { product: { naam: { in: vanProducten } } },
    select: {
      id: true,
      naam: true,
      oorspronkelijkeTekst: true,
      product: { select: { naam: true } },
      recept: { select: { slug: true } },
    },
    orderBy: { id: "asc" },
  });

  const uit: string[][] = [["ingredient_id", "recept", "naam", "oorspronkelijke_tekst", "nu_product", "voorstel_product", "reden"]];
  let tel = 0;
  const perProduct: Record<string, number> = {};
  for (const r of regels) {
    const huidig = r.product!.naam;
    perProduct[huidig] = (perProduct[huidig] ?? 0) + 1;
    const tekst = normaliseerNaam(`${r.naam} ${r.oorspronkelijkeTekst ?? ""}`);
    let voorstel: string | null = null;
    let reden = "";
    if (huidig === "olijven") {
      voorstel = olijfSoort(tekst);
      reden = "soort olijf";
    } else if (huidig === "kaas") {
      voorstel = kaasSoort(tekst);
      reden = "soort kaas";
    } else {
      const m = verplaats.find((v) => v.van === huidig && bevat(tekst, normaliseerNaam(v.synoniem)));
      if (m) {
        voorstel = m.naar;
        reden = `bevat "${m.synoniem}"`;
      }
    }
    if (voorstel && voorstel !== huidig) {
      uit.push([String(r.id), r.recept.slug, r.naam, r.oorspronkelijkeTekst ?? "", huidig, voorstel, reden]);
      tel++;
    }
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(uitvoerPad("herkoppelen.csv"), naarCsv(uit));
  console.log(`${regels.length} gekoppelde regels bekeken bij ${vanProducten.length} producten; ${tel} voorstellen.`);
  console.log("Per huidig product (bekeken):", JSON.stringify(perProduct));
}, db);
