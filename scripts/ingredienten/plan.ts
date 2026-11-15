// Bepaalt wat toepassen.ts gaat doen, zonder iets te schrijven.
// Alle beslissingen staan hier, zodat ze getest zijn; toepassen.ts voert
// alleen het plan uit.

import { isEenheidCode } from "../../lib/eenheden";
import { isVegan, isVegetarisch } from "../../lib/dieetFilter";
import { normaliseerNaam } from "../../lib/productKoppeling";
import { csvNaarGetal, type ControleRij } from "./controle";
import { naarOpgeslagen, uitOpgeslagen, zelfdeGetal, type RegelWaarden, type Wijziging } from "./soorten";

export interface DbRegel {
  id: number;
  slug: string;
  titel: string;
  volgorde: number;
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  notitie: string | null;
  oorspronkelijkeTekst: string | null;
  productId: number | null;
}

export interface Overgeslagen {
  slug: string;
  volgorde: string;
  naam: string;
  reden: string;
}

export interface Plan {
  wijzigingen: Wijziging[];
  overgeslagen: Overgeslagen[];
  zonderAkkoord: number;
  telling: Record<string, number>;
}

const MAX_TEKST = 500;

function waarden(regel: DbRegel): RegelWaarden {
  return {
    hoeveelheid: naarOpgeslagen(regel.hoeveelheid),
    eenheid: regel.eenheid,
    naam: regel.naam,
    notitie: regel.notitie,
    oorspronkelijkeTekst: regel.oorspronkelijkeTekst,
    productId: regel.productId,
  };
}

function zelfdeOudeWaarden(regel: DbRegel, rij: ControleRij): boolean {
  const oud = csvNaarGetal(rij.oude_hoeveelheid);
  return (
    oud !== undefined &&
    zelfdeGetal(regel.hoeveelheid, oud) &&
    (regel.eenheid ?? "").trim() === rij.oude_eenheid.trim() &&
    regel.naam.trim() === rij.oude_naam.trim() &&
    (regel.notitie ?? "").trim() === rij.oude_notitie.trim()
  );
}

export function maakPlan(rijen: ControleRij[], db: DbRegel[], producten: { id: number; naam: string }[]): Plan {
  const opPlek = new Map<string, DbRegel[]>();
  for (const regel of db) {
    const sleutel = `${regel.slug}\n${regel.volgorde}`;
    opPlek.set(sleutel, [...(opPlek.get(sleutel) ?? []), regel]);
  }
  const productId = new Map(producten.map((p) => [normaliseerNaam(p.naam), p.id]));

  const plan: Plan = { wijzigingen: [], overgeslagen: [], zonderAkkoord: 0, telling: {} };
  const gebruikt = new Set<number>();
  const tel = (soort: string) => (plan.telling[soort] = (plan.telling[soort] ?? 0) + 1);

  for (const rij of rijen) {
    if (rij.akkoord.trim().toLowerCase() !== "ja") {
      plan.zonderAkkoord++;
      continue;
    }
    const sla = (reden: string) =>
      plan.overgeslagen.push({ slug: rij.slug, volgorde: rij.volgorde, naam: rij.oude_naam, reden });

    const kandidaten = opPlek.get(`${rij.slug.trim()}\n${Number(rij.volgorde)}`) ?? [];
    if (kandidaten.length === 0) {
      sla("regel niet gevonden: recept verwijderd of ingrediënten verschoven");
      continue;
    }
    const passend = kandidaten.filter((k) => zelfdeOudeWaarden(k, rij) && !gebruikt.has(k.id));
    if (passend.length === 0) {
      const omgezet = kandidaten.every((k) => k.oorspronkelijkeTekst != null);
      sla(omgezet ? "al omgezet" : "recept is sinds de export bewerkt");
      continue;
    }
    if (passend.length > 1) {
      sla("meerdere regels met dezelfde volgorde en waarden");
      continue;
    }
    const regel = passend[0];
    if (regel.oorspronkelijkeTekst != null) {
      sla("al omgezet");
      continue;
    }

    // Controleer de voorgestelde waarden (jij kunt ze hebben aangepast)
    const hoeveelheid = csvNaarGetal(rij.hoeveelheid);
    if (hoeveelheid === undefined || (hoeveelheid != null && !Number.isFinite(hoeveelheid))) {
      sla(`hoeveelheid "${rij.hoeveelheid}" is niet te lezen`);
      continue;
    }
    const eenheid = rij.eenheid.trim() || null;
    if (eenheid && !isEenheidCode(eenheid)) {
      sla(`eenheid "${eenheid}" staat niet op de lijst`);
      continue;
    }
    const naam = rij.naam.trim();
    if (!naam) {
      sla("naam is leeg");
      continue;
    }
    let nieuwProductId = regel.productId; // leeg laten = bestaande koppeling houden
    if (rij.product.trim()) {
      const gevonden = productId.get(normaliseerNaam(rij.product));
      if (gevonden === undefined) {
        sla(`product "${rij.product.trim()}" bestaat niet in de database`);
        continue;
      }
      nieuwProductId = gevonden;
    }

    const oorspronkelijk =
      (rij.bronregel.trim() || rij.herstelde_tekst.trim() || [rij.oude_hoeveelheid, rij.oude_eenheid, rij.oude_naam].join(" ").trim())
        .slice(0, MAX_TEKST);

    const nieuw: RegelWaarden = {
      hoeveelheid,
      eenheid,
      naam,
      notitie: rij.notitie.trim() || null,
      oorspronkelijkeTekst: oorspronkelijk,
      productId: nieuwProductId,
    };

    gebruikt.add(regel.id);
    plan.wijzigingen.push({ id: regel.id, slug: regel.slug, volgorde: regel.volgorde, oud: waarden(regel), nieuw });

    const verschillen = [
      !zelfdeGetal(regel.hoeveelheid, hoeveelheid) && "hoeveelheid gewijzigd",
      (regel.eenheid ?? "") !== (eenheid ?? "") && "eenheid gewijzigd",
      regel.naam !== naam && "naam gewijzigd",
      (regel.notitie ?? "") !== (nieuw.notitie ?? "") && "notitie gewijzigd",
    ].filter((v): v is string => typeof v === "string");
    verschillen.forEach(tel);
    const zichtbaar = verschillen.length > 0;
    if (regel.productId == null && nieuwProductId != null) tel("product gekoppeld");
    else if (regel.productId !== nieuwProductId) tel("productkoppeling gewijzigd");
    if (nieuwProductId == null) tel("blijft zonder product (komt in Koppelen)");
    if (!zichtbaar) tel("alleen oorspronkelijke tekst vastgelegd");
  }
  return plan;
}

