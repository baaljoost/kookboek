import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProductDefinitie } from "../../lib/productLijst";
import { getalTekst, herstelRegel, maakWoordenlijst, type OudeRegel } from "./herstel";
import { koppelBronregels, letters, oudeParserHoeveelheid, vergelijkMetBron, vindReceptRegels } from "./bron";
import { leesCsv, naarCsv } from "./csv";
import { csvNaarGetal, leesControle, maakControleRijen, rijenNaarTabel, type ControleRij } from "./controle";
import { dieetVerschillen, maakPlan, maakTerugdraaiPlan, type DbRegel } from "./plan";
import type { ExportBestand } from "./soorten";

const producten: ProductDefinitie[] = JSON.parse(readFileSync(join(process.cwd(), "data", "producten.json"), "utf8"));
const bekend = maakWoordenlijst(producten);

function oud(hoeveelheid: number | null, eenheid: string | null, naam: string, notitie: string | null = null): OudeRegel {
  return { hoeveelheid, eenheid, naam, notitie };
}
function herstel(...args: Parameters<typeof oud>) {
  return herstelRegel(oud(...args), bekend);
}

test("herstel: eenheid die midden in een woord was afgesplitst", () => {
  let h = herstel(3, "cl", "oves garlic", "minced");
  assert.equal(h.tekst, "3 cloves garlic, minced");
  assert.deepEqual(h.voorstel, { hoeveelheid: 3, eenheid: "teen", naam: "garlic", notitie: "minced" });
  assert.deepEqual(h.twijfel, []);

  h = herstel(1, "gr", "ote ui");
  assert.equal(h.tekst, "1 grote ui");
  assert.deepEqual(h.voorstel, { hoeveelheid: 1, eenheid: null, naam: "grote ui", notitie: null });

  h = herstel(2, "l", "imoenen");
  assert.deepEqual(h.voorstel, { hoeveelheid: 2, eenheid: null, naam: "limoenen", notitie: null });

  h = herstel(1, "blik", "je tomaten");
  assert.deepEqual(h.voorstel, { hoeveelheid: 1, eenheid: "blik", naam: "tomaten", notitie: null });

  h = herstel(2, "cup", "s flour");
  assert.deepEqual(h.voorstel, { hoeveelheid: 473, eenheid: "ml", naam: "flour", notitie: null });
  assert.ok(h.opmerkingen.includes("omgerekend naar metrisch"));

  h = herstel(1, "l", "b ground beef");
  assert.deepEqual(h.voorstel, { hoeveelheid: 454, eenheid: "g", naam: "ground beef", notitie: null });

  h = herstel(1, "teen", "tje knoflook");
  assert.deepEqual(h.voorstel, { hoeveelheid: 1, eenheid: "teen", naam: "knoflook", notitie: null });
});

test("herstel: een goede splitsing blijft een splitsing", () => {
  let h = herstel(5, "cl", "wijn");
  assert.equal(h.tekst, "5 cl wijn");
  assert.deepEqual(h.voorstel, { hoeveelheid: 50, eenheid: "ml", naam: "wijn", notitie: null });
  assert.deepEqual(h.twijfel, []);

  h = herstel(200, "gram", "bloem", "gezeefd");
  assert.deepEqual(h.voorstel, { hoeveelheid: 200, eenheid: "g", naam: "bloem", notitie: "gezeefd" });

  h = herstel(3, "tenen", "knoflook (gepers)");
  assert.deepEqual(h.voorstel, { hoeveelheid: 3, eenheid: "teen", naam: "knoflook (gepers)", notitie: null });

  // eenheid zonder hoeveelheid blijft een eenheid
  h = herstel(null, "el", "olie");
  assert.deepEqual(h.voorstel, { hoeveelheid: null, eenheid: "el", naam: "olie", notitie: null });
});

test("herstel: niet te bepalen wordt twijfel met beide lezingen", () => {
  const h = herstel(1, "can", "ola oil");
  assert.equal(h.twijfel.length, 1);
  assert.equal(h.tekst, "1 can ola oil");
  assert.equal(h.alternatief, "1 canola oil");
});

test("herstel: decimale komma en bereik", () => {
  let h = herstel(2, null, "2", "5 dl melk");
  assert.equal(h.tekst, "2,5 dl melk");
  assert.deepEqual(h.voorstel, { hoeveelheid: 250, eenheid: "ml", naam: "melk", notitie: null });

  h = herstel(1, null, "-2 uien");
  assert.equal(h.tekst, "1-2 uien");
  assert.deepEqual(h.voorstel, { hoeveelheid: 2, eenheid: null, naam: "uien", notitie: null });
  assert.deepEqual(h.twijfel, []);
  assert.ok(h.opmerkingen.includes("bereik: hoogste waarde genomen"));
});

