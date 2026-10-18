import test from "node:test";
import assert from "node:assert/strict";
import {observePreprodValidators,parsePublicPreprodManifest} from "../lib/preprod-validator-observer";
const names=["collateral","perpetual","options","notional","registry"];
const mmAddress="addr_test1"+"q".repeat(75);
const hash=(letter:string,n:number)=>letter.repeat(n);
const receipts=names.map((name,i)=>({
 name,title:name+"."+name+".spend",
 scriptHash:(i+1).toString(16).repeat(56),scriptAddress:"addr_test1"+"p".repeat(75),
 txHash:(i+1).toString(16).repeat(64),outputIndex:0,
 referenceUtxo:(i+1).toString(16).repeat(64)+"#0",referenceReserveLovelace:"5000000"
}));
const manifest={network:"preprod",networkMagic:1,status:"complete",
 blueprintSha256:hash("a",64),mmAddress,validators:receipts};
test("manifest rejects missing, duplicate or malformed validator receipts",()=>{
 assert.equal(parsePublicPreprodManifest(manifest).validators.length,5);
 assert.throws(()=>parsePublicPreprodManifest({...manifest,validators:receipts.slice(0,4)}),/five-validator/);
 assert.throws(()=>parsePublicPreprodManifest({...manifest,validators:[...receipts.slice(0,4),receipts[0]]}),/duplicate/);
 assert.throws(()=>parsePublicPreprodManifest({...manifest,network:"mainnet"}),/five-validator/);
});
test("cross-checks confirmed reference hash and unspent status against independent data",async()=>{
 const fake=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  assert.equal((init?.headers as {project_id:string}).project_id,"preprod"+"x".repeat(32));
  if(url.includes("/addresses/")){
   return new Response(JSON.stringify(receipts.map(r=>({tx_hash:r.txHash,output_index:0}))),{status:200});
  }
  const receipt=receipts.find(r=>url.includes(r.txHash));
  assert.ok(receipt);
  if(url.endsWith("/utxos"))return new Response(JSON.stringify({outputs:[{
   output_index:0,address:mmAddress,reference_script_hash:receipt!.scriptHash,
   amount:[{unit:"lovelace",quantity:"5000000"}]
  }]}),{status:200});
  return new Response(JSON.stringify({block:hash("f",64),block_height:5308128}),{status:200});
 }) as typeof fetch;
 const proof=await observePreprodValidators(parsePublicPreprodManifest(manifest),"preprod"+"x".repeat(32),fake);
 assert.equal(proof.referenceValidatorsVerified,true);
 assert.equal(proof.validatorCount,5);
 assert.equal(proof.tradeExecutionEnabled,false);
});
test("already spent reference script is never considered deployed and live",async()=>{
 const fake=(async(input:RequestInfo|URL)=>{
  if(String(input).includes("/addresses/"))return new Response("[]",{status:200});
  throw Error("Should not fetch tx after UTxO is absent");
 }) as typeof fetch;
 await assert.rejects(()=>observePreprodValidators(parsePublicPreprodManifest(manifest),"preprod"+"x".repeat(32),fake),/spent or absent/);
});
