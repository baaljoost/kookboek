// Vergelijkt de regels in de database met de regels op de bronpagina.
// Werkt zonder database en zonder netwerk; het ophalen zelf staat in
// bronnen-ophalen.ts.

import { parseIngredientRegel } from "../../lib/ingredientParser";
import { verdeelWaarschuwingen, type Herstel, type OudeRegel, type Voorstel } from "./herstel";
import { zelfdeGetal } from "./soorten";

// Zoek het Recipe-object in de JSON-LD van een pagina en geef de
// ingrediëntregels terug. Geen recept gevonden → null.
export function vindReceptRegels(html: string): string[] | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " "));
      const recept = zoekRecept(data, 0);
      if (!recept) continue;
      const regels = recept.recipeIngredient ?? recept.ingredients;
      if (Array.isArray(regels)) {
        return regels.map((r) => String(r ?? "").trim()).filter(Boolean);
      }
    } catch {
      // ongeldige JSON, volgende proberen
    }
  }
  return null;
}

function zoekRecept(data: unknown, diepte: number): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || diepte > 6) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const gevonden = zoekRecept(item, diepte + 1);
      if (gevonden) return gevonden;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
  if (obj["@graph"]) return zoekRecept(obj["@graph"], diepte + 1);
  return null;
}

// Alleen de letters van een regel. De oude parsers knipten een regel in
// stukken maar gooiden geen letters weg, dus een opgeslagen regel en zijn
// bronregel hebben dezelfde letters, hoe kapot de splitsing ook is.
export function letters(tekst: string): string {
  return tekst.toLowerCase().replace(/[^\p{L}]/gu, "");
}

function lettersVanRegel(oud: OudeRegel): string {
  return letters(`${oud.eenheid ?? ""}${oud.naam}${oud.notitie ?? ""}`);
}

// Welke hoeveelheid zouden de oude parsers bij deze bronregel hebben
// opgeslagen? "1/2" en "1 ½" → 1, "½" → niets, "2,5" → 2, "1-2" → 1.
export function oudeParserHoeveelheid(bronregel: string): number | null {
  const tekst = bronregel.trim();
  const komma = tekst.match(/^(.+?),\s*(.+)$/);
  const basis = komma ? komma[1].trim() : tekst;
  const begin = basis.match(/^[\d\s¼-¾⅐-⅞\/.\-]+/);
  if (!begin) return null;
  const getal = parseFloat(begin[0].trim());
  return Number.isNaN(getal) ? null : getal;
}

// Zoek bij elke opgeslagen regel de bronregel met dezelfde letters.
// Geeft per regel de bronregel of null. Elke bronregel wordt één keer gebruikt;
// bij gelijke regels wint de regel op dezelfde plek.
export function koppelBronregels(regels: { volgorde: number; oud: OudeRegel }[], bron: string[]): (string | null)[] {
  const vrij = new Map<string, number[]>();
  bron.forEach((regel, i) => {
    const sleutel = letters(regel);
    if (!sleutel) return;
    const lijst = vrij.get(sleutel) ?? [];
    lijst.push(i);
    vrij.set(sleutel, lijst);
  });

  return regels.map(({ volgorde, oud }) => {
    const lijst = vrij.get(lettersVanRegel(oud));
    if (!lijst?.length) return null;
    const plek = lijst.indexOf(volgorde);
    const [index] = lijst.splice(plek >= 0 ? plek : 0, 1);
    return bron[index];
  });
}

function maat(v: Voorstel): string {
  if (v.hoeveelheid == null) return v.eenheid ?? "geen hoeveelheid";
  const getal = String(Math.round(v.hoeveelheid * 1000) / 1000);
  return v.eenheid ? `${getal} ${v.eenheid}` : getal;
}

export interface Vergelijking {
  voorstel: Voorstel;
  twijfel: string[];
  opmerkingen: string[];
}

// Vergelijk een opgeslagen regel met zijn bronregel.
//  - Gelijk: de bron bevestigt de regel; twijfel over de splitsing vervalt.
//  - Anders: altijd twijfel. De database wordt nooit vanzelf overschreven,
//    want je kunt het recept zelf hebben aangepast.
export function vergelijkMetBron(oud: OudeRegel, herstel: Herstel, bronregel: string): Vergelijking {
  const bron = parseIngredientRegel(bronregel);
  const bronVoorstel: Voorstel = {
    hoeveelheid: bron.hoeveelheid,
    eenheid: bron.eenheid,
    naam: bron.naam,
    notitie: bron.notitie,
  };
  const bronInfo = verdeelWaarschuwingen(bron.waarschuwingen);
  const db = herstel.voorstel;

  // Was de splitsing niet te bepalen, dan telt ook de andere lezing: de
  // bronregel laat zien welke van de twee het was.
  const lezingen: { hoeveelheid: number | null; eenheid: string | null }[] = [db];
  if (herstel.alternatief) lezingen.push(parseIngredientRegel(herstel.alternatief));
  if (lezingen.some((l) => zelfdeGetal(bron.hoeveelheid, l.hoeveelheid) && bron.eenheid === l.eenheid)) {
    return { voorstel: bronVoorstel, twijfel: bronInfo.twijfel, opmerkingen: bronInfo.opmerkingen };
  }

  // Staat in de database precies wat de oude parser van de bronregel maakte,
  // dan is de regel na het importeren niet aangepast en verklaart de oude
  // parser het verschil.
  if (zelfdeGetal(oud.hoeveelheid, oudeParserHoeveelheid(bronregel))) {
    return {
      voorstel: bronVoorstel,
      twijfel: [
        `bron wijkt af: bron ${maat(bronVoorstel)}, database ${maat(db)}. ` +
          "Verklaard door de oude parser; de bronwaarde is als voorstel ingevuld",
        ...bronInfo.twijfel,
      ],
      opmerkingen: bronInfo.opmerkingen,
    };
  }

  return {
    voorstel: db,
    twijfel: [
      `bron wijkt af: bron ${maat(bronVoorstel)}, database ${maat(db)}. ` +
        "Mogelijk zelf aangepast; de databasewaarde is als voorstel ingevuld",
      ...herstel.twijfel,
    ],
    opmerkingen: herstel.opmerkingen,
  };
}
