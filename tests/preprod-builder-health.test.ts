import assert from "node:assert/strict";
import test from "node:test";
import {validatedBuilderReadiness} from "../lib/preprod-builder-health";
const now=Date.parse("2026-10-18T17:00:00Z");
const good={service:"symbiotic-preprod-builder",network:"preprod",networkMagic:1,
 actions:["WALLET_SELF_TEST"],contractTransactionsEnabled:false,ready:true,
 tipTime:new Date(now-1000).toISOString()};
test("Builder readiness only accepts pinned Preprod self-test and current tip",()=>{
 assert.equal(validatedBuilderReadiness(good,now).ready,true);
 assert.throws(()=>validatedBuilderReadiness({...good,network:"mainnet"},now),/capabilities/);
 assert.throws(()=>validatedBuilderReadiness({...good,actions:["OPEN_PERP"]},now),/capabilities/);
 assert.throws(()=>validatedBuilderReadiness({...good,contractTransactionsEnabled:true},now),/capabilities/);
 assert.throws(()=>validatedBuilderReadiness({...good,tipTime:new Date(now-900000).toISOString()},now),/stale/);
});
