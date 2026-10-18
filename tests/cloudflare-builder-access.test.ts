import test from "node:test";
import assert from "node:assert/strict";
import {cloudflareBuilderAccess} from "../lib/cloudflare-builder-access";
import {TransactionBuilderClient} from "../lib/transaction-builder";

test("Access service-token headers are all-or-nothing",()=>{
 assert.deepEqual(cloudflareBuilderAccess({}),{});
 assert.throws(()=>cloudflareBuilderAccess({SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_ID:"id"}),/both/);
 assert.throws(()=>cloudflareBuilderAccess({SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_SECRET:"secret"}),/both/);
 assert.deepEqual(cloudflareBuilderAccess({
  SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_ID:"id",
  SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_SECRET:"secret"
 }),{"CF-Access-Client-Id":"id","CF-Access-Client-Secret":"secret"});
 assert.throws(()=>cloudflareBuilderAccess({
  SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_ID:"hello\\r\\nInjected: yes",
  SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_SECRET:"secret"
 }),/Invalid/);
});

test("Access service token accompanies authenticated builder calls with no redirects",async()=>{
 const saved=globalThis.fetch;
 const calls:RequestInit[]=[];
 globalThis.fetch=(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  calls.push(init!);
  if(calls.length===1)return new Response(JSON.stringify({network:"mainnet",unsignedTxCborHex:"a100"}));
  return new Response(JSON.stringify({signedTxCborHex:"a100"}));
 }) as typeof fetch;
 try{
  const client=new TransactionBuilderClient("https://builder.example","bearer",{
   "CF-Access-Client-Id":"client",
   "CF-Access-Client-Secret":"secret"
  });
  await assert.rejects(()=>client.prepare({action:"WALLET_SELF_TEST",network:"preprod",
   account:"addr_test1abc",intentHash:"a".repeat(64),payload:{}}),/wrong Cardano network/);
  const cbor=await client.assemble({requestId:"builder:12345678",unsignedTxCborHex:"a100",witnessSetCborHex:"a100"});
  assert.equal(cbor,"a100");
  assert.equal(calls.length,2);
  for(const call of calls){
   const headers=call.headers as Record<string,string>;
   assert.equal(call.redirect,"error");
   assert.equal(headers.authorization,"Bearer bearer");
   assert.equal(headers["CF-Access-Client-Id"],"client");
   assert.equal(headers["CF-Access-Client-Secret"],"secret");
   assert.ok(call.signal);
  }
 }finally{globalThis.fetch=saved;}
});
