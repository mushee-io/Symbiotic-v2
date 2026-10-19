"use client";
import {useEffect,useState} from "react";

type Position={
 kind:"perpetual"|"options";reference:string;txHash:string;market:string;
 sideOrKind:string;settlement:string;lockedStableUnits:string;
 notionalOrContracts:string;entryOrStrike:string;expiryMs:string|null
};
type Observation={
 verified?:boolean;positions?:Position[];positionCount?:number;
 observedAt?:string;reason?:string;code?:string
};
function fixed6(raw:string){
 try{
  const n=BigInt(raw);
  const dec=(n%1000000n).toString().padStart(6,"0").replace(/0+$/,"");
  return (n/1000000n).toLocaleString("en-GB")+(dec?"."+dec:"");
 }catch{return "—";}
}
export function PreprodPositions({address,refreshCounter}:{address:string;refreshCounter:number}){
 const [state,setState]=useState<Observation|null>(null);
 useEffect(()=>{
  if(!address){setState(null);return;}
  let active=true;
  setState({reason:"Checking deployed contracts and owner positions on Cardano Preprod..."});
  void fetch("/api/portfolio/positions?address="+encodeURIComponent(address),{cache:"no-store"})
   .then(async response=>{
    const result=await response.json() as Observation;
    if(active)setState(response.ok&&result.verified?result:{
     verified:false,reason:result.reason??"Position evidence is not yet available"
    });
   }).catch(()=>{if(active)setState({verified:false,reason:"Preprod position observer is unavailable"});});
  return ()=>{active=false;};
 },[address,refreshCounter]);
 return <section aria-label="Verified on-chain protocol positions" style={{
  margin:"20px 0 32px",padding:22,border:"1px solid #385d43",
  background:"#0b1c13",color:"#e0f4dc",borderRadius:10
 }}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
   <h2 style={{fontSize:20,margin:0}}>YOUR ON-CHAIN DERIVATIVE POSITIONS</h2>
   <strong style={{color:state?.verified?"#b7ee8c":"#f4cc96",fontSize:11}}>
    {state?.verified?"OWNER + COLLATERAL VERIFIED":"PREPROD EVIDENCE REQUIRED"}
   </strong>
  </div>
  {!address?<p style={{fontSize:13,marginTop:15}}>Connect Lace or inspect a public Preprod payment address above to identify confirmed on-chain positions.</p>:
   !state?.verified?<p style={{fontSize:13,marginTop:15}} role="status">{state?.reason??"Loading position evidence..."}</p>:
   <div style={{marginTop:14}}>
    <p style={{fontSize:12,color:"#b4cdb6"}}>
     {state.positionCount} owner-matched unspent position{state.positionCount===1?"":"s"} across independently verified perpetual and options scripts.
    </p>
    {(state.positions??[]).length===0?
     <p style={{fontSize:13}}>No confirmed, collateral-backed positions belonging to this wallet are currently indexed at these scripts.</p>:
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
      {(state.positions??[]).map(position=><article key={position.reference} style={{
       padding:16,border:"1px solid #3b6443",background:"#102319",minWidth:0
      }}>
       <strong style={{display:"block",fontSize:14}}>{position.market} / {position.kind.toUpperCase()}</strong>
       <p style={{fontSize:12,color:"#b7ef8e"}}>{position.sideOrKind} · {position.settlement}</p>
       <p style={{fontSize:18,margin:"12px 0"}}>{fixed6(position.lockedStableUnits)} <small style={{fontSize:11}}>test sUSD locked</small></p>
       <p style={{fontSize:11}}>Contract {position.kind==="perpetual"?"notional":"contracts"}: {position.kind==="perpetual"?fixed6(position.notionalOrContracts):position.notionalOrContracts}</p>
       <p style={{fontSize:11}}>Entry / strike (micro-units): {position.entryOrStrike}</p>
       {position.expiryMs?<p style={{fontSize:11}}>Expiry: {new Date(Number(position.expiryMs)).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</p>:null}
       <a href={"https://preprod.cexplorer.io/tx/"+position.txHash}
        target="_blank" rel="noreferrer" style={{fontSize:11,color:"#b7ef8e",overflowWrap:"anywhere"}}>
        VIEW CONFIRMED OUTPUT {position.reference.slice(0,16)}… ↗
       </a>
      </article>)}
     </div>}
    <p style={{marginTop:15,fontSize:11,color:"#8eaf94"}}>
     {state.observedAt?"Observed "+new Date(state.observedAt).toLocaleString("en-GB",{timeZone:"UTC"})+" UTC. ":""}
     Positions are read directly from confirmed unspent outputs. PnL, execution permissions, successful withdrawals and market prices are not inferred.
    </p>
   </div>}
 </section>;
}
