// Eén parser voor ingrediëntregels, gebruikt door alle imports, de
// formulieren en het omzetscript.
//
// "3 cloves garlic, minced" →
//   { hoeveelheid: 3, eenheid: "teen", naam: "garlic", notitie: "minced" }

import { zoekEenheidWoord } from "./eenheden";
import { converteerEenheid } from "./unitConversie";

export type Waarschuwing =
  | "bereik" // "1-2 uien": hoogste waarde genomen
  | "omgerekend" // cups, oz, dl… omgerekend naar ml of g
  | "vermenigvuldigd" // "2 x 400 g" → 800 g
  | "duizendtal" // "1.000" of "1,000": gelezen als duizend
  | "tweede-hoeveelheid" // "200 g / 7 oz": tweede maat weggelaten
  | "geen-naam"; // na hoeveelheid en eenheid bleef niets over

export interface GeparstIngredient {
  hoeveelheid: number | null;
  eenheid: string | null; // code uit lib/eenheden.ts
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string;
  waarschuwingen: Waarschuwing[];
}

const BREUKTEKENS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅐": 1 / 7,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
};
const BREUK = "[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]";

const HTML_ENTITEITEN: Record<string, string> = {
  "&frac12;": "½",
  "&frac14;": "¼",
  "&frac34;": "¾",
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&deg;": "°",
};

