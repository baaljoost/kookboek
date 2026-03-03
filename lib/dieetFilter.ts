// Keywords die vlees of vis aanduiden → recept is NIET vegetarisch
// Gebruik als hele woorden (woordgrens-matching in filterRecepten)
const VLEES_VIS_KEYWORDS = [
  // Vlees
  "kip", "chicken", "rundvlees", "rund", "beef", "varken", "pork", "lam", "lamb",
  "gehakt", "spek", "bacon", "worst", "saucijs", "salami", "prosciutto", "ham",
  "pancetta", "chorizo", "duck", "eend", "kalkoen", "turkey", "carnitas", "ribeye",
  "entrecote", "ossenhaas", "biefstuk", "steak", "spareribs", "vlees", "meat",
  "konijn", "rabbit", "hert", "wild",
  // Vis & zeevruchten — specifiek genoeg om geen valse positieven te geven
  "zalm", "salmon", "tonijn", "tuna", "sardine", "ansjovis", "anchovy", "anchovies",
  "makreel", "garnaal", "shrimp", "prawn", "inktvis", "squid", "octopus",
  "mossel", "mussel", "kreeft", "lobster", "krab", "crab", "zeevruchten", "seafood",
  "scampi", "tilapia", "kabeljauw", "cod", "witvis", "haddock", "forellen",
  // Meer specifiek voor vis: gebruik "vilet" niet, wél expliciete vissen
  "haring", "paling", "brasem", "snoek", "forel",
  // Combinaties die zeker vlees/vis zijn
  "visfilet", "kipfilet", "kippenborst", "kippendij", "kipdij", "gehaktbal",
];

// Keywords die dierlijke producten aanduiden → recept is NIET vegan
const DIERLIJK_KEYWORDS = [
  "boter", "butter", "melk", "milk", "room", "cream", "kaas", "cheese",
  "parmezaan", "parmesan", "pecorino", "mozzarella", "feta", "gorgonzola",
  "cheddar", "comté", "roquefort", "halloumi", "geitenkaas", "ricotta",
  "mascarpone", "brie", "camembert", "gruyère", "gruyere",
  "ei", "eieren", "egg", "eggs", "eiwitten", "eigeel",
  "honing", "honey",
  "yoghurt", "yogurt", "kwark", "ghee",
];

// Maakt een regex die het keyword als heel woord matcht (woordgrens of spatie/leesteken)
function maakWoordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s,()/-])${escaped}([\\s,()/-]|$)`, "i");
}

type IngredientRecord = { naam: string };

function bevatKeyword(ingredienten: IngredientRecord[], keywords: string[]): boolean {
  const regexes = keywords.map(maakWoordRegex);
  return ingredienten.some((ing) =>
    regexes.some((re) => re.test(` ${ing.naam} `))
  );
}

export function isVegetarisch(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, VLEES_VIS_KEYWORDS);
}

export function isVegan(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, [...VLEES_VIS_KEYWORDS, ...DIERLIJK_KEYWORDS]);
}
