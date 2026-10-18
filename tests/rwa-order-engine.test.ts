import test from "node:test";
import assert from "node:assert/strict";
import {proposeStockMatches,validateStockOrder,type StockLimitOrder} from "../lib/rwa-order-engine";
const at=new Date("2026-10-19T14:00:00.000Z");
const address1="addr_test1"+"a".repeat(45);
const address2="addr_test1"+"b".repeat(45);
function order(id:string,side:"BUY"|"SELL",price="260000000",quantity="1000000",ticker="AAPL"):StockLimitOrder{
 return {id,ticker,side,limitPriceMicros:price,quantityMicros:quantity,
 owner:side==="BUY"?address1:address2,nonce:Buffer.from(id,"utf8").toString("hex").padEnd(32,"0").slice(0,32),
 lockedCollateralUtxo:null,createdAt:new Date(at.getTime()-1000).toISOString(),expiresAt:new Date(at.getTime()+60000).toISOString()};
}
test("price-time priority yields exact micro-unit limit crossing",()=>{
 const b=order("buy-0001","BUY"),s=order("sell-0001","SELL","250000000","750000");
 const result=proposeStockMatches([b,s],at);
 assert.equal(result.status,"PROPOSAL_NOT_SETTLEMENT");
 assert.equal(result.fills.length,1);
 assert.equal(result.fills[0].priceMicros,"250000000");
 assert.equal(result.fills[0].amountMicros,"187500000");
 assert.equal(result.unfilled[b.id],"250000");
 assert.equal(result.unfilled[s.id],"0");
});
test("noncrossing orders never fill",()=>{
 const result=proposeStockMatches([order("buy-0001","BUY","200000000"),order("sell-0001","SELL","260000000")],at);
 assert.deepEqual(result.fills,[]);
});
test("expired orders, mismatched network owner and replayed nonce fail",()=>{
 const b=order("buy-0001","BUY");
 assert.throws(()=>proposeStockMatches([b,b],at),/Duplicate/);
 assert.throws(()=>validateStockOrder({...b,owner:"addr1not-preprod"},at),/Preprod/);
 assert.throws(()=>validateStockOrder({...b,expiresAt:new Date(at.getTime()-1000).toISOString()},at),/lifetime/);
 assert.throws(()=>validateStockOrder(b,new Date("2026-10-18T14:00:00Z")),/lifetime|closed/);
});
test("unsupported ticker, zero size and oversized book fail",()=>{
 const b=order("buy-0001","BUY");
 assert.throws(()=>validateStockOrder({...b,ticker:"NOTREAL"},at),/Unknown/);
 assert.throws(()=>validateStockOrder({...b,quantityMicros:"0"},at),/positive/);
 assert.throws(()=>proposeStockMatches(Array.from({length:501},()=>b),at),/capacity/);
});
test("ticker and quote unit cannot cross between markets",()=>{
 const b=order("buy-0001","BUY"),s=order("sell-0001","SELL","200000000","1000000","NVDA");
 assert.equal(proposeStockMatches([b,s],at).fills.length,0);
});

test("self-matches fail closed rather than silently discarding a sell order",()=>{
 const buy=order("buy-0001","BUY");const sell=order("sell-0001","SELL");
 assert.throws(()=>proposeStockMatches([buy,{...sell,owner:buy.owner}],at),/Self-trade/);
});
