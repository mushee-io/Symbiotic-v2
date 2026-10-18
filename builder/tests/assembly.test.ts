import test from "node:test";
import assert from "node:assert/strict";
import {Serialization} from "@meshsdk/core-cst";
import {PreprodBuilder} from "../src/builder.js";

/**
 * Synthetic Cardano transaction CBOR and structurally valid test witness.
 * No private keys, live wallet funds, or HTTP calls are involved.
 * This exercises the exact serialization functions used by Lace assembly.
 */
const address="00"+"11".repeat(28)+"22".repeat(28);
const txBody="a30081825820"+"aa".repeat(32)+"00"+
 "0181825839"+address+"1a001e8480"+"021a00029810";
const unsignedTxCborHex="84"+txBody+"a0f5f6";
const witnessSetCborHex="a10081825820"+"33".repeat(32)+"5840"+"44".repeat(64);

test("assembler preserves unsigned body when merging a CIP-30 vkey witness",()=>{
 const tx=Serialization.Transaction.fromCbor(unsignedTxCborHex as Parameters<typeof Serialization.Transaction.fromCbor>[0]);
 const bodyHash=String(tx.getId());
 assert.match(bodyHash,/^[0-9a-f]{64}$/i);
 const builder=new PreprodBuilder("preprod"+"a".repeat(32));
 const now=1_000;
 const requestId=builder.sessions.store({
  unsignedTxCborHex,txBodyHash:bodyHash,expiresAt:now+900000,consumed:false
 },now);
 const result=builder.assemble({requestId,unsignedTxCborHex,witnessSetCborHex},now+120_000);
 const signed=Serialization.Transaction.fromCbor(result.signedTxCborHex as Parameters<typeof Serialization.Transaction.fromCbor>[0]);
 assert.equal(String(signed.getId()),bodyHash);
 assert.equal(signed.witnessSet().vkeys()?.values().length,1);
 assert.throws(()=>builder.assemble({requestId,unsignedTxCborHex,witnessSetCborHex},now+120_001),/already used/);
});

test("assembler rejects non-CIP-30 witness, changed CBOR, or expired session",()=>{
 const tx=Serialization.Transaction.fromCbor(unsignedTxCborHex as Parameters<typeof Serialization.Transaction.fromCbor>[0]);
 const builder=new PreprodBuilder("preprod"+"a".repeat(32));
 const now=1_000;
 const requestId=builder.sessions.store({
  unsignedTxCborHex,txBodyHash:String(tx.getId()),expiresAt:now+900000,consumed:false
 },now);
 assert.throws(()=>builder.assemble({requestId,unsignedTxCborHex,witnessSetCborHex:"a0"},now),/verification-key witness/);
 assert.throws(()=>builder.assemble({requestId,unsignedTxCborHex:unsignedTxCborHex+"00",witnessSetCborHex},now),/CBOR changed/);
 assert.throws(()=>builder.assemble({requestId,unsignedTxCborHex,witnessSetCborHex},now+900000),/expired/);
});
