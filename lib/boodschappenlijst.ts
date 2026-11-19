// Berekent de boodschappenlijst uit het mandje. Pure functies: geen database,
// geen React. De server haalt de gegevens op (lib/lijstData.ts) en geeft ze hier aan.
//
// De regels staan in nimbalyst-local/plans/weekmenu-en-boodschappenlijst.md, sectie 4 en 5.

import { AFDELINGEN, afdelingLabel, isAfdelingCode } from "./afdelingen";
import { EENHEDEN, eenheidWeergave, isEenheidCode } from "./eenheden";
import { formatHoeveelheid } from "./hoeveelheidWeergave";
import { normaliseerNaam } from "./productKoppeling";

export interface LijstProduct {
  id: number;
  naam: string;
  afdeling: string;
  altijdInHuis: boolean;
}

export interface LijstIngredient {
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  oorspronkelijkeTekst: string | null;
  product: LijstProduct | null;
}

export interface LijstRecept {
  receptId: number;
  titel: string;
  porties: number | null; // porties van het recept
  gekozenPorties: number | null; // porties in het mandje
  ingredienten: LijstIngredient[];
}

export interface EigenRegel {
  id: number;
  tekst: string;
}

export interface LijstRegel {
  sleutel: string;
  tekst: string;
  detail?: string; // kleine grijze tekst eronder
}

export interface LijstSectie {
  id: string; // afdelingscode, "voorraad" of "eigen"
  label: string;
  regels: LijstRegel[];
}

export const VOORRAAD_SECTIE = "voorraad";
export const EIGEN_SECTIE = "eigen";

// ---------------------------------------------------------------------------
// Eenheden

type Familie = "gew" | "vol";

// Hoeveel van de basiseenheid (g of ml) is één van deze eenheid.
const OMREKEN = new Map<string, { familie: Familie; factor: number }>(Object.entries({
  g: { familie: "gew", factor: 1 },
  kg: { familie: "gew", factor: 1000 },
  ml: { familie: "vol", factor: 1 },
  l: { familie: "vol", factor: 1000 },
  el: { familie: "vol", factor: 15 },
  tl: { familie: "vol", factor: 5 },
} as Record<string, { familie: Familie; factor: number }>));

const BASIS: Record<Familie, { klein: string; groot: string }> = {
  gew: { klein: "g", groot: "kg" },
  vol: { klein: "ml", groot: "l" },
};

const soortPerCode = new Map(EENHEDEN.map((e) => [e.code, e.soort]));

function isTelwoord(groep: string): boolean {
  return groep === "n" || soortPerCode.get(groep) === "telwoord";
}

// Het aantal porties waarmee een recept geschaald wordt; zonder porties is het 1.
export function schaalFactor(porties: number | null, gekozen: number | null): number {
  if (porties && porties > 0 && gekozen && gekozen > 0) return gekozen / porties;
  return 1;
}

function heeftHoeveelheid(h: number | null): h is number {
  return h != null && Number.isFinite(h) && h > 0;
}

// De groep waarin een regel wordt opgeteld, binnen één product.
// gew, vol, n (stuk of geen eenheid), zonder, <eenheidscode> of ?<onbekende eenheid>.
function groepVan(eenheid: string | null, heeftGetal: boolean): string {
  if (!heeftGetal) return "zonder";
  const e = (eenheid ?? "").trim();
  if (!e || e === "stuk") return "n";
  const omrekening = OMREKEN.get(e);
  if (omrekening) return omrekening.familie;
  if (isEenheidCode(e)) return e;
  return `?${e}`;
}

function rangVanGroep(groep: string): number {
  if (groep === "gew") return 0;
  if (groep === "vol") return 1;
  if (groep === "zonder") return 9;
  return 2;
}

// ---------------------------------------------------------------------------
// Tekst van een opgetelde groep

interface Bijdrage {
  eenheid: string | null;
  hoeveelheid: number; // al geschaald
}

function dichtBij(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}

