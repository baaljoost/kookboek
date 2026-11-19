import { test } from "node:test";
import assert from "node:assert/strict";
import { controleerSessieToken, maakSessieToken, SESSIE_DUUR_MS } from "./sessie";

const GEHEIM = "een-heel-lang-testgeheim-van-minstens-32-tekens";
const ANDER_GEHEIM = "een-ander-heel-lang-testgeheim-van-32-tekens-";

test("sessie: een vers token is geldig", async () => {
  const token = await maakSessieToken(GEHEIM);
  assert.equal(await controleerSessieToken(token, GEHEIM), true);
});

test("sessie: de oude vaste waarde en lege tokens worden geweigerd", async () => {
  assert.equal(await controleerSessieToken("authenticated", GEHEIM), false);
  assert.equal(await controleerSessieToken("", GEHEIM), false);
  assert.equal(await controleerSessieToken(undefined, GEHEIM), false);
  assert.equal(await controleerSessieToken(null, GEHEIM), false);
  assert.equal(await controleerSessieToken(".", GEHEIM), false);
  assert.equal(await controleerSessieToken("1.2.3", GEHEIM), false);
});

test("sessie: een aangepast verloop of een aangepaste handtekening wordt geweigerd", async () => {
  const nu = Date.now();
  const token = await maakSessieToken(GEHEIM, nu);
  const [verloop, handtekening] = token.split(".");

  const langerVerloop = `${Number(verloop) + 1000}.${handtekening}`;
  assert.equal(await controleerSessieToken(langerVerloop, GEHEIM, nu), false);

  const andereLetter = handtekening.startsWith("A") ? "B" : "A";
  const aangepast = `${verloop}.${andereLetter}${handtekening.slice(1)}`;
  assert.equal(await controleerSessieToken(aangepast, GEHEIM, nu), false);

  assert.equal(await controleerSessieToken(`${verloop}.!!!`, GEHEIM, nu), false);
});

test("sessie: een token met een ander geheim wordt geweigerd", async () => {
  const token = await maakSessieToken(ANDER_GEHEIM);
  assert.equal(await controleerSessieToken(token, GEHEIM), false);
});

test("sessie: een verlopen token wordt geweigerd", async () => {
  const nu = Date.now();
  const token = await maakSessieToken(GEHEIM, nu);
  assert.equal(await controleerSessieToken(token, GEHEIM, nu + SESSIE_DUUR_MS - 1), true);
  assert.equal(await controleerSessieToken(token, GEHEIM, nu + SESSIE_DUUR_MS + 1), false);
});

test("sessie: zonder (of met een te kort) geheim wordt alles geweigerd", async () => {
  const token = await maakSessieToken(GEHEIM);
  const oud = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  try {
    assert.equal(await controleerSessieToken(token), false);
    process.env.SESSION_SECRET = "kort";
    assert.equal(await controleerSessieToken(token), false);
    await assert.rejects(() => maakSessieToken());
  } finally {
    if (oud === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = oud;
  }
});
