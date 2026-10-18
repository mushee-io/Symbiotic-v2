"use client";

import {useEffect,useState} from "react";

type Entry={
 validator:string;utxoCount:number;totalLovelace:string;
 inlineDatumOutputs:number;datumHashOutputs:number;
 nativeAssets:Array<{unit:string;quantity:string}>;
 outputs:Array<{ref:string;txHash:string;lovelace:string;hasInlineDatum:boolean}>;
};
type LedgerResponse={
 verified?:boolean;observedAt?:string;reason?:string;products?:Entry[];
};
function ada(value:string){
 try{
  const n=BigInt(value);
  return (n/1_000_000n).toLocaleString("en-GB")+"."+
   (n%1_000_000n).toString().padStart(6,"0").slice(0,3)+" tADA";
 }catch{return "—";}
}
export function PreprodLockedLedger(){
 const [state,setState]=useState<LedgerResponse>({reason:"Fetching independent Cardano Preprod evidence..."});
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const response=await fetch("/api/protocol/locked",{cache:"no-store"});
    const result=await response.json() as LedgerResponse;
    if(active)setState(response.ok&&result.verified?result:{
     verified:false,reason:result.reason??"Preprod protocol UTxOs have not been verified"
    });
   }catch{
    if(active)setState({verified:false,reason:"Preprod protocol index is unavailable"});
   }
  };
  void load();
  const id=setInterval(()=>void load(),60_000);
  return ()=>{active=false;clearInterval(id);};
 },[]);
 return <section style={{border:"1px solid #375d44",background:"#0a1a10",
   margin:"24px 0",padding:24,borderRadius:12,color:"#dcebd7"}}>
  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
   <h2 style={{fontSize:20,margin:"0 0 10px"}}>CARDANO PREPROD / LOCKED CONTRACT OUTPUTS</h2>
   <span style={{fontSize:12,color:state.verified?"#afe587":"#f2bc8f"}}>
    {state.verified?"INDEPENDENTLY VERIFIED":"EXECUTION EVIDENCE NOT YET CONNECTED"}
   </span>
  </div>
  {!state.verified?
   <p style={{marginTop:10,color:"#aebfad"}}>{state.reason}</p>:
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:15,marginTop:17}}>
    {(state.products??[]).map(p=><div key={p.validator} style={{padding:16,border:"1px solid #35503d"}}>
     <strong style={{textTransform:"uppercase",fontSize:13}}>{p.validator}</strong>
     <p style={{fontSize:24,margin:"12px 0 3px"}}>{p.utxoCount} <small style={{fontSize:12}}>UTxOs</small></p>
     <p style={{fontSize:12}}>{ada(p.totalLovelace)} locked</p>
     <p style={{fontSize:11,color:"#a7b6a3"}}>{p.nativeAssets.length} native asset types · {p.inlineDatumOutputs} inline datums</p>
     {p.outputs.slice(0,3).map(o=><a key={o.ref}
      style={{display:"block",fontSize:10,overflowWrap:"anywhere",marginTop:5,color:"#afe587"}}
      href={"https://preprod.cexplorer.io/tx/"+o.txHash} target="_blank" rel="noreferrer">
      {o.ref.slice(0,16)}…#{o.ref.split("#")[1]} ↗
     </a>)}
    </div>)}
   </div>
  }
  <p style={{color:"#91aa95",fontSize:11,marginTop:20}}>
   This is read-only chain accounting. Contract outputs do not imply valid open positions, settlement ability,
   customer ownership, TVL, profit or APY. Signed contract lifecycle evidence is separately required.
  </p>
 </section>;
}