// Gewicht of volume: eigen eenheid als alles in dezelfde eenheid staat (el, tl),
// anders ml of g, en l of kg vanaf 1000 als het totaal een veelvoud van 100 is.
function maatTekst(familie: Familie, bijdragen: Bijdrage[]): string {
  const eenheden = new Set(bijdragen.map((b) => b.eenheid));
  if (eenheden.size === 1) {
    const enige = [...eenheden][0]!;
    if (enige === "el" || enige === "tl") {
      const totaal = bijdragen.reduce((som, b) => som + b.hoeveelheid, 0);
      return `${formatHoeveelheid(totaal)} ${enige}`;
    }
  }
  const basis = bijdragen.reduce((som, b) => som + b.hoeveelheid * OMREKEN.get(b.eenheid!)!.factor, 0);
  const namen = BASIS[familie];
  if (basis >= 1000 && dichtBij(basis, Math.round(basis / 100) * 100)) {
    return `${formatHoeveelheid(Math.round(basis / 100) / 10)} ${namen.groot}`;
  }
  const afgerond = basis >= 10 ? Math.round(basis) : basis;
  return `${formatHoeveelheid(afgerond)} ${namen.klein}`;
}

function groepTekst(groep: string, bijdragen: Bijdrage[], productNaam: string): string {
  if (groep === "zonder") return productNaam;
  if (groep === "gew" || groep === "vol") return `${maatTekst(groep, bijdragen)} ${productNaam}`;

  let totaal = bijdragen.reduce((som, b) => som + b.hoeveelheid, 0);
  // Tellende eenheden koop je heel: 1,5 blik wordt 2 blikken
  if (isTelwoord(groep)) totaal = Math.ceil(totaal - 1e-9);
  const hoeveel = formatHoeveelheid(totaal);

  if (groep === "n") return `${hoeveel} ${productNaam}`;
  if (groep.startsWith("?")) return `${hoeveel} ${groep.slice(1)} ${productNaam}`;
  return `${hoeveel} ${eenheidWeergave(groep, totaal)} ${productNaam}`;
}

// ---------------------------------------------------------------------------
// De lijst

interface Opgeteld {
  product: LijstProduct;
  groep: string;
  bijdragen: Bijdrage[];
}

interface Ongekoppeld {
  sleutel: string;
  tekst: string;
  detail: string;
}

