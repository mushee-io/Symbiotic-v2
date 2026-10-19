import assert from "node:assert/strict";
import test from "node:test";
import {demoSnapshot,isTerminalPair,parseCandleRows,parseLevels,TERMINAL_PAIRS,validPositive} from "../lib/terminal-market";
import {readFileSync} from "node:fs";

test("default professional market includes real public BTC/EUR and separate Symbiotic BTC/USD",()=>{
 assert.ok(isTerminalPair("BTC-EUR"));
 assert.ok(isTerminalPair("BTC-USD"));
 assert.ok(!isTerminalPair("BTC-USD/../../private"));
 assert.equal(TERMINAL_PAIRS["BTC-EUR"].symbol,"BTC");
});
test("fallback is deterministic, sorted, physically valid OHLCV and labelled demo",()=>{
 const a=demoSnapshot("BTC-EUR",900,1792395000);
 const b=demoSnapshot("BTC-EUR",900,1792395000);
 assert.deepEqual(a,b);
 assert.equal(a.source,"DEMO");
 assert.equal(a.currency,"EUR");
 assert.equal(a.candles.length,150);
 for(let i=0;i<a.candles.length;i++){
  const c=a.candles[i];
  assert.ok(c.low>0&&c.high>=c.low&&c.open>=c.low&&c.open<=c.high&&c.close>=c.low&&c.close<=c.high);
  assert.ok(c.volume>=0);
  if(i)assert.ok(c.time>a.candles[i-1].time);
 }
 assert.ok(a.bids[0].price<a.asks[0].price);
});
test("validate Coinbase OHLCV rows and sort in chronological order",()=>{
 const result=parseCandleRows([[1792395000,5,10,7,8,33],[1792394100,4,9,7,6,17]]);
 assert.equal(result[0].time,1792394100);
 assert.equal(result[1].close,8);
 assert.throws(()=>parseCandleRows([[1792395000,5,10,7,11,33]]),/OHLCV/);
 assert.throws(()=>parseCandleRows([[1792395000,5,10,7,8,-1]]),/OHLCV/);
 assert.throws(()=>parseCandleRows([[1792395000,5,10,7,8,33],[1792395000,5,10,7,8,33]]),/Duplicate/);
});
test("reject malicious or malformed public order book rows before display",()=>{
 assert.deepEqual(parseLevels([["73900.0","0.5","2"]]),[{price:73900,size:.5}]);
 assert.throws(()=>parseLevels([["-1","5"]]),/Invalid price/);
 assert.throws(()=>parseLevels([["abc","5"]]),/Invalid price/);
 assert.equal(validPositive("0"),null);
 assert.equal(validPositive("NaN"),null);
});
test("original homepage untouched, advanced Preprod execution preserved, terminal interactive components present",()=>{
 const page=readFileSync("app/page.tsx","utf8");
 const trade=readFileSync("app/trade/page.tsx","utf8");
 const legacy=readFileSync("app/trade/advanced/page.tsx","utf8");
 const terminal=readFileSync("components/ProfessionalTerminal.tsx","utf8");
 assert.match(page,/<FluidHero\s*\/>/);
 assert.match(trade,/<ProfessionalTerminal\s*\/>/);
 assert.ok(legacy.includes("LivePerpLauncher"));
 assert.ok(legacy.includes("NOTIONAL"));
 for(const item of ["ProfessionalCandleChart","Open orders","Trade history","Search crypto","DEMO MARKET DATA","/trade/advanced","BTC-EUR","MA10","Last trades","TP/SL"])
  assert.ok(terminal.includes(item),"Missing expected interactive feature "+item);
});
