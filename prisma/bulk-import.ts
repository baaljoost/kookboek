import { PrismaClient, Categorie } from "@prisma/client";

const prisma = new PrismaClient();

// Alle URLs uit het document
const urls = [
  // Pasta
  "https://www.hellofresh.nl/recipes/orzo-met-gebakken-sjalotjes-5d9de08fc58fa845675ff37a",
  "https://www.theguardian.com/food/2019/mar/23/one-pot-puttanesca-chickpea-soup-and-spicy-popcorn-yotam-ottolenghis-store-cupboard-recipes",
  "https://cooking.nytimes.com/recipes/1020370-pasta-with-zucchini-feta-and-fried-lemon",
  "https://foodnetwork.co.uk/recipes/shrimp-and-artichoke-tagliatelle-black-pepper-and-pecorino/",
  "https://www.leukerecepten.nl/recepten/pasta-met-paprikasaus/",
  "https://www.ah.nl/kookschrift/recept?id=141689",
  "https://marleyspoon.nl/menu/43162-snelle-ansjovis-courgettepasta-met-spinazie-en-gedroogde-tomaatjes",
  "https://www.nrc.nl/nieuws/2017/03/28/thuiskokspaghetti-met-ansjovis-7501768-a1552078",
  "https://www.allesoveritaliaanseten.nl/recepten/pasta-met-gorgonzola-peer-en-walnoten/",
  "http://www.ah.nl/kookschrift/verzameld-recept?id=81801&userid=168643",
  "https://familieoverdekook.nl/vegetarische-lasagne-courgette-en-aubergine/",
  "https://healthywanderlust.nl/recepten/pasta-ricotta-citroen-garnalen/",
  "https://www.ah.nl/allerhande/recept/R-R1194606/gnocchi-met-truffelsaus-en-bloemkool",
  "https://www.zelfpestomaken.nl/recept/pesto-arrabbiata/",
  "https://lifemadesimplebakes.com/30-minute-toasted-tortellini-with-pesto/",
  // Risotto & Paella
  "https://www.ah.nl/allerhande/recept/R-R1190583/vegetarische-paella-met-gegrilde-groenten-en-gebakken-halloumi",
  // Salades
  "https://www.mindyourfeed.nl/recepten/lunch/salade-met-vijgen-en-geitenkaas/",
  "http://www.ah.nl/allerhande/recept/R-R1112310/linzensalade-met-kaasblokjes",
  "http://www.voedzaamensnel.nl/hoofdgerecht/vegetarische-maaltijdsalade-van-gegrilde-groenten/",
  "https://uitpaulineskeuken.nl/recept/kikkererwtensalade",
  "https://www.smulweb.nl/recepten/1439414/salade-geitenkaas-granaatappel-en-pistachenootjes",
  // Soep
  "https://www.ah.nl/allerhande/recept/R-R767128/rijkgevulde-tomatensoep",
  // Quiche, plaattaart, ovenschotels
  "https://www.jamieoliver.com/recipes/vegetable-recipes/wonderful-veg-tagine/",
  "https://www.nrc.nl/nieuws/2021/04/26/de-perfecte-quiche-a4041379",
  "https://www.ah.nl/allerhande/recept/R-R1195573/traybake-van-zoete-aardappel-kip-en-courgette",
  "https://www.ah.nl/r/1198139",
  "https://deliciousmagazine.nl/recepten/vegetarische-cassoulet-yvette-van-boven/",
  "https://www.ah.nl/allerhande/recept/R-R1192268/plaattaart-met-zoete-aardappel-rode-biet-en-feta",
  "https://vriendvandeshow.nl/laatsteavondmaal/posts/recept-de-fish-pie-van-hiske-versprille",
  "https://www.ah.nl/allerhande/recept/R-R1194415/bloemkoolquiche-met-oude-kaas",
  "https://www.ah.nl/allerhande/recept/R-R84452",
  "https://www.ah.nl/kookschrift/recept?id=178245",
  "http://mijnmixedkitchen.blogspot.nl/2013/08/quiche-hartige-taart-met-brie-gerookte.html",
  "https://familieoverdekook.nl/vegetarische-quiche-met-spinazie-en-feta/",
  "https://overetengesproken.nl/vegetarische-moussaka/",
  "https://www.ah.nl/allerhande/recept/R-R1192895/traybake-harissakip",
  "https://www.ah.nl/allerhande/recept/R-R1193383/knolselderij-champignongratin",
  // Curry's
  "https://www.rebelrecipes.com/chana-masala-mango-naan/",
  "https://www.thespruceeats.com/special-thai-lime-leaf-green-curry-3217453",
  "https://www.ah.nl/allerhande/recept/R-R1192842/kikkererwtenstoof-met-kokosmelk-kurkuma-en-spinazie-the-stew",
  "https://miljuschka.nl/dahl-met-geroosterde-bloemkool/",
  // Noedels
  "https://drivemehungry.com/yaki-udon-stir-fried-udon-noodles/",
  "https://www.ah.nl/allerhande/recept/R-R1192431/noedelsalade-met-broccolirijst-rivierkreeftjes-en-gemberdressing",
  "https://chickslovefood.com/recept/noedels-met-garnalen-skinny-six/",
  "https://www.yummly.com/recipe/Stir-Fry-Udon-Noodle-with-Black-Pepper-Sauce-1713403",
  // Asian
  "https://www.macaronsenmie.nl/tonijntartaar-met-japanse-dressing/",
  "https://www.dekokendezussen.nl/recepten/vegetarische-dumplings/",
  "https://madebyellen.com/gestoomde-zalm-met-sojasaus-sesam-gember/",
  "https://www.ah.nl/allerhande/recept/R-R1100694/vegetarische-rijstvelloempia-s",
  // Mexicaans
  "https://www.jamieoliver.com/recipes/vegetables-recipes/veggie-chilli/",
  "https://marleyspoon.nl/menu/45568-fajita-s-met-smoky-champignons-en-limoen-avocadocreme-met-uienpickle",
  "https://ciaoflorentina.com/tacos-de-carnitas-chive-pesto-carnitas-tacos-recipe/",
  "http://uitpaulineskeuken.nl/2013/01/burritos.html",
  "https://cooking.nytimes.com/recipes/1012445-fish-tacos",
  // Wraps
  "http://www.culy.nl/recepten/persiana/",
  // Burgers
  "http://www.ah.nl/allerhande/recept/R-R831032/vegaburger-met-geitenkaas",
  // Ontbijt & lunch
  "https://cooking.nytimes.com/recipes/1014721-shakshuka-with-feta",
  "https://www.culy.nl/recepten/okonomiyaki-hartige-japanse-pannenkoek/",
  "https://estoyhechouncocinillas.com/2015/08/tostadas-con-tomate-desayuno.html",
  "https://happyvegan.nl/vegan-recepten/vegan-pannenkoek/",
  "https://www.google.com/amp/s/bettyskitchen.nl/granola-met-eiwit/amp",
  // Taart & gebak
  "https://www.onnokleyn.nl/recept-limoentaart-zonder-bakken/",
  "https://rutgerbakt.nl/kerst-recepten/lekkerste-kersttulband-recept/",
  "https://www.bbcgoodfood.com/recipes/carrot-cake",
  "https://miljuschka.nl/pruimentaart-met-hazelnoot/",
  // Ongesorteerd
  "https://www.watschaftdepodcast.com/recept-gefrituurde-oesterzwammen/",
  "https://www.culy.nl/recepten/zoete-aardappels-met-tahiniboter/",
  "https://www.knoeienmetinge.nl/knoflookgarnalen-uit-de-oven/",
  "https://www.culy.nl/inspiratie/trend-in-londen-halloumi-frietjes/",
  "https://www.foodiesmagazine.nl/recepten/marokkaanse-couscous/",
  "https://www.francescakookt.nl/clafoutis-met-druiven/",
  "https://www.ah.nl/allerhande/recept/R-R346188/zalm-uit-de-oven-met-zeekraal-en-rose",
  "https://www.ah.nl/allerhande/recept/R-R1190633/mosselen-roquefort",
  "https://www.ah.nl/allerhande/recept/R-R369612/portobello-gevuld-met-gorgonzola",
  "https://www.ah.nl/allerhande/recept/R-R1193232/vegetarische-paddenstoelenstoof-met-knolselderijpuree",
  "https://www.ah.nl/allerhande/recept/R-R299886/hutspot-met-gembersiroop-en-geitenkaas",
  "https://cooking.nytimes.com/recipes/1021805-caramelized-plantains-with-beans-scallions-and-lemon",
  // Nog een keer proberen
  "https://www.myparisiankitchen.com/en/peach-melba-esay-recipe-and-story-behind/",
  "https://food52.com/recipes/82027-chile-chicken-with-pineapple-recipe",
  "https://www.tajine.nl/recept/tunesische-brik/",
  "https://www.bbcgoodfood.com/recipes/sweet-potato-goats-cheese-ravioli",
  "https://www.bbcgoodfood.com/recipes/ravioli-artichokes-leek-lemon",
  "https://www.degroenemeisjes.nl/kokos-linzen-dal/",
  "https://www.theguardian.com/food/2022/sep/26/claudia-roden-recipe-for-aubergine-fritters-with-honey",
  "https://www.theguardian.com/food/2022/may/04/how-to-make-the-perfect-pasta-con-le-sarde-recipe",
  "https://www.theguardian.com/food/2021/dec/15/how-to-make-the-perfect-vegetarian-wellington-recipe",
  "https://www.ah.nl/allerhande/recept/R-R1186329/sergio-hermans-zeekraalrisotto",
  "https://www.theguardian.com/food/2022/sep/26/claudia-roden-recipe-for-pissaladiere",
  "https://tasty.co/recipe/coconut-broth-clams",
  "https://www.volkskrant.nl/eten-en-drinken/de-volkskeuken-doe-het-zelfvleesvervangers-van-aubergine~bb5588cb/",
  "https://www.nrc.nl/nieuws/2020/09/16/de-aubergines-van-fuchsia-a4012297",
  "https://cooking.nytimes.com/recipes/3783-original-plum-torte",
  "https://www.theguardian.com/food/2022/apr/13/how-to-make-the-perfect-cardamom-buns-recipe-felicity-cloake",
  "https://www.aspall.co.uk/blogs/recipes/rachel-greens-pickled-grapes",
  "https://uitpaulineskeuken.nl/recept/kikkererwtensalade",
  "https://www.culy.nl/recepten/kikkererwtensalade",
  "https://www.ah.nl/allerhande/recept/R-R1190311/raita",
];

