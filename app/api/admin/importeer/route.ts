import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

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
  // PT30M -> 30, PT1H30M -> 90
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
    // Soms één lange string met genummerde stappen
    return instructies
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
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
  // Probeer hoeveelheid + eenheid + naam te splitsen
  // Bijv: "200 gram bloem" / "2 el olijfolie" / "3 knoflookteentjes, fijngehakt"
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
      const data = JSON.parse(match[1]);

      // Kan direct een Recipe zijn
      if (data["@type"] === "Recipe") return data as JsonLdRecipe;

      // Kan een array zijn
      if (Array.isArray(data)) {
        const recept = data.find((item) => item["@type"] === "Recipe");
        if (recept) return recept as JsonLdRecipe;
      }

      // Kan een @graph hebben
      if (data["@graph"]) {
        const recept = data["@graph"].find(
          (item: { "@type": string }) => item["@type"] === "Recipe"
        );
        if (recept) return recept as JsonLdRecipe;
      }
    } catch {
      // Ongeldige JSON, skip
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "Geen URL opgegeven" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Kookboek/1.0; recepten-import)",
        Accept: "text/html",
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

  const jsonLd = vindJsonLd(html);

  if (!jsonLd) {
    return NextResponse.json(
      { error: "Geen receptdata gevonden op deze pagina. Vul het recept handmatig in." },
      { status: 422 }
    );
  }

  // Bereidingstijd: totalTime > cookTime + prepTime
  let bereidingstijd: number | null = null;
  if (jsonLd.totalTime) {
    bereidingstijd = parseIsoDuration(jsonLd.totalTime);
  } else if (jsonLd.cookTime || jsonLd.prepTime) {
    const cook = jsonLd.cookTime ? parseIsoDuration(jsonLd.cookTime) ?? 0 : 0;
    const prep = jsonLd.prepTime ? parseIsoDuration(jsonLd.prepTime) ?? 0 : 0;
    bereidingstijd = cook + prep || null;
  }

  const ingredienten = (jsonLd.recipeIngredient ?? []).map(parseIngredient);
  const stappen = parseInstructies(jsonLd.recipeInstructions);

  // Foto-URL extraheren
  let fotoUrl: string | null = null;
  if (jsonLd.image) {
    if (typeof jsonLd.image === "string") {
      fotoUrl = jsonLd.image;
    } else if (Array.isArray(jsonLd.image)) {
      fotoUrl = typeof jsonLd.image[0] === "string" ? jsonLd.image[0] : (jsonLd.image[0] as { url?: string })?.url ?? null;
    } else if (typeof jsonLd.image === "object" && jsonLd.image.url) {
      fotoUrl = jsonLd.image.url;
    }
  }

  return NextResponse.json({
    titel: jsonLd.name ?? "",
    porties: parsePorties(jsonLd.recipeYield),
    bereidingstijd,
    herkomstUrl: url,
    herkomstNaam: new URL(url).hostname.replace(/^www\./, ""),
    ingredienten,
    stappen: stappen.map((tekst) => ({ tekst })),
    fotoUrl,
  });
}
