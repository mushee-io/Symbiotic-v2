import test from "node:test";
import assert from "node:assert/strict";
import {inspectReferenceOutput,verifyReferenceScriptReceipt} from "../src/reference-script-proof.js";
const txHash="a".repeat(64),scriptHash="b".repeat(56),blockHash="c".repeat(64);
const address="addr_test1"+"q".repeat(85);
const expected={txHash,outputIndex:0,address,scriptHash,minLovelace:"5000000"};
const tx={block:blockHash,block_height:5308128};
const result={outputs:[{output_index:0,address,reference_script_hash:scriptHash,
 amount:[{unit:"lovelace",quantity:"9000000"}]}]};
test("verifies the exact reference script hash at a confirmed Preprod UTxO",()=>{
 assert.equal(inspectReferenceOutput(expected,result,tx).verified,true);
 assert.equal(inspectReferenceOutput(expected,result,tx).blockHeight,5308128);
});
test("rejects ADA-only fake deployments, wrong scripts or inadequate reserve",()=>{
 assert.throws(()=>inspectReferenceOutput(expected,{outputs:[{...result.outputs[0],reference_script_hash:null}]},tx),/hash missing/);
 assert.throws(()=>inspectReferenceOutput(expected,{outputs:[{...result.outputs[0],reference_script_hash:"d".repeat(56)}]},tx),/mismatched/);
 assert.throws(()=>inspectReferenceOutput(expected,{outputs:[{...result.outputs[0],address:"addr_test1"+"z".repeat(85)}]},tx),/address mismatch/);
 assert.throws(()=>inspectReferenceOutput(expected,{outputs:[{...result.outputs[0],amount:[{unit:"lovelace",quantity:"1"}]}]},tx),/insufficient/);
 assert.throws(()=>inspectReferenceOutput(expected,result,{}),/not independently confirmed/);
 assert.throws(()=>inspectReferenceOutput({...expected,outputIndex:1},result,tx),/Missing/);
});
test("Blockfrost network request checks both confirmed transaction and UTxO",async()=>{
 const urls:string[]=[];
 const fake=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  urls.push(String(input));
  assert.equal((init?.headers as {project_id:string}).project_id,"preprod"+"x".repeat(32));
  return new Response(JSON.stringify(String(input).endsWith("/utxos")?result:tx),{status:200});
 }) as typeof fetch;
 const out=await verifyReferenceScriptReceipt(expected,"preprod"+"x".repeat(32),fake);
 assert.equal(out.referenceScriptHash,scriptHash);
 assert.equal(urls.length,2);
 assert.ok(urls.every(x=>x.startsWith("https://cardano-preprod.blockfrost.io/api/v0/txs/")));
});
test("API failure is never treated as proof",async()=>{
 const bad=(async()=>new Response(JSON.stringify({message:"offline"}),{status:503})) as typeof fetch;
 await assert.rejects(()=>verifyReferenceScriptReceipt(expected,"preprod"+"x".repeat(32),bad),/unavailable/);
});
