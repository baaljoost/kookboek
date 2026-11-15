import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseIngredientRegel,
  parseHoeveelheidTekst,
  hoeveelheidNaarTekst,
  normaliseerEenheid,
  parseVoorFormulier,
} from "./ingredientParser";
import { eenheidWeergave, EENHEDEN, KANDIDAAT_EENHEDEN, OMREKENINGEN } from "./eenheden";

// Vergelijk alleen de velden die in `verwacht` staan.
function controleer(tekst: string, verwacht: Record<string, unknown>) {
  const uit = parseIngredientRegel(tekst) as unknown as Record<string, unknown>;
  for (const [veld, waarde] of Object.entries(verwacht)) {
    assert.deepEqual(uit[veld], waarde, `"${tekst}" → ${veld}: ${JSON.stringify(uit[veld])}`);
  }
}

test("regels uit het plan", () => {
  controleer("3 cloves garlic", { hoeveelheid: 3, eenheid: "teen", naam: "garlic", notitie: null });
  controleer("2 cups flour", { hoeveelheid: 473, eenheid: "ml", naam: "flour", waarschuwingen: ["omgerekend"] });
  controleer("½ lb ground meat", { hoeveelheid: 227, eenheid: "g", naam: "ground meat" });
  controleer("1/2 tl zout", { hoeveelheid: 0.5, eenheid: "tl", naam: "zout" });
  controleer("1 ½ el olie", { hoeveelheid: 1.5, eenheid: "el", naam: "olie" });
  controleer("1-2 uien", { hoeveelheid: 2, eenheid: null, naam: "uien", waarschuwingen: ["bereik"] });
  controleer("2,5 dl melk", { hoeveelheid: 250, eenheid: "ml", naam: "melk", notitie: null });
  controleer("1 grote ui", { hoeveelheid: 1, eenheid: null, naam: "grote ui" });
  controleer("2 limoenen", { hoeveelheid: 2, eenheid: null, naam: "limoenen" });
  controleer("1 blikje tomaten", { hoeveelheid: 1, eenheid: "blik", naam: "tomaten" });
  controleer("200g bloem", { hoeveelheid: 200, eenheid: "g", naam: "bloem" });
  controleer("snufje zout", { hoeveelheid: null, eenheid: "snufje", naam: "zout" });
});

test("eenheid alleen als heel woord", () => {
  controleer("1 gember", { hoeveelheid: 1, eenheid: null, naam: "gember" });
  controleer("2 large eggs", { hoeveelheid: 2, eenheid: null, naam: "large eggs" });
  controleer("1 lemon", { hoeveelheid: 1, eenheid: null, naam: "lemon" });
  controleer("2 liter water", { hoeveelheid: 2, eenheid: "l", naam: "water" });
  controleer("2 eetlepels olie", { hoeveelheid: 2, eenheid: "el", naam: "olie" });
  controleer("1 teentje knoflook", { hoeveelheid: 1, eenheid: "teen", naam: "knoflook" });
  controleer("1 L water", { hoeveelheid: 1, eenheid: "l", naam: "water" });
  controleer("500ml bouillon", { hoeveelheid: 500, eenheid: "ml", naam: "bouillon" });
  controleer("100 gr. boter", { hoeveelheid: 100, eenheid: "g", naam: "boter" });
  controleer("4 gedroogde tomaten", { hoeveelheid: 4, eenheid: null, naam: "gedroogde tomaten" });
});

test("getallen", () => {
  controleer("½ ui", { hoeveelheid: 0.5, naam: "ui" });
  controleer("1½ ui", { hoeveelheid: 1.5, naam: "ui" });
  controleer("1 1/2 tsp salt", { hoeveelheid: 1.5, eenheid: "tl", naam: "salt" });
  controleer("2.5 kg aardappelen", { hoeveelheid: 2.5, eenheid: "kg", naam: "aardappelen" });
  controleer("een halve citroen", { hoeveelheid: 0.5, eenheid: null, naam: "citroen" });
  controleer("halve komkommer", { hoeveelheid: 0.5, naam: "komkommer" });
  controleer("anderhalve liter water", { hoeveelheid: 1.5, eenheid: "l", naam: "water" });
  controleer("1 – 2 tenen knoflook", { hoeveelheid: 2, eenheid: "teen", naam: "knoflook" });
  controleer("2 à 3 el olie", { hoeveelheid: 3, eenheid: "el", naam: "olie" });
  controleer("1 of 2 rode pepers", { hoeveelheid: 2, eenheid: null, naam: "rode pepers" });
  controleer("1⁄4 cup sugar", { hoeveelheid: 59, eenheid: "ml", naam: "sugar" });
  controleer("1 &frac12; el honing", { hoeveelheid: 1.5, eenheid: "el", naam: "honing" });
  controleer("ca. 200 g spinazie", { hoeveelheid: 200, eenheid: "g", naam: "spinazie" });
});

