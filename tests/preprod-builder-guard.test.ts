import test from "node:test";
import assert from "node:assert/strict";
import {assertPreprodBuilderRequest} from "../lib/preprod-builder-guard";
import {TransactionBuilderClient} from "../lib/transaction-builder";
test("transaction-builder API routes accept only Cardano Preprod",()=>{
 assert.equal(assertPreprodBuilderRequest({},"preprod").network,"preprod");
 assert.throws(()=>assertPreprodBuilderRequest({},"mainnet"),/Only Cardano Preprod/);
 assert.throws(()=>assertPreprodBuilderRequest({},"preview"),/Only Cardano Preprod/);
 assert.throws(()=>assertPreprodBuilderRequest({SYMBIOTIC_CARDANO_NETWORK:"mainnet"},"preprod"),/Configured execution network/);
 assert.throws(()=>assertPreprodBuilderRequest({SYMBIOTIC_ALLOW_MAINNET:"1"},"preprod"),/Mainnet override/);
});
test("transaction builder client cannot use cleartext remote endpoints or credentials in URL",()=>{
 assert.throws(()=>new TransactionBuilderClient("http://remote.example/"),/HTTPS/);
 assert.throws(()=>new TransactionBuilderClient("https://admin:pass@remote.example/"),/credentials/);
 assert.throws(()=>new TransactionBuilderClient("https://remote.example/#key"),/fragment/);
});
test("transaction builder never follows redirects with authorization token",async()=>{
 const previous=globalThis.fetch;
 let option:RequestInit|undefined;
 globalThis.fetch=(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  option=init;
  return new Response(JSON.stringify({network:"mainnet",unsignedTxCborHex:"a100"}),{status:200});
 }) as typeof fetch;
 try{
  const builder=new TransactionBuilderClient("https://remote.example","secret");
  await assert.rejects(()=>builder.prepare({action:"OPEN_PERP",network:"preprod",account:"addr_test1xyz",intentHash:"a".repeat(64),payload:{}}),/wrong Cardano network/);
  assert.equal(option?.redirect,"error");
  assert.match(String((option?.headers as Record<string,string>)?.authorization),/Bearer secret/);
 }finally{globalThis.fetch=previous;}
});
