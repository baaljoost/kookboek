// De vaste lijst eenheden voor ingrediënten.
//
// In de database staat de `code`. Alles wat een recept kan schrijven
// ("gram", "tbsp", "teentjes") staat hier als synoniem en wordt bij het
// parsen naar de code omgezet. De lijst kan groeien zonder schemawijziging.

export interface Eenheid {
  code: string;
  enkelvoud: string;
  meervoud: string;
  // "maat" = g, ml, el…; "telwoord" = teen, blik, snufje…
  // Alleen telwoorden worden ook zonder getal herkend ("snufje zout").
  soort: "maat" | "telwoord";
  nl: string[];
  en: string[];
}

export const EENHEDEN: Eenheid[] = [
  {
    code: "g",
    enkelvoud: "g",
    meervoud: "g",
    soort: "maat",
    nl: ["g", "gr", "gram", "grammen"],
    en: ["grams", "gramme", "grammes"],
  },
  {
    code: "kg",
    enkelvoud: "kg",
    meervoud: "kg",
    soort: "maat",
    nl: ["kg", "kilo", "kilogram"],
    en: ["kilos", "kilograms"],
  },
  {
    code: "ml",
    enkelvoud: "ml",
    meervoud: "ml",
    soort: "maat",
    nl: ["ml", "milliliter", "cc"],
    en: ["milliliters", "millilitre", "millilitres"],
  },
  {
    code: "l",
    enkelvoud: "l",
    meervoud: "l",
    soort: "maat",
    nl: ["l", "liter", "ltr"],
    en: ["liters", "litre", "litres"],
  },
  {
    code: "el",
    enkelvoud: "el",
    meervoud: "el",
    soort: "maat",
    nl: ["el", "eetlepel", "eetlepels"],
    en: ["tbsp", "tbsps", "tbs", "tablespoon", "tablespoons"],
  },
  {
    code: "tl",
    enkelvoud: "tl",
    meervoud: "tl",
    soort: "maat",
    nl: ["tl", "theelepel", "theelepels"],
    en: ["tsp", "tsps", "teaspoon", "teaspoons"],
  },
  {
    code: "stuk",
    enkelvoud: "stuk",
    meervoud: "stuks",
    soort: "telwoord",
    nl: ["stuk", "stuks", "st", "stukje", "stukjes", "stukken"],
    en: ["piece", "pieces"],
  },
  {
    code: "teen",
    enkelvoud: "teen",
    meervoud: "tenen",
    soort: "telwoord",
    nl: ["teen", "tenen", "teentje", "teentjes"],
    en: ["clove", "cloves"],
  },
  {
    code: "bos",
    enkelvoud: "bos",
    meervoud: "bossen",
    soort: "telwoord",
    nl: ["bos", "bossen", "bosje", "bosjes"],
    en: ["bunch", "bunches"],
  },
  {
    code: "snufje",
    enkelvoud: "snufje",
    meervoud: "snufjes",
    soort: "telwoord",
    nl: ["snufje", "snufjes", "snuf", "snuifje", "mespunt", "mespuntje"],
    en: ["pinch", "pinches"],
  },
  {
    code: "blik",
    enkelvoud: "blik",
    meervoud: "blikken",
    soort: "telwoord",
    nl: ["blik", "blikken", "blikje", "blikjes"],
    en: ["can", "cans", "tin", "tins"],
  },
];

// Eenheden die pas op de lijst komen als ze minstens drie keer in de data
// voorkomen (zie plan). Tot die tijd blijft het woord in de naam staan.
// Activeren = het blok verplaatsen naar EENHEDEN hierboven.
export const KANDIDAAT_EENHEDEN: Eenheid[] = [
  {
    code: "takje",
    enkelvoud: "takje",
    meervoud: "takjes",
    soort: "telwoord",
    nl: ["takje", "takjes", "tak", "takken"],
    en: ["sprig", "sprigs"],
  },
  {
    code: "plak",
    enkelvoud: "plak",
    meervoud: "plakken",
    soort: "telwoord",
    nl: ["plak", "plakken", "plakje", "plakjes"],
    en: ["slice", "slices"],
  },
  {
    code: "zakje",
    enkelvoud: "zakje",
    meervoud: "zakjes",
    soort: "telwoord",
    nl: ["zakje", "zakjes", "zak", "zakken"],
    en: ["sachet", "sachets", "bag", "bags"],
  },
  {
    code: "pak",
    enkelvoud: "pak",
    meervoud: "pakken",
    soort: "telwoord",
    nl: ["pak", "pakken", "pakje", "pakjes"],
    en: ["package", "packages", "pack", "packs", "pkg"],
  },
  {
    code: "pot",
    enkelvoud: "pot",
    meervoud: "potten",
    soort: "telwoord",
    nl: ["pot", "potten", "potje", "potjes"],
    en: ["jar", "jars"],
  },
  {
    code: "scheut",
    enkelvoud: "scheut",
    meervoud: "scheuten",
    soort: "telwoord",
    nl: ["scheut", "scheuten", "scheutje", "scheutjes"],
    en: ["splash", "dash"],
  },
  {
    code: "handvol",
    enkelvoud: "handvol",
    meervoud: "handenvol",
    soort: "telwoord",
    nl: ["handvol", "handenvol", "handje", "handjes"],
    en: ["handful", "handfuls"],
  },
  {
    code: "cm",
    enkelvoud: "cm",
    meervoud: "cm",
    soort: "maat",
    nl: ["cm", "centimeter"],
    en: ["centimeters", "centimetre", "centimetres"],
  },
];

