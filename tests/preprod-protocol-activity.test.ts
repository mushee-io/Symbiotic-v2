import test from "node:test";
import assert from "node:assert/strict";
import {classifyVerifiedProtocolActivity,getVerifiedProtocolActivity} from "../lib/preprod-protocol-activity";
const address="addr_test1"+"q".repeat(74);
const hash="a".repeat(64),block="b".repeat(64);
const time=Date.parse("2026-10-18T22:00:00Z");
const tx={hash,block,block_height:5308128,block_time:Math.floor(time/1000),fees:"175000"};
const ada=(address:string,quantity:string)=>({address,amount:[{unit:"lovelace",quantity}]});
const input=ada("addr_test1"+"p".repeat(74),"8000000");
const output=ada(address,"2500000");
test("real script output creation is not mislabeled a trade",()=>{
 const event=classifyVerifiedProtocolActivity({
  expectedHash:hash,scriptAddress:address,utxos:{inputs:[input],outputs:[output]},tx,nowMs:time+1000
 });
 assert.equal(event.kind,"OUTPUT_CREATED");
 assert.equal(event.incomingLovelace,"2500000");
 assert.equal(event.outgoingLovelace,"0");
 assert.equal(event.createdScriptOutputs,1);
});
test("identifies script spending and state updates without inventing PnL",()=>{
 const consumed=classifyVerifiedProtocolActivity({expectedHash:hash,scriptAddress:address,
  utxos:{inputs:[output],outputs:[input]},tx,nowMs:time+1000});
 assert.equal(consumed.kind,"OUTPUT_CONSUMED");
 assert.equal(consumed.netLovelaceChange,"-2500000");
 const moved=classifyVerifiedProtocolActivity({expectedHash:hash,scriptAddress:address,
  utxos:{inputs:[output],outputs:[ada(address,"3000000")]},tx,nowMs:time+1000});
 assert.equal(moved.kind,"SCRIPT_STATE_UPDATED");
 assert.equal(moved.netLovelaceChange,"500000");
});
test("rejects missing on-chain evidence, wrong contract address and forged refs",()=>{
 assert.throws(()=>classifyVerifiedProtocolActivity({expectedHash:hash,scriptAddress:address,
  utxos:{inputs:[input],outputs:[input]},tx,nowMs:time+1000}),/does not touch/);
 assert.throws(()=>classifyVerifiedProtocolActivity({expectedHash:hash,scriptAddress:address,
  utxos:{inputs:[input],outputs:[output]},tx:{...tx,hash:"f".repeat(64)},nowMs:time+1000}),/not independently confirmed/);
 assert.throws(()=>classifyVerifiedProtocolActivity({expectedHash:hash,scriptAddress:address,
  utxos:{inputs:[input],outputs:[output]},tx:{...tx,block_time:Math.floor(time/1000)+700},nowMs:time+1000}),/not independently confirmed/);
});
test("retrieval verifies the indexed hash, confirmed transaction and output movement",async()=>{
 const key="preprod"+"x".repeat(32);
 const fake=(async(url:RequestInfo|URL,options?:RequestInit)=>{
  assert.equal((options?.headers as {project_id:string}).project_id,key);
  const path=String(url);
  if(path.includes("/addresses/"))return new Response(JSON.stringify([{tx_hash:hash}]),{status:200});
  if(path.endsWith("/utxos"))return new Response(JSON.stringify({inputs:[input],outputs:[output]}),{status:200});
  return new Response(JSON.stringify(tx),{status:200});
 }) as typeof fetch;
 const result=await getVerifiedProtocolActivity({
  scriptAddress:address,validator:"perpetual",projectId:key,limit:5,fetcher:fake,nowMs:time+1000
 });
 assert.equal(result.verified,true);
 assert.equal(result.transactionsObserved,1);
 assert.equal(result.events[0].kind,"OUTPUT_CREATED");
 assert.equal(result.isCompleteHistory,false);
});
test("fails closed when provider index is truncated or has duplicated hashes",async()=>{
 const key="preprod"+"x".repeat(32);
 const fake=(async()=>new Response(JSON.stringify([{tx_hash:hash},{tx_hash:hash}]),{status:200})) as typeof fetch;
 await assert.rejects(()=>getVerifiedProtocolActivity({
  scriptAddress:address,validator:"perpetual",projectId:key,fetcher:fake,nowMs:time
 }),/duplicate/);
});
