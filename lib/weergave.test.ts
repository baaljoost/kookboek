import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHoeveelheid } from "./hoeveelheidWeergave";
import { isVegan, isVegetarisch } from "./dieetFilter";

test("formatHoeveelheid: hele getallen en nette breuken", () => {
  assert.equal(formatHoeveelheid(3), "3");
  assert.equal(formatHoeveelheid(200), "200");
  assert.equal(formatHoeveelheid(0.25), "¼");
  assert.equal(formatHoeveelheid(1 / 3), "⅓");
  assert.equal(formatHoeveelheid(0.5), "½");
  assert.equal(formatHoeveelheid(2 / 3), "⅔");
  assert.equal(formatHoeveelheid(0.75), "¾");
  assert.equal(formatHoeveelheid(1.5), "1½");
  assert.equal(formatHoeveelheid(2 + 1 / 3), "2⅓");
});

test("formatHoeveelheid: schalen geeft geen rare staarten", () => {
  assert.equal(formatHoeveelheid((1 / 3) * 3), "1");
  assert.equal(formatHoeveelheid(0.5 * (6 / 4)), "¾");
  assert.equal(formatHoeveelheid(1 * (5 / 4)), "1¼");
  assert.equal(formatHoeveelheid(2 * (5 / 4)), "2½");
});

test("formatHoeveelheid: anders één decimaal met komma", () => {
  assert.equal(formatHoeveelheid(0.3), "0,3");
  assert.equal(formatHoeveelheid(0.125), "0,1");
  assert.equal(formatHoeveelheid(2.4), "2,4");
  assert.equal(formatHoeveelheid(354.75), "354,8");
  assert.equal(formatHoeveelheid(12.5), "12,5");
  assert.equal(formatHoeveelheid(0.04), "0,04");
  assert.equal(formatHoeveelheid(0), "0");
  assert.equal(formatHoeveelheid(NaN), "");
});

test("dieetfilter: ongekoppeld werkt als voorheen", () => {
  assert.equal(isVegetarisch([{ naam: "kipfilet" }, { naam: "ui" }]), false);
  assert.equal(isVegetarisch([{ naam: "ui" }, { naam: "boter" }]), true);
  assert.equal(isVegan([{ naam: "ui" }, { naam: "boter" }]), false);
  assert.equal(isVegan([{ naam: "ui" }, { naam: "olijfolie", product: null }]), true);
});

test("dieetfilter: de productnaam telt mee", () => {
  // Engelse en Italiaanse woorden die niet in de trefwoordenlijst staan
  assert.equal(isVegetarisch([{ naam: "pollo", product: { naam: "kip" } }]), false);
  assert.equal(isVegan([{ naam: "burro", product: { naam: "boter" } }]), false);
  assert.equal(isVegetarisch([{ naam: "garlic", product: { naam: "knoflook" } }]), true);
});
