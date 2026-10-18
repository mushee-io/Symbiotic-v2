"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
type Entry={
 txHash:string;blockHeight:number;timestamp:string;kind:string;
 incomingLovelace:string;outgoingLovelace:string;createdScriptOutputs:number;
 consumedScriptInputs:number;explorer:string
};
type View={verified?:boolean;events?:Entry[];reason?:string;observedAt?:string};
export function PreprodProtocolActivity(){
 const [value,setValue]=useState<View>({reason:"Loading contract activity from Preprod..."});
 useEffect(()=>{
  let mounted=true;
  const refresh=async()=>{
   try{
    const response=await fetch("/api/protocol/activity?validator=perpetual&limit=5",{cache:"no-store"});
    const body=await response.json() as View;
    if(mounted)setValue(response.ok&&body.verified?body:{
     verified:false,events:[],reason:body.reason??"Contract activity proof unavailable"
    });
   }catch{
    if(mounted)setValue({verified:false,reason:"Cardano Preprod activity service unavailable"});
   }
  };
  void refresh();
  const interval=setInterval(()=>void refresh(),90_000);
  return ()=>{mounted=false;clearInterval(interval);};
 },[]);
 return <section style={{margin:"25px 4%",padding:23,background:"#0b1910",border:"1px solid #334c38"}}>
  <div style={{display:"flex",gap:15,justifyContent:"space-between",flexWrap:"wrap"}}>
   <strong style={{color:"#c9ff3d",fontSize:13}}>VERIFIED BTC PERPETUAL CONTRACT ACTIVITY</strong>
   <span style={{color:value.verified?"#a8ee86":"#f3ca90",fontSize:11}}>
    {value.verified?"CARDANO PREPROD / VERIFIED":"RECEIPTS REQUIRED"}
   </span>
  </div>
  {!value.verified?<p style={{color:"#b4c3b2",fontSize:12}}>{value.reason}</p>:
    (value.events??[]).length===0?
    <p style={{color:"#b4c3b2",fontSize:12}}>No confirmed transactions observed in this validator's most recent index window.</p>:
    <div style={{marginTop:19}}>
     {(value.events??[]).map(event=><div key={event.txHash}
      style={{borderTop:"1px solid #304936",padding:"13px 0",display:"flex",gap:20,justifyContent:"space-between",flexWrap:"wrap"}}>
       <div>
        <b style={{fontSize:11}}>{event.kind.replaceAll("_"," ")}</b>
        <p style={{fontSize:10,color:"#93ab97"}}>BLOCK {event.blockHeight.toLocaleString()} · {new Date(event.timestamp).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</p>
        <p style={{fontSize:10,color:"#93ab97"}}>Script inputs: {event.consumedScriptInputs} · outputs: {event.createdScriptOutputs}</p>
       </div>
       <a href={event.explorer} target="_blank" rel="noreferrer" style={{fontSize:10,color:"#c9ff3d",overflowWrap:"anywhere"}}>
        {event.txHash.slice(0,16)}… ↗
       </a>
      </div>)}
    </div>
  }
  <p style={{color:"#839d88",fontSize:11,marginTop:12}}>
   This is raw confirmed script activity, not trading volume, PnL, fills or open positions.
   <Link href="/status/validators" style={{marginLeft:8,color:"#c9ff3d"}}>View validator proofs ↗</Link>
  </p>
 </section>;
}