test("twijfelachtige getallen krijgen een waarschuwing", () => {
  controleer("1.000 g bloem", { hoeveelheid: 1000, eenheid: "g", waarschuwingen: ["duizendtal"] });
  controleer("0,125 l room", { hoeveelheid: 0.125, eenheid: "l", waarschuwingen: [] });
  controleer("2 x 400 g tomatenblokjes", {
    hoeveelheid: 800,
    eenheid: "g",
    naam: "tomatenblokjes",
    waarschuwingen: ["vermenigvuldigd"],
  });
  controleer("200 g / 7 oz flour", {
    hoeveelheid: 200,
    eenheid: "g",
    naam: "flour",
    waarschuwingen: ["tweede-hoeveelheid"],
  });
});

test("omrekenen naar g en ml", () => {
  controleer("1 ons ham", { hoeveelheid: 100, eenheid: "g", naam: "ham" });
  controleer("1 pond gehakt", { hoeveelheid: 500, eenheid: "g", naam: "gehakt" });
  controleer("1 pound ground beef", { hoeveelheid: 454, eenheid: "g", naam: "ground beef" });
  controleer("5 cl wijn", { hoeveelheid: 50, eenheid: "ml", naam: "wijn" });
  controleer("8 ounces pasta", { hoeveelheid: 227, eenheid: "g", naam: "pasta" });
  controleer("2 fl oz rum", { hoeveelheid: 59, eenheid: "ml", naam: "rum" });
  controleer("1 quart stock", { hoeveelheid: 946, eenheid: "ml", naam: "stock" });
  controleer("2 tbsp olive oil", { hoeveelheid: 2, eenheid: "el", naam: "olive oil", waarschuwingen: [] });
  controleer("1 tsp of cumin", { hoeveelheid: 1, eenheid: "tl", naam: "cumin" });
  controleer("1-2 cups water", { hoeveelheid: 473, eenheid: "ml", waarschuwingen: ["bereik", "omgerekend"] });
});

test("naam, notitie en haakjes", () => {
  controleer("1 ui, fijngesnipperd", { naam: "ui", notitie: "fijngesnipperd" });
  controleer("2 uien (gesnipperd, niet te fijn)", { naam: "uien (gesnipperd, niet te fijn)", notitie: null });
  controleer("1 (14-ounce) can chickpeas, drained", {
    hoeveelheid: 1,
    eenheid: "blik",
    naam: "chickpeas (14-ounce)",
    notitie: "drained",
  });
  controleer("200 g (7 oz) flour", { hoeveelheid: 200, eenheid: "g", naam: "flour (7 oz)" });
  controleer("zout en peper", { hoeveelheid: null, eenheid: null, naam: "zout en peper" });
  controleer("- 2 uien", { hoeveelheid: 2, naam: "uien" });
  controleer("1-inch piece ginger", { hoeveelheid: 1, eenheid: null, naam: "inch piece ginger" });
});

test("lidwoord telt als 1 voor een telwoord", () => {
  controleer("een snufje zout", { hoeveelheid: 1, eenheid: "snufje", naam: "zout" });
  controleer("a pinch of salt", { hoeveelheid: 1, eenheid: "snufje", naam: "salt" });
  controleer("een ui", { hoeveelheid: null, eenheid: null, naam: "een ui" });
});

test("zonder naam is het eenheidswoord zelf het ingrediënt", () => {
  controleer("6 cloves", { hoeveelheid: 6, eenheid: null, naam: "cloves", waarschuwingen: ["geen-naam"] });
  controleer("2 cups", { hoeveelheid: 2, eenheid: null, naam: "cups", waarschuwingen: ["geen-naam"] });
});

test("woorden die nog niet op de lijst staan blijven in de naam", () => {
  controleer("2 takjes tijm", { hoeveelheid: 2, eenheid: null, naam: "takjes tijm" });
  controleer("1 scheut olijfolie", { hoeveelheid: 1, eenheid: null, naam: "scheut olijfolie" });
  controleer("el olijfolie", { hoeveelheid: null, eenheid: null, naam: "el olijfolie" });
});

test("oorspronkelijke tekst blijft bewaard", () => {
  const uit = parseIngredientRegel("  3 cloves garlic, minced ");
  assert.equal(uit.oorspronkelijkeTekst, "3 cloves garlic, minced");
});

