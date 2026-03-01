import { NextRequest, NextResponse } from "next/server";

interface JsonLdIngredient {
  recipeIngredient?: string[];
}

interface JsonLdInstruction {
  "@type"?: string;
  text?: string;
  itemListElement?: JsonLdInstruction[];
  name?: string;
}

interface JsonLdRecipe {
  "@type"?: string | string[];
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string | string[] | JsonLdInstruction[];
  recipeYield?: string | number | string[];
  totalTime?: string;
  cookTime?: string;
  prepTime?: string;
  image?: string | string[] | { url?: string };
}

function parseIsoDuration(iso: string): number | null {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const uren = parseInt(match[1] ?? "0");
  const minuten = parseInt(match[2] ?? "0");
  return uren * 60 + minuten || null;
}

function parsePorties(waarde: string | number | string[] | undefined): number | null {
  if (!waarde) return null;
  const str = Array.isArray(waarde) ? waarde[0] : String(waarde);
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function parseInstructies(
  instructies: string | string[] | JsonLdInstruction[] | undefined
): string[] {
  if (!instructies) return [];

  if (typeof instructies === "string") {
    return instructies
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((s) => s.length > 10);
  }

  if (Array.isArray(instructies)) {
    const stappen: string[] = [];
    for (const item of instructies) {
      if (typeof item === "string") {
        stappen.push(item.trim());
      } else if (item["@type"] === "HowToStep") {
        if (item.text) stappen.push(item.text.trim());
      } else if (item["@type"] === "HowToSection" && item.itemListElement) {
        for (const sub of item.itemListElement) {
          if (sub.text) stappen.push(sub.text.trim());
        }
      }
    }
    return stappen.filter(Boolean);
  }

  return [];
}

interface ParsedIngredient {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
}

function parseIngredient(tekst: string): ParsedIngredient {
  const notitieMatch = tekst.match(/^(.+?),\s*(.+)$/);
  const notitie = notitieMatch ? notitieMatch[2].trim() : "";
  const basisTekst = notitieMatch ? notitieMatch[1].trim() : tekst.trim();

  const hoeveelheidMatch = basisTekst.match(
    /^([\d\s\u00BC\u00BD\u00BE\u2150-\u215E\/\.]+)\s*(ml|dl|cl|l|liter|cc|gram|gr|g|kg|kilogram|el|tl|eetlepel|theelepel|kopje|kop|stuks?|stuk|bosje|teen|teentje|snufje|scheut|handvol|plak|plakje|blik|zakje|pak|can|ons|pond|oz|lb|cup|cups|tbsp|tsp|bunch)?\s*(.*)/i
  );

  if (hoeveelheidMatch) {
    return {
      hoeveelheid: hoeveelheidMatch[1].trim(),
      eenheid: hoeveelheidMatch[2]?.trim() ?? "",
      naam: hoeveelheidMatch[3].trim() || basisTekst,
      notitie,
    };
  }

  return { hoeveelheid: "", eenheid: "", naam: basisTekst, notitie };
}

function vindJsonLd(html: string): JsonLdRecipe | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      // Verwijder control characters die JSON.parse breken
      const cleaned = match[1].replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");
      const data = JSON.parse(cleaned);

      // Direct Recipe object
      if (data["@type"] === "Recipe") return data as JsonLdRecipe;

      // Array van objecten
      if (Array.isArray(data)) {
        const recept = data.find((item) => item["@type"] === "Recipe");
        if (recept) return recept as JsonLdRecipe;
      }

      // @graph array
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const recept = data["@graph"].find(
          (item: { "@type": string }) => item["@type"] === "Recipe"
        );
        if (recept) return recept as JsonLdRecipe;
      }
    } catch {
      // Ongeldige JSON, probeer volgende
    }
  }

  return null;
}

// Strip HTML tags en geef platte tekst terug
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Extraheer tekst uit een HTML-sectie (bv. een <ul> of <div>)
function extractTextFromHtmlSection(section: string): string[] {
  // Splits op li-elementen of regeleindes
  const items = section
    .split(/<\/li>|<br\s*\/?>|\n/gi)
    .map((s) => stripHtml(s).trim())
    .filter((s) => s.length > 1);
  return items;
}

