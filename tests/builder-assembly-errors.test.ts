import test from "node:test";
import assert from "node:assert/strict";
import {TransactionBuilderClient} from "../lib/transaction-builder";

test("assembly surfaces known, sanitized builder failure code",async()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({code:"SIGNING_SESSION_EXPIRED",error:"Internal details"}),{
  status:400,headers:{"content-type":"application/json"}})) as typeof fetch;
 try{
  const client=new TransactionBuilderClient("https://builder.example","secret");
  await assert.rejects(()=>client.assemble({requestId:"request-1234",unsignedTxCborHex:"a100",witnessSetCborHex:"a100"}),/signing session expired/i);
 }finally{globalThis.fetch=prior;}
});
test("unknown assembly error details never surface to browser",async()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({code:"UNKNOWN",error:"secret credential leak"}),{status:400})) as typeof fetch;
 try{
  const client=new TransactionBuilderClient("https://builder.example","secret");
  await assert.rejects(()=>client.assemble({requestId:"request-1234",unsignedTxCborHex:"a100",witnessSetCborHex:"a100"}),e=>{
   assert.match(String(e),/assemble failed with 400/);
   assert.doesNotMatch(String(e),/secret credential leak/);
   return true;
  });
 }finally{globalThis.fetch=prior;}
});