export interface DieetVerschil {
  slug: string;
  titel: string;
  vegetarisch: [boolean, boolean] | null; // [voor, na], null = gelijk
  vegan: [boolean, boolean] | null;
}

// Voor welke recepten verandert de uitkomst van het dieetfilter?
export function dieetVerschillen(db: DbRegel[], wijzigingen: Wijziging[], productNaam: Map<number, string>): DieetVerschil[] {
  const nieuw = new Map(wijzigingen.map((w) => [w.id, w.nieuw]));
  const perRecept = new Map<string, DbRegel[]>();
  for (const regel of db) perRecept.set(regel.slug, [...(perRecept.get(regel.slug) ?? []), regel]);

  const metProduct = (naam: string, id: number | null) => ({
    naam,
    product: id != null && productNaam.has(id) ? { naam: productNaam.get(id)! } : null,
  });

  const uit: DieetVerschil[] = [];
  for (const [slug, regels] of perRecept) {
    const voor = regels.map((r) => metProduct(r.naam, r.productId));
    const na = regels.map((r) => {
      const w = nieuw.get(r.id);
      return w ? metProduct(w.naam, w.productId) : metProduct(r.naam, r.productId);
    });
    const vega: [boolean, boolean] = [isVegetarisch(voor), isVegetarisch(na)];
    const vegan: [boolean, boolean] = [isVegan(voor), isVegan(na)];
    if (vega[0] !== vega[1] || vegan[0] !== vegan[1]) {
      uit.push({
        slug,
        titel: regels[0].titel,
        vegetarisch: vega[0] !== vega[1] ? vega : null,
        vegan: vegan[0] !== vegan[1] ? vegan : null,
      });
    }
  }
  return uit;
}

function zelfdeWaarden(regel: DbRegel, w: RegelWaarden): boolean {
  return (
    zelfdeGetal(regel.hoeveelheid, uitOpgeslagen(w.hoeveelheid)) &&
    (regel.eenheid ?? null) === (w.eenheid ?? null) &&
    regel.naam === w.naam &&
    (regel.notitie ?? null) === (w.notitie ?? null) &&
    (regel.oorspronkelijkeTekst ?? null) === (w.oorspronkelijkeTekst ?? null) &&
    (regel.productId ?? null) === (w.productId ?? null)
  );
}

export interface TerugdraaiPlan {
  herstellen: Wijziging[];
  alTeruggedraaid: number;
  overgeslagen: Overgeslagen[];
}

// Draai alleen regels terug die nog precies zo staan als toepassen.ts ze
// heeft achtergelaten. Is een regel daarna bewerkt, dan blijft hij staan.
export function maakTerugdraaiPlan(wijzigingen: Wijziging[], db: DbRegel[]): TerugdraaiPlan {
  const opId = new Map(db.map((r) => [r.id, r]));
  const plan: TerugdraaiPlan = { herstellen: [], alTeruggedraaid: 0, overgeslagen: [] };
  for (const w of wijzigingen) {
    const regel = opId.get(w.id);
    const sla = (reden: string) =>
      plan.overgeslagen.push({ slug: w.slug, volgorde: String(w.volgorde), naam: w.nieuw.naam, reden });
    if (!regel) sla("regel bestaat niet meer (recept bewerkt of verwijderd)");
    else if (zelfdeWaarden(regel, w.oud)) plan.alTeruggedraaid++;
    else if (!zelfdeWaarden(regel, w.nieuw)) sla("regel is na de omzetting gewijzigd");
    else plan.herstellen.push(w);
  }
  return plan;
}
