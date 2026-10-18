import assert from "node:assert/strict";
import test from "node:test";
import {summarizeVerifiedScriptUtxos,fetchVerifiedScriptUtxos} from "../lib/preprod-protocol-ledger";
const base={tx_hash:"a".repeat(64),output_index:0,inline_datum:"d87980",
 amount:[{unit:"lovelace",quantity:"2500000"},{unit:"f".repeat(56),quantity:"3000000"}]};
test("indexes only verifiable unspent script output quantities; never assumes trades",()=>{
 const result=summarizeVerifiedScriptUtxos("perpetual",[base]);
 assert.equal(result.totalLovelace,"2500000");
 assert.equal(result.inlineDatumOutputs,1);
 assert.deepEqual(result.nativeAssets,[{unit:"f".repeat(56),quantity:"3000000"}]);
 assert.equal(result.outputs[0].txHash,"a".repeat(64));
});
test("rejects duplicates, invalid amounts and malformed datum",()=>{
 assert.throws(()=>summarizeVerifiedScriptUtxos("perpetual",[base,base]),/Duplicated/);
 assert.throws(()=>summarizeVerifiedScriptUtxos("perpetual",[{...base,amount:[{unit:"lovelace",quantity:"-1"}]}]),/Invalid/);
 assert.throws(()=>summarizeVerifiedScriptUtxos("perpetual",[{...base,inline_datum:"wrong"}]),/inline datum/);
});
test("never returns incomplete first page as a total",async()=>{
 const address="addr_test1"+"q".repeat(70);
 const id="preprod"+"x".repeat(32);
 const fake=(async(url:RequestInfo|URL,options?:RequestInit)=>{
  assert.equal((options?.headers as {project_id:string}).project_id,id);
  assert.ok(String(url).includes("?count=100&page=1"));
  return new Response(JSON.stringify(Array.from({length:100},()=>base)),{status:200});
 }) as typeof fetch;
 await assert.rejects(()=>fetchVerifiedScriptUtxos(address,id,fake),/index incomplete/);
});
test("no provider success, no protocol accounting",async()=>{
 const address="addr_test1"+"q".repeat(70);
 const fake=(async()=>new Response("oops",{status:503})) as typeof fetch;
 await assert.rejects(()=>fetchVerifiedScriptUtxos(address,"preprod"+"x".repeat(32),fake),/unavailable/);
});
