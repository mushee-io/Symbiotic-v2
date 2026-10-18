import test from "node:test";
import assert from "node:assert/strict";
import {SMOKE_TEST_ASSET_UNIT,verifyPreprodSmokeAsset} from "../lib/rwa-blockfrost-health";
const good={
 asset:SMOKE_TEST_ASSET_UNIT,
 initial_mint_tx_hash:"058fc48598399499694045ae9337cc5d51bb6d28d722f9a82c5a01699603d45c",
 quantity:"1000000000000"
};
test("Read-only Blockfrost Preprod known asset identity",()=>{
 const proof=verifyPreprodSmokeAsset(good);
 assert.equal(proof.verified,true);
 if(proof.verified)assert.equal(proof.mintTxHash,good.initial_mint_tx_hash);
});
test("Fail closed on wrong policy, mint transaction and zero supply",()=>{
 assert.equal(verifyPreprodSmokeAsset({...good,asset:"a".repeat(64)}).verified,false);
 assert.equal(verifyPreprodSmokeAsset({...good,initial_mint_tx_hash:"b".repeat(64)}).verified,false);
 assert.equal(verifyPreprodSmokeAsset({...good,quantity:"0"}).verified,false);
 assert.equal(verifyPreprodSmokeAsset({...good,quantity:"NaN"}).verified,false);
});
