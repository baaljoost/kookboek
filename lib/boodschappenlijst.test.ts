import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afgevinktOnderaan,
  berekenLijst,
  lijstAlsTekst,
  telRegels,
  type LijstIngredient,
  type LijstProduct,
  type LijstRecept,
} from "./boodschappenlijst";

let volgnummer = 0;
function product(naam: string, afdeling = "groente-fruit", altijdInHuis = false): LijstProduct {
  return { id: ++volgnummer, naam, afdeling, altijdInHuis };
}

const melk = product("melk", "zuivel");
const bloem = product("bloem", "bakken");
const tomaat = product("tomaat", "conserven");
const ui = product("ui");
const suiker = product("suiker", "bakken");
const zout = product("zout", "kruiden", true);
const olijfolie = product("olijfolie", "olie-sauzen", true);
const peper = product("peper", "kruiden");

function ing(
  p: LijstProduct | null,
  hoeveelheid: number | null,
  eenheid: string | null,
  naam = p?.naam ?? "onbekend",
  oorspronkelijkeTekst: string | null = null
): LijstIngredient {
  return { hoeveelheid, eenheid, naam, oorspronkelijkeTekst, product: p };
}

function recept(
  ingredienten: LijstIngredient[],
  opties: Partial<LijstRecept> = {}
): LijstRecept {
  return { receptId: 1, titel: "Testrecept", porties: 4, gekozenPorties: 4, ingredienten, ...opties };
}

// Alle regeltekst van een lijst, in volgorde
function teksten(recepten: LijstRecept[]): string[] {
  return berekenLijst(recepten).flatMap((s) => s.regels.map((r) => r.tekst));
}

test("lijst: el en ml van hetzelfde product worden samengevoegd tot ml", () => {
  assert.deepEqual(teksten([recept([ing(melk, 2, "el"), ing(melk, 100, "ml")])]), ["130 ml melk"]);
});

test("lijst: een product dat altijd in huis is komt onder Check voorraad, zonder hoeveelheid", () => {
  const secties = berekenLijst([recept([ing(olijfolie, 2, "el"), ing(olijfolie, 100, "ml"), ing(zout, 1, "snufje")])]);
  assert.equal(secties.length, 1);
  const voorraad = secties[0];
  assert.equal(voorraad.label, "Check voorraad");
  assert.deepEqual(
    voorraad.regels.map((r) => r.tekst),
    ["olijfolie", "zout"]
  );
});

test("lijst: een snufje van een gewoon product blijft een snufje", () => {
  assert.deepEqual(teksten([recept([ing(peper, 1, "snufje")])]), ["1 snufje peper"]);
});

test("lijst: andere eenheden van hetzelfde product staan apart, gewicht eerst", () => {
  assert.deepEqual(teksten([recept([ing(tomaat, 1, "blik"), ing(tomaat, 200, "g")])]), [
    "200 g tomaat",
    "1 blik tomaat",
  ]);
});

test("lijst: gewicht en volume optellen en omzetten", () => {
  assert.deepEqual(teksten([recept([ing(bloem, 200, "g"), ing(bloem, 300, "g")])]), ["500 g bloem"]);
  assert.deepEqual(teksten([recept([ing(bloem, 600, "g"), ing(bloem, 600, "g")])]), ["1,2 kg bloem"]);
  assert.deepEqual(teksten([recept([ing(bloem, 500, "g"), ing(bloem, 1, "kg")])]), ["1½ kg bloem"]);
  assert.deepEqual(teksten([recept([ing(melk, 1, "l"), ing(melk, 250, "ml")])]), ["1250 ml melk"]);
  assert.deepEqual(teksten([recept([ing(melk, 0.5, "l")])]), ["500 ml melk"]);
  assert.deepEqual(teksten([recept([ing(melk, 1, "l")])]), ["1 l melk"]);
  assert.deepEqual(teksten([recept([ing(bloem, 2.5, "kg")])]), ["2½ kg bloem"]);
});

test("lijst: dezelfde eenheid blijft staan (el, tl)", () => {
  assert.deepEqual(teksten([recept([ing(suiker, 3, "el"), ing(suiker, 1, "el")])]), ["4 el suiker"]);
  assert.deepEqual(teksten([recept([ing(suiker, 1, "tl"), ing(suiker, 1, "el")])]), ["20 ml suiker"]);
});

test("lijst: stuk en geen eenheid tellen als hetzelfde", () => {
  assert.deepEqual(teksten([recept([ing(ui, 2, null), ing(ui, 1, "stuk")])]), ["3 ui"]);
});

test("lijst: tellende eenheden worden omhoog afgerond, met meervoud", () => {
  const r = recept([ing(tomaat, 1, "blik")], { porties: 4, gekozenPorties: 6 });
  assert.deepEqual(teksten([r]), ["2 blikken tomaat"]);
  assert.deepEqual(teksten([recept([ing(ui, 1, null)], { porties: 4, gekozenPorties: 6 })]), ["2 ui"]);
  assert.deepEqual(teksten([recept([ing(ui, 1.5, null), ing(ui, 1.5, null)])]), ["3 ui"]);
});

