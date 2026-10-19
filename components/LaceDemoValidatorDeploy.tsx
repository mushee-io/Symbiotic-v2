"use client";
import {BrowserWallet,MeshTxBuilder,type UTxO} from "@meshsdk/core";
import {useEffect,useState} from "react";

type Validator={
 name:"collateral"|"perpetual"|"options"|"notional"|"registry";
 title:string;scriptHash:string;scriptAddress:string;scriptCbor:string;
 scriptBytes:number;referenceReserveLovelace:string
};
type DeploymentPlan={
 network:"preprod";walletAddress:string;authorityKeyHash:string;blueprintSha256:string;
 validators:Validator[];totalReferenceReserveLovelace:string;transactionFeeBufferLovelace:string;
 mode:"LACE_SINGLE_OPERATOR_PREPROD_DEMO";note:string
};
type Receipt={
 network:"preprod";verified:true;validator:string;scriptHash:string;scriptAddress:string;
 referenceUtxo:string;txHash:string;blockHeight:number;blueprintSha256:string;
 authorityKeyHash:string;walletAddress:string;demoOnly:true;tradeExecutionEnabled:false
};
const ORDER=["collateral","perpetual","options","notional","registry"];
function ada(quantity:string){return (Number(BigInt(quantity))/1_000_000).toLocaleString("en-GB",{maximumFractionDigits:3})+" tADA";}
function storedKey(address:string,blueprint:string){return "symbiotic-v2-lace-validator-demo:"+address+":"+blueprint;}
function hasScriptOutput(txUtxo:UTxO,protectedRefs:Set<string>){
 return protectedRefs.has(txUtxo.input.txHash+"#"+txUtxo.input.outputIndex);
}
export function LaceDemoValidatorDeploy(){
 const [installed,setInstalled]=useState(false);
 const [plan,setPlan]=useState<DeploymentPlan|null>(null);
 const [receipts,setReceipts]=useState<Record<string,Receipt>>({});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("Connect Lace to build your five-validator Preprod demo.");
 const [pending,setPending]=useState<{name:string;hash:string}|null>(null);
 useEffect(()=>{
  setInstalled(BrowserWallet.getInstalledWallets().some(w=>w.name.toLowerCase()==="lace"));
 },[]);
 async function connect(){
  setBusy(true);
  try{
   const wallet=await BrowserWallet.enable("lace");
   if(await wallet.getNetworkId()!==0)throw Error("Switch Lace to Cardano Preprod");
   const address=await wallet.getChangeAddress();
   if(!/^addr_test1[a-z0-9]{35,120}$/.test(address))throw Error("Cardano testnet address required");
   const utxos=await wallet.getUtxos();
   if(!utxos?.length)throw Error("This Lace account has no Preprod UTxOs");
   // CIP-30 network id 0 can also mean Preview. Require independent
   // evidence of this exact output existing on the Preprod chain.
   const check=await fetch("/api/rwa/preflight",{
    method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
    body:JSON.stringify({utxoRefs:utxos.slice(0,3).map(u=>u.input.txHash+"#"+u.input.outputIndex)})
   });
   const result=await check.json() as {verified?:boolean;error?:string};
   if(!check.ok||!result.verified)throw Error(result.error||"Wallet UTxOs not proven on Cardano Preprod");
   const response=await fetch("/api/deploy/lace/plan",{
    method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
    body:JSON.stringify({address})
   });
   const data=await response.json() as DeploymentPlan&{error?:string};
   if(!response.ok)throw Error(data.error||"Preprod validator plan unavailable");
   if(data.walletAddress!==address||data.network!=="preprod"||data.validators.length!==5)
    throw Error("Deployment plan mismatched Lace wallet");
   setPlan(data);
   let stored:Record<string,Receipt>={};
   try{
    const raw=window.localStorage.getItem(storedKey(address,data.blueprintSha256));
    if(raw)stored=JSON.parse(raw) as Record<string,Receipt>;
   }catch{/* untrusted cache ignored */}
   const verified:Record<string,Receipt>={};
   for(const v of data.validators){
    const candidate=stored[v.name];
    if(!candidate?.txHash||!candidate.verified)continue;
    const check=await fetch("/api/deploy/lace/verify",{
     method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
     body:JSON.stringify({address,name:v.name,txHash:candidate.txHash})
    });
    if(check.ok){
     const body=await check.json() as Receipt;
     if(body.verified&&body.scriptHash===v.scriptHash)verified[v.name]=body;
    }
   }
   setReceipts(verified);
   const pendingKey=storedKey(address,data.blueprintSha256)+":pending";
   const pendingRaw=window.localStorage.getItem(pendingKey);
   if(pendingRaw){
    try{
     const candidate=JSON.parse(pendingRaw) as {name?:string;hash?:string};
     if(typeof candidate.name==="string"&&data.validators.some(v=>v.name===candidate.name)&&
        typeof candidate.hash==="string"&&/^[a-f0-9]{64}$/i.test(candidate.hash)&&
        !verified[candidate.name]){
      setPending({name:candidate.name,hash:candidate.hash.toLowerCase()});
     }else window.localStorage.removeItem(pendingKey);
    }catch{window.localStorage.removeItem(pendingKey);}
   }
   setMessage("Preprod deployment plan ready. Previous receipts independently rechecked.");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not connect Lace");}
  finally{setBusy(false);}
 }
 async function verifyReceipt(name:string,hash:string,activePlan=plan){
  if(!activePlan)throw Error("No Preprod deployment plan");
  const response=await fetch("/api/deploy/lace/verify",{
   method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
   body:JSON.stringify({name,txHash:hash,address:activePlan.walletAddress})
  });
  const data=await response.json() as Receipt&{error?:string};
  if(!response.ok||!data.verified)throw Error(data.error||"Not confirmed in Cardano Preprod yet");
  const target=activePlan.validators.find(v=>v.name===name)!;
  if(data.walletAddress!==activePlan.walletAddress||data.scriptHash!==target.scriptHash||
     data.blueprintSha256!==activePlan.blueprintSha256)
   throw Error("On-chain proof mismatched expected deployment plan");
  const updated={...receipts,[name]:data};
  setReceipts(updated);
  window.localStorage.setItem(storedKey(activePlan.walletAddress,activePlan.blueprintSha256),
   JSON.stringify(updated));
  setPending(null);
  window.localStorage.removeItem(storedKey(activePlan.walletAddress,activePlan.blueprintSha256)+":pending");
  setMessage(name.toUpperCase()+" reference script confirmed on Cardano Preprod at block "+data.blockHeight+".");
 }
 async function deploy(v:Validator){
  if(!plan||busy)return;
  const next=plan.validators.find(x=>!receipts[x.name]);
  if(next?.name!==v.name)throw Error("Deploy and verify validators in order");
  setBusy(true);
  try{
   const wallet=await BrowserWallet.enable("lace");
   if(await wallet.getNetworkId()!==0)throw Error("Cardano Preprod wallet required");
   const address=await wallet.getChangeAddress();
   if(address!==plan.walletAddress)throw Error("Lace account changed. Reconnect before deploying.");
   const all=await wallet.getUtxos();
   if(!all?.length)throw Error("No available wallet UTxOs");
   const protectedRefs=new Set(Object.values(receipts).map(r=>r.referenceUtxo));
   const eligible=all.filter(u=>!hasScriptOutput(u,protectedRefs));
   const adaOnly=eligible.filter(u=>
    u.output.address===address&&u.output.amount.length===1&&u.output.amount[0].unit==="lovelace"
   );
   const needed=BigInt(v.referenceReserveLovelace)+2_000_000n;
   if(adaOnly.reduce((a,u)=>a+BigInt(u.output.amount[0].quantity),0n)<needed)
    throw Error("Not enough ADA-only testnet UTxOs: need "+ada(needed.toString())+" for this deployment and estimated fee");
   setMessage("Building "+v.name+" reference-script deployment. Review the Lace transaction carefully.");
   const unsigned=await new MeshTxBuilder()
    .txOut(address,[{unit:"lovelace",quantity:v.referenceReserveLovelace}])
    .txOutReferenceScript(v.scriptCbor,"V3")
    .changeAddress(address)
    .selectUtxosFrom(adaOnly)
    .complete();
   setMessage("Approve "+v.name.toUpperCase()+" deployment in Lace. This locks test ADA in a reference output at your own wallet address.");
   const signed=await wallet.signTx(unsigned);
   setMessage("Submitting transaction to Cardano Preprod...");
   const txHash=await wallet.submitTx(signed);
   if(!/^[a-f0-9]{64}$/i.test(txHash))throw Error("Invalid transaction hash returned by Lace");
   setPending({name:v.name,hash:txHash.toLowerCase()});
   window.localStorage.setItem(storedKey(plan.walletAddress,plan.blueprintSha256)+":pending",
    JSON.stringify({name:v.name,hash:txHash.toLowerCase()}));
   setMessage("Submitted "+v.name+". Cardano Preprod confirmation can take several seconds; click Verify Receipt.");
  }catch(e){setMessage(e instanceof Error?e.message:"Deployment unsuccessful");}
  finally{setBusy(false);}
 }
 async function verifyPending(){
  if(!pending||busy)return;
  setBusy(true);
  try{await verifyReceipt(pending.name,pending.hash);}
  catch(e){setMessage(e instanceof Error?e.message:"Receipt not confirmed yet");}
  finally{setBusy(false);}
 }
 function saveManifest(){
  if(!plan||Object.keys(receipts).length!==5)return;
  const validators=plan.validators.map(v=>({
   name:v.name,title:v.title,scriptHash:v.scriptHash,scriptAddress:v.scriptAddress,
   scriptBytes:v.scriptBytes,referenceReserveLovelace:v.referenceReserveLovelace,
   txHash:receipts[v.name].txHash,outputIndex:0,
   referenceUtxo:receipts[v.name].referenceUtxo,blockHeight:receipts[v.name].blockHeight
  }));
  const manifest={
   version:1,network:"preprod",networkMagic:1,status:"complete",
   blueprintSha256:plan.blueprintSha256,mmAddress:plan.walletAddress,
   deployerAddress:plan.walletAddress,operatorMode:plan.mode,
   authorities:Object.fromEntries(["governor","guardian","oracle","keeper","settlement","solver"]
    .map(role=>[role,plan.authorityKeyHash])),validators
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],
   {type:"application/json"}));
  const a=document.createElement("a");a.href=url;
  a.download="symbiotic-lace-preprod-validators.json";
  a.click();URL.revokeObjectURL(url);
 }
 return <section style={{border:"1px solid #46634b",padding:25,background:"#0b1e13",
   display:"grid",gap:18}}>
  <h2 style={{fontSize:24}}>DEPLOY 5 VALIDATORS WITH LACE</h2>
  <p style={{lineHeight:1.7,color:"#b5cbb4"}}>
   Five compiled Plutus V3 contracts, one Lace Preprod wallet. No mnemonic, new operator wallet,
   mainnet funds or Ubuntu terminal required. This is a single-operator <b>testnet demo</b>,
   not audited production trading.
  </p>
  <button onClick={()=>void connect()} disabled={busy||!installed} type="button"
   style={{padding:15,background:"#caed83",color:"#07180e",fontWeight:700}}>
   {busy?"WORKING…":plan?"REFRESH LACE + ON-CHAIN RECEIPTS":"CONNECT LACE & PREPARE CONTRACTS"}
  </button>
  {!installed?<p>Lace extension was not detected in this browser.</p>:null}
  {plan?<div style={{display:"grid",gap:12}}>
   <p style={{fontSize:12,overflowWrap:"anywhere"}}>SIGNER: {plan.walletAddress}</p>
   <p style={{fontSize:12}}>TOTAL REFERENCE RESERVE: {ada(plan.totalReferenceReserveLovelace)} + network fees. Each deployment requires Lace approval.</p>
   {plan.validators.map((v,i)=>{
    const proof=receipts[v.name],next=plan.validators.find(item=>!receipts[item.name]);
    return <div key={v.name} style={{border:"1px solid #31583d",padding:17,
      display:"grid",gap:8}}>
     <strong style={{textTransform:"uppercase"}}>{i+1}. {v.name} {proof?"— VERIFIED ON PREPROD":""}</strong>
     <small>Plutus V3 · {v.scriptBytes} bytes · {ada(v.referenceReserveLovelace)}</small>
     <small style={{overflowWrap:"anywhere"}}>HASH: {v.scriptHash}</small>
     <small style={{overflowWrap:"anywhere"}}>SCRIPT ADDRESS: {v.scriptAddress}</small>
     {proof?
      <a href={"https://preprod.cexplorer.io/tx/"+proof.txHash} target="_blank" rel="noreferrer"
       style={{color:"#ccff92"}}>BLOCK {proof.blockHeight} · VERIFIED RECEIPT ↗</a>:
      <button type="button" disabled={busy||pending!==null||next?.name!==v.name}
       onClick={()=>void deploy(v)}
       style={{padding:12,opacity:next?.name===v.name?1:0.45,
        border:"1px solid #6da875",background:"#1d3c29",color:"#d4edc7"}}>
       APPROVE {v.name.toUpperCase()} IN LACE
      </button>}
    </div>;
   })}
   {Object.keys(receipts).length===5?<button type="button" onClick={saveManifest}
    style={{padding:15,background:"#caed83",color:"#07180e"}}>
    EXPORT VERIFIED PUBLIC DEPLOYMENT MANIFEST
   </button>:null}
  </div>:null}
  {pending?<div style={{border:"1px solid #b7a364",padding:16}}>
   <p>Pending {pending.name} confirmation: <a href={"https://preprod.cexplorer.io/tx/"+pending.hash}
    target="_blank" rel="noreferrer">{pending.hash.slice(0,15)}… ↗</a></p>
   <button type="button" onClick={()=>void verifyPending()} disabled={busy}
    style={{padding:12,background:"#caed83",color:"#07180e"}}>VERIFY PREPROD RECEIPT</button>
  </div>:null}
  <p aria-live="polite" style={{color:"#d9e6b4",fontSize:12,lineHeight:1.8}}>{message}</p>
  <p style={{fontSize:11,color:"#a2bd9d"}}>
   Contracts here are reference-script outputs. Deploying them does not automatically activate
   Perpetuals, RWA, lending, loan liquidations or oracle settlement.
  </p>
 </section>;
}
