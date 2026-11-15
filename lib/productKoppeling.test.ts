import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bouwProductIndex, koppelSleutel, normaliseerNaam, zoekProduct } from "./productKoppeling";
import { valideerProductLijst, type ProductDefinitie } from "./productLijst";
import { parseIngredientRegel } from "./ingredientParser";

const lijst: ProductDefinitie[] = JSON.parse(
  readFileSync(join(process.cwd(), "data", "producten.json"), "utf8")
);
const index = bouwProductIndex(lijst.map((p) => ({ sleutel: p.naam, naam: p.naam, synoniemen: p.synoniemen })));

// Parse een hele regel en zoek het product op, zoals een import dat doet.
function product(regel: string): string | null {
  return zoekProduct(index, parseIngredientRegel(regel).naam);
}

test("data/producten.json is geldig", () => {
  assert.deepEqual(valideerProductLijst(lijst), []);
});

test("normaliseerNaam", () => {
  assert.equal(normaliseerNaam("Crème fraîche (volle)"), "creme fraiche");
  assert.equal(normaliseerNaam("pinda's"), "pindas");
  assert.equal(normaliseerNaam("  Lente-uien "), "lente uien");
  assert.equal(normaliseerNaam("Peper & zout"), "peper zout");
});

test("koppelSleutel laat maat- en snijwoorden weg, maar geen soortwoorden", () => {
  assert.equal(koppelSleutel("grote ui"), "ui");
  assert.equal(koppelSleutel("verse gember, geraspt"), "gember");
  assert.equal(koppelSleutel("large eggs"), "eggs");
  assert.equal(koppelSleutel("ui in blokjes"), "ui");
  assert.equal(koppelSleutel("rode ui"), "rode ui");
  assert.equal(koppelSleutel("gedroogde tomaten"), "gedroogde tomaten");
  assert.equal(koppelSleutel("gehakt"), "gehakt");
  assert.equal(koppelSleutel("volle melk"), "volle melk");
});

test("koppelen op naam, meervoud en Engelse naam", () => {
  assert.equal(product("1 grote ui"), "ui");
  assert.equal(product("2 uien, gesnipperd"), "ui");
  assert.equal(product("3 cloves garlic"), "knoflook");
  assert.equal(product("2 tenen knoflook (geperst)"), "knoflook");
  assert.equal(product("2 limoenen"), "limoen");
  assert.equal(product("2 large eggs"), "ei");
  assert.equal(product("200 g Crème fraîche"), "creme fraiche");
  assert.equal(product("1 rode ui"), "rode ui");
  assert.equal(product("400 ml kokosmelk"), "kokosmelk");
  assert.equal(product("snufje zout"), "zout");
  assert.equal(product("2 el extra vergine olijfolie"), "olijfolie");
});

test("geen benaderend zoeken", () => {
  assert.equal(product("200 ml amandelmelk"), null);
  assert.equal(product("1 el knoflookolie"), null);
  assert.equal(product("100 g gerookte kip"), null);
  assert.equal(product("iets heel anders"), null);
  assert.equal(zoekProduct(index, ""), null);
});

test("een productnaam wint van een synoniem met dezelfde tekst", () => {
  const klein = bouwProductIndex([
    { sleutel: "a", naam: "room", synoniemen: [] },
    { sleutel: "b", naam: "slagroom", synoniemen: ["room"] },
  ]);
  assert.equal(zoekProduct(klein, "room"), "a");
});
