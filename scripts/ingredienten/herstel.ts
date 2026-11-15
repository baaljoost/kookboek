// Herstelt ingrediëntregels die door de oude parsers kapot zijn opgeslagen
// en parset ze opnieuw. Werkt zonder database.
//
//   3 | cl | oves garlic        →  "3 cloves garlic"   →  3 teen garlic
//   2 |    | 2      | 5 dl melk →  "2,5 dl melk"       →  250 ml melk
//   1 |    | -2 uien            →  "1-2 uien"          →  2 uien

import { alleEenheidWoorden, isEenheidCode, zoekEenheidWoord } from "../../lib/eenheden";
import { parseIngredientRegel, type Waarschuwing } from "../../lib/ingredientParser";
import { isBijwoord, normaliseerNaam } from "../../lib/productKoppeling";
import type { ProductDefinitie } from "../../lib/productLijst";

export interface OudeRegel {
  hoeveelheid: number | null; // kan NaN zijn
  eenheid: string | null;
  naam: string;
  notitie: string | null;
}

export interface Voorstel {
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
}

export interface Herstel {
  tekst: string; // de herstelde regel
  alternatief: string | null; // andere lezing als de splitsing niet te bepalen is
  voorstel: Voorstel;
  twijfel: string[]; // houdt automatisch akkoord tegen
  opmerkingen: string[]; // ter informatie
}

// De eenheden uit de oude regexen. Alleen deze kunnen midden in een woord
// zijn afgesplitst ("cl" + "oves").
const OUDE_REGEX_EENHEDEN = new Set([
  "ml", "dl", "cl", "l", "liter", "cc", "gram", "gr", "g", "kg", "kilogram", "el", "tl",
  "eetlepel", "theelepel", "kopje", "kop", "stuks", "stuk", "bosje", "teen", "teentje",
  "snufje", "scheut", "handvol", "plak", "plakje", "blik", "zakje", "pak", "can", "ons",
  "pond", "oz", "lb", "cup", "cups", "tbsp", "tsp", "bunch",
]);

// Veelvoorkomende woorden die niet in de productlijst staan. Onbekend is
// niet erg: dan komt de regel in twijfel en beslis jij.
const EXTRA_WOORDEN = [
  // Nederlands
  "gedroogde", "gedroogd", "gerookte", "gerookt", "geroosterde", "geroosterd", "gekookte", "gekookt",
  "gemalen", "gebakken", "gegrilde", "gegrild", "gezouten", "ongezouten", "bevroren", "ingemaakte",
  "rode", "rood", "groene", "groen", "gele", "geel", "witte", "wit", "zwarte", "zwart", "bruine", "bruin",
  "hele", "heel", "halve", "half", "volle", "vol", "magere", "mager", "zoete", "zoet", "zure", "zuur",
  "koude", "koud", "warme", "warm", "hete", "heet", "lauwe", "lauw", "lauwwarme", "lauwwarm",
  "extra", "gemengde", "griekse", "italiaanse", "chinese", "japanse", "turkse", "thaise",
  "groente", "groenten", "kruiden", "specerijen", "blaadjes", "blad", "bladeren", "garnering",
  "gelatine", "griesmeel", "granola", "grapefruit", "lamskoteletten", "lamsvlees", "lamsbout", "lam",
  "lasagne", "likeur", "limonade", "kopje", "kopjes", "kop", "koppen", "glas", "glazen", "liters", "grammen",
  "clementine", "clementines", "cranberries", "crackers", "croutons", "cress", "tuinkers", "cupcakes",
  // Engels
  "dried", "ground", "smoked", "toasted", "roasted", "cooked", "frozen", "canned", "salted", "unsalted",
  "red", "green", "yellow", "white", "black", "brown", "whole", "sweet", "sour", "hot", "cold", "warm",
  "light", "lean", "low", "long", "little", "leaves", "leaf", "loaf", "liquid", "lard", "lamb", "lettuce",
  "garnish", "gallon", "gallons", "gelatin", "grapefruit", "greens", "grain", "grains", "grapes",
  "crumbs", "cream", "clarified", "clear", "cleaned", "club", "cubed", "cut", "cured", "curly",
];