test("parseHoeveelheidTekst leest een formulierveld", () => {
  assert.equal(parseHoeveelheidTekst("1/2"), 0.5);
  assert.equal(parseHoeveelheidTekst("1 ½"), 1.5);
  assert.equal(parseHoeveelheidTekst("½"), 0.5);
  assert.equal(parseHoeveelheidTekst("2,5"), 2.5);
  assert.equal(parseHoeveelheidTekst("1-2"), 2);
  assert.equal(parseHoeveelheidTekst(" 200 "), 200);
  assert.equal(parseHoeveelheidTekst(3), 3);
  assert.equal(parseHoeveelheidTekst("halve"), 0.5);
  assert.equal(parseHoeveelheidTekst(""), null);
  assert.equal(parseHoeveelheidTekst("snufje"), null);
  assert.equal(parseHoeveelheidTekst("2 uien"), null);
  assert.equal(parseHoeveelheidTekst(NaN), null);
  assert.equal(parseHoeveelheidTekst(null), null);
});

test("hoeveelheidNaarTekst en terug verliest niets", () => {
  assert.equal(hoeveelheidNaarTekst(0.5), "1/2");
  assert.equal(hoeveelheidNaarTekst(1.5), "1 1/2");
  assert.equal(hoeveelheidNaarTekst(1 / 3), "1/3");
  assert.equal(hoeveelheidNaarTekst(200), "200");
  assert.equal(hoeveelheidNaarTekst(0.15), "0.15");
  assert.equal(hoeveelheidNaarTekst(null), "");
  for (const n of [0.5, 1.5, 1 / 3, 2 / 3, 0.25, 0.125, 2.75, 200, 0.15]) {
    const terug = parseHoeveelheidTekst(hoeveelheidNaarTekst(n));
    assert.ok(terug != null && Math.abs(terug - n) < 1e-9, `${n} → ${hoeveelheidNaarTekst(n)} → ${terug}`);
  }
});

test("normaliseerEenheid voor een los eenheidveld", () => {
  assert.deepEqual(normaliseerEenheid(2, "gram"), { hoeveelheid: 2, eenheid: "g" });
  assert.deepEqual(normaliseerEenheid(3, "tenen"), { hoeveelheid: 3, eenheid: "teen" });
  assert.deepEqual(normaliseerEenheid(2, "tbsp"), { hoeveelheid: 2, eenheid: "el" });
  assert.deepEqual(normaliseerEenheid(2, "cups"), { hoeveelheid: 473, eenheid: "ml" });
  assert.deepEqual(normaliseerEenheid(null, "snufje"), { hoeveelheid: null, eenheid: "snufje" });
  assert.equal(normaliseerEenheid(null, "cup"), null);
  assert.equal(normaliseerEenheid(1, "scheut"), null);
  assert.equal(normaliseerEenheid(1, "grote"), null);
});

test("parseVoorFormulier geeft tekstvelden", () => {
  assert.deepEqual(parseVoorFormulier("1/2 tl zout, fijn"), {
    hoeveelheid: "1/2",
    eenheid: "tl",
    naam: "zout",
    notitie: "fijn",
    oorspronkelijkeTekst: "1/2 tl zout, fijn",
  });
});

test("eenheidWeergave: enkelvoud en meervoud", () => {
  assert.equal(eenheidWeergave("teen", 3), "tenen");
  assert.equal(eenheidWeergave("teen", 1), "teen");
  assert.equal(eenheidWeergave("teen", 0.5), "teen");
  assert.equal(eenheidWeergave("blik", 2), "blikken");
  assert.equal(eenheidWeergave("g", 200), "g");
  assert.equal(eenheidWeergave("snufje", null), "snufje");
  assert.equal(eenheidWeergave("scheut", 2), "scheut"); // oude waarde, niet op de lijst
  assert.equal(eenheidWeergave(null, 2), "");
});

test("eenhedenlijst: geen woord wijst naar twee eenheden", () => {
  const gezien = new Map<string, string>();
  for (const e of [...EENHEDEN, ...KANDIDAAT_EENHEDEN]) {
    for (const woord of new Set([e.code, e.enkelvoud, e.meervoud, ...e.nl, ...e.en])) {
      assert.ok(!gezien.has(woord), `"${woord}" staat bij ${gezien.get(woord)} en ${e.code}`);
      gezien.set(woord, e.code);
    }
  }
  for (const o of OMREKENINGEN) {
    for (const woord of o.woorden) {
      assert.ok(!gezien.has(woord), `"${woord}" is eenheid ${gezien.get(woord)} en omrekening`);
    }
  }
});
