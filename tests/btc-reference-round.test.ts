import test from "node:test";
import assert from "node:assert/strict";
import {parseBtcReferenceRound} from "../lib/btc-reference-round";
const now=Date.parse("2026-10-18T23:00:00Z");
const good={market:"BTC-USD",price:100000,sourceCount:2,maxDeviationBps:10,
 roundId:"a".repeat(64),generatedAt:new Date(now-12000).toISOString(),
 observations:[{source:"coinbase",price:100050},{source:"kraken",price:99950}]};
test("only a recent 2+ source BTC reference is displayable",()=>{
 assert.equal(parseBtcReferenceRound(good,now).price,100000);
});
test("rejects stale, single-source, duplicate or deviating reference rounds",()=>{
 assert.throws(()=>parseBtcReferenceRound({...good,generatedAt:new Date(now-60_000).toISOString()},now),/stale/);
 assert.throws(()=>parseBtcReferenceRound({...good,sourceCount:1,observations:[good.observations[0]]},now),/quorum/);
 assert.throws(()=>parseBtcReferenceRound({...good,observations:[good.observations[0],good.observations[0]]},now),/duplicate/);
 assert.throws(()=>parseBtcReferenceRound({...good,observations:[{source:"coinbase",price:100000},{source:"gemini",price:120000}]},now),/disagree/);
});
