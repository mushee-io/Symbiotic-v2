import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {equityFeedConfigFromEnv,signedPayload,verifyEquityObservation,verifiedEquityRound,type EquityFeedConfig,type SignedEquityObservation} from "../lib/rwa-equity-oracle";
const keys=Array.from({length:3},()=>generateKeyPairSync("ed25519"));
const feeds=keys.map((k,i):EquityFeedConfig=>({
 id:"feed-"+i,url:"https://issuer"+i+".example.test/{ticker}",
 publicKeyPem:k.publicKey.export({type:"spki",format:"pem"}).toString()
}));
const instant=new Date("2026-10-19T14:00:00.000Z");
function observation(i:number,micros="260000000",at=instant.toISOString()):SignedEquityObservation{
 const payload={ticker:"AAPL",priceMicros:micros,asOf:at,roundId:"signed-round-"+i};
 return {...payload,signature:sign(null,Buffer.from(signedPayload(payload)),keys[i].privateKey).toString("base64")};
}
function mock(obs:SignedEquityObservation[]){
 return (async (input:RequestInfo|URL)=>{
  const url=String(input),i=Number(url.match(/issuer([0-2])/)?.[1]??0);
  return new Response(JSON.stringify(obs[i]),{status:200});
 }) as typeof fetch;
}
test("independent authenticated quorum builds informational reference",async()=>{
 const o=[observation(0),observation(1,"260040000"),observation(2,"259980000")];
 const a=await verifiedEquityRound({ticker:"AAPL",feeds,at:instant,fetchImpl:mock(o)});
 assert.equal(a.sourceCount,3);assert.equal(a.priceMicros,"260000000");
 assert.equal(a.operationalForResearchOnly,true);
});
test("modified price without signed payload proof is rejected",()=>{
 const o=observation(0);o.priceMicros="999999999";
 assert.throws(()=>verifyEquityObservation(o,feeds[0],"AAPL",instant.getTime()),/signature/);
});
test("too old signed prices fail even with valid signatures",()=>{
 const o=observation(0,"260000000",new Date(instant.getTime()-31_000).toISOString());
 assert.throws(()=>verifyEquityObservation(o,feeds[0],"AAPL",instant.getTime()),/stale/);
});
test("price-source deviation and quorum fail closed",async()=>{
 const o=[observation(0),observation(1,"340000000"),observation(2,"240000000")];
 await assert.rejects(()=>verifiedEquityRound({ticker:"AAPL",feeds,at:instant,fetchImpl:mock(o)}),/disagreement/);
 const broken=[observation(0),{...observation(1),signature:"not-a-signature"},{...observation(2),priceMicros:"111"}];
 await assert.rejects(()=>verifiedEquityRound({ticker:"AAPL",feeds,at:instant,fetchImpl:mock(broken)}),/quorum/);
});
test("closed exchanges and unknown symbols never produce executable quotes",async()=>{
 await assert.rejects(()=>verifiedEquityRound({ticker:"AAPL",feeds,at:new Date("2026-10-18T14:00:00Z"),fetchImpl:mock([observation(0),observation(1),observation(2)])}),/closed/);
 await assert.rejects(()=>verifiedEquityRound({ticker:"XYZNOTEXIST",feeds,at:instant,fetchImpl:mock([observation(0),observation(1),observation(2)])}),/unsupported/);
});
test("missing or nonindependent provider config fails",()=>{
 assert.throws(()=>equityFeedConfigFromEnv(undefined),/not configured/);
 assert.throws(()=>equityFeedConfigFromEnv(JSON.stringify([feeds[0]])),/2/);
 assert.throws(()=>equityFeedConfigFromEnv(JSON.stringify([feeds[0],{...feeds[1],url:feeds[0].url}])),/independent origins/);
 assert.throws(()=>equityFeedConfigFromEnv(JSON.stringify([feeds[0],{...feeds[1],publicKeyPem:feeds[0].publicKeyPem}])),/signing keys/);
 assert.equal(equityFeedConfigFromEnv(JSON.stringify(feeds)).length,3);
});

test("provider URLs block direct IP destinations and local origins",()=>{
 const config=(url:string)=>JSON.stringify([feeds[0],{...feeds[1],url}]);
 assert.throws(()=>equityFeedConfigFromEnv(config("https://127.0.0.1/equities/{ticker}")),/Private/);
 assert.throws(()=>equityFeedConfigFromEnv(config("https://[::1]/equities/{ticker}")),/Private/);
 assert.throws(()=>equityFeedConfigFromEnv(config("https://relay.internal/equities/{ticker}")),/Private/);
});
test("oracle HTTP requests never follow redirects into untrusted destinations",async()=>{
 const example=observation(0);
 let option:RequestInit|undefined;
 const record=(async(_url:RequestInfo|URL,init?:RequestInit)=>{option=init;return new Response(JSON.stringify(example),{status:200})}) as typeof fetch;
 await assert.rejects(()=>verifiedEquityRound({ticker:"AAPL",feeds:[feeds[0]],at:instant,fetchImpl:record}),/quorum/);
 assert.equal(option?.redirect,"error");
});