// WPRM (WP Recipe Maker) plugin scraper
function scrapWprm(html: string): Partial<JsonLdRecipe> | null {
  if (!html.includes("wprm-recipe")) return null;

  // Titel
  const titelMatch = html.match(/class="[^"]*wprm-recipe-name[^"]*"[^>]*>([^<]+)</i);
  const titel = titelMatch ? titelMatch[1].trim() : null;

  // Porties
  const portiesMatch = html.match(/class="[^"]*wprm-recipe-servings[^"]*"[^>]*>([^<]+)</i);
  const portiesStr = portiesMatch ? portiesMatch[1].trim() : null;

  // Bereidingstijd
  const tijdMatch = html.match(/class="[^"]*wprm-recipe-total_time-minutes[^"]*"[^>]*>([^<]+)</i);
  const minuten = tijdMatch ? parseInt(tijdMatch[1]) : null;

  // Ingrediënten via wprm spans
  const ingrItems = html.match(/<li class="wprm-recipe-ingredient"[\s\S]*?<\/li>/gi) || [];
  const ingredienten: string[] = ingrItems.map((li) => {
    const amount = (li.match(/class="wprm-recipe-ingredient-amount"[^>]*>([^<]+)</) || [])[1] || "";
    const unit = (li.match(/class="wprm-recipe-ingredient-unit"[^>]*>([^<]+)</) || [])[1] || "";
    const name = (li.match(/class="wprm-recipe-ingredient-name"[^>]*>([^<]+)</) || [])[1] || "";
    const note = (li.match(/class="wprm-recipe-ingredient-notes[^"]*"[^>]*>\(([^)]+)\)/) || [])[1] || "";
    return [amount, unit, name, note ? `, ${note}` : ""].filter(Boolean).join(" ").trim();
  });

  // Stappen via wprm
  const stapItems = html.match(/<li class="wprm-recipe-instruction[^"]*"[\s\S]*?<\/li>/gi) || [];
  const stappen: string[] = stapItems.map((li) => {
    const text = (li.match(/class="wprm-recipe-instruction-text[^"]*"[^>]*>([\s\S]*?)<\//) || [])[1] || "";
    return stripHtml(text).trim();
  }).filter(Boolean);

  // Foto
  const imgMatch = html.match(/class="[^"]*wprm-recipe-image[^"]*"[\s\S]*?src="([^"]+)"/i);
  const fotoUrl = imgMatch ? imgMatch[1] : null;

  if (!titel && ingredienten.length === 0) return null;

  return {
    name: titel || undefined,
    recipeYield: portiesStr || undefined,
    totalTime: minuten ? `PT${minuten}M` : undefined,
    recipeIngredient: ingredienten,
    recipeInstructions: stappen.map((tekst) => ({ "@type": "HowToStep", text: tekst })),
    image: fotoUrl || undefined,
  };
}

// Heuristieke HTML-fallback scraper
function scrapHtmlFallback(html: string, url: string): Partial<JsonLdRecipe> | null {
  // Probeer eerst WPRM plugin
  const wprm = scrapWprm(html);
  if (wprm && (wprm.recipeIngredient?.length ?? 0) > 0) return wprm;

  // Generieke fallback: zoek naar gestructureerde ingredient- en stap-secties

  // Titel: <h1> of <title>
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleTagMatch = html.match(/<title[^>]*>([^<|–\-]+)/i);
  const titel = h1Match ? stripHtml(h1Match[1]).trim() : (titleTagMatch ? titleTagMatch[1].trim() : null);

  // Foto: eerste grote afbeelding (og:image of eerste img met groot formaat)
  const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
  const fotoUrl = ogImageMatch ? ogImageMatch[1] : null;

  // Bereidingstijd: zoek naar patronen als "30 minuten" of "1 uur"
  const tijdMatch = html.match(/(\d+)\s*(?:minuten?|min\.?)\b/i)
    || html.match(/(\d+)\s*(?:uur|hour)/i);
  let bereidingstijd: string | undefined;
  if (tijdMatch) {
    const min = html.match(/(\d+)\s*uur/i)
      ? parseInt((html.match(/(\d+)\s*uur/i) || ["", "0"])[1]) * 60 + parseInt((html.match(/(\d+)\s*min/i) || ["", "0"])[1])
      : parseInt(tijdMatch[1]);
    bereidingstijd = `PT${min}M`;
  }

  // Porties: zoek naar "4 personen" of "serves 4"
  const portiesMatch = html.match(/(\d+)\s*(?:personen?|porties?|persons?|servings?|serves?)/i);
  const porties = portiesMatch ? portiesMatch[1] : undefined;

  // Ingrediënten: zoek sectie met "ingrediënten" header gevolgd door een lijst
  const ingredienten = extractIngredients(html);

  // Stappen: zoek sectie met "bereiding" of "instructies" of "werkwijze"
  const stappen = extractStappen(html);

  if (!titel || (ingredienten.length === 0 && stappen.length === 0)) return null;

  return {
    name: titel,
    recipeYield: porties,
    totalTime: bereidingstijd,
    recipeIngredient: ingredienten,
    recipeInstructions: stappen.map((tekst) => ({ "@type": "HowToStep", text: tekst })),
    image: fotoUrl || undefined,
  };
}

function extractIngredients(html: string): string[] {
  // Patroon 1: sectie met class die "ingredient" bevat
  const ingrContainerMatch = html.match(
    /class="[^"]*ingredi[^"]*"[^>]*>([\s\S]{50,3000}?)(?:<\/(?:div|section|article|ul)>[\s\S]{0,200}?(?:bereiding|instructie|werkwijze|method|directions|steps|preparation)|$)/i
  );

  if (ingrContainerMatch) {
    const items = ingrContainerMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    const parsed = items.map((li) => stripHtml(li).trim()).filter((s) => s.length > 1 && s.length < 200);
    if (parsed.length > 0) return parsed;
  }

  // Patroon 2: zoek naar <ul> na "ingrediënten" / "ingredients" header
  const headerPatterns = [
    /(?:ingrediënten|ingredienten|ingredients)[^<]{0,100}<(?:ul|ol)[^>]*>([\s\S]{10,3000}?)<\/(?:ul|ol)>/gi,
    /(?:h[1-4])[^>]*>[\s\S]*?ingredi[\s\S]*?<\/h[1-4]>[\s\S]{0,500}?<(?:ul|ol)[^>]*>([\s\S]{10,2000}?)<\/(?:ul|ol)>/gi,
  ];

  for (const pattern of headerPatterns) {
    const m = pattern.exec(html);
    if (m) {
      const items = m[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const parsed = items.map((li) => stripHtml(li).trim()).filter((s) => s.length > 1 && s.length < 200);
      if (parsed.length > 2) return parsed;
    }
  }

  return [];
}

function extractStappen(html: string): string[] {
  // Patroon 1: class met "instruction" / "bereiding" / "step"
  const stapContainerMatch = html.match(
    /class="[^"]*(?:instruction|bereiding|preparation|steps?|method|werkwijze)[^"]*"[^>]*>([\s\S]{50,5000}?)(?:<\/(?:div|section|article)>[\s\S]{0,100}?(?:tip|note|opmerking|comment)|$)/i
  );

  if (stapContainerMatch) {
    // Zoek genummerde li's of p tags
    const liItems = stapContainerMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    const parsed = liItems.map((li) => stripHtml(li).trim()).filter((s) => s.length > 15);
    if (parsed.length > 0) return parsed;

    // Zoek p tags als fallback
    const pItems = stapContainerMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const parsedP = pItems.map((p) => stripHtml(p).trim()).filter((s) => s.length > 20);
    if (parsedP.length > 0) return parsedP;
  }

  // Patroon 2: header gevolgd door ol
  const headerPatterns = [
    /(?:bereiding|werkwijze|instructies|preparation|directions|method)[^<]{0,100}<(?:ul|ol)[^>]*>([\s\S]{10,5000}?)<\/(?:ul|ol)>/gi,
    /(?:h[1-4])[^>]*>[\s\S]*?(?:bereiding|werkwijze|instructie|method)[\s\S]*?<\/h[1-4]>[\s\S]{0,500}?<(?:ol|ul)[^>]*>([\s\S]{10,3000}?)<\/(?:ol|ul)>/gi,
  ];

  for (const pattern of headerPatterns) {
    const m = pattern.exec(html);
    if (m) {
      const items = m[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const parsed = items.map((li) => stripHtml(li).trim()).filter((s) => s.length > 15);
      if (parsed.length > 0) return parsed;
    }
  }

  return [];
}

function extractFotoUrl(jsonLd: JsonLdRecipe): string | null {
  if (!jsonLd.image) return null;
  if (typeof jsonLd.image === "string") return jsonLd.image;
  if (Array.isArray(jsonLd.image)) {
    return typeof jsonLd.image[0] === "string"
      ? jsonLd.image[0]
      : (jsonLd.image[0] as { url?: string })?.url ?? null;
  }
  if (typeof jsonLd.image === "object" && jsonLd.image.url) return jsonLd.image.url;
  return null;
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "Geen URL opgegeven" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Kon pagina niet ophalen: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }

  // Stap 1: probeer JSON-LD
  let recept = vindJsonLd(html);

  // Stap 2: probeer HTML-fallback scraping
  if (!recept) {
    const fallback = scrapHtmlFallback(html, url);
    if (fallback) {
      recept = fallback as JsonLdRecipe;
    }
  }

  if (!recept || !recept.name) {
    return NextResponse.json(
      { error: "Geen receptdata gevonden op deze pagina. Vul het recept handmatig in." },
      { status: 422 }
    );
  }

  // Bereidingstijd
  let bereidingstijd: number | null = null;
  if (recept.totalTime) {
    bereidingstijd = parseIsoDuration(recept.totalTime);
  } else if (recept.cookTime || recept.prepTime) {
    const cook = recept.cookTime ? parseIsoDuration(recept.cookTime) ?? 0 : 0;
    const prep = recept.prepTime ? parseIsoDuration(recept.prepTime) ?? 0 : 0;
    bereidingstijd = cook + prep || null;
  }

  const ingredienten = (recept.recipeIngredient ?? []).map(parseIngredient);
  const stappen = parseInstructies(recept.recipeInstructions);
  const fotoUrl = extractFotoUrl(recept);

  return NextResponse.json({
    titel: recept.name ?? "",
    porties: parsePorties(recept.recipeYield),
    bereidingstijd,
    herkomstUrl: url,
    herkomstNaam: new URL(url).hostname.replace(/^www\./, ""),
    ingredienten,
    stappen: stappen.map((tekst) => ({ tekst })),
    fotoUrl,
  });
}
