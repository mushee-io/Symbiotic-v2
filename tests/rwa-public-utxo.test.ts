import test from "node:test";
import assert from "node:assert/strict";
import {verifyPublicPreprodUtxos} from "../lib/rwa-public-utxo";
const time=new Date("2026-10-19T14:00:00Z").getTime();
const ref="a".repeat(64)+"#0";
const records=[{tx_hash:"a".repeat(64),tx_index:0,is_spent:false,address:"addr_test1"+"d".repeat(50)}];
function provider(output:unknown=records,tipOffset=20,success=true){
 return (async(input:RequestInfo|URL)=>{
  const url=String(input),v=url.endsWith("/tip")?[{block_time:Math.floor(time/1000)-tipOffset}]:output;
  return new Response(JSON.stringify(v),{status:success?200:503});
 }) as typeof fetch;
}
test("independent Preprod UTxO source accepts only unspent testnet output",async()=>{
 const result=await verifyPublicPreprodUtxos([ref],provider(),time);
 assert.equal(result.verified,true);assert.equal(result.source,"koios-preprod");
});
test("spent output fails closed",async()=>{
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref],provider([{...records[0],is_spent:true}]),time),/UNSPENT/);
});
test("wrong network and wrong reference fail closed",async()=>{
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref],provider([{...records[0],address:"addr1"+"e".repeat(50)}]),time),/UNSPENT/);
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref],provider([{...records[0],tx_hash:"f".repeat(64)}]),time),/UNSPENT/);
});
test("stale provider, duplicates, bad input and downtime fail closed",async()=>{
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref],provider(records,900),time),/stale/);
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref,ref],provider(),time),/Duplicate/);
 await assert.rejects(()=>verifyPublicPreprodUtxos(["not-a-ref"],provider(),time),/Supply/);
 await assert.rejects(()=>verifyPublicPreprodUtxos([ref],provider(records,20,false),time),/unavailable/);
});
