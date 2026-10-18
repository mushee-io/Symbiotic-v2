import test from "node:test";
import assert from "node:assert/strict";
import {fetchPreprodChainTip,preprodValidityWindow} from "../src/preprod-chain-tip.js";

const now=Date.parse("2026-10-18T21:30:00Z");
const tip={slot:136676449,time:Math.floor(now/1000)-75};

test("regression: on-chain head 136676449 must be inside self-test validity window",()=>{
 const {invalidBefore,invalidHereafter}=preprodValidityWindow(tip,now);
 assert.equal(invalidBefore,136676149);
 assert.equal(invalidHereafter,136678249);
 assert.ok(invalidBefore<136676449,"lower bound must be behind current on-chain slot");
 assert.ok(invalidHereafter>136676449,"upper bound must be in the future");
 // The previously rejected transaction started at 136676522, in the future.
 assert.ok(136676522>136676449);
});

test("window uses tip slot, not an ahead-of-chain machine wall clock",()=>{
 const futureMachineTime=now+75_000;
 const {invalidBefore}=preprodValidityWindow(tip,futureMachineTime);
 assert.equal(invalidBefore,136676149);
});
test("chain tip invalid or stale fails closed",()=>{
 assert.throws(()=>preprodValidityWindow({slot:10,time:tip.time},now),/Invalid/);
 assert.throws(()=>preprodValidityWindow({slot:NaN,time:tip.time},now),/Invalid/);
 assert.throws(()=>preprodValidityWindow({...tip,time:tip.time-700},now),/stale/);
 assert.throws(()=>preprodValidityWindow({...tip,time:tip.time+120},now),/future-dated/);
});

test("authenticated Blockfrost tip retrieval returns validated chain tip",async()=>{
 let urlSeen="";
 let key="";
 const fetcher=(async(url:RequestInfo|URL,init?:RequestInit)=>{
  urlSeen=String(url);
  key=(init?.headers as Record<string,string>).project_id;
  return new Response(JSON.stringify(tip),{status:200,headers:{"content-type":"application/json"}});
 }) as typeof fetch;
 assert.deepEqual(await fetchPreprodChainTip("preprod-test-id",now,fetcher),tip);
 assert.match(urlSeen,/cardano-preprod.blockfrost.io\/api\/v0\/blocks\/latest/);
 assert.equal(key,"preprod-test-id");
});
test("Blockfrost failure cannot be bypassed by guessing machine time",async()=>{
 const fetcher=(async()=>new Response(JSON.stringify({message:"bad key"}),{status:403})) as typeof fetch;
 await assert.rejects(()=>fetchPreprodChainTip("bad-key",now,fetcher),/provider unavailable/);
});
