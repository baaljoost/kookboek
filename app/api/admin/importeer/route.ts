import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

// Detecteer of een tekst eerder op een ingrediënt lijkt dan op een bereidingsstap
function lijktOpIngredient(tekst: string, ingredientenSet: Set<string>): boolean {
  const lower = tekst.toLowerCase().trim();
  // Exacte match met een bekend ingrediënt
  if (ingredientenSet.has(lower)) return true;
  // Begint met een typische hoeveelheid-aanduiding (kort = ingrediënt, niet een stap)
  // Ondersteunt ook "14-ounce" (getal direct gevolgd door koppelteken + eenheid)
  return (
    tekst.length < 120 &&
    /^[\d½¼¾⅓⅔\u2150-\u215E\/\s-]*([\d]+[-\s])(cup|cups|tsp|tbsp|gram|g\b|kg|ml|oz|lb|ounce|ounces|pound|pounds|tablespoon|tablespoons|teaspoon|teaspoons|pkg|package|pinch|dash)/i.test(tekst)
  );
}

function maakIngredientenSet(recipeIngredient?: string[]): Set<string> {
  return new Set((recipeIngredient ?? []).map((s) => s.toLowerCase().trim()));
}

function parseInstructies(
  instructies: string | string[] | JsonLdInstruction[] | undefined,
  recipeIngredient?: string[]
): string[] {
  if (!instructies) return [];

  const ingredientenSet = maakIngredientenSet(recipeIngredient);
  const isIngr = (t: string) => lijktOpIngredient(t, ingredientenSet);

  if (typeof instructies === "string") {
    return instructies
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((s) => s.length > 10 && !isIngr(s));
  }

  if (Array.isArray(instructies)) {
    const stappen: string[] = [];
    for (const item of instructies) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed && !isIngr(trimmed)) stappen.push(trimmed);
      } else if (item["@type"] === "HowToStep") {
        // Filter ook HowToStep items die eigenlijk ingrediënten zijn
        // (sommige sites zoals andrewzimmern.com stoppen ingrediënten als HowToStep in recipeInstructions)
        if (item.text && !isIngr(item.text.trim())) stappen.push(item.text.trim());
      } else if (item["@type"] === "HowToSection" && item.itemListElement) {
        // Sla secties over die als ingrediënten-sectie zijn gelabeld (veelvoorkomende bug in recipe plugins)
        const sectionName = (item.name ?? "").toLowerCase();
        if (!sectionName.includes("ingredi")) {
          for (const sub of item.itemListElement) {
            if (sub.text) stappen.push(sub.text.trim());
          }
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
    const liItems = stapContainerMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    const parsed = liItems.map((li) => stripHtml(li).trim()).filter((s) => s.length > 15);
    if (parsed.length > 0) return parsed;

    const pItems = stapContainerMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const parsedP = pItems.map((p) => stripHtml(p).trim()).filter((s) => s.length > 20);
    if (parsedP.length > 0) return parsedP;
  }

  // Patroon 2: header gevolgd door ul/ol
  const headerListPatterns = [
    /(?:bereiding|werkwijze|instructies?|instructions?|preparation|directions?|method)[^<]{0,100}<(?:ul|ol)[^>]*>([\s\S]{10,5000}?)<\/(?:ul|ol)>/gi,
    /(?:h[1-4])[^>]*>[\s\S]*?(?:bereiding|werkwijze|instructies?|instructions?|method)[\s\S]*?<\/h[1-4]>[\s\S]{0,500}?<(?:ol|ul)[^>]*>([\s\S]{10,3000}?)<\/(?:ol|ul)>/gi,
  ];

  for (const pattern of headerListPatterns) {
    const m = pattern.exec(html);
    if (m) {
      const items = m[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const parsed = items.map((li) => stripHtml(li).trim()).filter((s) => s.length > 15);
      if (parsed.length > 0) return parsed;
    }
  }

  // Patroon 3: header met "Instructions/Directions/Bereiding" gevolgd door <p> alinea's
  // (voor sites zoals andrewzimmern.com die p-tags gebruiken i.p.v. lijsten)
  const headerPPattern = /<h[1-4][^>]*>[^<]*(?:instructions?|directions?|bereiding|werkwijze|preparation)[^<]*<\/h[1-4]>([\s\S]{0,3000}?)(?=<h[1-4]|<\/(?:div|section|article|main)>|$)/gi;
  const headerPMatch = headerPPattern.exec(html);
  if (headerPMatch) {
    const pItems = headerPMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const parsed = pItems.map((p) => stripHtml(p).trim()).filter((s) => s.length > 15);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

type Categorie =
  | "PASTA" | "CURRY" | "SOEP" | "SALADE" | "RIJST_EN_GRANEN"
  | "VLEES" | "VIS_EN_ZEEVRUCHTEN" | "GROENTEN" | "SNACKS"
  | "ONTBIJT" | "DESSERT" | "SAUZEN" | "OVERIG";

function detecteerCategorie(titel: string, ingredienten: ParsedIngredient[]): Categorie {
  const tekst = [titel, ...ingredienten.map((i) => i.naam)].join(" ").toLowerCase();

  const patronen: [Categorie, RegExp][] = [
    ["PASTA",           /\b(pasta|spaghetti|penne|fusilli|lasagna|lasagne|tagliatelle|fettuccine|rigatoni|linguine|gnocchi|ravioli|tortellini|macaroni|noodle)\b/],
    ["CURRY",           /\b(curry|kerrie|tikka|masala|korma|dal|dahl|rendang|sambal|kokos(?:melk)?)\b/],
    ["SOEP",            /\b(soep|bouillon|bisque|gazpacho|minestrone|chowder|consomm[eé])\b/],
    ["SALADE",          /\b(salade|coleslaw|tabouleh|tabbouleh)\b/],
    ["RIJST_EN_GRANEN", /\b(rijst|risotto|pilaf|paella|couscous|quinoa|bulgur|gierst|polenta|spelt|gerst)\b/],
    ["VIS_EN_ZEEVRUCHTEN", /\b(vis|zalm|kabeljauw|tonijn|garnalen?|garnaal|mosselen?|inktvis|schelvis|forel|makreel|tilapia|pangasius|zeebaars|zeevruchten|seafood|sushi|sashimi|crevetten?|langoustine|kreeft|krab)\b/],
    ["VLEES",           /\b(kip|kippendij|kipfilet|gehakt|rundvlees|rund|varken|varkensvlees|lamsvlees|lam|spek|worst|biefstuk|hamburger|pulled pork|ribben|steak|entrecote|rosbief|bacon|salami|chorizo|tartaar)\b/],
    ["GROENTEN",        /\b(groenten?|vegan|vegetarisch|tofu|tempeh|peulvruchten|linzen|kikkererwten|bonen|aubergine|courgette|broccoli|bloemkool|spinazie|paddenstoel|champignon|prei|venkel|pastinaak)\b/],
    ["DESSERT",         /\b(taart|cake|koek|gebak|pudding|mousse|tiramisu|brownie|muffin|cheesecake|crumble|sorbet|ijs|panna cotta|crème br[uû]l[eé]e|wafels|pannenkoek)\b/],
    ["ONTBIJT",         /\b(ontbijt|granola|muesli|havermout|overnight oats|smoothie|pannenkoek|wentelteefje|ei(?:eren)?|omelet|roerei|spiegelei|toast|bagel|overnight)\b/],
    ["SNACKS",          /\b(snack|borrelhapje|dip|hummus|guacamole|wrap|taco|quesadilla|nachos|pizza|bruschetta|crostini|bitterbal|kroket|frikandel)\b/],
    ["SAUZEN",          /\b(saus|dressing|vinaigrette|pesto|aioli|mayonaise|ketchup|chimichurri|salsa|jus|marinade|glaz[ue]ur)\b/],
  ];

  for (const [categorie, patroon] of patronen) {
    if (patroon.test(tekst)) return categorie;
  }

  return "OVERIG";
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

// Parseer één JSON-LD string naar een RecipeObject (of null)
function vindJsonLdVanString(str: string): JsonLdRecipe | null {
  try {
    const cleaned = str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");
    const data = JSON.parse(cleaned);
    if (data["@type"] === "Recipe") return data as JsonLdRecipe;
    if (Array.isArray(data)) {
      const r = data.find((item) => item["@type"] === "Recipe");
      if (r) return r as JsonLdRecipe;
    }
    if (data["@graph"] && Array.isArray(data["@graph"])) {
      const r = data["@graph"].find((item: { "@type": string }) => item["@type"] === "Recipe");
      if (r) return r as JsonLdRecipe;
    }
  } catch {
    // ongeldige JSON
  }
  return null;
}

// Detecteer bot-challenge pagina's (Cloudflare, Akamai, etc.) + ah.nl specifieke markers
function detecteerBotBlokkade(html: string): boolean {
  if (!html || html.length < 500) return false;
  return (
    /<title[^>]*>\s*(just a moment|attention required|access denied|403 forbidden|blocked)\s*<\/title>/i.test(html)
    || /cf-browser-verification|cf-challenge-running|cf-turnstile/i.test(html)
    || /checking if the site connection is secure/i.test(html)
    || /enable javascript and cookies to continue/i.test(html)
    || /this page is protected by.*captcha/i.test(html)
    || /robot.*detected|detected.*robot/i.test(html)
    // ah.nl specifieke markers
    || /window\.location.*security|security\.akamai|guard\.akamai/i.test(html)
    || /403|429|invalid request/i.test(html.slice(0, 500)) // check eerste 500 chars voor HTTP-achtige markers
  );
}

// Strip HTML naar leesbare plain text voor AI-extractie
function htmlNaarTekst(html: string, maxChars = 10000): string {
  // Verwijder noise-elementen
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Probeer main content te isoleren
  const mainMatch =
    stripped.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i) ||
    stripped.match(/class="[^"]*(?:recipe|recept|content|artikel)[^"]*"[^>]*>([\s\S]{500,30000}?)<\/(?:div|section|article)>/i);
  const bron = mainMatch ? mainMatch[1] : stripped;

  return stripHtml(bron).replace(/\s{3,}/g, "\n").trim().slice(0, maxChars);
}

// AI-extractie via Claude als JSON-LD en HTML-scraping beide mislukken
async function extractViaAI(html: string): Promise<JsonLdRecipe | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const tekst = htmlNaarTekst(html);
  if (tekst.length < 200) return null;

  try {
    const client = new Anthropic({ apiKey });
    const bericht = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Extraheer het recept uit deze paginatekst. Geef ALLEEN een JSON-object terug (geen uitleg, geen markdown, geen code blocks).

JSON formaat:
{
  "name": "Naam van het recept",
  "recipeIngredient": ["200 gram bloem", "2 eieren", "snufje zout"],
  "recipeInstructions": [{"@type": "HowToStep", "text": "Verwarm de oven..."}],
  "recipeYield": "4",
  "totalTime": "PT30M",
  "image": "https://..."
}

Als er geen recept op de pagina staat, geef dan terug: null

Paginatekst:
${tekst}`,
        },
      ],
    });

    const respons = bericht.content[0];
    if (respons.type !== "text") return null;

    const tekst_respons = respons.text.trim();
    if (tekst_respons === "null" || tekst_respons === "") return null;

    // Verwijder eventuele markdown code blocks die het model toch stuurt
    const schoon = tekst_respons.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const data = JSON.parse(schoon);
    if (!data || typeof data !== "object" || !data.name) return null;

    return data as JsonLdRecipe;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, jsonLdStrings, ogImage, pageHtml } = body as {
    url?: string;
    jsonLdStrings?: string[] | null; // null = extensie kon pagina niet lezen; [] = pagina geladen maar geen JSON-LD
    ogImage?: string | null;
    pageHtml?: string | null; // gerenderde HTML van de browser (voor sites zonder JSON-LD)
  };

  if (!url) {
    return NextResponse.json({ error: "Geen URL opgegeven" }, { status: 400 });
  }

  let recept: JsonLdRecipe | null = null;
  let html = "";

  // Stap 1: gebruik JSON-LD die de browser-extensie direct uit de DOM heeft gehaald
  // jsonLdStrings is een array (ook leeg) → extensie heeft de pagina geladen → geen server fetch
  // jsonLdStrings is null → extensie kon het niet lezen → probeer server fetch
  if (Array.isArray(jsonLdStrings)) {
    for (const str of jsonLdStrings) {
      recept = vindJsonLdVanString(str);
      if (recept) break;
    }
    // Geen JSON-LD gevonden: probeer de meegestuurde gerenderde HTML te scrapen
    if (!recept && pageHtml) {
      recept = vindJsonLd(pageHtml);
      if (!recept) {
        const fallback = scrapHtmlFallback(pageHtml, url ?? "");
        if (fallback) recept = fallback as JsonLdRecipe;
      }
      // Laatste redmiddel: AI-extractie als recept ontbreekt of instructies leeg zijn
      {
        const heeftInstructies = Array.isArray(recept?.recipeInstructions) && (recept.recipeInstructions as unknown[]).length > 0;
        if (!recept || !heeftInstructies) {
          const aiRecept = await extractViaAI(pageHtml);
          if (aiRecept) recept = aiRecept;
        }
      }
      html = pageHtml; // gebruik voor og:image fallback
    }
    if (!recept) {
      return NextResponse.json(
        { error: "Geen receptdata gevonden op deze pagina. Vul het recept handmatig in." },
        { status: 422 }
      );
    }
  }

  // Stap 2: server-side fetch (geen extensie-data ontvangen)
  if (!recept) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache, no-store",
          "Pragma": "no-cache",
          "Connection": "keep-alive",
          "Referer": new URL(url).origin + "/", // voeg referer toe (veel sites blocken zonder deze)
          "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const errorStatus = res.status;
        // 429 = rate limited, 403/401 = bot-detected
        if (errorStatus === 429 || errorStatus === 403 || errorStatus === 401) {
          return NextResponse.json(
            {
              error: "Deze website blokkeert automatisch ophalen (rate limiting/bot-bescherming). Probeer later opnieuw of gebruik de browserextensie.",
              partialData: {} // leeg voor nu, maar user kan later proberen
            },
            { status: 422 }
          );
        }
        throw new Error(`HTTP ${errorStatus}`);
      }
      html = await res.text();
    } catch (err) {
      return NextResponse.json(
        { error: `Kon pagina niet ophalen: ${err instanceof Error ? err.message : String(err)}` },
        { status: 422 }
      );
    }

    // Detecteer bot-challenge pagina's (Cloudflare, Akamai, etc.)
    if (detecteerBotBlokkade(html)) {
      return NextResponse.json(
        {
          error:
            "Deze website blokkeert automatisch ophalen (bot-bescherming). " +
            "Gebruik de browserextensie terwijl je op de receptenpagina bent.",
        },
        { status: 422 }
      );
    }

    // Controleer of HTML leeg is (bot-protection response)
    if (html && html.length < 2000) {
      console.warn(`[importeer] Short HTML (${html.length} chars) voor ${url}`);
      // Probeer toch JSON-LD te vinden, maar verwacht niet veel
    }

    recept = vindJsonLd(html);
    if (recept) {
      console.log(`[importeer] JSON-LD gevonden voor ${url}`);
    }

    if (!recept) {
      const fallback = scrapHtmlFallback(html, url);
      if (fallback) {
        recept = fallback as JsonLdRecipe;
        console.log(`[importeer] HTML fallback scraper werkte voor ${url}`);
      }
    }

    // Laatste redmiddel: AI-extractie als recept ontbreekt of instructies leeg zijn
    {
      const heeftInstructies = Array.isArray(recept?.recipeInstructions) && (recept.recipeInstructions as unknown[]).length > 0;
      if (!recept || !heeftInstructies) {
        const aiRecept = await extractViaAI(html);
        if (aiRecept) recept = aiRecept;
      }
    }
  }

  if (!recept || !recept.name) {
    // Stuur zoveel mogelijk partialData mee zodat het formulier alvast pre-gevuld kan worden
    const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    const ogTitel = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1]
      || html.match(/<title[^>]*>([^<|–\-]+)/i)?.[1]?.trim()
      || recept?.name || "";
    const ogFoto = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1]
      || ogImage || extractFotoUrl(recept ?? {}) || null;
    const partialIngredienten = recept?.recipeIngredient?.map(parseIngredient)
      ?? (html ? extractIngredients(html).map(parseIngredient) : []);
    const partialStappen = recept ? parseInstructies(recept.recipeInstructions, recept.recipeIngredient).map((tekst) => ({ tekst }))
      : (html ? extractStappen(html).map((tekst) => ({ tekst })) : []);

    // Detecteer loginpagina of bot-blokkade
    const isLoginPagina = html && (
      /<title[^>]*>\s*(inloggen|login|sign in|aanmelden)\s*<\/title>/i.test(html)
      || /window\.location.*login/i.test(html)
      || html.length < 20000 && /login|inloggen|sign.in/i.test(html) && !/ingredi/i.test(html)
    );
    const isBotBlokkade = html && detecteerBotBlokkade(html);
    const foutmelding = isBotBlokkade
      ? "Deze website blokkeert automatisch ophalen (bot-bescherming). Gebruik de browserextensie terwijl je op de receptenpagina bent."
      : isLoginPagina
        ? "Deze pagina vereist inloggen. Gebruik de browserextensie als je al bent ingelogd op de website."
        : "Geen receptdata gevonden op deze pagina. Vul het recept handmatig in.";

    return NextResponse.json(
      {
        error: foutmelding,
        partialData: {
          herkomstUrl: url,
          herkomstNaam: hostname,
          titel: ogTitel,
          fotoUrl: ogFoto,
          ingredienten: partialIngredienten,
          stappen: partialStappen,
        },
      },
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
  let stappen = parseInstructies(recept.recipeInstructions, recept.recipeIngredient);

  // Als stappen leeg zijn na het filteren (bijv. JSON-LD instructies bevatten eigenlijk ingrediënten):
  // 1. Probeer HTML scraper (geen API nodig)
  // 2. Probeer AI als HTML ook leeg geeft
  // 3. Return foutmelding met partialData als alles mislukt
  if (stappen.length === 0 && html) {
    // Pas dezelfde ingrediëntfilter toe op HTML-gescrapte stappen
    const ingredientenSet = maakIngredientenSet(recept.recipeIngredient);
    const htmlStappen = extractStappen(html).filter(
      (s) => !lijktOpIngredient(s, ingredientenSet)
    );
    if (htmlStappen.length > 0) {
      stappen = htmlStappen;
    } else {
      const aiRecept = await extractViaAI(html);
      if (aiRecept) {
        stappen = parseInstructies(aiRecept.recipeInstructions);
      }
    }
  }

  // Als stappen nog steeds leeg zijn: return als mislukking met partialData
  // zodat de gebruiker de foutmelding ziet en naam kan invullen
  if (stappen.length === 0) {
    const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    return NextResponse.json(
      {
        error: "Bereidingsstappen niet gevonden op deze pagina.",
        partialData: {
          herkomstUrl: url,
          herkomstNaam: hostname,
          titel: recept.name ?? "",
          fotoUrl: extractFotoUrl(recept) || null,
          ingredienten,
          stappen: [],
        },
      },
      { status: 422 }
    );
  }

  // Foto: JSON-LD image veld → og:image van extensie → og:image uit HTML
  let fotoUrl = extractFotoUrl(recept);
  if (!fotoUrl && ogImage) {
    fotoUrl = ogImage;
  }
  if (!fotoUrl && html) {
    const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    fotoUrl = ogMatch ? ogMatch[1] : null;
  }

  const categorie = detecteerCategorie(recept.name ?? "", ingredienten);

  return NextResponse.json({
    titel: recept.name ?? "",
    porties: parsePorties(recept.recipeYield),
    bereidingstijd,
    herkomstUrl: url,
    herkomstNaam: new URL(url).hostname.replace(/^www\./, ""),
    ingredienten,
    stappen: stappen.map((tekst) => ({ tekst })),
    fotoUrl,
    categorie,
  });
}
