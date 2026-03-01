// Parseer ruwe tekst (van OCR of plakken) naar receptvelden

export interface ParsedIngredient {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
}

export interface ParsedStap {
  tekst: string;
}

export interface ParsedRecept {
  titel: string;
  porties: string;
  bereidingstijd: string;
  ingredienten: ParsedIngredient[];
  stappen: ParsedStap[];
}

const EENHEDEN = /^(ml|dl|cl|l|liter|gram|gr|g|kg|kilogram|el|tl|eetlepel|theelepel|kopje|kop|stuks?|stuk|bosje|teen|teentje|snufje|scheut|handvol|plak|plakje|blik|zakje|pak|ons|pond|oz|lb|cup|cups|tbsp|tsp)\.?$/i;

export function parseIngredientRegel(regel: string): ParsedIngredient {
  const tekst = regel.trim();
  // Notitie achter komma
  const notitieMatch = tekst.match(/^(.+?),\s*(.+)$/);
  const notitie = notitieMatch ? notitieMatch[2].trim() : "";
  const basis = notitieMatch ? notitieMatch[1].trim() : tekst;

  // Hoeveelheid + eenheid + naam
  const m = basis.match(
    /^([\d\s\u00BC\u00BD\u00BE\u2150-\u215E\/\-\.]+)\s*(\S+)?\s+(.*)/
  );
  if (m) {
    const mogelijkeEenheid = m[2] ?? "";
    if (EENHEDEN.test(mogelijkeEenheid)) {
      return { hoeveelheid: m[1].trim(), eenheid: mogelijkeEenheid, naam: m[3].trim() || basis, notitie };
    }
    // Geen eenheid — getal + naam
    return { hoeveelheid: m[1].trim(), eenheid: "", naam: (mogelijkeEenheid + " " + (m[3] ?? "")).trim() || basis, notitie };
  }

  // Geen getal — alles is naam
  return { hoeveelheid: "", eenheid: "", naam: basis, notitie };
}

export function parseReceptTekst(tekst: string): ParsedRecept {
  const regels = tekst
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);

  // Detecteer secties op basis van headers
  type Sectie = "onbekend" | "ingredienten" | "bereiding";
  let huidigeSectie: Sectie = "onbekend";

  const INGR_HEADER = /^(?:ingrediënten|ingredienten|benodigdheden|ingredients?)\s*[:.]?\s*$/i;
  const BEREIDING_HEADER = /^(?:bereiding|werkwijze|instructies|bereidingswijze|methode|method|preparation|directions?)\s*[:.]?\s*$/i;
  const STAP_NUMMERING = /^(\d+[\.\)]\s*|[-•]\s*)/;

  const titel: string[] = [];
  const ingredienten: ParsedIngredient[] = [];
  const stappen: ParsedStap[] = [];
  let porties = "";
  let bereidingstijd = "";

  // Zoek porties en bereidingstijd in de eerste 10 regels
  const eersteRegels = regels.slice(0, 10).join(" ");
  const portiesMatch = eersteRegels.match(/(\d+)\s*(?:personen?|porties?|persoon|pers\.)/i);
  if (portiesMatch) porties = portiesMatch[1];

  const tijdMatch = eersteRegels.match(/(\d+)\s*(?:minuten?|min\.?\b)/i);
  const uurMatch = eersteRegels.match(/(\d+)\s*(?:uur|u\.?\b)/i);
  if (uurMatch && tijdMatch) {
    bereidingstijd = String(parseInt(uurMatch[1]) * 60 + parseInt(tijdMatch[1]));
  } else if (tijdMatch) {
    bereidingstijd = tijdMatch[1];
  } else if (uurMatch) {
    bereidingstijd = String(parseInt(uurMatch[1]) * 60);
  }

  let huidigeSingleStap = "";

  for (let i = 0; i < regels.length; i++) {
    const regel = regels[i];

    // Detecteer sectionheader
    if (INGR_HEADER.test(regel)) {
      huidigeSectie = "ingredienten";
      // Sla de header zelf over
      continue;
    }
    if (BEREIDING_HEADER.test(regel)) {
      // Sla lopende stap op
      if (huidigeSingleStap) { stappen.push({ tekst: huidigeSingleStap.trim() }); huidigeSingleStap = ""; }
      huidigeSectie = "bereiding";
      continue;
    }

    // Herken overgang van ingrediënten naar bereiding op basis van inhoud
    // Als we nog niet weten in welke sectie we zijn, probeer het te raden
    if (huidigeSectie === "onbekend") {
      // Eerste niet-lege regel is waarschijnlijk de titel
      if (titel.length === 0) {
        titel.push(regel);
        continue;
      }
      // Regels die lijken op ingrediënten (beginnen met getal of maat)
      if (/^[\d\u00BC\u00BD\u00BE]/.test(regel) || /^\d/.test(regel)) {
        huidigeSectie = "ingredienten";
      }
    }

    if (huidigeSectie === "ingredienten") {
      // Check of dit toch een bereidingstap is (lange zin zonder hoeveelheid)
      if (regel.length > 80 && !/^[\d\u00BC\u00BD\u00BE]/.test(regel) && !STAP_NUMMERING.test(regel)) {
        if (huidigeSingleStap) { stappen.push({ tekst: huidigeSingleStap.trim() }); huidigeSingleStap = ""; }
        huidigeSectie = "bereiding";
        huidigeSingleStap = regel;
        continue;
      }
      const schoon = regel.replace(STAP_NUMMERING, "").trim();
      if (schoon) ingredienten.push(parseIngredientRegel(schoon));
    } else if (huidigeSectie === "bereiding") {
      if (STAP_NUMMERING.test(regel)) {
        // Nieuw genummerd stap
        if (huidigeSingleStap) stappen.push({ tekst: huidigeSingleStap.trim() });
        huidigeSingleStap = regel.replace(STAP_NUMMERING, "").trim();
      } else if (regel.length > 0) {
        // Voeg toe aan huidige stap of start nieuwe alinea-stap
        if (huidigeSingleStap) {
          // Korte regel na lange stap = nieuwe stap
          huidigeSingleStap += " " + regel;
        } else {
          huidigeSingleStap = regel;
        }
      } else {
        // Lege regel = stapeinde
        if (huidigeSingleStap) { stappen.push({ tekst: huidigeSingleStap.trim() }); huidigeSingleStap = ""; }
      }
    }
  }

  // Sla laatste stap op
  if (huidigeSingleStap) stappen.push({ tekst: huidigeSingleStap.trim() });

  return {
    titel: titel[0] ?? "",
    porties,
    bereidingstijd,
    ingredienten: ingredienten.filter((i) => i.naam.length > 0),
    stappen: stappen.filter((s) => s.tekst.length > 5),
  };
}
