import test from "node:test";
import assert from "node:assert/strict";
import {validateDemoBlueprint,PINNED_DEMO_BLUEPRINT,DEMO_VALIDATOR_NAMES} from "../lib/lace-demo-deployment";
test("core plan defines all five distinct validators with pinned artifact digest",()=>{
 assert.equal(DEMO_VALIDATOR_NAMES.length,5);
 assert.equal(new Set(DEMO_VALIDATOR_NAMES).size,5);
 assert.match(PINNED_DEMO_BLUEPRINT,/^[0-9a-f]{64}$/);
});
test("cannot swap or spoof the on-chain Aiken blueprint",()=>{
 assert.throws(()=>validateDemoBlueprint("{}"),/length/);
 assert.throws(()=>validateDemoBlueprint('{"test":"'+ "a".repeat(256)+'"}'),/digest mismatch/);
});
