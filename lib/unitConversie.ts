// Unit conversion utilities for American → metric units

export interface IngredientForConversion {
  hoeveelheid: number | null;
  eenheid: string | null;
  naam?: string;
  notitie?: string | null;
}

export interface StepForConversion {
  tekst: string;
}

// Parse a number string that may include fractions (e.g., "1/4", "2.5", "1/2")
function parseGetal(str: string): number {
  if (str.includes("/")) {
    const [num, denom] = str.split("/").map(Number);
    return num / denom;
  }
  return parseFloat(str);
}

// Detect if any American units are present in ingredients or steps
export function heeftAmerikaanseEenheden(
  ingredienten: IngredientForConversion[],
  stappen: StepForConversion[]
): boolean {
  // Check ingredient units
  const amerikaanseEenheiden = [
    "oz",
    "ounce",
    "ounces",
    "fl oz",
    "floz",
    "lb",
    "lbs",
    "cup",
    "cups",
    "tbsp",
    "tsp",
    "inch",
    "inches",
    '"',
  ];

  // Patterns for detecting American units in any text
  const amerikaansePatterns = [
    /\d+\s*(?:degrees?\s+)?(?:°\s*)?(?:F|Fahrenheit)\b/i, // Fahrenheit variants
    /\d+\s*(?:\.\d+)?\s*(oz|ounce|ounces)\b/i, // ounces
    /\d+\s*(?:\.\d+)?\s*(lb|lbs)\b/i, // pounds
    /\d+\s*(?:\.\d+)?\s*(inch|inches|")\b/i, // inches
    /\d+\s*(?:\.\d+)?\s*cups?\b/i, // cups
    /\d+\s*(?:\.\d+)?\s*(?:fl\.?\s*oz|fl\s+oz)/i, // fl oz
    /\d+\s*(?:\.\d+)?\s*(?:tbsp|tablespoons?)\b/i, // tablespoon
    /\d+\s*(?:\.\d+)?\s*(?:tsp|teaspoons?)\b/i, // teaspoon
  ];

  // Check ingredient eenheid field
  for (const ing of ingredienten) {
    if (ing.eenheid) {
      const lower = ing.eenheid.toLowerCase();
      if (amerikaanseEenheiden.some((u) => lower.includes(u))) {
        return true;
      }
    }

    // Check naam and notitie fields for American units
    const textToCheck = `${ing.naam || ""} ${ing.notitie || ""}`.toLowerCase();
    if (amerikaansePatterns.some((p) => p.test(textToCheck))) {
      return true;
    }
  }

  // Check step text for American patterns
  for (const stap of stappen) {
    if (amerikaansePatterns.some((p) => p.test(stap.tekst))) {
      return true;
    }
  }

  return false;
}

// Convert a single ingredient unit
export function converteerEenheid(
  hoeveelheid: number | null,
  eenheid: string | null
): { hoeveelheid: number | null; eenheid: string | null } {
  if (!eenheid) return { hoeveelheid, eenheid };

  const lower = eenheid.toLowerCase();

  // Weight conversions
  if (lower === "oz" || lower === "ounce" || lower === "ounces") {
    return {
      hoeveelheid: hoeveelheid ? Math.round(hoeveelheid * 28.35) : null,
      eenheid: "g",
    };
  }

  if (lower === "lb" || lower === "lbs") {
    return {
      hoeveelheid: hoeveelheid ? Math.round(hoeveelheid * 453.59) : null,
      eenheid: "g",
    };
  }

  // Volume conversions
  if (lower === "cup" || lower === "cups") {
    return {
      hoeveelheid: hoeveelheid ? Math.round(hoeveelheid * 236.59) : null,
      eenheid: "ml",
    };
  }

  if (lower === "fl oz" || lower === "floz") {
    return {
      hoeveelheid: hoeveelheid ? Math.round(hoeveelheid * 29.57) : null,
      eenheid: "ml",
    };
  }

  if (lower === "tbsp") {
    // tbsp → el (rename, same volume)
    return {
      hoeveelheid,
      eenheid: "el",
    };
  }

  if (lower === "tsp") {
    // tsp → tl (rename, same volume)
    return {
      hoeveelheid,
      eenheid: "tl",
    };
  }

  // Length conversions
  if (lower === "inch" || lower === "inches" || lower === '"') {
    return {
      hoeveelheid: hoeveelheid ? Math.round(hoeveelheid * 2.54 * 10) / 10 : null,
      eenheid: "cm",
    };
  }

  // No conversion found
  return { hoeveelheid, eenheid };
}

// Convert temperature in text (°F → °C)
function converteerTemperatuur(tekst: string): string {
  // Match patterns like "350°F", "350 F", "350F", "350 degrees F", "350 degrees Fahrenheit"
  // Supports fractions like "1/2 degrees F"
  return tekst.replace(
    /(\d+(?:\/\d+)?)\s*(?:degrees?\s+)?(?:°\s*)?(?:F(?:ahrenheit)?)\b/gi,
    (match, fahrenheit) => {
      const f = parseGetal(fahrenheit);
      const c = Math.round(((f - 32) * 5) / 9);
      return `${c}°C`;
    }
  );
}

// Convert weight in text (oz → g, lb → g)
function converteerGewicht(tekst: string): string {
  // oz/ounce/ounces → g (supports fractions like "1/4 oz")
  tekst = tekst.replace(
    /(\d+(?:\/\d+)?)\s*(oz|ounce|ounces)\b/gi,
    (match, amount) => {
      const oz = parseGetal(amount);
      const g = Math.round(oz * 28.35);
      return `${g}g`;
    }
  );

  // lb/lbs → g (supports fractions)
  tekst = tekst.replace(
    /(\d+(?:\/\d+)?)\s*(lb|lbs)\b/gi,
    (match, amount) => {
      const lb = parseGetal(amount);
      const g = Math.round(lb * 453.59);
      return `${g}g`;
    }
  );

  return tekst;
}

// Convert length in text (inch → cm)
function converteerLengte(tekst: string): string {
  // inch/inches/" → cm (supports fractions like "1/2 inch")
  return tekst.replace(
    /(\d+(?:\/\d+)?)\s*(inch|inches|")\b/gi,
    (match, amount) => {
      const inch = parseGetal(amount);
      const cm = Math.round(inch * 2.54 * 10) / 10;
      return `${cm}cm`;
    }
  );
}

// Convert volume in text (cup → ml, fl oz → ml)
function converteerInhoud(tekst: string): string {
  // cup/cups → ml (supports fractions like "1/4 cup")
  tekst = tekst.replace(/(\d+(?:\/\d+)?)\s*cups?\b/gi, (match, amount) => {
    const cups = parseGetal(amount);
    const ml = Math.round(cups * 236.59);
    return `${ml}ml`;
  });

  // fl oz → ml (supports fractions)
  tekst = tekst.replace(
    /(\d+(?:\/\d+)?)\s*fl\.?\s*oz\b/gi,
    (match, amount) => {
      const floz = parseGetal(amount);
      const ml = Math.round(floz * 29.57);
      return `${ml}ml`;
    }
  );

  return tekst;
}

// Convert all American units in step text to metric
export function converteerStapTekst(tekst: string): string {
  tekst = converteerTemperatuur(tekst);
  tekst = converteerGewicht(tekst);
  tekst = converteerLengte(tekst);
  tekst = converteerInhoud(tekst);
  return tekst;
}

// Convert ingredient fields handling cases where unit is embedded in naam
// E.g., hoeveelheid=8, eenheid=null, naam="ounces pasta" → hoeveelheid=227, eenheid="g", naam="pasta"
export function converteerIngredientVeld(
  geschaaldHoeveelheid: number | null,
  eenheid: string | null,
  naam: string
): { hoeveelheid: number | null; eenheid: string | null; naam: string } {
  if (geschaaldHoeveelheid == null) {
    // No amount to convert
    return { hoeveelheid: null, eenheid, naam };
  }

  // First, try converting the eenheid field
  const byEenheid = converteerEenheid(geschaaldHoeveelheid, eenheid);
  if (byEenheid.eenheid !== eenheid) {
    // Eenheid was converted (e.g., "oz" → "g")
    return {
      hoeveelheid: byEenheid.hoeveelheid,
      eenheid: byEenheid.eenheid,
      naam,
    };
  }

  // Try combined conversion (for cases where unit is embedded in naam, e.g., "ounces pasta")
  const combined = `${geschaaldHoeveelheid}${eenheid ? ` ${eenheid}` : ""} ${naam}`;
  const converted = converteerStapTekst(combined);

  if (converted === combined) {
    // No conversion happened
    return { hoeveelheid: geschaaldHoeveelheid, eenheid, naam };
  }

  // Conversion happened - try to parse back into hoeveelheid/eenheid/naam
  // Match pattern like "227g pasta" or "59 ml rest"
  const match = converted.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)\s*(.*)/);
  if (match) {
    return {
      hoeveelheid: parseFloat(match[1]),
      eenheid: match[2],
      naam: match[3] || naam, // Use match[3] or fallback to original naam
    };
  }

  // Fallback: return as-is
  return { hoeveelheid: geschaaldHoeveelheid, eenheid, naam };
}
