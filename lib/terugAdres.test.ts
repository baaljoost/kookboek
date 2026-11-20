import { test } from "node:test";
import assert from "node:assert/strict";
import { loginLink, STANDAARD_TERUG, veiligTerugAdres } from "./terugAdres";

test("interne paden blijven bewaard, met query", () => {
  assert.equal(veiligTerugAdres("/"), "/");
  assert.equal(veiligTerugAdres("/recepten/dahl-met-bloemkool"), "/recepten/dahl-met-bloemkool");
  assert.equal(veiligTerugAdres("/?categorie=hoofdgerecht&q=kip"), "/?categorie=hoofdgerecht&q=kip");
  assert.equal(veiligTerugAdres("/week/lijst"), "/week/lijst");
});

test("externe adressen vallen terug op de standaard", () => {
  for (const kwaad of [
    "https://evil.example",
    "http://evil.example/x",
    "//evil.example",
    "//evil.example/pad",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    "recepten/x",
  ]) {
    assert.equal(veiligTerugAdres(kwaad), STANDAARD_TERUG, kwaad);
  }
});

test("geen string, geen terugadres", () => {
  assert.equal(veiligTerugAdres(undefined), STANDAARD_TERUG);
  assert.equal(veiligTerugAdres(["/x"]), STANDAARD_TERUG);
  assert.equal(veiligTerugAdres(null), STANDAARD_TERUG);
});

test("niet terug naar de loginpagina of een API-route", () => {
  assert.equal(veiligTerugAdres("/admin/login"), STANDAARD_TERUG);
  assert.equal(veiligTerugAdres("/admin/login?terug=/x"), STANDAARD_TERUG);
  assert.equal(veiligTerugAdres("/api/admin/week"), STANDAARD_TERUG);
});

test("loginLink codeert het pad en past erbij", () => {
  const link = loginLink("/?q=a&b=c");
  assert.equal(link, "/admin/login?terug=%2F%3Fq%3Da%26b%3Dc");
  const terug = new URL(link, "http://x").searchParams.get("terug");
  assert.equal(veiligTerugAdres(terug), "/?q=a&b=c");
});
