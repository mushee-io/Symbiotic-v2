import {NextResponse} from "next/server";
import {
 demoSnapshot,isTerminalPair,parseCandleRows,parseLevels,
 validNonnegative,validPositive,type TerminalCandle,type TerminalSnapshot
} from "@/lib/terminal-market";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const BASE="https://api.exchange.coinbase.com";
async function exchange(path:string):Promise<unknown>{
 const response=await fetch(BASE+path,{
  next:{revalidate:12},headers:{"Accept":"application/json","User-Agent":"Symbiotic-V2-Reference-Dashboard/1.0"},
  signal:AbortSignal.timeout(5500)
 });
 if(!response.ok)throw Error("Public exchange response unavailable");
 return response.json();
}
export async function GET(request:Request){
 const url=new URL(request.url);
 const raw=url.searchParams.get("pair")??"BTC-USD";
 if(!isTerminalPair(raw))return NextResponse.json({error:"Unsupported reference market"},{status:400});
 const requestedGranularity=Number(url.searchParams.get("granularity")??900);
 const granularity=[60,300,900,3600,21600,86400].includes(requestedGranularity)?requestedGranularity:900;
 const fallback=demoSnapshot(raw,granularity);
 try{
  const [candlesResult,tickerResult,statsResult,bookResult,tradesResult]=await Promise.allSettled([
   exchange(`/products/${raw}/candles?granularity=${granularity}`),
   exchange(`/products/${raw}/ticker`),
   exchange(`/products/${raw}/stats`),
   exchange(`/products/${raw}/book?level=2`),
   exchange(`/products/${raw}/trades?limit=12`)
  ]);
  // Never display a mixture of fictional candles and a real order book as a
  // live complete market. The price + candles + book must each verify.
  if(candlesResult.status!=="fulfilled"||
    tickerResult.status!=="fulfilled"||
    bookResult.status!=="fulfilled")throw Error("Incomplete public market snapshot");
  const tick=tickerResult.value as Record<string,unknown>;
  const price=validPositive(tick.price);
  const candles=parseCandleRows(candlesResult.value);
  const book=bookResult.value as Record<string,unknown>;
  const bids=parseLevels(book.bids),asks=parseLevels(book.asks);
  if(price===null||candles.length<5||!bids.length||!asks.length)
   throw Error("Insufficient exchange market data");
  if(bids[0].price>=asks[0].price)throw Error("Crossed public order book");
  const stats=statsResult.status==="fulfilled"?statsResult.value as Record<string,unknown>:{};
  const open24=validPositive(stats.open);
  const result:TerminalSnapshot={
   pair:raw,currency:"USD",source:"COINBASE_PUBLIC",observedAt:new Date().toISOString(),
   price,
   changePct:open24?((price/open24)-1)*100:null,
   changeUsd:open24?price-open24:null,
   high24:validPositive(stats.high),low24:validPositive(stats.low),volume24:validNonnegative(stats.volume),
   candles: candles as TerminalCandle[],bids,asks,
   trades:tradesResult.status==="fulfilled"&&Array.isArray(tradesResult.value)?
    (tradesResult.value as Array<Record<string,unknown>>).slice(0,12).flatMap(row=>{
     const price=validPositive(row.price),size=validPositive(row.size);
     if(price===null||size===null||typeof row.time!=="string"||
       !Number.isFinite(Date.parse(row.time)))return [];
     return [{price,size,time:row.time,side:row.side==="buy"?"BUY" as const:"SELL" as const}];
    }):[]
  };
  return NextResponse.json(result,{headers:{"Cache-Control":"public, s-maxage=12, stale-while-revalidate=15"}});
 }catch{
  return NextResponse.json(fallback,{headers:{"Cache-Control":"no-store"}});
 }
}
