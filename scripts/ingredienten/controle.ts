// Maakt de rijen van controle.csv en leest ze terug. Werkt zonder database.

import { parseHoeveelheidTekst } from "../../lib/ingredientParser";
import { bouwProductIndex, zoekProduct } from "../../lib/productKoppeling";
import { afdelingLabel } from "../../lib/afdelingen";
import type { ProductDefinitie } from "../../lib/productLijst";
import { koppelBronregels, vergelijkMetBron } from "./bron";
import { leesCsv } from "./csv";
import type { OudeRegel } from "./herstel";
import { uitOpgeslagen, type BronBestand, type ExportBestand } from "./soorten";

export const KOLOMMEN = [
  "slug",
  "recept",
  "volgorde",
  "oude_hoeveelheid",
  "oude_eenheid",
  "oude_naam",
  "oude_notitie",
  "herstelde_tekst",
  "bronregel",
  "hoeveelheid",
  "eenheid",
  "naam",
  "notitie",
  "product",
  "afdeling",
  "twijfel",
  "opmerking",
  "akkoord",
] as const;

export type Kolom = (typeof KOLOMMEN)[number];
export type ControleRij = Record<Kolom, string>;

// Getal voor in het CSV-bestand: punt als decimaalteken, "NaN" voor een
// ongeldig opgeslagen waarde, leeg voor geen hoeveelheid.
export function getalNaarCsv(waarde: number | null | undefined): string {
  if (waarde == null) return "";
  return Number.isNaN(waarde) ? "NaN" : String(waarde);
}

// Lees een getal uit het CSV-bestand. Punt of komma als decimaalteken,
// ook "1/2" en "½". Leeg → null, onleesbaar → undefined.
export function csvNaarGetal(tekst: string): number | null | undefined {
  const s = tekst.trim();
  if (!s) return null;
  if (s === "NaN") return NaN;
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(",", "."));
  const gelezen = parseHoeveelheidTekst(s);
  return gelezen == null ? undefined : gelezen;
}

export function maakControleRijen(
  exportBestand: ExportBestand,
  bronnen: BronBestand,
  producten: ProductDefinitie[]
): ControleRij[] {
  const index = bouwProductIndex(producten.map((p) => ({ sleutel: p.naam, naam: p.naam, synoniemen: p.synoniemen })));
  const afdelingVan = new Map(producten.map((p) => [p.naam, p.afdeling]));
  const rijen: ControleRij[] = [];

  for (const recept of exportBestand.recepten) {
    // Alleen regels die nog niet zijn omgezet
    const open = recept.ingredienten.filter((ing) => ing.oorspronkelijkeTekst == null && ing.herstel);
    const oud = open.map((ing) => ({
      volgorde: ing.volgorde,
      oud: {
        hoeveelheid: uitOpgeslagen(ing.hoeveelheid),
        eenheid: ing.eenheid,
        naam: ing.naam,
        notitie: ing.notitie,
      } satisfies OudeRegel,
    }));

    const pagina = recept.herkomstUrl ? bronnen[recept.herkomstUrl] : undefined;
    const bronregels =
      pagina?.status === "ok" ? koppelBronregels(oud, pagina.regels) : open.map((): string | null => null);

    open.forEach((ing, i) => {
      const herstel = ing.herstel!;
      const bronregel = bronregels[i];
      const uitkomst = bronregel
        ? vergelijkMetBron(oud[i].oud, herstel, bronregel)
        : { voorstel: herstel.voorstel, twijfel: herstel.twijfel, opmerkingen: herstel.opmerkingen };

      // Een bestaande koppeling (via de beheerpagina) blijft staan
      const product = ing.product ?? zoekProduct(index, uitkomst.voorstel.naam) ?? "";
      const afdeling = afdelingVan.get(product);

      rijen.push({
        slug: recept.slug,
        recept: recept.titel,
        volgorde: String(ing.volgorde),
        oude_hoeveelheid: getalNaarCsv(oud[i].oud.hoeveelheid),
        oude_eenheid: ing.eenheid ?? "",
        oude_naam: ing.naam,
        oude_notitie: ing.notitie ?? "",
        herstelde_tekst: herstel.tekst,
        bronregel: bronregel ?? "",
        hoeveelheid: getalNaarCsv(uitkomst.voorstel.hoeveelheid),
        eenheid: uitkomst.voorstel.eenheid ?? "",
        naam: uitkomst.voorstel.naam,
        notitie: uitkomst.voorstel.notitie ?? "",
        product,
        afdeling: afdeling ? afdelingLabel(afdeling) : "",
        twijfel: uitkomst.twijfel.join(" | "),
        opmerking: uitkomst.opmerkingen.join(" | "),
        akkoord: uitkomst.twijfel.length === 0 ? "ja" : "",
      });
    });
  }
  return rijen;
}

export function rijenNaarTabel(rijen: ControleRij[]): string[][] {
  return [[...KOLOMMEN], ...rijen.map((rij) => KOLOMMEN.map((k) => rij[k]))];
}

// Lees controle.csv terug. Kolommen mogen in een andere volgorde staan;
// ontbreekt er een, dan stopt het lezen met een fout.
export function leesControle(tekst: string): ControleRij[] {
  const tabel = leesCsv(tekst);
  if (tabel.length === 0) return [];
  const kop = tabel[0].map((k) => k.trim().toLowerCase());
  const plek = new Map<Kolom, number>();
  for (const kolom of KOLOMMEN) {
    const i = kop.indexOf(kolom);
    if (i < 0) throw new Error(`controle.csv mist de kolom "${kolom}"`);
    plek.set(kolom, i);
  }
  return tabel.slice(1).map((regel) => {
    const rij = {} as ControleRij;
    for (const kolom of KOLOMMEN) rij[kolom] = regel[plek.get(kolom)!] ?? "";
    return rij;
  });
}
