import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  signSiteGateToken,
  verifySiteGateToken,
  timingEqual
} = require("../api/site-gate/_token.js");

test("site gate token round-trips email and rejects tamper", () => {
  const secret = "unit-test-secret-key";
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = signSiteGateToken(secret, {
    email: "max@example.com",
    exp
  });
  const session = verifySiteGateToken(secret, token);
  assert.equal(session.email, "max@example.com");
  assert.equal(verifySiteGateToken("other", token), null);
  assert.equal(verifySiteGateToken(secret, token.slice(0, -2) + "ff"), null);
});

test("timingEqual matches identical strings only", () => {
  assert.equal(timingEqual("abc", "abc"), true);
  assert.equal(timingEqual("abc", "abd"), false);
  assert.equal(timingEqual("abc", "ab"), false);
});
