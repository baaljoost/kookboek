// Zet invoer van een formulier, een import of de browserextensie om naar
// de waarden die in de database komen. Eén plek voor alle schrijfroutes.

import { hoeveelheidNaarTekst, normaliseerEenheid, parseHoeveelheidTekst } from "./ingredientParser";
import { normaliseerNaam, zoekProduct, type ProductIndex } from "./productKoppeling";

// Wat een route binnenkrijgt. Hoeveelheid mag tekst ("1/2", "2,5") of een
// getal zijn; oude invoer zonder oorspronkelijkeTekst blijft werken.
export interface IngredientInvoer {
  id?: number;
  hoeveelheid?: string | number | null;
  eenheid?: string | null;
  naam?: string | null;
  notitie?: string | null;
  oorspronkelijkeTekst?: string | null;
}

export interface IngredientOpslag {
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string | null;
  productId: number | null;
}

// De regel zoals die nu in de database staat (bij bewerken).
export interface BestaandIngredient {
  id: number;
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string | null;
  productId: number | null;
}

const MAX_TEKST = 500;

function tekst(waarde: unknown): string {
  return waarde == null ? "" : String(waarde).trim();
}

function zelfdeGetal(a: number | null, b: number | null): boolean {
  const leegA = a == null || Number.isNaN(a);
  const leegB = b == null || Number.isNaN(b);
  if (leegA || leegB) return leegA && leegB;
  return Math.abs((a as number) - (b as number)) < 1e-6;
}

// De regel zoals hij is ingevoerd, voor in oorspronkelijkeTekst.
function alsRegel(invoer: IngredientInvoer): string {
  const basis = [tekst(invoer.hoeveelheid), tekst(invoer.eenheid), tekst(invoer.naam)].filter(Boolean).join(" ");
  const notitie = tekst(invoer.notitie);
  return (notitie ? `${basis}, ${notitie}` : basis).slice(0, MAX_TEKST);
}

function woorden(waarde: string): string[] {
  return waarde.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 1);
}

// Een meegestuurde importregel telt alleen als de naam er nog in voorkomt.
// Is de rij na het importeren overschreven met een ander ingrediënt, dan
// hoort die regel er niet meer bij.
function hoortBij(regel: string, naam: string): boolean {
  const inRegel = regel.toLowerCase();
  return woorden(naam).every((woord) => inRegel.includes(woord));
}

export function verwerkIngredient(
  invoer: IngredientInvoer,
  index: ProductIndex<number>,
  bestaand?: BestaandIngredient | null
): IngredientOpslag {
  const naam = tekst(invoer.naam);
  const notitie = tekst(invoer.notitie) || null;
  const eenheidTekst = tekst(invoer.eenheid);
  let hoeveelheid = parseHoeveelheidTekst(invoer.hoeveelheid);
  let eenheid: string | null = eenheidTekst || null;

  // Bij bewerken: hoeveelheid en eenheid die niet zijn aangeraakt blijven
  // letterlijk staan. Zo verandert opslaan geen regel die nog op de
  // omzetting wacht.
  // "Niet aangeraakt" = het getal is gelijk, of het veld toont nog precies
  // wat het formulier voor de opgeslagen waarde liet zien.
  const maatOngewijzigd =
    !!bestaand &&
    (zelfdeGetal(bestaand.hoeveelheid, hoeveelheid) ||
      tekst(invoer.hoeveelheid) === hoeveelheidNaarTekst(bestaand.hoeveelheid)) &&
    (bestaand.eenheid ?? "") === eenheidTekst;

  if (bestaand && maatOngewijzigd) {
    hoeveelheid = bestaand.hoeveelheid;
    eenheid = bestaand.eenheid;
  } else if (eenheidTekst) {
    // Synoniem → code, cups en dl → omgerekend. Een onbekend woord blijft
    // staan zoals het is ingevoerd.
    const genormaliseerd = normaliseerEenheid(hoeveelheid, eenheidTekst);
    if (genormaliseerd) {
      hoeveelheid = genormaliseerd.hoeveelheid;
      eenheid = genormaliseerd.eenheid;
    }
  }

  const naamOngewijzigd = !!bestaand && normaliseerNaam(bestaand.naam) === normaliseerNaam(naam);
  const productId =
    bestaand && naamOngewijzigd && bestaand.productId != null ? bestaand.productId : zoekProduct(index, naam);

  let oorspronkelijkeTekst: string | null;
  if (bestaand) {
    const helemaalOngewijzigd =
      maatOngewijzigd && bestaand.naam === naam && (bestaand.notitie ?? null) === notitie;
    // Nooit overschrijven. Een regel zonder oorspronkelijke tekst die niet
    // is aangeraakt, blijft leeg: die wacht nog op de omzetting.
    oorspronkelijkeTekst = bestaand.oorspronkelijkeTekst ?? (helemaalOngewijzigd ? null : alsRegel(invoer));
  } else {
    const meegestuurd = tekst(invoer.oorspronkelijkeTekst).slice(0, MAX_TEKST);
    oorspronkelijkeTekst = meegestuurd && hoortBij(meegestuurd, naam) ? meegestuurd : alsRegel(invoer);
  }

  return { hoeveelheid, eenheid, naam, notitie, oorspronkelijkeTekst, productId };
}

// Verwerk een hele lijst. Regels zonder naam vallen weg. Bij bewerken
// wordt elke ingevoerde regel op id aan de bestaande regel gekoppeld.
export function verwerkIngredienten(
  invoer: IngredientInvoer[] | null | undefined,
  index: ProductIndex<number>,
  bestaande: BestaandIngredient[] = []
): (IngredientOpslag & { volgorde: number })[] {
  const opId = new Map(bestaande.map((b) => [b.id, b]));
  const uit: (IngredientOpslag & { volgorde: number })[] = [];
  for (const regel of invoer ?? []) {
    if (!regel || !tekst(regel.naam)) continue;
    const id = typeof regel.id === "number" ? regel.id : NaN;
    const bestaand = opId.get(id) ?? null;
    if (bestaand) opId.delete(id); // elke bestaande regel hooguit één keer
    uit.push({ ...verwerkIngredient(regel, index, bestaand), volgorde: uit.length });
  }
  return uit;
}
