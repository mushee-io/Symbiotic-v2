import test from "node:test";
import assert from "node:assert/strict";
import {verifyPreprodSelfReturn} from "../lib/preprod-self-test-receipt";
const hash="a".repeat(64),address="addr_test1"+"q".repeat(70);
const tx={hash,block:"b".repeat(64),block_height:5308128,fees:"170500"};
const evidence={inputs:[{address,amount:[{unit:"lovelace",quantity:"10000000"}]}],
 outputs:[{address,amount:[{unit:"lovelace",quantity:"2000000"}]},
 {address,amount:[{unit:"lovelace",quantity:"7829500"}]}]};
test("wallet-to-self transaction is confirmed only if all ADA is conserved",()=>{
 const proof=verifyPreprodSelfReturn(hash,address,evidence,tx);
 assert.equal(proof.confirmed,true);assert.equal(proof.feeLovelace,"170500");
 assert.equal(proof.inputs,1);assert.equal(proof.outputs,2);
});
test("rejects an unauthorized output even when the 2-ADA output is present",()=>{
 const e=structuredClone(evidence);e.outputs[1].address="addr_test1"+"z".repeat(70);
 assert.throws(()=>verifyPreprodSelfReturn(hash,address,e,tx),/outside-wallet/);
});
test("rejects non-ADA, wrong sender, invalid fee and unconfirmed transaction",()=>{
 const e=structuredClone(evidence);e.outputs[1].amount.push({unit:"asset",quantity:"1"});
 assert.throws(()=>verifyPreprodSelfReturn(hash,address,e,tx),/non-ADA/);
 const sender=structuredClone(evidence);sender.inputs[0].address="addr_test1"+"z".repeat(70);
 assert.throws(()=>verifyPreprodSelfReturn(hash,address,sender,tx),/unexpected address/);
 assert.throws(()=>verifyPreprodSelfReturn(hash,address,evidence,{...tx,fees:"170499"}),/conserve/);
 assert.throws(()=>verifyPreprodSelfReturn(hash,address,evidence,{...tx,block_height:undefined}),/not independently confirmed/);
});
