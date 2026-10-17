"use client";
import {BrowserWallet, type UTxO} from "@meshsdk/core";
import {useEffect,useMemo,useState} from "react";
import {PREPROD_LIVE} from "@/lib/preprod-live";

type Installed={name:string};
function refs(utxos:UTxO[]){
 return utxos.slice(0,3).map(u=>u.input.txHash+"#"+u.input.outputIndex);
}
export function RwaWalletPreflight(){
 const [available,setAvailable]=useState<Installed[]>([]);
 const [selected,setSelected]=useState("");
 const [state,setState]=useState<"idle"|"checking"|"verified"|"blocked">("idle");
 const [reason,setReason]=useState("");
 const [address,setAddress]=useState("");
 const [susd,setSusd]=useState("");
 useEffect(()=>{
  const entries=BrowserWallet.getInstalledWallets().map(({name})=>({name}));
  setAvailable(entries);if(entries[0])setSelected(entries[0].name);
 },[]);
 const details=useMemo(()=>address?address.slice(0,13)+"…"+address.slice(-8):"NOT CONNECTED",[address]);
 async function inspect(){
  if(!selected)return;
  setState("checking");setReason("");setAddress("");setSusd("");
  try{
   const wallet=await BrowserWallet.enable(selected);
   if(await wallet.getNetworkId()!==0)throw Error("Switch to a Cardano testnet wallet (Preprod).");
   const addr=await wallet.getChangeAddress();
   if(!/^addr_test1[a-z0-9]{30,}$/.test(addr))throw Error("Expected a Cardano testnet payment address");
   const utxos=await wallet.getUtxos();
   if(!utxos?.length)throw Error("Wallet has no unspent testnet outputs");
   // Network ID 0 includes Preview; independently prove the UTxO is on Preprod.
   const proof=await fetch("/api/rwa/preflight",{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json"},body:JSON.stringify({utxoRefs:refs(utxos)})});
   const body=await proof.json() as {verified?:boolean;error?:string};
   if(!proof.ok||!body.verified)throw Error(body.error||"Wallet Preprod network could not be independently verified");
   const units=utxos.reduce((total,utxo)=>total+
    BigInt(utxo.output.amount.find(a=>a.unit===PREPROD_LIVE.sUsd.unit)?.quantity||"0"),0n);
   setAddress(addr);setSusd((units/1_000_000n).toString()+"."+(units%1_000_000n).toString().padStart(6,"0"));
   setState("verified");
  }catch(e){setState("blocked");setReason(e instanceof Error?e.message:"Wallet check failed");}
 }
 return <section aria-label="Cardano Preprod wallet readiness" style={{border:"1px solid #35543f",padding:14,marginTop:20,display:"grid",gap:11}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
   <strong style={{fontSize:11,letterSpacing:".08em"}}>WALLET PREFLIGHT</strong>
   <small style={{fontSize:9,color:state==="verified"?"#c9ff3d":"#fbb9a1"}}>{state==="verified"?"PREPROD VERIFIED":state==="checking"?"VERIFYING…":"NOT VERIFIED"}</small>
  </div>
  {available.length?
   <select aria-label="Select installed Cardano wallet" value={selected} onChange={e=>setSelected(e.target.value)}
    style={{padding:10,color:"#edf1e6",background:"#17281e",border:"1px solid #3d5945",width:"100%"}}>
    {available.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}
   </select>:<p style={{fontSize:11,color:"#e2b39f",lineHeight:1.6}}>No CIP-30 browser wallet detected. Install Lace or another Cardano-compatible wallet.</p>}
  <button type="button" disabled={!selected||state==="checking"} onClick={()=>void inspect()}
   style={{padding:12,border:"1px solid #94c958",background:"#253b24",color:"#d8ffad",fontSize:11,cursor:"pointer"}}>
   {state==="checking"?"CHECKING REAL PREPROD UTxOs…":"CONNECT & VERIFY PREPROD WALLET"}
  </button>
  {address?<p style={{fontSize:10,color:"#a3c0a8"}}>{details} | {susd} test sUSD</p>:null}
  {reason?<p role="alert" style={{fontSize:10,lineHeight:1.6,color:"#fdb5a0"}}>{reason}</p>:null}
  <p style={{fontSize:10,lineHeight:1.6,color:"#99a99c"}}>Read-only verification. Preview and Preprod both have network ID 0; a live Preprod UTxO check is required. This does not sign transactions or enable stock trading.</p>
 </section>;
}
