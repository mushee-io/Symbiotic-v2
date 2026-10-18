import test from "node:test";
import assert from "node:assert/strict";
import {WIRING_MODULES,wiringSummary} from "../lib/wiring-milestones";
test("all 17 requested missing modules remain visible in the wiring tracker",()=>{
 assert.equal(WIRING_MODULES.length,17);
 assert.equal(new Set(WIRING_MODULES.map(m=>m.id)).size,17);
 assert.ok(WIRING_MODULES.every(m=>m.blockers.length>=2&&m.evidenceRequired.length>20));
 assert.ok(WIRING_MODULES.every(m=>m.live===false));
});
test("environment presence cannot turn a missing onchain lifecycle into a live status",()=>{
 const a=wiringSummary({});
 assert.equal(a.incompleteCount,17);assert.equal(a.releaseReady,false);
 assert.equal(a.runtime.transactionBuilderConfigured,false);
 const b=wiringSummary({
  SYMBIOTIC_CARDANO_NETWORK:"preprod",
  SYMBIOTIC_TX_BUILDER_ENDPOINT:"https://example.com",
  SYMBIOTIC_TX_BUILDER_TOKEN:"super-private-token",
  SYMBIOTIC_EQUITY_FEEDS_JSON:"[]",
  SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID:"preprodfake"
 });
 assert.equal(b.runtime.transactionBuilderConfigured,true);
 assert.equal(b.releaseReady,false);
 assert.ok(b.modules.every(m=>m.live===false));
 assert.ok(!JSON.stringify(b).includes("super-private-token"));
});