// Eenheden die niet op de lijst staan maar wel worden herkend en dan
// omgerekend naar een eenheid die er wel op staat.
//  - `factor`: vaste omrekening (dl, cl, ons, pond)
//  - `via`: naam waaronder `converteerEenheid` in lib/unitConversie.ts
//    de eenheid kent (cup, oz, lb, quart, fl oz)
export interface Omrekening {
  woorden: string[];
  engels: boolean;
  naar: "g" | "ml";
  factor?: number;
  via?: string;
}

export const OMREKENINGEN: Omrekening[] = [
  { woorden: ["dl", "deciliter"], engels: false, naar: "ml", factor: 100 },
  { woorden: ["cl", "centiliter"], engels: false, naar: "ml", factor: 10 },
  { woorden: ["ons"], engels: false, naar: "g", factor: 100 },
  { woorden: ["pond"], engels: false, naar: "g", factor: 500 },
  { woorden: ["cup", "cups"], engels: true, naar: "ml", via: "cup" },
  { woorden: ["oz", "ounce", "ounces"], engels: true, naar: "g", via: "oz" },
  { woorden: ["lb", "lbs", "pound", "pounds"], engels: true, naar: "g", via: "lb" },
  { woorden: ["quart", "quarts", "qt"], engels: true, naar: "ml", via: "quart" },
  { woorden: ["fl oz", "floz", "fluid ounce", "fluid ounces"], engels: true, naar: "ml", via: "fl oz" },
];

export type EenheidTreffer =
  | { soort: "eenheid"; eenheid: Eenheid; engels: boolean }
  | { soort: "omrekening"; omrekening: Omrekening; engels: boolean };

const woordIndex = new Map<string, EenheidTreffer>();
for (const eenheid of EENHEDEN) {
  for (const woord of [eenheid.code, eenheid.enkelvoud, eenheid.meervoud, ...eenheid.nl]) {
    woordIndex.set(woord, { soort: "eenheid", eenheid, engels: false });
  }
  for (const woord of eenheid.en) {
    if (!woordIndex.has(woord)) woordIndex.set(woord, { soort: "eenheid", eenheid, engels: true });
  }
}
for (const omrekening of OMREKENINGEN) {
  for (const woord of omrekening.woorden) {
    if (!woordIndex.has(woord)) {
      woordIndex.set(woord, { soort: "omrekening", omrekening, engels: omrekening.engels });
    }
  }
}

const codeIndex = new Map(EENHEDEN.map((e) => [e.code, e]));

// Zoek een woord uit een receptregel op: eenheid van de lijst, een eenheid
// die omgerekend wordt, of niets. Alleen hele woorden; hoofdletters tellen niet.
export function zoekEenheidWoord(woord: string): EenheidTreffer | null {
  const sleutel = woord.toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
  return woordIndex.get(sleutel) ?? null;
}

export function isEenheidCode(waarde: string | null | undefined): boolean {
  return !!waarde && codeIndex.has(waarde);
}

// Tekst voor op de receptpagina: "3 tenen", "1 teen", "200 g".
// Een oude waarde die niet op de lijst staat, komt ongewijzigd terug.
export function eenheidWeergave(
  eenheid: string | null | undefined,
  hoeveelheid: number | null | undefined
): string {
  if (!eenheid) return "";
  const gevonden = codeIndex.get(eenheid);
  if (!gevonden) return eenheid;
  const meervoud = hoeveelheid != null && hoeveelheid > 1;
  return meervoud ? gevonden.meervoud : gevonden.enkelvoud;
}

// Opties voor de keuzelijst in de formulieren.
export const EENHEID_OPTIES = EENHEDEN.map((e) => ({ code: e.code, label: e.enkelvoud }));

// Alle woorden die als eenheid worden herkend, ook de kandidaten.
// Het omzetscript gebruikt dit om kapotte splitsingen te herstellen.
export function alleEenheidWoorden(): string[] {
  const woorden = new Set<string>(woordIndex.keys());
  for (const kandidaat of KANDIDAAT_EENHEDEN) {
    for (const woord of [kandidaat.code, kandidaat.enkelvoud, kandidaat.meervoud, ...kandidaat.nl, ...kandidaat.en]) {
      woorden.add(woord);
    }
  }
  return [...woorden];
}