// Maak de tekst gelijkvormig zonder de inhoud te veranderen.
function schoonmaken(tekst: string): string {
  return tekst
    .replace(/&[a-z0-9#]+;/gi, (m) => HTML_ENTITEITEN[m.toLowerCase()] ?? m)
    .replace(/[  -​  　]/g, " ")
    .replace(/⁄/g, "/") // breukstreep
    .replace(/\s+/g, " ")
    .trim();
}

interface Gelezen {
  waarde: number;
  lengte: number;
  duizendtal?: boolean;
}

// Lees één getal aan het begin van de tekst.
function leesGetal(s: string): Gelezen | null {
  let m: RegExpMatchArray | null;

  // "1 ½" en "1½"
  m = s.match(new RegExp(`^(\\d+)\\s*(${BREUK})`));
  if (m) return { waarde: parseInt(m[1], 10) + BREUKTEKENS[m[2]], lengte: m[0].length };

  // "1 1/2"
  m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (m && parseInt(m[3], 10) !== 0) {
    return {
      waarde: parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10),
      lengte: m[0].length,
    };
  }

  // "1/2"
  m = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (m && parseInt(m[2], 10) !== 0) {
    return { waarde: parseInt(m[1], 10) / parseInt(m[2], 10), lengte: m[0].length };
  }

  // "½"
  m = s.match(new RegExp(`^${BREUK}`));
  if (m) return { waarde: BREUKTEKENS[m[0]], lengte: m[0].length };

  // "1.000" of "1,000": drie cijfers na het scheidingsteken en geen nul
  // ervoor lezen we als duizendtal. Dat is onzeker, dus met waarschuwing.
  m = s.match(/^([1-9]\d{0,2})[.,](\d{3})(?![\d.,])/);
  if (m) return { waarde: parseInt(m[1] + m[2], 10), lengte: m[0].length, duizendtal: true };

  // "2,5", "2.5" en "2"
  m = s.match(/^(\d+)[.,](\d+)/);
  if (m) return { waarde: parseFloat(`${m[1]}.${m[2]}`), lengte: m[0].length };
  m = s.match(/^\d+/);
  if (m) return { waarde: parseInt(m[0], 10), lengte: m[0].length };

  return null;
}

interface GelezenHoeveelheid {
  waarde: number;
  lengte: number;
  waarschuwingen: Waarschuwing[];
}

// Lees een hoeveelheid: een getal, of een bereik ("1-2", "1 à 2", "1 of 2").
// Van een bereik nemen we de hoogste waarde.
function leesHoeveelheid(s: string): GelezenHoeveelheid | null {
  const eerste = leesGetal(s);
  if (!eerste) return null;

  const waarschuwingen: Waarschuwing[] = [];
  if (eerste.duizendtal) waarschuwingen.push("duizendtal");
  let waarde = eerste.waarde;
  let lengte = eerste.lengte;

  const scheiding = s.slice(lengte).match(/^\s*(?:[-–—]|à|tot|to|of|or)\s*(?=[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])/i);
  if (scheiding) {
    const tweede = leesGetal(s.slice(lengte + scheiding[0].length));
    if (tweede) {
      waarde = Math.max(waarde, tweede.waarde);
      lengte += scheiding[0].length + tweede.lengte;
      waarschuwingen.push("bereik");
      if (tweede.duizendtal && !waarschuwingen.includes("duizendtal")) waarschuwingen.push("duizendtal");
    }
  }

  return { waarde, lengte, waarschuwingen };
}

// Zet de tekst uit een hoeveelheidveld om naar een getal.
// "1/2" → 0.5, "1 ½" → 1.5, "2,5" → 2.5, "1-2" → 2. Onleesbaar → null.
export function parseHoeveelheidTekst(tekst: string | number | null | undefined): number | null {
  if (tekst == null) return null;
  if (typeof tekst === "number") return Number.isFinite(tekst) ? tekst : null;
  const s = schoonmaken(tekst);
  if (!s) return null;
  const woord = leesTelwoord(s);
  if (woord && woord.lengte === s.length) return woord.waarde;
  const gelezen = leesHoeveelheid(s);
  if (!gelezen || gelezen.lengte !== s.length) return null;
  return gelezen.waarde;
}

// Toon een getal in een formulierveld zonder precisie te verliezen:
// 0.5 → "1/2", 1.5 → "1 1/2", 0.333… → "1/3", 2.5 → "2 1/2", 0.15 → "0.15".
export function hoeveelheidNaarTekst(waarde: number | null | undefined): string {
  if (waarde == null || !Number.isFinite(waarde)) return "";
  if (Number.isInteger(waarde)) return String(waarde);
  const heel = Math.floor(waarde);
  const rest = waarde - heel;
  for (const noemer of [2, 3, 4, 8]) {
    const teller = Math.round(rest * noemer);
    if (teller > 0 && teller < noemer && Math.abs(rest - teller / noemer) < 1e-6) {
      return heel > 0 ? `${heel} ${teller}/${noemer}` : `${teller}/${noemer}`;
    }
  }
  const tekst = String(Math.round(waarde * 1000) / 1000);
  // "1.333" zou bij teruglezen een duizendtal zijn; dan twee decimalen.
  if (/^[1-9]\d{0,2}\.\d{3}$/.test(tekst)) return String(Math.round(waarde * 100) / 100);
  return tekst;
}

// "een halve", "half", "anderhalve", "een kwart"
function leesTelwoord(s: string): { waarde: number; lengte: number } | null {
  let m = s.match(/^(?:(?:een|één|a)\s+)?(?:halve|half)(?![\p{L}])(?:\s+an?(?![\p{L}]))?/iu);
  if (m) return { waarde: 0.5, lengte: m[0].length };
  m = s.match(/^anderhal(?:ve|f)(?![\p{L}])/iu);
  if (m) return { waarde: 1.5, lengte: m[0].length };
  m = s.match(/^(?:(?:een|één)\s+)?kwart(?![\p{L}])/iu);
  if (m) return { waarde: 0.25, lengte: m[0].length };
  return null;
}

interface GelezenEenheid {
  lengte: number;
  woord: string; // zoals het in de tekst stond
  code: string | null; // eenheid van de lijst
  omrekenVia?: string;
  omrekenFactor?: number;
  omrekenNaar?: string;
  engels: boolean;
  telwoord: boolean;
}

// Lees een eenheid aan het begin van de tekst. Alleen een heel woord telt:
// "gr" in "grote" of "l" in "limoenen" is geen eenheid.
function leesEenheid(s: string): GelezenEenheid | null {
  const kandidaten: RegExpMatchArray[] = [];
  const tweeWoorden = s.match(/^(fl\.?\s*oz|fluid\s+ounces?)\.?(?=\s|$|[,;(])/i);
  if (tweeWoorden) kandidaten.push(tweeWoorden);
  const enkelWoord = s.match(/^([\p{L}]+)\.?(?=\s|$|[,;()])/u);
  if (enkelWoord) kandidaten.push(enkelWoord);

  for (const m of kandidaten) {
    const woord = m[1];
    const sleutel = /^fl/i.test(woord) && /oz|ounce/i.test(woord)
      ? (/fluid/i.test(woord) ? woord.toLowerCase().replace(/\s+/g, " ") : "fl oz")
      : woord;
    const treffer = zoekEenheidWoord(sleutel);
    if (!treffer) continue;
    if (treffer.soort === "eenheid") {
      return {
        lengte: m[0].length,
        woord,
        code: treffer.eenheid.code,
        engels: treffer.engels,
        telwoord: treffer.eenheid.soort === "telwoord",
      };
    }
    return {
      lengte: m[0].length,
      woord,
      code: null,
      omrekenVia: treffer.omrekening.via,
      omrekenFactor: treffer.omrekening.factor,
      omrekenNaar: treffer.omrekening.naar,
      engels: treffer.engels,
      telwoord: false,
    };
  }
  return null;
}

function rondAf(waarde: number): number {
  return Math.round(waarde * 100) / 100;
}

function rekenOm(hoeveelheid: number, eenheid: GelezenEenheid): { hoeveelheid: number; eenheid: string } | null {
  if (eenheid.omrekenFactor && eenheid.omrekenNaar) {
    return { hoeveelheid: rondAf(hoeveelheid * eenheid.omrekenFactor), eenheid: eenheid.omrekenNaar };
  }
  if (eenheid.omrekenVia) {
    const uit = converteerEenheid(hoeveelheid, eenheid.omrekenVia);
    if (uit.hoeveelheid != null && uit.eenheid) return { hoeveelheid: uit.hoeveelheid, eenheid: uit.eenheid };
  }
  return null;
}

// Reken een losse eenheid om naar de lijst. Voor invoer uit een formulier.
//  - eenheid van de lijst of een synoniem → de code
//  - cups, oz, dl… met hoeveelheid → omgerekend
//  - onbekend → null (de aanroeper beslist wat er dan gebeurt)
export function normaliseerEenheid(
  hoeveelheid: number | null,
  eenheid: string
): { hoeveelheid: number | null; eenheid: string } | null {
  const gelezen = leesEenheid(eenheid.trim());
  if (!gelezen || gelezen.lengte !== eenheid.trim().length) return null;
  if (gelezen.code) return { hoeveelheid, eenheid: gelezen.code };
  if (hoeveelheid == null) return null;
  return rekenOm(hoeveelheid, gelezen);
}

// Splits "naam, notitie" op de eerste komma buiten haakjes.
function splitsNotitie(tekst: string): { naam: string; notitie: string | null } {
  let diepte = 0;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (c === "(") diepte++;
    else if (c === ")") diepte = Math.max(0, diepte - 1);
    else if (c === "," && diepte === 0) {
      const notitie = tekst.slice(i + 1).trim();
      return { naam: tekst.slice(0, i).trim(), notitie: notitie || null };
    }
  }
  return { naam: tekst.trim(), notitie: null };
}

// Haal een stuk tussen haakjes aan het begin weg: "(14-ounce) can" → "can".
function leesHaakjes(s: string): { inhoud: string; lengte: number } | null {
  const m = s.match(/^\(([^()]*)\)\s*/);
  return m ? { inhoud: m[1].trim(), lengte: m[0].length } : null;
}

export function parseIngredientRegel(tekst: string): GeparstIngredient {
  const oorspronkelijkeTekst = tekst.trim();
  const waarschuwingen: Waarschuwing[] = [];

  let rest = schoonmaken(tekst)
    .replace(/^[\s\-–—•*·▢□☐✓]+/, "")
    .replace(/^(?:ca\.?|circa|ongeveer|about|approx\.?|approximately|±|\+\/-|~)\s*(?=[\d½⅓⅔¼¾⅛])/i, "");
  const zonderHoeveelheid = rest;

  let hoeveelheid: number | null = null;
  let eenheid: string | null = null;
  const haakjes: string[] = [];

  // 1. Hoeveelheid
  const telwoord = leesTelwoord(rest);
  const getal = telwoord ? null : leesHoeveelheid(rest);
  if (telwoord) {
    hoeveelheid = telwoord.waarde;
    rest = rest.slice(telwoord.lengte).trimStart();
  } else if (getal) {
    hoeveelheid = getal.waarde;
    waarschuwingen.push(...getal.waarschuwingen);
    rest = rest.slice(getal.lengte).trimStart();

    // "2 x 400 g": alleen vermenigvuldigen als er een eenheid achter staat
    const maal = rest.match(/^[x×]\s*(?=[\d½⅓⅔¼¾⅛])/i);
    if (maal) {
      const tweede = leesHoeveelheid(rest.slice(maal[0].length));
      if (tweede) {
        const erna = rest.slice(maal[0].length + tweede.lengte).trimStart();
        if (leesEenheid(erna)) {
          hoeveelheid = rondAf(hoeveelheid * tweede.waarde);
          rest = erna;
          waarschuwingen.push("vermenigvuldigd", ...tweede.waarschuwingen);
        }
      }
    }
  } else {
    // "een snufje zout", "a pinch of salt": lidwoord telt als 1
    const lidwoord = rest.match(/^(?:een|één|a|an|one)\s+/i);
    if (lidwoord) {
      const erna = leesEenheid(rest.slice(lidwoord[0].length));
      if (erna?.code && erna.telwoord) {
        hoeveelheid = 1;
        rest = rest.slice(lidwoord[0].length);
      }
    }
  }

  // 2. Eenheid (met eventueel haakjes ervoor: "1 (14-ounce) can")
  let onbewerkteHoeveelheid = hoeveelheid;
  const restVoorEenheid = rest;
  {
    let kijk = rest.replace(/^-\s*/, "");
    const voor = leesHaakjes(kijk);
    const naHaakjes = voor ? kijk.slice(voor.lengte) : kijk;
    let gelezen = leesEenheid(naHaakjes);
    // Zonder getal alleen telwoorden van minstens drie letters ("snufje zout")
    if (gelezen && hoeveelheid == null && !(gelezen.code && gelezen.telwoord && gelezen.woord.length >= 3)) {
      gelezen = null;
    }
    if (gelezen) {
      kijk = naHaakjes.slice(gelezen.lengte).trimStart();
      if (gelezen.code) {
        eenheid = gelezen.code;
      } else if (hoeveelheid != null) {
        const om = rekenOm(hoeveelheid, gelezen);
        if (om) {
          hoeveelheid = om.hoeveelheid;
          eenheid = om.eenheid;
          waarschuwingen.push("omgerekend");
        }
      }
      if (eenheid) {
        if (voor?.inhoud) haakjes.push(voor.inhoud);
        if (gelezen.engels) kijk = kijk.replace(/^of\s+/i, "");
        rest = kijk;

        // "200 g / 7 oz bloem": tweede maat laten vallen
        const tweedeMaat = rest.match(/^\/\s*/);
        if (tweedeMaat) {
          const getal2 = leesHoeveelheid(rest.slice(tweedeMaat[0].length));
          if (getal2) {
            const erna = rest.slice(tweedeMaat[0].length + getal2.lengte).trimStart();
            const eenheid2 = leesEenheid(erna);
            if (eenheid2) {
              rest = erna.slice(eenheid2.lengte).trimStart();
              waarschuwingen.push("tweede-hoeveelheid");
            }
          }
        }
        // "200 g (7 oz) bloem": haakjes naar het eind van de naam
        const na = leesHaakjes(rest);
        if (na) {
          if (na.inhoud) haakjes.push(na.inhoud);
          rest = rest.slice(na.lengte);
        }
      }
    }
  }
  if (!eenheid) rest = rest.replace(/^-\s*/, "");

  // 3. Naam en notitie
  let { naam, notitie } = splitsNotitie(rest);
  naam = naam.replace(/^[,;:\s]+/, "").trim();

  if (!naam && eenheid) {
    // "2 cloves" of "1 blik": zonder naam is het woord zelf het ingrediënt
    hoeveelheid = onbewerkteHoeveelheid;
    eenheid = null;
    const zonderOmrekening = waarschuwingen.filter((w) => w !== "omgerekend" && w !== "tweede-hoeveelheid");
    waarschuwingen.length = 0;
    waarschuwingen.push(...zonderOmrekening);
    haakjes.length = 0;
    ({ naam, notitie } = splitsNotitie(restVoorEenheid.replace(/^-\s*/, "")));
    waarschuwingen.push("geen-naam");
  } else if (!naam) {
    ({ naam, notitie } = splitsNotitie(zonderHoeveelheid));
    if (hoeveelheid != null) {
      hoeveelheid = null;
      onbewerkteHoeveelheid = null;
    }
    waarschuwingen.length = 0;
    waarschuwingen.push("geen-naam");
  }

  if (haakjes.length) naam = `${naam} (${haakjes.join(", ")})`;

  return {
    hoeveelheid,
    eenheid,
    naam: naam.replace(/\s+/g, " ").trim(),
    notitie,
    oorspronkelijkeTekst,
    waarschuwingen,
  };
}

// Vorm voor de formuliervelden (alles tekst) en voor de browserextensie.
export interface FormulierIngredient {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
  oorspronkelijkeTekst: string;
}

export function naarFormulier(ing: GeparstIngredient): FormulierIngredient {
  return {
    hoeveelheid: hoeveelheidNaarTekst(ing.hoeveelheid),
    eenheid: ing.eenheid ?? "",
    naam: ing.naam,
    notitie: ing.notitie ?? "",
    oorspronkelijkeTekst: ing.oorspronkelijkeTekst,
  };
}

export function parseVoorFormulier(tekst: string): FormulierIngredient {
  return naarFormulier(parseIngredientRegel(tekst));
}