// Maakt de toets "is dit een bekend woord?" uit de productlijst, de
// eenhedenlijst en de lijst hierboven.
export function maakWoordenlijst(producten: ProductDefinitie[]): (woord: string) => boolean {
  const woorden = new Set<string>();
  const voegToe = (tekst: string) => {
    for (const woord of normaliseerNaam(tekst).split(" ")) if (woord.length > 1) woorden.add(woord);
  };
  for (const p of producten) {
    voegToe(p.naam);
    for (const synoniem of p.synoniemen ?? []) voegToe(synoniem);
  }
  for (const woord of alleEenheidWoorden()) voegToe(woord);
  for (const woord of EXTRA_WOORDEN) voegToe(woord);
  return (woord: string) => {
    const sleutel = normaliseerNaam(woord);
    return sleutel.length > 1 && (woorden.has(sleutel) || isBijwoord(sleutel));
  };
}

// Getal als tekst die de parser exact terugleest. "1.333" zou als duizendtal
// worden gelezen, dus daar komt een nul achter.
export function getalTekst(waarde: number): string {
  const tekst = String(waarde);
  return /^[1-9]\d{0,2}\.\d{3}$/.test(tekst) ? `${tekst}0` : tekst;
}

function tel(tekst: string, teken: string): number {
  return tekst.split(teken).length - 1;
}

const INFO: Partial<Record<Waarschuwing, string>> = {
  bereik: "bereik: hoogste waarde genomen",
  omgerekend: "omgerekend naar metrisch",
};
const TWIJFEL: Partial<Record<Waarschuwing, string>> = {
  duizendtal: "getal gelezen als duizendtal",
  vermenigvuldigd: "twee getallen vermenigvuldigd (2 x 400 g)",
  "tweede-hoeveelheid": "tweede hoeveelheid weggelaten",
  "geen-naam": "geen naam gevonden na hoeveelheid en eenheid",
};

// Verdeel parserwaarschuwingen over twijfel en opmerkingen.
export function verdeelWaarschuwingen(waarschuwingen: Waarschuwing[]): { twijfel: string[]; opmerkingen: string[] } {
  const twijfel: string[] = [];
  const opmerkingen: string[] = [];
  for (const w of waarschuwingen) {
    if (TWIJFEL[w]) twijfel.push(TWIJFEL[w] as string);
    else if (INFO[w]) opmerkingen.push(INFO[w] as string);
  }
  return { twijfel, opmerkingen };
}

