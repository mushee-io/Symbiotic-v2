/** Unauthenticated public spot market reference data.
 * All exchange prices/depth are reference-only: never Cardano settlement or
 * evidence of Symbiotic venue liquidity.
 */
export const TERMINAL_PAIRS={
 "BTC-EUR":{symbol:"BTC",name:"Bitcoin",base:73772},
 "BTC-USD":{symbol:"BTC",name:"Bitcoin",base:78820},
 "ETH-USD":{symbol:"ETH",name:"Ethereum",base:3950},
 "SOL-USD":{symbol:"SOL",name:"Solana",base:205},
 "ADA-USD":{symbol:"ADA",name:"Cardano",base:.72},
 "DOGE-USD":{symbol:"DOGE",name:"Dogecoin",base:.24},
 "XRP-USD":{symbol:"XRP",name:"XRP",base:2.6},
 "BCH-USD":{symbol:"BCH",name:"Bitcoin Cash",base:550},
 "AVAX-USD":{symbol:"AVAX",name:"Avalanche",base:42},
 "LTC-USD":{symbol:"LTC",name:"Litecoin",base:130},
 "ZEC-USD":{symbol:"ZEC",name:"Zcash",base:53},
} as const;
export type TerminalPair=keyof typeof TERMINAL_PAIRS;
export const isTerminalPair=(v:string):v is TerminalPair=>
 Object.prototype.hasOwnProperty.call(TERMINAL_PAIRS,v);
export type TerminalCandle={time:number;open:number;high:number;low:number;close:number;volume:number};
export type TerminalLevel={price:number;size:number};
export type TerminalTrade={time:string;price:number;size:number;side:"BUY"|"SELL"};
export type TerminalSnapshot={
 pair:TerminalPair;currency:"USD"|"EUR";source:"COINBASE_PUBLIC"|"DEMO";
 observedAt:string;price:number;changePct:number|null;changeUsd:number|null;
 high24:number|null;low24:number|null;volume24:number|null;
 candles:TerminalCandle[];bids:TerminalLevel[];asks:TerminalLevel[];
 trades:TerminalTrade[];reason?:string
};
const clean=(v:unknown)=>typeof v==="number"?v:typeof v==="string"&&v.trim()?Number(v):NaN;
export function validPositive(v:unknown):number|null{
 const n=clean(v);return Number.isFinite(n)&&n>0&&n<1e12?n:null;
}
export function validNonnegative(v:unknown):number|null{
 const n=clean(v);return Number.isFinite(n)&&n>=0&&n<1e12?n:null;
}
export function parseCandleRows(raw:unknown):TerminalCandle[]{
 if(!Array.isArray(raw))throw Error("Invalid public candle response");
 const seen=new Set<number>();
 const rows=raw.slice(0,300).map(v=>{
  if(!Array.isArray(v)||v.length<6)throw Error("Malformed candle");
  const [timestamp,lo,hi,open,close,volume]=v.map(clean);
  if(!Number.isSafeInteger(timestamp)||timestamp<1500000000||timestamp>4102444800||
    ![lo,hi,open,close,volume].every(Number.isFinite)||lo<=0||hi<lo||
    open<lo||open>hi||close<lo||close>hi||volume<0)throw Error("Malformed OHLCV");
  if(seen.has(timestamp))throw Error("Duplicate timestamp");
  seen.add(timestamp);
  return {time:timestamp,open,high:hi,low:lo,close,volume};
 });
 return rows.sort((a,b)=>a.time-b.time);
}
export function parseLevels(raw:unknown):TerminalLevel[]{
 if(!Array.isArray(raw))throw Error("Malformed order book");
 return raw.slice(0,16).map(row=>{
  if(!Array.isArray(row)||row.length<2)throw Error("Invalid book row");
  const price=validPositive(row[0]),size=validPositive(row[1]);
  if(price===null||size===null)throw Error("Invalid price/size");
  return {price,size};
 });
}
export function demoSnapshot(pair:TerminalPair,intervalSeconds=900,nowSeconds=Math.floor(Date.now()/1000)):TerminalSnapshot{
 const base=TERMINAL_PAIRS[pair].base;
 const aligned=Math.floor(nowSeconds/intervalSeconds)*intervalSeconds;
 const candles:TerminalCandle[]=[];
 let prev=base*.974;
 for(let i=0;i<150;i++){
  const phase=i/149;
  const impulse=i>45?.014:0;
  const rise=i>104?.017:0;
  const wave=Math.sin(i*.31)*.0035+Math.cos(i*.117)*.0025;
  const close=base*(.964+phase*.018+impulse+rise+wave);
  const open=prev;
  const high=Math.max(open,close)*(1.001+Math.abs(Math.sin(i*1.7))*.0008);
  const low=Math.min(open,close)*(.999-Math.abs(Math.cos(i*1.6))*.0008);
  candles.push({time:aligned-(149-i)*intervalSeconds,open,high,low,close,volume:4+8*Math.abs(Math.sin(i*.71))+(i%34===0?19:0)});
  prev=close;
 }
 const price=candles.at(-1)!.close;
 const bids=Array.from({length:15},(_,i)=>({price:price*(1-(i+1)*.00018),size:.008+((i*13)%27)/100}));
 const asks=Array.from({length:15},(_,i)=>({price:price*(1+(i+1)*.00018),size:.008+((i*17)%23)/100}));
 const trades=Array.from({length:10},(_,i)=>({
  time:new Date((aligned-i*40)*1000).toISOString(),price:price*(1+Math.sin(i)*.0006),
  size:.012+((i*7)%15)/100,side:i%2===0?"BUY" as const:"SELL" as const
 }));
 return {pair,currency:pair.endsWith("-EUR")?"EUR":"USD",source:"DEMO",observedAt:new Date(nowSeconds*1000).toISOString(),
  price,changePct:1.49,changeUsd:price*.0149,high24:price*1.02,low24:price*.977,
  volume24:null,candles,bids,asks,trades,
  reason:"Deterministic demonstration data. No exchange fill or Symbiotic market liquidity is implied."};
}
