/**
 * Snapshot-only protocol metrics derived from actual UTxOs at independently
 * verified Cardano Preprod validators. Not historic trade volume or PnL.
 */
import type {ObservedPosition} from "./preprod-position-index";
const UINT=/^(0|[1-9][0-9]*)$/;
export function summariseVerifiedPositions(positions:ObservedPosition[]){
 if(!Array.isArray(positions)||positions.length>198)throw Error("Invalid bounded position index");
 const seen=new Set<string>();
 let locked=0n,perpetualNotional=0n;
 let activePerps=0,openOptions=0,settledOptions=0;
 const markets=new Map<string,{positions:number;lockedStable:bigint}>();
 for(const position of positions){
  if(!position||!["perpetual","options"].includes(position.kind)||
    !/^[0-9a-f]{64}#[0-9]+$/i.test(position.reference)||
    seen.has(position.reference)||!UINT.test(position.lockedStableUnits)||
    !UINT.test(position.notionalOrContracts)||BigInt(position.notionalOrContracts)===0n||
    !/^[A-Z0-9_/-]{3,30}$/.test(position.market))
   throw Error("Malformed or duplicated protocol position");
  seen.add(position.reference);
  const amount=BigInt(position.lockedStableUnits);
  locked+=amount;
  const row=markets.get(position.market)??{positions:0,lockedStable:0n};
  row.positions++;row.lockedStable+=amount;
  markets.set(position.market,row);
  if(position.kind==="perpetual"){
   if(position.settlement!=="OPEN"||!["LONG","SHORT"].includes(position.sideOrKind))
    throw Error("Unexpected perpetual settlement state");
   activePerps++;
   perpetualNotional+=BigInt(position.notionalOrContracts);
  }else if(position.settlement==="OPEN")openOptions++;
   else if(position.settlement==="SETTLED")settledOptions++;
   else throw Error("Unexpected option settlement state");
 }
 return {
  positionsObserved:positions.length,activePerpetualPositions:activePerps,
  openOptionPositions:openOptions,settledOptionPositions:settledOptions,
  lockedTestStableBaseUnits:locked.toString(),
  perpetualOpenNotionalBaseUnits:perpetualNotional.toString(),
  distinctMarkets:markets.size,
  markets:[...markets].sort(([a],[b])=>a.localeCompare(b)).map(([market,row])=>({
   market,openOrPendingPositions:row.positions,lockedTestStableBaseUnits:row.lockedStable.toString()
  })),
  classification:"Confirmed unspent validator UTxOs only. Open interest is a sum of indexed perpetual position notional; neither trading volume nor mark-to-market PnL can be inferred."
 };
}
