import assert from "node:assert/strict";
import test from "node:test";
import {parseAnyCorePosition,type ObservedPosition} from "../lib/preprod-position-index";
import {summariseVerifiedPositions} from "../lib/preprod-protocol-metrics";

const owner="a".repeat(56),stable="b".repeat(56)+"73555344";
const utxo={
 tx_hash:"c".repeat(64),output_index:0,
 amount:[{unit:"lovelace",quantity:"2000000"},{unit:stable,quantity:"250000000"}]
};
const position=(reference:string,kind:"perpetual"|"options",notional:string,locked:string):ObservedPosition=>({
 kind,reference,txHash:reference.split("#")[0],ownerKeyHash:owner,
 market:kind==="perpetual"?"BTC-USD":"AAPL",
 lockedLovelace:"2000000",lockedStableUnits:locked,
 notionalOrContracts:notional,nonce:"0",entryOrStrike:"1000000",
 sideOrKind:kind==="perpetual"?"LONG":"CALL",settlement:"OPEN",expiryMs:null
});
test("global index extracts signer from independently decoded Plutus datum",()=>{
 const decoded={constructor:0,fields:[owner,Buffer.from("BTC-USD").toString("hex"),
  1,"1000000000","250000000","65000000000",0]};
 const parsed=parseAnyCorePosition({kind:"perpetual",output:utxo,decodedDatum:decoded,stableUnit:stable});
 assert.equal(parsed.ownerKeyHash,owner);
 assert.equal(parsed.lockedStableUnits,"250000000");
 assert.equal(parsed.notionalOrContracts,"1000000000");
});
test("exact BigInt aggregation gives actual outstanding notional but no fictional volume",()=>{
 const a=position("c".repeat(64)+"#0","perpetual","1000000000000000000000","250000000");
 const b=position("d".repeat(64)+"#1","perpetual","500000000000000000000","500000000");
 const c=position("e".repeat(64)+"#2","options","2","750000000");
 const result=summariseVerifiedPositions([a,b,c]);
 assert.equal(result.positionsObserved,3);
 assert.equal(result.activePerpetualPositions,2);
 assert.equal(result.openOptionPositions,1);
 assert.equal(result.perpetualOpenNotionalBaseUnits,"1500000000000000000000");
 assert.equal(result.lockedTestStableBaseUnits,"1500000000");
 assert.equal(result.distinctMarkets,2);
 assert.deepEqual(result.markets.map(x=>x.market),["AAPL","BTC-USD"]);
 assert.equal("tradeVolume" in result,false);
 assert.equal("pnl" in result,false);
});
test("cannot claim duplicates, negative funds, phantom notional, or bad script refs",()=>{
 const a=position("c".repeat(64)+"#0","perpetual","1000000","2000000");
 assert.throws(()=>summariseVerifiedPositions([a,a]),/duplicated/);
 assert.throws(()=>summariseVerifiedPositions([{...a,lockedStableUnits:"-1"}]),/Malformed/);
 assert.throws(()=>summariseVerifiedPositions([{...a,notionalOrContracts:"0"}]),/Malformed/);
 assert.throws(()=>summariseVerifiedPositions([{...a,reference:"bad"}]),/Malformed/);
 assert.throws(()=>summariseVerifiedPositions([{...a,settlement:"SETTLED"}]),/perpetual/);
});
