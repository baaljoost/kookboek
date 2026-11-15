import { test } from "node:test";
import assert from "node:assert/strict";
import { verwerkIngredient, verwerkIngredienten, type BestaandIngredient } from "./ingredientInvoer";
import { bouwProductIndex } from "./productKoppeling";
import { parseVoorFormulier } from "./ingredientParser";

const index = bouwProductIndex<number>([
  { sleutel: 1, naam: "knoflook", synoniemen: ["garlic"] },
  { sleutel: 2, naam: "ui", synoniemen: ["uien", "onion"] },
  { sleutel: 3, naam: "zout", synoniemen: ["salt"] },
]);

test("formulierinvoer: tekst wordt getal, synoniem wordt code, product gekoppeld", () => {
  assert.deepEqual(verwerkIngredient({ hoeveelheid: "1/2", eenheid: "tl", naam: "zout", notitie: "" }, index), {
    hoeveelheid: 0.5,
    eenheid: "tl",
    naam: "zout",
    notitie: null,
    oorspronkelijkeTekst: "1/2 tl zout",
    productId: 3,
  });
  const uit = verwerkIngredient({ hoeveelheid: "2,5", eenheid: "gram", naam: " grote uien ", notitie: "gesnipperd" }, index);
  assert.equal(uit.hoeveelheid, 2.5);
  assert.equal(uit.eenheid, "g");
  assert.equal(uit.naam, "grote uien");
  assert.equal(uit.productId, 2);
  assert.equal(uit.oorspronkelijkeTekst, "2,5 gram grote uien, gesnipperd");
});

test("foute hoeveelheden worden leeg, nooit NaN of een half gelezen getal", () => {
  assert.equal(verwerkIngredient({ hoeveelheid: "½", naam: "ui" }, index).hoeveelheid, 0.5);
  assert.equal(verwerkIngredient({ hoeveelheid: "1 ½", naam: "ui" }, index).hoeveelheid, 1.5);
  assert.equal(verwerkIngredient({ hoeveelheid: "beetje", naam: "ui" }, index).hoeveelheid, null);
  assert.equal(verwerkIngredient({ hoeveelheid: NaN, naam: "ui" }, index).hoeveelheid, null);
  assert.equal(verwerkIngredient({ naam: "ui" }, index).hoeveelheid, null);
});

test("uitvoer van de importroute (extensie) komt ongewijzigd door", () => {
  const vanImport = parseVoorFormulier("3 cloves garlic, minced");
  assert.deepEqual(verwerkIngredient(vanImport, index), {
    hoeveelheid: 3,
    eenheid: "teen",
    naam: "garlic",
    notitie: "minced",
    oorspronkelijkeTekst: "3 cloves garlic, minced",
    productId: 1,
  });
});

test("oude invoer: getal als hoeveelheid, cups worden omgerekend, onbekende eenheid blijft staan", () => {
  assert.equal(verwerkIngredient({ hoeveelheid: 2, eenheid: "cups", naam: "flour" }, index).hoeveelheid, 473);
  assert.equal(verwerkIngredient({ hoeveelheid: 2, eenheid: "cups", naam: "flour" }, index).eenheid, "ml");
  assert.equal(verwerkIngredient({ hoeveelheid: 1, eenheid: "scheut", naam: "olie" }, index).eenheid, "scheut");
  assert.equal(verwerkIngredient({ hoeveelheid: "", eenheid: "", naam: "peper" }, index).eenheid, null);
});

const bestaand: BestaandIngredient = {
  id: 10,
  hoeveelheid: 1,
  eenheid: "cl",
  naam: "oves garlic",
  notitie: null,
  oorspronkelijkeTekst: null,
  productId: null,
};

test("bewerken: een niet-aangeraakte regel blijft letterlijk staan", () => {
  const uit = verwerkIngredient({ id: 10, hoeveelheid: "1", eenheid: "cl", naam: "oves garlic", notitie: "" }, index, bestaand);
  assert.deepEqual(uit, {
    hoeveelheid: 1,
    eenheid: "cl",
    naam: "oves garlic",
    notitie: null,
    oorspronkelijkeTekst: null,
    productId: null,
  });
});

