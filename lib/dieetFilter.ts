// Keywords die vlees of vis aanduiden → recept is NIET vegetarisch
// Elk keyword wordt als substring gematcht (bevat), maar is specifiek genoeg
// om geen valse positieven te geven.
const VLEES_VIS_KEYWORDS = [
  // Kip
  "kip", "chicken", "kipfilet", "kippenborst", "kippendij", "kipdij",
  "scharrelkip", "kiphaas", "kippenpoot",
  // Rund/beef
  "rundvlees", "rundergehakt", "beef", "biefstuk", "ribeye", "entrecote",
  "ossenhaas", "gehakt", // gehakt = bijna altijd vlees
  // Varken
  "varkensvlees", "varken", "pork", "spek", "bacon", "pancetta", "chorizo",
  "salami", "prosciutto", "ham", "saucijs", "spareribs", "worst",
  // Lam
  "lamsvlees", "lamsgehakt", "lamsfilet", "lamsrack", "lam ", "lamb",
  // Overig vlees
  "eend", "duck", "kalkoen", "turkey", "carnitas", "hert", "konijn", "rabbit",
  "vlees", "meat",
  // Vis — specifiek genoeg
  "zalmfilet", "zalm", "salmon",
  "tonijnfilet", "tonijn", "tuna",
  "sardine",
  "ansjovis", "anchovy", "anchovies",
  "makreel",
  "garnaal", "shrimp", "prawn", "scampi",
  "inktvis", "squid", "octopus",
  "mossel", "mussel",
  "kreeft", "lobster",
  "krab", "crab",
  "zeevruchten", "seafood",
  "tilapia", "kabeljauw", "cod", "haddock",
  "haring", "paling", "forel", "forellen", "snoek",
  "visfilet", "scholfilet", "schol",
  // Generiek "vis" maar voorkom "viskoek" false negative — "vis" is genoeg
  // want "viskoekjes" bevat wel degelijk het woord "vis"
  "viskoek", "visstick",
  // Gevogelte
  "eendenborst", "kippenvleugel",
];

// Keywords die dierlijke producten aanduiden → recept is NIET vegan
const DIERLIJK_KEYWORDS = [
  "boter", "roomboter", "butter",
  "melk", "milk", "halfvolle melk", "volle melk",
  "slagroom", "room", "cream",
  "kaas", "cheese", "parmezaan", "parmesan", "pecorino", "mozzarella",
  "feta", "gorgonzola", "cheddar", "comté", "roquefort", "halloumi",
  "geitenkaas", "ricotta", "mascarpone", "brie", "camembert", "gruyère", "gruyere",
  "ei", "eieren", "egg", "eggs", "eiwitten", "eigeel",
  "honing", "honey",
  "yoghurt", "yogurt", "kwark", "ghee",
  "crème fraîche", "creme fraiche", "zure room",
];

type IngredientRecord = { naam: string };

function bevatKeyword(ingredienten: IngredientRecord[], keywords: string[]): boolean {
  return ingredienten.some((ing) => {
    const naam = ing.naam.toLowerCase();
    return keywords.some((kw) => naam.includes(kw.toLowerCase()));
  });
}

export function isVegetarisch(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, VLEES_VIS_KEYWORDS);
}

export function isVegan(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, [...VLEES_VIS_KEYWORDS, ...DIERLIJK_KEYWORDS]);
}