test("lijst: schalen naar porties; zonder porties blijft de factor 1", () => {
  assert.deepEqual(teksten([recept([ing(bloem, 200, "g")], { porties: 4, gekozenPorties: 6 })]), ["300 g bloem"]);
  assert.deepEqual(teksten([recept([ing(bloem, 200, "g")], { porties: 4, gekozenPorties: 2 })]), ["100 g bloem"]);
  assert.deepEqual(teksten([recept([ing(bloem, 200, "g")], { porties: null, gekozenPorties: null })]), ["200 g bloem"]);
  assert.deepEqual(teksten([recept([ing(bloem, 200, "g")], { porties: 0, gekozenPorties: 6 })]), ["200 g bloem"]);
  // 100 g × 4/6 geeft geen 66,7 g
  assert.deepEqual(teksten([recept([ing(bloem, 100, "g")], { porties: 6, gekozenPorties: 4 })]), ["67 g bloem"]);
});

test("lijst: twee recepten worden bij elkaar opgeteld", () => {
  const a = recept([ing(bloem, 200, "g")], { receptId: 1 });
  const b = recept([ing(bloem, 300, "g")], { receptId: 2, porties: 2, gekozenPorties: 2 });
  assert.deepEqual(teksten([a, b]), ["500 g bloem"]);
});

test("lijst: een regel zonder getal vervalt als er al een regel met getal is", () => {
  assert.deepEqual(teksten([recept([ing(ui, null, null), ing(ui, 2, null)])]), ["2 ui"]);
  assert.deepEqual(teksten([recept([ing(peper, null, null)])]), ["peper"]);
  // 0 en NaN tellen als geen hoeveelheid
  assert.deepEqual(teksten([recept([ing(peper, 0, "g"), ing(peper, NaN, null)])]), ["peper"]);
});

test("lijst: een oude eenheid die niet op de lijst staat blijft apart en ongewijzigd", () => {
  assert.deepEqual(teksten([recept([ing(suiker, 2, "scheutje"), ing(suiker, 100, "g")])]), [
    "100 g suiker",
    "2 scheutje suiker",
  ]);
});

test("lijst: een eenheid als cm wordt niet afgerond", () => {
  const gember = product("gember");
  assert.deepEqual(teksten([recept([ing(gember, 2.5, "cm")])]), ["2½ cm gember"]);
});

test("lijst: niet-gekoppelde ingrediënten staan in Overig met hun tekst en receptnaam", () => {
  const r = recept([ing(null, 2, "stuk", "bleekselderij", "2 stengels bleekselderij")], { titel: "Soep" });
  const secties = berekenLijst([r]);
  assert.equal(secties.length, 1);
  assert.equal(secties[0].id, "overig");
  assert.deepEqual(secties[0].regels, [
    { sleutel: "t1:bleekselderij", tekst: "2 stengels bleekselderij", detail: "Soep" },
  ]);
});

test("lijst: niet-gekoppeld en geschaald toont de nieuwe hoeveelheid met de oude tekst eronder", () => {
  const r = recept([ing(null, 2, null, "gember", "2 stukken gember")], { porties: 2, gekozenPorties: 4, titel: "Curry" });
  const regel = berekenLijst([r])[0].regels[0];
  assert.equal(regel.tekst, "4 gember");
  assert.equal(regel.detail, "Curry (oorspronkelijk: 2 stukken gember)");
});

test("lijst: Overig bevat eerst producten uit de afdeling overig, dan niet-gekoppelde regels", () => {
  const folie = product("aluminiumfolie", "overig");
  const secties = berekenLijst([recept([ing(null, null, null, "iets", "iets lekkers"), ing(folie, 1, "stuk")])]);
  assert.deepEqual(secties[0].regels.map((r) => r.tekst), ["1 aluminiumfolie", "iets lekkers"]);
});

test("lijst: een onbekende afdeling valt onder Overig", () => {
  const raar = product("raar", "bestaat-niet");
  assert.equal(berekenLijst([recept([ing(raar, 1, null)])])[0].id, "overig");
});

test("lijst: secties staan in de volgorde van de winkel, dan voorraad, dan eigen regels", () => {
  const secties = berekenLijst(
    [recept([ing(melk, 1, "l"), ing(ui, 1, null), ing(zout, null, null), ing(bloem, 100, "g")])],
    [{ id: 3, tekst: "wc-papier" }]
  );
  assert.deepEqual(
    secties.map((s) => s.id),
    ["groente-fruit", "zuivel", "bakken", "voorraad", "eigen"]
  );
  assert.deepEqual(secties[4].regels, [{ sleutel: "e3", tekst: "wc-papier" }]);
});