// Uniek maken
const uniqueUrls = [...new Set(urls)];

interface ParsedIngredient {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
  notitie: string;
}

interface ImportedRecept {
  titel: string;
  porties: number | null;
  bereidingstijd: number | null;
  herkomstUrl: string;
  herkomstNaam: string;
  ingredienten: ParsedIngredient[];
  stappen: { tekst: string }[];
  fotoUrl: string | null;
}

async function importeerUrl(url: string): Promise<ImportedRecept | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Kookboek/1.0; recepten-import)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // JSON-LD zoeken
    const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    // eslint-disable-next-line no-cond-assign
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        const jsonLd =
          data["@type"] === "Recipe"
            ? data
            : Array.isArray(data)
            ? data.find((i: { "@type": string }) => i["@type"] === "Recipe")
            : data["@graph"]?.find((i: { "@type": string }) => i["@type"] === "Recipe");

        if (!jsonLd) continue;

        // Bereidingstijd
        let bereidingstijd: number | null = null;
        const parseIso = (iso: string) => {
          const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          if (!m) return null;
          return (parseInt(m[1] ?? "0") * 60 + parseInt(m[2] ?? "0")) || null;
        };
        if (jsonLd.totalTime) bereidingstijd = parseIso(jsonLd.totalTime);
        else if (jsonLd.cookTime || jsonLd.prepTime) {
          bereidingstijd = (parseIso(jsonLd.cookTime ?? "") ?? 0) + (parseIso(jsonLd.prepTime ?? "") ?? 0) || null;
        }

        // Ingrediënten
        const parseIngredient = (tekst: string): ParsedIngredient => {
          const notitieMatch = tekst.match(/^(.+?),\s*(.+)$/);
          const notitie = notitieMatch ? notitieMatch[2].trim() : "";
          const basis = notitieMatch ? notitieMatch[1].trim() : tekst.trim();
          const m = basis.match(/^([\d\s\u00BC\u00BD\u00BE\/\.]+)\s*(ml|dl|l|gram|gr|g|kg|el|tl|cup|cups|tbsp|tsp|stuks?|stuk|bosje|snufje|scheut|handvol|ons|pond|oz|lb|bunch)?\s*(.*)/i);
          if (m) return { hoeveelheid: m[1].trim(), eenheid: m[2]?.trim() ?? "", naam: m[3].trim() || basis, notitie };
          return { hoeveelheid: "", eenheid: "", naam: basis, notitie };
        };

        // Stappen
        const parseStappen = (inst: unknown): string[] => {
          if (!inst) return [];
          if (typeof inst === "string") return inst.split(/\n+/).map(s => s.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
          if (Array.isArray(inst)) {
            const stappen: string[] = [];
            for (const item of inst) {
              if (typeof item === "string") stappen.push(item.trim());
              else if (item["@type"] === "HowToStep" && item.text) stappen.push(item.text.trim());
              else if (item["@type"] === "HowToSection" && item.itemListElement) {
                for (const sub of item.itemListElement) if (sub.text) stappen.push(sub.text.trim());
              }
            }
            return stappen.filter(Boolean);
          }
          return [];
        };

        // Foto
        let fotoUrl: string | null = null;
        if (jsonLd.image) {
          if (typeof jsonLd.image === "string") fotoUrl = jsonLd.image;
          else if (Array.isArray(jsonLd.image)) fotoUrl = typeof jsonLd.image[0] === "string" ? jsonLd.image[0] : jsonLd.image[0]?.url ?? null;
          else if (jsonLd.image?.url) fotoUrl = jsonLd.image.url;
        }

        // Porties
        const portiesRaw = jsonLd.recipeYield;
        let porties: number | null = null;
        if (portiesRaw) {
          const str = Array.isArray(portiesRaw) ? portiesRaw[0] : String(portiesRaw);
          const pm = str.match(/\d+/);
          if (pm) porties = parseInt(pm[0]);
        }

        return {
          titel: jsonLd.name ?? "",
          porties,
          bereidingstijd,
          herkomstUrl: url,
          herkomstNaam: new URL(url).hostname.replace(/^www\./, ""),
          ingredienten: (jsonLd.recipeIngredient ?? []).map(parseIngredient),
          stappen: parseStappen(jsonLd.recipeInstructions).map((tekst: string) => ({ tekst })),
          fotoUrl,
        };
      } catch {
        // skip
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

function maakSlug(titel: string): string {
  return titel
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u").replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

async function main() {
  console.log(`\nBulk import van ${uniqueUrls.length} URLs...\n`);
  let gelukt = 0, mislukt = 0, overgeslagen = 0;
  const mislukteLijst: string[] = [];

  for (const url of uniqueUrls) {
    // Al eerder geïmporteerd?
    const bestaand = await prisma.recept.findFirst({ where: { herkomstUrl: url } });
    if (bestaand) {
      console.log(`  ⏭  Overgeslagen (bestaat al): ${bestaand.titel}`);
      overgeslagen++;
      continue;
    }

    process.stdout.write(`  ⏳ ${url.substring(0, 60)}...`);
    const data = await importeerUrl(url);

    if (!data || !data.titel) {
      console.log(` ✗ (geen JSON-LD gevonden)`);
      mislukt++;
      mislukteLijst.push(url);
      continue;
    }

    // Slug
    let slug = maakSlug(data.titel);
    const slugBestaand = await prisma.recept.findUnique({ where: { slug } });
    if (slugBestaand) slug = `${slug}-${Date.now()}`;

    await prisma.recept.create({
      data: {
        titel: data.titel,
        slug,
        categorie: Categorie.OVERIG,
        porties: data.porties,
        bereidingstijd: data.bereidingstijd,
        herkomstNaam: data.herkomstNaam,
        herkomstUrl: data.herkomstUrl,
        ingredienten: {
          create: data.ingredienten.map((ing, i) => ({
            volgorde: i,
            hoeveelheid: ing.hoeveelheid ? parseFloat(ing.hoeveelheid) || null : null,
            eenheid: ing.eenheid || null,
            naam: ing.naam,
            notitie: ing.notitie || null,
          })),
        },
        stappen: {
          create: data.stappen.map((s, i) => ({ volgorde: i, tekst: s.tekst })),
        },
        fotos: data.fotoUrl ? {
          create: [{ volgorde: 0, url: data.fotoUrl, altTekst: data.titel }],
        } : undefined,
      },
    });

    console.log(` ✓ ${data.titel}`);
    gelukt++;

    // Kleine pauze om servers niet te overbelasten
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Klaar!`);
  console.log(`   Geïmporteerd: ${gelukt}`);
  console.log(`   Overgeslagen: ${overgeslagen}`);
  console.log(`   Mislukt:      ${mislukt}`);

  if (mislukteLijst.length > 0) {
    console.log(`\nMislukte URLs (geen JSON-LD):`);
    mislukteLijst.forEach(u => console.log(`   - ${u}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