test("bewerken: koppeling en oorspronkelijke tekst blijven bewaard", () => {
  const gekoppeld: BestaandIngredient = {
    id: 11,
    hoeveelheid: 3,
    eenheid: "teen",
    naam: "garlic",
    notitie: null,
    oorspronkelijkeTekst: "3 cloves garlic",
    productId: 1,
  };
  // hoeveelheid aangepast, naam gelijk
  const uit = verwerkIngredient({ id: 11, hoeveelheid: "4", eenheid: "teen", naam: "garlic" }, index, gekoppeld);
  assert.equal(uit.hoeveelheid, 4);
  assert.equal(uit.productId, 1);
  assert.equal(uit.oorspronkelijkeTekst, "3 cloves garlic");

  // handmatige koppeling aan een product dat niet op naam te vinden is
  const handmatig = { ...gekoppeld, naam: "look", productId: 1 };
  assert.equal(verwerkIngredient({ id: 11, hoeveelheid: "3", eenheid: "teen", naam: "look" }, index, handmatig).productId, 1);

  // naam veranderd: opnieuw opzoeken
  assert.equal(verwerkIngredient({ id: 11, hoeveelheid: "3", eenheid: "teen", naam: "ui" }, index, gekoppeld).productId, 2);
  assert.equal(verwerkIngredient({ id: 11, hoeveelheid: "3", eenheid: "teen", naam: "iets" }, index, gekoppeld).productId, null);
});

test("bewerken: een aangepaste oude regel wordt genormaliseerd en krijgt een oorspronkelijke tekst", () => {
  const uit = verwerkIngredient({ id: 10, hoeveelheid: "3", eenheid: "tenen", naam: "knoflook" }, index, bestaand);
  assert.equal(uit.eenheid, "teen");
  assert.equal(uit.productId, 1);
  assert.equal(uit.oorspronkelijkeTekst, "3 tenen knoflook");
});

test("bewerken: een afgerond getoonde hoeveelheid telt als niet aangeraakt", () => {
  const oud = { ...bestaand, id: 13, hoeveelheid: 1.333, eenheid: "g", naam: "zout" };
  // het formulier toonde "1.33"; alleen de notitie is aangepast
  const uit = verwerkIngredient({ id: 13, hoeveelheid: "1.33", eenheid: "g", naam: "zout", notitie: "fijn" }, index, oud);
  assert.equal(uit.hoeveelheid, 1.333);
});

test("opgeslagen NaN telt als leeg en blijft staan zolang de regel niet is aangeraakt", () => {
  const kapot = { ...bestaand, id: 12, hoeveelheid: NaN, eenheid: "tl", naam: "zout" };
  const uit = verwerkIngredient({ id: 12, hoeveelheid: "", eenheid: "tl", naam: "zout" }, index, kapot);
  assert.ok(Number.isNaN(uit.hoeveelheid));
  assert.equal(uit.oorspronkelijkeTekst, null);
});

test("verwerkIngredienten: volgorde, lege regels weg, id's maar één keer gebruikt", () => {
  const uit = verwerkIngredienten(
    [
      { id: 10, hoeveelheid: "1", eenheid: "cl", naam: "oves garlic" },
      { naam: "  " },
      { id: 10, hoeveelheid: "1", eenheid: "cl", naam: "wijn" },
      { id: 999, hoeveelheid: "2", naam: "uien" },
    ],
    index,
    [bestaand]
  );
  assert.equal(uit.length, 3);
  assert.deepEqual(uit.map((u) => u.volgorde), [0, 1, 2]);
  assert.equal(uit[0].eenheid, "cl"); // bestaande regel, letterlijk
  assert.equal(uit[1].eenheid, "ml"); // nieuwe regel: cl omgerekend
  assert.equal(uit[1].hoeveelheid, 10);
  assert.equal(uit[2].productId, 2);
  assert.deepEqual(verwerkIngredienten(undefined, index), []);
});