test("lijst: lege secties worden niet getoond en een leeg mandje geeft een lege lijst", () => {
  assert.deepEqual(berekenLijst([]), []);
  assert.deepEqual(berekenLijst([recept([])]), []);
});

test("lijst: binnen een sectie alfabetisch op productnaam", () => {
  const appel = product("appel");
  const peer = product("peer");
  assert.deepEqual(teksten([recept([ing(ui, 1, null), ing(peer, 1, null), ing(appel, 1, null)])]), [
    "1 appel",
    "1 peer",
    "1 ui",
  ]);
});

// --- sleutels -------------------------------------------------------------

test("sleutels: dezelfde regel houdt dezelfde sleutel bij andere porties, hoeveelheden en recepten", () => {
  const sleutels = (rs: LijstRecept[]) => berekenLijst(rs).flatMap((s) => s.regels.map((r) => r.sleutel));

  const basis = sleutels([recept([ing(melk, 2, "el")])]);
  assert.deepEqual(basis, [`p${melk.id}:vol`]);

  // andere porties
  assert.deepEqual(sleutels([recept([ing(melk, 2, "el")], { gekozenPorties: 8 })]), basis);
  // er komt een recept bij dat de eenheid verandert (2 el wordt 130 ml)
  const erbij = recept([ing(melk, 100, "ml")], { receptId: 2 });
  assert.deepEqual(sleutels([recept([ing(melk, 2, "el")]), erbij]), basis);
  // het andere recept staat er alleen nog
  assert.deepEqual(sleutels([erbij]), basis);
});

test("sleutels: per soort regel", () => {
  const sleutels = berekenLijst(
    [
      recept([
        ing(bloem, 200, "g"),
        ing(tomaat, 1, "blik"),
        ing(ui, 2, null),
        ing(peper, null, null),
        ing(suiker, 1, "scheutje"),
        ing(zout, 1, null),
      ]),
    ],
    [{ id: 9, tekst: "x" }]
  ).flatMap((s) => s.regels.map((r) => r.sleutel));
  assert.deepEqual(new Set(sleutels), new Set([
    `p${bloem.id}:gew`,
    `p${tomaat.id}:blik`,
    `p${ui.id}:n`,
    `p${peper.id}:zonder`,
    `p${suiker.id}:?scheutje`,
    `p${zout.id}:voorraad`,
    "e9",
  ]));
});

test("sleutels: twee dezelfde niet-gekoppelde regels in één recept krijgen verschillende sleutels", () => {
  const r = recept([ing(null, 1, null, "Gember"), ing(null, 2, null, "gember")], { receptId: 7 });
  const sleutels = berekenLijst([r])[0].regels.map((x) => x.sleutel);
  assert.deepEqual(new Set(sleutels), new Set(["t7:gember", "t7:gember#2"]));
});

test("sleutels: de sleutel van een regel zonder product hangt niet af van de porties", () => {
  const maak = (gekozen: number) =>
    berekenLijst([recept([ing(null, 2, null, "gember", "2 gember")], { receptId: 5, gekozenPorties: gekozen })])[0].regels[0].sleutel;
  assert.equal(maak(4), maak(8));
});

// --- afvinken en delen ------------------------------------------------------

test("afvinken: afgevinkte regels staan onderaan, in dezelfde volgorde", () => {
  const regels = ["a", "b", "c", "d"].map((t) => ({ sleutel: t, tekst: t }));
  const uit = afgevinktOnderaan(regels, new Set(["a", "c"]));
  assert.deepEqual(uit.map((r) => r.sleutel), ["b", "d", "a", "c"]);
});

test("afvinken: tellen", () => {
  const secties = berekenLijst([recept([ing(ui, 1, null), ing(melk, 1, "l")])]);
  const ui1 = `p${ui.id}:n`;
  assert.deepEqual(telRegels(secties, new Set([ui1, "bestaat-niet"])), { totaal: 2, afgevinkt: 1 });
});

test("delen: platte tekst per afdeling, zonder afgevinkte regels en zonder lege secties", () => {
  const secties = berekenLijst([recept([ing(ui, 2, null), ing(melk, 1, "l"), ing(bloem, 200, "g"), ing(zout, null, null)])]);
  const tekst = lijstAlsTekst(secties, new Set([`p${melk.id}:vol`]));
  assert.equal(
    tekst,
    ["Boodschappenlijst", "Groente & fruit\n- 2 ui", "Bakproducten\n- 200 g bloem", "Check voorraad\n- zout"].join("\n\n")
  );
});

test("delen: een lijst waar alles van is afgevinkt toont alleen de titel", () => {
  const secties = berekenLijst([recept([ing(ui, 1, null)])]);
  assert.equal(lijstAlsTekst(secties, new Set([`p${ui.id}:n`])), "Boodschappenlijst");
});
