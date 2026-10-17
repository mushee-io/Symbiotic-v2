// Deterministic OFFCHAIN order-matching proposal only.
// This does not custody assets, persist orders, create CIP-30 witness,
// or convert a simulated match into a Cardano execution.
import {RWA_MARKETS,marketSession} from "./rwa-market";
export type StockSide="BUY"|"SELL";
export type StockLimitOrder={
 id:string;ticker:string;side:StockSide;owner:string;
 quantityMicros:string;limitPriceMicros:string;createdAt:string;expiresAt:string;
 nonce:string;lockedCollateralUtxo:string|null;
};
export type ProposedFill={buyId:string;sellId:string;ticker:string;quantityMicros:string;priceMicros:string;
 amountMicros:string;buyOwner:string;sellOwner:string};
export function integer(v:string,label:string){
 if(!/^[1-9][0-9]{0,17}$/.test(v))throw Error(label+" must be a positive safe-sized integer string");
 return BigInt(v);
}
export function validateStockOrder(o:StockLimitOrder,at=new Date()){
 if(!RWA_MARKETS.some(m=>m.ticker===o.ticker&&m.category==="STOCK"))throw Error("Unknown stock reference");
 if(o.side!=="BUY"&&o.side!=="SELL")throw Error("Invalid order side");
 if(!/^[a-zA-Z0-9:_-]{8,64}$/.test(o.id)||!/^[a-f0-9]{32,64}$/i.test(o.nonce))throw Error("Invalid order ID or nonce");
 if(!/^addr_test1[a-z0-9]{30,}$/.test(o.owner))throw Error("Owner must be a Preprod address");
 integer(o.quantityMicros,"Quantity");integer(o.limitPriceMicros,"Limit price");
 if(o.lockedCollateralUtxo!==null&&!/^[a-f0-9]{64}#[0-9]+$/i.test(o.lockedCollateralUtxo))throw Error("Invalid locked collateral reference");
 const created=Date.parse(o.createdAt),expires=Date.parse(o.expiresAt),now=at.getTime();
 if(!Number.isFinite(created)||!Number.isFinite(expires)||created>now+2000||expires<=now||expires-created>86_400_000)throw Error("Invalid order lifetime");
 if(!marketSession(at).regularOpen)throw Error("Stock reference session closed or unverified");
 return true;
}
export function proposeStockMatches(orders:StockLimitOrder[],at=new Date()){
 if(orders.length>500)throw Error("Order list exceeds bounded matching capacity");
 const seenIds=new Set<string>(),seenNonces=new Set<string>();
 for(const o of orders){
  validateStockOrder(o,at);
  if(seenIds.has(o.id)||seenNonces.has(o.nonce))throw Error("Duplicate or replayed order ID/nonce");
  seenIds.add(o.id);seenNonces.add(o.nonce);
 }
 const byTicker=new Map<string,StockLimitOrder[]>();
 for(const o of orders)byTicker.set(o.ticker,[...(byTicker.get(o.ticker)||[]),o]);
 const fills:ProposedFill[]=[];
 for(const [ticker,book] of byTicker){
  const buys=book.filter(o=>o.side==="BUY").sort((a,b)=>{
   const x=BigInt(a.limitPriceMicros),y=BigInt(b.limitPriceMicros);
   return x>y?-1:x<y?1:a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
  });
  const sells=book.filter(o=>o.side==="SELL").sort((a,b)=>{
   const x=BigInt(a.limitPriceMicros),y=BigInt(b.limitPriceMicros);
   return x<y?-1:x>y?1:a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
  });
  const remains=new Map(book.map(o=>[o.id,BigInt(o.quantityMicros)]));
  let i=0,j=0;
  while(i<buys.length&&j<sells.length){
   const buy=buys[i],sell=sells[j];
   if(buy.owner===sell.owner){j++;continue;}
   const bp=BigInt(buy.limitPriceMicros),sp=BigInt(sell.limitPriceMicros);
   if(bp<sp)break;
   const q1=remains.get(buy.id)!,q2=remains.get(sell.id)!;
   const qty=q1<q2?q1:q2;
   // Price at resting sell's bounded limit; never crosses buyer's limit.
   // Both quantity and prices are micro units; amount remains micro USD.
   const amount=qty*sp/1_000_000n;
   if(amount<=0n)throw Error("Match notional rounds down to zero");
   fills.push({buyId:buy.id,sellId:sell.id,ticker,quantityMicros:qty.toString(),
    priceMicros:sp.toString(),amountMicros:amount.toString(),
    buyOwner:buy.owner,sellOwner:sell.owner});
   remains.set(buy.id,q1-qty);remains.set(sell.id,q2-qty);
   if(remains.get(buy.id)===0n)i++;
   if(remains.get(sell.id)===0n)j++;
  }
 }
 return {network:"preprod" as const,status:"PROPOSAL_NOT_SETTLEMENT" as const,
  fills,unfilled:Object.fromEntries([...byTicker.values()].flat().map(o=>[o.id,remainsOrZero(o,fills)])),
  note:"Orders are illustrative and not escrowed on chain. A fill proposal is NOT a transaction."};
}
function remainsOrZero(o:StockLimitOrder,fills:ProposedFill[]){
 const matched=fills.filter(f=>f.buyId===o.id||f.sellId===o.id).reduce((sum,f)=>sum+BigInt(f.quantityMicros),0n);
 return (BigInt(o.quantityMicros)-matched).toString();
}
