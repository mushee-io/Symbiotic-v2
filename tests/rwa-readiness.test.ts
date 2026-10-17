import assert from "node:assert/strict";
import test from "node:test";
import {marketSession} from "../lib/rwa-market";
import {stockReadiness} from "../lib/rwa-preprod-proof";
const minted={
 policy_id:"558015db095bf61d0fd364b484ebddedf16f8d193a884a1c7b9e62f6",
 asset_name:"73555344",
 minting_tx_hash:"058fc48598399499694045ae9337cc5d51bb6d28d722f9a82c5a01699603d45c",
 total_supply:"1000000000000"
};
const instant=new Date("2026-10-19T14:00:00Z");
function provider(asset:Record<string,string>=minted,tipAge=20){
 return (async(input:RequestInfo|URL)=>{
  const path=String(input);
  const data=path.endsWith("/tip")?[{block_no:5250000,block_time:Math.floor(instant.getTime()/1000)-tipAge}]:
   path.includes("/asset_info?")?[asset]:[];
  return new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json"}});
 }) as typeof fetch;
}
test("US stocks observe NYSE holidays and early closes",()=>{
 assert.equal(marketSession(new Date("2026-07-03T15:00:00Z")).session,"HOLIDAY");
 assert.equal(marketSession(new Date("2026-11-26T17:00:00Z")).session,"HOLIDAY");
 assert.equal(marketSession(new Date("2026-11-27T17:30:00Z")).session,"REGULAR");
 assert.equal(marketSession(new Date("2026-11-27T18:00:00Z")).session,"EARLY_CLOSED");
 assert.equal(marketSession(new Date("2026-12-24T19:00:00Z")).session,"EARLY_CLOSED");
});
test("DST calendar and unsupported years fail closed",()=>{
 assert.equal(marketSession(new Date("2026-03-09T13:30:00Z")).regularOpen,true);
 assert.equal(marketSession(new Date("2026-01-12T14:30:00Z")).regularOpen,true);
 assert.equal(marketSession(new Date("2026-10-18T15:00:00Z")).regularOpen,false);
 assert.equal(marketSession(new Date("2029-07-03T14:30:00Z")).session,"CALENDAR_UNVERIFIED");
 assert.equal(marketSession(new Date("2029-07-03T14:30:00Z")).regularOpen,false);
});
test("Preprod collateral evidence does not enable a stock trading contract",async()=>{
 const s=await stockReadiness("AAPL",instant,provider());
 assert.equal(s.checks.preprodTipFresh,true);
 assert.equal(s.checks.demoCollateralMintConfirmed,true);
 assert.equal(s.checks.orderbookAndSettlementVerified,false);
 assert.equal(s.tradingEnabled,false);
 assert.equal(s.collateral?.mintTxHash,minted.minting_tx_hash);
 assert.equal(s.session.regularOpen,true);
});
test("stale tip and incorrect mint fail closed",async()=>{
 const s=await stockReadiness("NVDA",instant,provider({...minted,minting_tx_hash:"f".repeat(64)},900));
 assert.equal(s.tradingEnabled,false);assert.equal(s.collateral,null);
 assert.equal(s.chainTip,null);
 assert.equal(s.checks.demoCollateralMintConfirmed,false);
});
test("invalid market refuses public provider lookups",async()=>{
 await assert.rejects(()=>stockReadiness("BADTICKER",instant,provider()),/Unsupported/);
});
