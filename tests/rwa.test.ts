import assert from "node:assert/strict";
import test from "node:test";
import { buildRwaTokenName, isAssetUnit, RWA_CATEGORIES, RWA_MARKER, validateRwaDraft } from "../lib/rwa";

const valid = {
  name: "Test Warehouse Certificate",
  issuer: "Mushee Lab",
  category: RWA_CATEGORIES[0],
  documentSha256: "ab".repeat(32),
  reference: "PREPROD-001"
};

test("RWA certificates are explicitly test-only and validate document hashes", () => {
  assert.equal(RWA_MARKER, "SYMBIOTIC_PREPROD_TEST_V1");
  assert.deepEqual(validateRwaDraft(valid), valid);
  assert.throws(() => validateRwaDraft({ ...valid, documentSha256: "fake" }), /SHA-256/);
  assert.throws(() => validateRwaDraft({ ...valid, issuer: "" }), /Issuer/);
});

test("RWA asset unit permits precisely a policy ID plus non-empty asset name", () => {
  const unit = "ab".repeat(28) + "534d59525741";
  assert.equal(isAssetUnit(unit), true);
  assert.equal(isAssetUnit("ab".repeat(28)), false);
  assert.equal(isAssetUnit(unit + "GG"), false);
  assert.equal(isAssetUnit("ab".repeat(28) + "f".repeat(66)), false);
});

test("RWA token name requires entropy from secure browser randomness", () => {
  assert.equal(buildRwaTokenName("aabbccddeeff"), "SYMRWAAABBCCDDEEFF");
  assert.throws(() => buildRwaTokenName("123"), /random bytes/);
});
