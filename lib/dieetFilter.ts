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
  // Vis & zeevruchten
  "zalmfilet", "zalm", "salmon",
  "tonijnfilet", "tonijn", "tuna",
  "sardine",
  "ansjovis", "anchovy", "anchovies",
  "makreel",
  "garnaal", "garnalen", "shrimp", "prawn", "scampi",
  "inktvis", "squid", "octopus",
  "mossel", "mosselen", "mussel",
  "clam", "clams",
  "kreeft", "rivierkreeft",
  "lobster", "krab", "krabben", "crab",
  "zeevruchten", "seafood",
  "tilapia", "kabeljauw", "cod", "haddock",
  "haring", "paling", "forel", "forellen", "snoek",
  "visfilet", "scholfilet", "schol",
  "viskoek", "visstick",
  "fish sauce", "vissaus", "oestersaus", "oyster sauce",
  "fish", // Fish Tacos, fish and chips etc. — Engels gerecht
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

// De naam is de bewoording van het recept; de productnaam is de Nederlandse
// standaardnaam van een gekoppeld ingrediënt. Door ook daarop te zoeken wordt
// een Engelse regel die aan "kip" is gekoppeld ook herkend. Ongekoppeld
// werkt zoals voorheen.
type IngredientRecord = { naam: string; product?: { naam: string } | null };

function bevatKeyword(ingredienten: IngredientRecord[], keywords: string[]): boolean {
  return ingredienten.some((ing) => {
    const teksten = [ing.naam.toLowerCase()];
    if (ing.product?.naam) teksten.push(ing.product.naam.toLowerCase());
    return keywords.some((kw) => teksten.some((tekst) => tekst.includes(kw.toLowerCase())));
  });
}

export function isVegetarisch(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, VLEES_VIS_KEYWORDS);
}

export function isVegan(ingredienten: IngredientRecord[]): boolean {
  return !bevatKeyword(ingredienten, [...VLEES_VIS_KEYWORDS, ...DIERLIJK_KEYWORDS]);
}