test("herstel: eenheid die in de naam was blijven staan", () => {
  assert.deepEqual(herstel(1, null, "teaspoon salt").voorstel, { hoeveelheid: 1, eenheid: "tl", naam: "salt", notitie: null });
  assert.deepEqual(herstel(8, null, "ounces pasta").voorstel, { hoeveelheid: 227, eenheid: "g", naam: "pasta", notitie: null });
  assert.deepEqual(herstel(2, null, "takjes tijm").voorstel, { hoeveelheid: 2, eenheid: null, naam: "takjes tijm", notitie: null });
});

test("herstel: NaN, haakjes en getallen met drie decimalen", () => {
  let h = herstel(NaN, "tsp", "salt");
  assert.deepEqual(h.voorstel, { hoeveelheid: null, eenheid: "tl", naam: "salt", notitie: null });
  assert.equal(h.twijfel.length, 1);

  h = herstel(NaN, "l", "emon");
  assert.equal(h.voorstel.naam, "lemon");
  assert.equal(h.voorstel.eenheid, null);

  h = herstel(2, null, "uien (gesnipperd", "niet te fijn), biologisch");
  assert.deepEqual(h.voorstel, { hoeveelheid: 2, eenheid: null, naam: "uien (gesnipperd, niet te fijn)", notitie: "biologisch" });

  assert.equal(getalTekst(1.333), "1.3330");
  assert.equal(herstel(1.333, "kg", "bloem").voorstel.hoeveelheid, 1.333);
  assert.equal(herstel(1 / 3, "el", "olie").voorstel.hoeveelheid, 1 / 3);
});

test("bron: JSON-LD vinden, ook in @graph en met @type als lijst", () => {
  const html = (json: unknown) => `<html><script type="application/ld+json">${JSON.stringify(json)}</script></html>`;
  assert.deepEqual(vindReceptRegels(html({ "@type": "Recipe", recipeIngredient: [" 1 ui ", ""] })), ["1 ui"]);
  assert.deepEqual(
    vindReceptRegels(html({ "@graph": [{ "@type": "WebPage" }, { "@type": ["Recipe", "NewsArticle"], recipeIngredient: ["2 eggs"] }] })),
    ["2 eggs"]
  );
  assert.equal(vindReceptRegels(html({ "@type": "WebPage" })), null);
  assert.equal(vindReceptRegels("<html></html>"), null);
});

test("bron: letters en de hoeveelheid van de oude parser", () => {
  assert.equal(letters("3 cloves garlic, minced"), "clovesgarlicminced");
  assert.equal(letters("1 ½ tl Crème"), "tlcrème");
  assert.equal(oudeParserHoeveelheid("1/2 cup sugar"), 1);
  assert.equal(oudeParserHoeveelheid("1 ½ el olie"), 1);
  assert.equal(oudeParserHoeveelheid("½ tsp salt"), null);
  assert.equal(oudeParserHoeveelheid("2,5 dl melk"), 2);
  assert.equal(oudeParserHoeveelheid("1-2 uien"), 1);
  assert.equal(oudeParserHoeveelheid("zout"), null);
});

test("bron: regels koppelen op letters, elke bronregel één keer", () => {
  const regels = [
    { volgorde: 0, oud: oud(3, "cl", "oves garlic", "minced") },
    { volgorde: 1, oud: oud(1, "tsp", "salt") },
    { volgorde: 2, oud: oud(1, "tsp", "salt") },
    { volgorde: 3, oud: oud(2, null, "zelf toegevoegd") },
  ];
  const bron = ["3 cloves garlic, minced", "1 tsp salt", "½ tsp salt", "1 onion"];
  assert.deepEqual(koppelBronregels(regels, bron), ["3 cloves garlic, minced", "1 tsp salt", "½ tsp salt", null]);
});

test("bron: bevestigt, verklaart of laat de database staan", () => {
  // gelijk: bron bevestigt en lost twijfel over de splitsing op
  let o = oud(1, "can", "ola oil");
  let v = vergelijkMetBron(o, herstelRegel(o, bekend), "1 canola oil");
  assert.deepEqual(v.twijfel, []);
  assert.equal(v.voorstel.naam, "canola oil");

  // "1/2 cup" werd 1 cup: verklaard door de oude parser, bronwaarde als voorstel, wel twijfel
  o = oud(1, "cup", "sugar");
  v = vergelijkMetBron(o, herstelRegel(o, bekend), "1/2 cup sugar");
  assert.equal(v.voorstel.hoeveelheid, 118);
  assert.equal(v.twijfel.length, 1);
  assert.match(v.twijfel[0], /bron 118 ml, database 237 ml/);

  // zelf aangepast (3 in plaats van 2): database blijft het voorstel, wel twijfel
  o = oud(3, "el", "olie");
  v = vergelijkMetBron(o, herstelRegel(o, bekend), "2 el olie");
  assert.equal(v.voorstel.hoeveelheid, 3);
  assert.match(v.twijfel[0], /Mogelijk zelf aangepast/);
});

