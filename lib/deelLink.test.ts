import { test } from "node:test";
import assert from "node:assert/strict";
import { maakCode } from "./deelLink";

test("deellink: een code is 32 tekens URL-veilig en elke keer anders", () => {
  const codes = new Set(Array.from({ length: 50 }, () => maakCode()));
  assert.equal(codes.size, 50);
  for (const code of codes) assert.match(code, /^[A-Za-z0-9_-]{32}$/);
});