function eersteWoord(tekst: string): string {
  return tekst.match(/^[\p{L}'’-]+/u)?.[0] ?? "";
}

export function herstelRegel(oud: OudeRegel, bekend: (woord: string) => boolean): Herstel {
  const twijfel: string[] = [];
  const opmerkingen: string[] = [];

  let hoeveelheid = oud.hoeveelheid;
  if (hoeveelheid != null && !Number.isFinite(hoeveelheid)) {
    hoeveelheid = null;
    twijfel.push("hoeveelheid was ongeldig opgeslagen (NaN)");
  }
  const eenheid = (oud.eenheid ?? "").trim();
  const naam = oud.naam.trim();
  const oudeNotitie = (oud.notitie ?? "").trim();
  let notitie = oudeNotitie;
  const getal = hoeveelheid != null ? getalTekst(hoeveelheid) : "";

  let basis: string; // hoeveelheid + eenheid + naam, zonder notitie
  let alternatief: string | null = null;
  let geplakt = false; // eenheid en naam zijn weer één woord

  const kommaGesplitst =
    hoeveelheid != null && !eenheid && /^\d+$/.test(naam) && Number(naam) === hoeveelheid && /^\d/.test(notitie);

  if (kommaGesplitst) {
    // "2,5 dl melk" werd op de komma gesplitst: 2 | naam "2" | notitie "5 dl melk"
    basis = `${naam},${notitie}`;
    notitie = "";
    opmerkingen.push("decimale komma hersteld");
  } else if (hoeveelheid != null && !eenheid && /^[-–—]\s*\d/.test(naam)) {
    // "1-2 uien" werd 1 | naam "-2 uien"
    basis = `${getal}${naam}`;
  } else if (eenheid) {
    const gespatieerd = [getal, eenheid, naam].filter(Boolean).join(" ");
    const woord = eersteWoord(naam);
    const kanGeplakt = OUDE_REGEX_EENHEDEN.has(eenheid.toLowerCase()) && woord.length > 0;
    if (!kanGeplakt) {
      basis = gespatieerd;
    } else {
      const aaneen = [getal, eenheid + naam].filter(Boolean).join(" ");
      const geplaktBekend = bekend(eenheid + woord);
      const losBekend = bekend(woord);
      if (geplaktBekend && !losBekend) {
        basis = aaneen;
        geplakt = true;
        opmerkingen.push(`splitsing hersteld: "${eenheid}" + "${woord}"`);
      } else if (losBekend && !geplaktBekend) {
        basis = gespatieerd;
      } else {
        // Niet te bepalen: voorstel is de gewone lezing, de andere staat erbij.
        basis = gespatieerd;
        alternatief = aaneen;
        twijfel.push(`splitsing niet te bepalen: "${gespatieerd}" of "${aaneen}"`);
      }
    }
  } else {
    basis = [getal, naam].filter(Boolean).join(" ");
  }

  const voorstel = parseBasis(basis, hoeveelheid, geplakt ? "" : eenheid, naam, twijfel, opmerkingen);

  // De oude parsers splitsten op de eerste komma, ook binnen haakjes:
  // "uien (gesnipperd" | "niet te fijn)". Zet dat terug.
  if (notitie && tel(voorstel.naam, "(") > tel(voorstel.naam, ")") && notitie.includes(")")) {
    const tot = notitie.indexOf(")") + 1;
    voorstel.naam = `${voorstel.naam}, ${notitie.slice(0, tot)}`;
    notitie = notitie.slice(tot).replace(/^[\s,]+/, "");
  }
  voorstel.notitie = [voorstel.notitie, notitie].filter(Boolean).join(", ") || null;

  const metNotitie = (regel: string) => (oudeNotitie && !kommaGesplitst ? `${regel}, ${oudeNotitie}` : regel);
  return {
    tekst: metNotitie(basis),
    alternatief: alternatief ? metNotitie(alternatief) : null,
    voorstel,
    twijfel,
    opmerkingen,
  };
}

function parseBasis(
  basis: string,
  hoeveelheid: number | null,
  eenheid: string,
  naam: string,
  twijfel: string[],
  opmerkingen: string[]
): Voorstel {
  // Eenheid zonder hoeveelheid ("el" | "olie"): de parser herkent een maat
  // alleen na een getal, dus hier houden we de eenheid zelf vast.
  if (hoeveelheid == null && eenheid) {
    const treffer = zoekEenheidWoord(eenheid);
    if (treffer?.soort === "eenheid") {
      return { hoeveelheid: null, eenheid: treffer.eenheid.code, naam, notitie: null };
    }
    if (treffer?.soort === "omrekening") twijfel.push(`eenheid "${eenheid}" zonder hoeveelheid: niet om te rekenen`);
  }

  const geparst = parseIngredientRegel(basis);
  const verdeeld = verdeelWaarschuwingen(geparst.waarschuwingen);
  twijfel.push(...verdeeld.twijfel);
  opmerkingen.push(...verdeeld.opmerkingen);
  if (geparst.eenheid && !isEenheidCode(geparst.eenheid)) twijfel.push(`onbekende eenheid "${geparst.eenheid}"`);
  return {
    hoeveelheid: geparst.hoeveelheid,
    eenheid: geparst.eenheid,
    naam: geparst.naam,
    notitie: geparst.notitie,
  };
}
