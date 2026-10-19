import assert from "node:assert/strict";
import test from "node:test";
import {parseCorePosition} from "../lib/preprod-position-index";

const pkh="a".repeat(56),stableUnit="b".repeat(56)+"73555344";
const tx="c".repeat(64);
const market=Buffer.from("BTC-USD").toString("hex");
const output={
 tx_hash:tx,output_index:1,inline_datum:"d87980",
 amount:[
  {unit:"lovelace",quantity:"2300000"},
  {unit:stableUnit,quantity:"250000000"}
 ]
};
const perpetual={
 constructor:0,fields:[pkh,market,1,1_000_000_000,250_000_000,65_000_000_000,0]
};
const options={
 constructor:0,fields:[pkh,market,0,70_000_000_000,1_800_000_000_000,2,250_000_000,0,0,0,4]
};
const read=(kind:"perpetual"|"options",decodedDatum:unknown,utxo:unknown=output,ownerKeyHash=pkh)=>
 parseCorePosition({kind,decodedDatum,output:utxo,stableUnit,ownerKeyHash});

test("indexes a confirmed exact-token-backed perpetual position without inventing PnL",()=>{
 const position=read("perpetual",perpetual);
 assert.ok(position);
 assert.equal(position.reference,tx+"#1");
 assert.equal(position.ownerKeyHash,pkh);
 assert.equal(position.market,"BTC-USD");
 assert.equal(position.sideOrKind,"LONG");
 assert.equal(position.lockedStableUnits,"250000000");
 assert.equal(position.notionalOrContracts,"1000000000");
 assert.equal(position.settlement,"OPEN");
 assert.equal("pnl" in position,false);
});

test("indexes a collateral-backed option and its exact expiry and status",()=>{
 const position=read("options",options);
 assert.ok(position);
 assert.equal(position.sideOrKind,"CALL");
 assert.equal(position.expiryMs,"1800000000000");
 assert.equal(position.notionalOrContracts,"2");
 assert.equal(position.entryOrStrike,"70000000000");
});

test("ignores correctly formed other-wallet positions, not a transferable balance claim",()=>{
 assert.equal(read("perpetual",perpetual,output,"d".repeat(56)),null);
});
test("fails closed on synthetic or inconsistent asset backing",()=>{
 const wrongAmount={...output,amount:[
  {unit:"lovelace",quantity:"2300000"},{unit:stableUnit,quantity:"249999999"}]};
 assert.throws(()=>read("perpetual",perpetual,wrongAmount),/collateral does not match/);
 const withoutStable={...output,amount:[{unit:"lovelace",quantity:"2300000"}]};
 assert.throws(()=>read("perpetual",perpetual,withoutStable),/collateral does not match/);
});
test("rejects malformed datum schemas, amounts, duplicate assets and invalid side",()=>{
 assert.throws(()=>read("perpetual",{constructor:1,fields:perpetual.fields}),/constructor/);
 assert.throws(()=>read("perpetual",{constructor:0,fields:[pkh]}),/fields/);
 assert.throws(()=>read("perpetual",{...perpetual,fields:[pkh,market,0,1_000_000_000,250_000_000,65_000_000_000,0]}),/side/);
 assert.throws(()=>read("perpetual",perpetual,{...output,amount:[...output.amount,output.amount[1]]}),/Duplicate/);
 assert.throws(()=>read("perpetual",perpetual,{...output,tx_hash:"not-a-hash"}),/UTxO/);
 assert.throws(()=>read("perpetual",perpetual,{...output,amount:[
  {unit:"lovelace",quantity:"1000"},output.amount[1]]}),/minimum ADA/);
});
test("rejects inconsistent option settlement evidence",()=>{
 assert.throws(()=>read("options",{constructor:0,fields:[
  pkh,market,0,70_000_000_000,1_800_000_000_000,2,250_000_000,0,100,0,4
 ]}),/Inconsistent/);
 assert.throws(()=>read("options",{constructor:0,fields:[
  pkh,market,0,70_000_000_000,1_800_000_000_000,2,250_000_000,1,100,250_000_001,4
 ]}),/Inconsistent/);
});
test("supports SDK JSON wrapper shapes without relying on floats",()=>{
 const raw={constructor:0,fields:[
  {bytes:pkh},{bytes:market},{int:1},{int:"1000000000"},
  {int:"250000000"},{int:"65000000000"},{int:"0"}
 ]};
 const result=read("perpetual",raw);
 assert.equal(result?.notionalOrContracts,"1000000000");
});