test("csv: heen en terug, ook met puntkomma en BOM", () => {
  const tabel = [["a", "b"], ['met "aanhaling"', "komma, hier"], [" spatie ", "regel\neinde"], ["", "x"]];
  assert.deepEqual(leesCsv(naarCsv(tabel)), tabel);
  assert.deepEqual(leesCsv('﻿a;b\r\n1;"x;y"\r\n'), [["a", "b"], ["1", "x;y"]]);
});

test("csv: getallen", () => {
  assert.equal(csvNaarGetal(""), null);
  assert.equal(csvNaarGetal("0.5"), 0.5);
  assert.equal(csvNaarGetal("0,5"), 0.5);
  assert.equal(csvNaarGetal("1.125"), 1.125); // geen duizendtal
  assert.equal(csvNaarGetal("1/2"), 0.5);
  assert.ok(Number.isNaN(csvNaarGetal("NaN")));
  assert.equal(csvNaarGetal("veel"), undefined);
});

const exportBestand: ExportBestand = {
  gemaaktOp: "2026-11-15T00:00:00.000Z",
  databaseHost: "test",
  kandidaatTelling: {},
  recepten: [
    {
      id: 1,
      slug: "pasta",
      titel: "Pasta",
      herkomstUrl: "https://voorbeeld.test/pasta",
      ingredienten: [
        [0, 3, "cl", "oves garlic", "minced"],
        [1, 1, "cup", "sugar", null],
        [2, 1, "can", "ola oil", null],
        [3, 2, null, "onbekend ding", null],
      ].map(([volgorde, hoeveelheid, eenheid, naam, notitie], i) => {
        const o = oud(hoeveelheid as number, eenheid as string | null, naam as string, notitie as string | null);
        return { id: 10 + i, volgorde: volgorde as number, ...o, oorspronkelijkeTekst: null, product: null, herstel: herstelRegel(o, bekend) };
      }),
    },
  ],
};
// regel 2 heeft geen bronregel en blijft dus twijfel
const bronnen = {
  "https://voorbeeld.test/pasta": { opgehaaldOp: "", status: "ok" as const, regels: ["3 cloves garlic, minced", "1/2 cup sugar"] },
};

test("controlebestand: akkoord alleen bij zekere regels, en terug te lezen", () => {
  const rijen = maakControleRijen(exportBestand, bronnen, producten);
  assert.deepEqual(rijen.map((r) => r.akkoord), ["ja", "", "", "ja"]);
  assert.equal(rijen[0].product, "knoflook");
  assert.equal(rijen[0].afdeling, "Groente & fruit");
  assert.equal(rijen[0].eenheid, "teen");
  assert.equal(rijen[0].bronregel, "3 cloves garlic, minced");
  assert.equal(rijen[1].hoeveelheid, "118");
  assert.equal(rijen[3].product, "");
  assert.deepEqual(leesControle(naarCsv(rijenNaarTabel(rijen))), rijen);
  assert.throws(() => leesControle("slug,recept\nx,y\n"), /mist de kolom/);
});

function dbRegels(): DbRegel[] {
  return exportBestand.recepten[0].ingredienten.map((ing) => ({
    id: ing.id,
    slug: "pasta",
    titel: "Pasta",
    volgorde: ing.volgorde,
    hoeveelheid: ing.hoeveelheid as number,
    eenheid: ing.eenheid,
    naam: ing.naam,
    notitie: ing.notitie,
    oorspronkelijkeTekst: null,
    productId: null,
  }));
}
const dbProducten = [{ id: 7, naam: "knoflook" }, { id: 8, naam: "kip" }, { id: 9, naam: "suiker" }];

test("toepassen: alleen regels met akkoord, met controle van de oude waarden", () => {
  const rijen = maakControleRijen(exportBestand, bronnen, producten);
  const plan = maakPlan(rijen, dbRegels(), dbProducten);
  assert.equal(plan.zonderAkkoord, 2);
  assert.deepEqual(plan.wijzigingen.map((w) => w.id), [10, 13]);
  assert.deepEqual(plan.wijzigingen[0].nieuw, {
    hoeveelheid: 3,
    eenheid: "teen",
    naam: "garlic",
    notitie: "minced",
    oorspronkelijkeTekst: "3 cloves garlic, minced",
    productId: 7,
  });
  assert.equal(plan.wijzigingen[1].nieuw.productId, null);
  assert.equal(plan.telling["product gekoppeld"], 1);
  assert.equal(plan.telling["alleen oorspronkelijke tekst vastgelegd"], 1);
});