export function berekenLijst(recepten: LijstRecept[], eigenRegels: EigenRegel[] = []): LijstSectie[] {
  const opgeteld = new Map<string, Opgeteld>(); // "<productId>:<groep>"
  const voorraad = new Map<number, LijstProduct>();
  const ongekoppeld: Ongekoppeld[] = [];
  const gezienOngekoppeld = new Map<string, number>();

  for (const recept of recepten) {
    const factor = schaalFactor(recept.porties, recept.gekozenPorties);

    for (const ing of recept.ingredienten) {
      const product = ing.product;

      if (!product) {
        const geschaald = heeftHoeveelheid(ing.hoeveelheid) ? ing.hoeveelheid * factor : null;
        const verschaald = geschaald != null && Math.abs(factor - 1) > 1e-9;
        const eigen = [
          geschaald != null ? formatHoeveelheid(geschaald) : "",
          geschaald != null ? eenheidWeergave(ing.eenheid, geschaald) : ing.eenheid ?? "",
          ing.naam,
        ]
          .filter(Boolean)
          .join(" ");
        const oorspronkelijk = ing.oorspronkelijkeTekst?.trim() || eigen;

        const basis = `t${recept.receptId}:${normaliseerNaam(ing.naam) || "regel"}`;
        const nummer = (gezienOngekoppeld.get(basis) ?? 0) + 1;
        gezienOngekoppeld.set(basis, nummer);

        ongekoppeld.push({
          sleutel: nummer === 1 ? basis : `${basis}#${nummer}`,
          tekst: verschaald ? eigen : oorspronkelijk,
          detail: verschaald ? `${recept.titel} (oorspronkelijk: ${oorspronkelijk})` : recept.titel,
        });
        continue;
      }

      if (product.altijdInHuis) {
        voorraad.set(product.id, product);
        continue;
      }

      const heeftGetal = heeftHoeveelheid(ing.hoeveelheid);
      const groep = groepVan(ing.eenheid, heeftGetal);
      const sleutel = `${product.id}:${groep}`;
      let regel = opgeteld.get(sleutel);
      if (!regel) {
        regel = { product, groep, bijdragen: [] };
        opgeteld.set(sleutel, regel);
      }
      if (heeftGetal) {
        const eenheid = groep === "gew" || groep === "vol" ? ing.eenheid!.trim() : null;
        regel.bijdragen.push({ eenheid, hoeveelheid: ing.hoeveelheid! * factor });
      }
    }
  }

  // Een regel zonder getal vervalt als hetzelfde product al een regel met getal heeft.
  const metGetal = new Set<number>();
  for (const r of opgeteld.values()) if (r.groep !== "zonder") metGetal.add(r.product.id);

  const perAfdeling = new Map<string, { sorteer: string; rang: number; groep: string; regel: LijstRegel }[]>();
  for (const r of opgeteld.values()) {
    if (r.groep === "zonder" && metGetal.has(r.product.id)) continue;
    const afdeling = isAfdelingCode(r.product.afdeling) ? r.product.afdeling : "overig";
    const lijst = perAfdeling.get(afdeling) ?? [];
    lijst.push({
      sorteer: r.product.naam,
      rang: rangVanGroep(r.groep),
      groep: r.groep,
      regel: {
        sleutel: `p${r.product.id}:${r.groep}`,
        tekst: groepTekst(r.groep, r.bijdragen, r.product.naam),
      },
    });
    perAfdeling.set(afdeling, lijst);
  }

  const secties: LijstSectie[] = [];
  for (const afdeling of AFDELINGEN) {
    const items = (perAfdeling.get(afdeling.code) ?? []).sort(
      (a, b) => a.sorteer.localeCompare(b.sorteer, "nl") || a.rang - b.rang || a.groep.localeCompare(b.groep)
    );
    const regels = items.map((i) => i.regel);

    // "Overig" bevat ook de ingrediënten die nog aan geen product zijn gekoppeld
    if (afdeling.code === "overig") {
      const rest = [...ongekoppeld].sort((a, b) => a.tekst.localeCompare(b.tekst, "nl"));
      for (const o of rest) regels.push({ sleutel: o.sleutel, tekst: o.tekst, detail: o.detail });
    }
    if (regels.length > 0) secties.push({ id: afdeling.code, label: afdelingLabel(afdeling.code), regels });
  }

  if (voorraad.size > 0) {
    secties.push({
      id: VOORRAAD_SECTIE,
      label: "Check voorraad",
      regels: [...voorraad.values()]
        .sort((a, b) => a.naam.localeCompare(b.naam, "nl"))
        .map((p) => ({ sleutel: `p${p.id}:voorraad`, tekst: p.naam })),
    });
  }

  if (eigenRegels.length > 0) {
    secties.push({
      id: EIGEN_SECTIE,
      label: "Eigen regels",
      regels: [...eigenRegels].sort((a, b) => a.id - b.id).map((r) => ({ sleutel: `e${r.id}`, tekst: r.tekst })),
    });
  }

  return secties;
}

// ---------------------------------------------------------------------------
// Afvinken: de weergave en de tekst om te delen

// Afgevinkte regels onderaan hun sectie, verder in dezelfde volgorde.
export function afgevinktOnderaan(regels: LijstRegel[], afgevinkt: ReadonlySet<string>): LijstRegel[] {
  return [...regels.filter((r) => !afgevinkt.has(r.sleutel)), ...regels.filter((r) => afgevinkt.has(r.sleutel))];
}

export function telRegels(secties: LijstSectie[], afgevinkt: ReadonlySet<string>) {
  let totaal = 0;
  let klaar = 0;
  for (const s of secties) {
    for (const r of s.regels) {
      totaal++;
      if (afgevinkt.has(r.sleutel)) klaar++;
    }
  }
  return { totaal, afgevinkt: klaar };
}

// Platte tekst per afdeling, zonder afgevinkte regels en zonder lege secties.
export function lijstAlsTekst(secties: LijstSectie[], afgevinkt: ReadonlySet<string>): string {
  const blokken: string[] = [];
  for (const s of secties) {
    const open = s.regels.filter((r) => !afgevinkt.has(r.sleutel));
    if (open.length === 0) continue;
    blokken.push([s.label, ...open.map((r) => `- ${r.tekst}`)].join("\n"));
  }
  return ["Boodschappenlijst", ...blokken].join("\n\n");
}
