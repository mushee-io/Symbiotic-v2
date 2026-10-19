"use client";
import {useEffect,useState} from "react";
type Market={market:string;openOrPendingPositions:number;lockedTestStableBaseUnits:string};
type Snapshot={
 verified?:boolean;reason?:string;observedAt?:string;
 positionsObserved?:number;activePerpetualPositions?:number;
 openOptionPositions?:number;settledOptionPositions?:number;
 lockedTestStableBaseUnits?:string;perpetualOpenNotionalBaseUnits?:string;
 markets?:Market[];classification?:string
};
function stable(raw:string|undefined){
 if(typeof raw!=="string")return "—";
 try{
  const n=BigInt(raw),f=(n%1000000n).toString().padStart(6,"0").slice(0,2);
  return (n/1000000n).toLocaleString("en-GB")+"."+f;
 }catch{return "—";}
}
export function PreprodProtocolMetrics(){
 const [state,setState]=useState<Snapshot>({reason:"Reading Cardano Preprod contract state..."});
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch("/api/protocol/positions",{cache:"no-store"});
    const body=await response.json() as Snapshot;
    if(active)setState(response.ok&&body.verified?body:{
     verified:false,reason:body.reason??"Verified five-validator position evidence missing."
    });
   }catch{if(active)setState({verified:false,reason:"Protocol metrics observer unavailable."});}
  };
  void load();
  const timer=setInterval(()=>void load(),90_000);
  return ()=>{active=false;clearInterval(timer);};
 },[]);
 const metrics=[
  ["OPEN PERPETUAL POSITIONS",state.activePerpetualPositions?.toLocaleString("en-GB")??"—"],
  ["PERP OPEN NOTIONAL",stable(state.perpetualOpenNotionalBaseUnits)+" test sUSD"],
  ["OPEN OPTIONS",state.openOptionPositions?.toLocaleString("en-GB")??"—"],
  ["LOCKED POSITION COLLATERAL",stable(state.lockedTestStableBaseUnits)+" test sUSD"]
 ];
 return <section style={{margin:"22px 0",padding:24,border:"1px solid #355a40",
  background:"#0b1c13",borderRadius:10,color:"#e2f0db"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap"}}>
   <h2 style={{fontSize:19,margin:0}}>SYMBIOTIC / VERIFIED CONTRACT METRICS</h2>
   <strong style={{fontSize:11,color:state.verified?"#b5ee8b":"#f3c38e"}}>
    {state.verified?"CHAIN VERIFIED · PREPROD":"CONTRACT RECEIPTS REQUIRED"}
   </strong>
  </div>
  {!state.verified?<p style={{fontSize:13,marginTop:14,color:"#b7c7ad"}}>{state.reason}</p>:
   <>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12,marginTop:18}}>
     {metrics.map(([label,value])=><div key={label} style={{padding:16,border:"1px solid #35563c"}}>
      <span style={{fontSize:11,color:"#a5bca4"}}>{label}</span>
      <strong style={{display:"block",fontSize:21,marginTop:10}}>{value}</strong>
     </div>)}
    </div>
    <p style={{fontSize:12,marginTop:16}}>Settled options still pending close: {state.settledOptionPositions??0}</p>
    {(state.markets??[]).length>0?<div style={{marginTop:15}}>
     <strong style={{fontSize:12}}>VERIFIED MARKETS</strong>
     {(state.markets??[]).map(row=><div key={row.market} style={{marginTop:8,fontSize:12,display:"flex",gap:8,justifyContent:"space-between",flexWrap:"wrap"}}>
      <span>{row.market} · {row.openOrPendingPositions} script positions</span>
      <span>{stable(row.lockedTestStableBaseUnits)} test sUSD locked</span>
     </div>)}
    </div>:null}
    <p style={{fontSize:11,marginTop:20,color:"#8fa98d"}}>
     {state.classification} No historic trade volume, platform revenue or trader PnL is inferred.
    </p>
   </>}
 </section>;
}