test("toepassen: overslaan bij bewerkt recept, al omgezet en ongeldige invoer", () => {
  const rijen = maakControleRijen(exportBestand, bronnen, producten);
  const alleJa = (aanpassing: Partial<ControleRij> = {}): ControleRij[] => rijen.map((r) => ({ ...r, akkoord: "ja", ...aanpassing }));
  const redenen = (plan: ReturnType<typeof maakPlan>) => plan.overgeslagen.map((o) => o.reden);

  // recept bewerkt sinds de export
  const bewerkt = dbRegels();
  bewerkt[0].naam = "knoflook";
  let plan = maakPlan(rijen, bewerkt, dbProducten);
  assert.deepEqual(plan.wijzigingen.map((w) => w.id), [13]);
  assert.deepEqual(redenen(plan), ["recept is sinds de export bewerkt"]);

  // tweede keer draaien: alles is al omgezet, er verandert niets
  const eerste = maakPlan(alleJa(), dbRegels(), dbProducten);
  assert.equal(eerste.wijzigingen.length, 4);
  const na = dbRegels().map((r) => {
    const w = eerste.wijzigingen.find((x) => x.id === r.id)!;
    return { ...r, ...w.nieuw, hoeveelheid: w.nieuw.hoeveelheid as number | null };
  });
  plan = maakPlan(alleJa(), na, dbProducten);
  assert.equal(plan.wijzigingen.length, 0);
  assert.deepEqual([...new Set(redenen(plan))], ["al omgezet"]);

  // ongeldige invoer in het controlebestand
  assert.match(redenen(maakPlan(alleJa({ eenheid: "scheut" }), dbRegels(), dbProducten))[0], /staat niet op de lijst/);
  assert.match(redenen(maakPlan(alleJa({ hoeveelheid: "veel" }), dbRegels(), dbProducten))[0], /niet te lezen/);
  assert.match(redenen(maakPlan(alleJa({ product: "eenhoorn" }), dbRegels(), dbProducten))[0], /bestaat niet in de database/);
  assert.match(redenen(maakPlan(alleJa({ slug: "weg" }), dbRegels(), dbProducten))[0], /niet gevonden/);
});

test("toepassen: een bestaande koppeling blijft staan als de productkolom leeg is", () => {
  const rijen = maakControleRijen(exportBestand, bronnen, producten).map((r) => ({ ...r, product: "", akkoord: "ja" }));
  const db = dbRegels();
  db[3].productId = 8;
  const plan = maakPlan(rijen, db, dbProducten);
  assert.equal(plan.wijzigingen.find((w) => w.id === 13)!.nieuw.productId, 8);
});

test("terugdraaien: alleen regels die nog staan zoals toepassen ze achterliet", () => {
  const rijen = maakControleRijen(exportBestand, bronnen, producten);
  const { wijzigingen } = maakPlan(rijen, dbRegels(), dbProducten);
  const na = dbRegels().map((r) => {
    const w = wijzigingen.find((x) => x.id === r.id);
    return w ? { ...r, ...w.nieuw, hoeveelheid: w.nieuw.hoeveelheid as number | null } : r;
  });
  assert.deepEqual(maakTerugdraaiPlan(wijzigingen, na).herstellen.map((w) => w.id), [10, 13]);

  na[0].naam = "daarna aangepast";
  const plan = maakTerugdraaiPlan(wijzigingen, na);
  assert.deepEqual(plan.herstellen.map((w) => w.id), [13]);
  assert.equal(plan.overgeslagen[0].reden, "regel is na de omzetting gewijzigd");

  // al teruggedraaid: niets te doen
  const terug = maakTerugdraaiPlan(wijzigingen, dbRegels());
  assert.equal(terug.herstellen.length, 0);
  assert.equal(terug.alTeruggedraaid, 2);
});

test("dieetfilter: welke recepten veranderen door de omzetting", () => {
  const db: DbRegel[] = [
    { id: 1, slug: "a", titel: "A", volgorde: 0, hoeveelheid: 1, eenheid: null, naam: "pollo", notitie: null, oorspronkelijkeTekst: null, productId: null },
    { id: 2, slug: "b", titel: "B", volgorde: 0, hoeveelheid: 1, eenheid: null, naam: "ui", notitie: null, oorspronkelijkeTekst: null, productId: null },
  ];
  const wijziging = { id: 1, slug: "a", volgorde: 0, oud: {} as never, nieuw: { hoeveelheid: 1, eenheid: null, naam: "pollo", notitie: null, oorspronkelijkeTekst: "1 pollo", productId: 8 } };
  const uit = dieetVerschillen(db, [wijziging], new Map([[8, "kip"]]));
  assert.deepEqual(uit, [{ slug: "a", titel: "A", vegetarisch: [true, false], vegan: [true, false] }]);
});
