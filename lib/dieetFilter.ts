// Keywords die vlees of vis aanduiden → recept is NIET vegetarisch
const VLEES_VIS_KEYWORDS = [
  // Vlees
  "kip", "chicken", "rundvlees", "rund", "beef", "varken", "pork", "lam", "lamb",
  "gehakt", "spek", "bacon", "worst", "saucijs", "salami", "prosciutto", "ham",
  "pancetta", "chorizo", "duck", "eend", "kalkoen", "turkey", "wild", "hert",
  "konijn", "rabbit", "vlees", "meat", "carnitas", "ribeye", "entrecote",
  "ossenhaas", "biefstuk", "steak", "pulled pork", "spareribs",
  // Vis & zeevruchten
  "vis", "fish", "zalm", "salmon", "tonijn", "tuna", "sardine", "ansjovis",
  "anchovy", "anchovies", "makreel", "garnaal", "shrimp", "prawn", "inktvis",
  "squid", "octopus", "mossel", "mussel", "clam", "kreeft", "lobster", "krab",
  "crab", "forellen", "forrel", "trout", "zeevruchten", "seafood", "scampi",
  "tilapia", "kabeljauw", "cod", "witvis", "haring", "haddock",
];

// Keywords die dierlijke producten aanduiden → recept is NIET vegan
// (aanvullend op vlees/vis)
const DIERLIJK_KEYWORDS = [
  "boter", "butter", "melk", "milk", "room", "cream", "kaas", "cheese",
  "parmezaan", "parmesan", "pecorino", "mozzarella", "feta", "gorgonzola",
  "cheddar", "comté", "roquefort", "halloumi", "geitenkaas", "ricotta",
  "mascarpone", "brie", "camembert", "gruyère", "gruyere",
  "ei", "eieren", "egg", "eggs", "eiwitten", "eigeel",
  "honing", "honey",
  "yoghurt", "yogurt", "crème fraîche", "creme fraiche", "kwark",
  "cottage cheese", "cream cheese", "zure room",
  "gezouten roomboter", "ghee",
];

// Bouw Prisma-where clausule: ingredient mag géén van deze keywords bevatten
function geenVanDezeKeywords(keywords: string[]) {
  return {
    every: {
      AND: keywords.map((kw) => ({
        NOT: { naam: { contains: kw, mode: "insensitive" as const } },
      })),
    },
  };
}

export function vegetarischFilter() {
  return {
    ingredienten: geenVanDezeKeywords(VLEES_VIS_KEYWORDS),
  };
}

export function veganFilter() {
  return {
    ingredienten: geenVanDezeKeywords([
      ...VLEES_VIS_KEYWORDS,
      ...DIERLIJK_KEYWORDS,
    ]),
  };
}
