import assert from "node:assert/strict";
import test from "node:test";
import type {UTxO} from "@meshsdk/core";
import {selectPreprodSelfTestUtxo} from "../lib/preprod-self-test-utxo";
const a="addr_test1"+"a".repeat(60);
const b="addr_test1"+"b".repeat(60);
function output(address:string, quantity:string, opts:Record<string,string>[] = []):UTxO {
 return {input:{txHash:"a".repeat(64),outputIndex:0},
  output:{address,amount:[{unit:"lovelace",quantity},...opts]}} as UTxO;
}
test("selects an ADA-only spendable receive-address UTxO instead of assuming change address",()=>{
 const choice=selectPreprodSelfTestUtxo([
  output(a,"4000000"),output(a,"9000000",[{unit:"token",quantity:"1"}]),
  output(b,"6000000"),output(a,"10000000")
 ]);
 assert.equal(choice?.output.address,a);
 assert.equal(choice?.output.amount[0].quantity,"10000000");
});
test("does not select too-small, token-bearing, mainnet, or malformed inputs",()=>{
 assert.equal(selectPreprodSelfTestUtxo([output(a,"4999999")]),undefined);
 assert.equal(selectPreprodSelfTestUtxo([output(a,"10000000",[{unit:"asset",quantity:"1"}])]),undefined);
 assert.equal(selectPreprodSelfTestUtxo([output("addr1mainnet","10000000")]),undefined);
 assert.equal(selectPreprodSelfTestUtxo([output(a,"not-number")]),undefined);
 assert.equal(selectPreprodSelfTestUtxo([]),undefined);
});
