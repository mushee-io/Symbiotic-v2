"use client";
import {BrowserWallet} from "@meshsdk/core";
import {selectPreprodSelfTestUtxo} from "@/lib/preprod-self-test-utxo";
import {useEffect,useState} from "react";
type Prepared={network:string;requestId:string;intentHash:string;unsignedTxCborHex:string;
 summary:{action:string;account:string;feeLovelace:string;scriptHashes:string[];
 outputs:Array<{address:string;lovelace:string}>;changeAddress:string}};
async function hashIntent(address:string){
 const preimage="symbiotic-builder-v1|preprod|WALLET_SELF_TEST|"+address+"|2000000";
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(preimage));
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
}
export function PreprodBuilderWalletTest(){
 const [wallets,setWallets]=useState<string[]>([]);
 const [selected,setSelected]=useState("");
 const [ready,setReady]=useState(false);
 const [phase,setPhase]=useState("Checking builder...");
 const [busy,setBusy]=useState(false);
 const [transaction,setTransaction]=useState("");
 const [address,setAddress]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 useEffect(()=>{
  const installed=BrowserWallet.getInstalledWallets().map(w=>w.name);
  setWallets(installed);setSelected(installed[0]??"");
  void fetch("/api/cardano/builder/status",{cache:"no-store"})
   .then(async r=>{const x=await r.json() as {ready?:boolean};setReady(r.ok&&x.ready===true);setPhase(r.ok&&x.ready?"Builder ready for Preprod self-test":"Builder is not running or has not been linked to Vercel");})
   .catch(()=>setPhase("Builder readiness unavailable"));
 },[]);
 async function send(){
  if(!ready||!selected||busy)return;
  setBusy(true);setConfirmed(false);setTransaction("");setAddress("");
  try{
   setPhase("Connecting Cardano wallet...");
   const wallet=await BrowserWallet.enable(selected);
   if(await wallet.getNetworkId()!==0)throw Error("Wallet network is not Cardano testnet");
   const change=await wallet.getChangeAddress();
   if(!/^addr_test1[a-z0-9]{35,120}$/.test(change))throw Error("Expected Preprod wallet address");
   const utxos=await wallet.getUtxos();
   if(!utxos?.length)throw Error("No spendable UTxOs found");
   // CIP-30 change addresses can differ from the funded receiving address.
   // Use an ADA-only output actually provided by the connected wallet, then
   // independently check that output on the Preprod blockchain.
   const candidate=selectPreprodSelfTestUtxo(utxos);
   if(!candidate)throw Error("No ADA-only wallet UTxO of at least 5 tADA found. Your wallet balance may be split across smaller outputs or outputs containing other tokens.");
   const account=candidate.output.address;
   setPhase("Verifying selected wallet UTxO independently on Preprod...");
   const proof=await fetch("/api/rwa/preflight",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({utxoRefs:[candidate.input.txHash+"#"+candidate.input.outputIndex]}),cache:"no-store"});
   const evidence=await proof.json() as {verified?:boolean;error?:string};
   if(!proof.ok||!evidence.verified)throw Error(evidence.error||"Cannot prove this wallet has a Preprod UTxO");
   setPhase("Preparing wallet-return transaction...");
   const intentHash=await hashIntent(account);
   const res=await fetch("/api/cardano/prepare",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({action:"WALLET_SELF_TEST",network:"preprod",account,payload:{},intentHash}),cache:"no-store"});
   const prepared=await res.json() as Prepared&{error?:string};
   if(!res.ok)throw Error(prepared.error||"Builder preparation failed");
   if(prepared.network!=="preprod"||prepared.intentHash!==intentHash||
    prepared.summary?.action!=="WALLET_SELF_TEST"||prepared.summary?.account!==account||
    prepared.summary?.changeAddress!==account||
    prepared.summary?.scriptHashes.length!==0||
    !prepared.summary.outputs?.length||
    prepared.summary.outputs.some(o=>o.address!==account)||
    BigInt(prepared.summary.feeLovelace)>1_500_000n)
    throw Error("Builder transaction summary failed wallet safety checks");
   setPhase("Please review the wallet popup: all outputs must return to your wallet. Only network fees should be spent.");
   const witnessSetCborHex=await wallet.signTx(prepared.unsignedTxCborHex,true);
   setPhase("Assembling signed Preprod transaction...");
   const assemble=await fetch("/api/cardano/assemble",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({requestId:prepared.requestId,unsignedTxCborHex:prepared.unsignedTxCborHex,witnessSetCborHex}),cache:"no-store"});
   const result=await assemble.json() as {signedTxCborHex?:string;error?:string};
   if(!assemble.ok||!result.signedTxCborHex)throw Error(result.error||"Signature assembly failed");
   setPhase("Submitting to Cardano Preprod through your wallet...");
   const hash=await wallet.submitTx(result.signedTxCborHex);
   if(!/^[a-f0-9]{64}$/i.test(hash))throw Error("Wallet returned an invalid transaction hash");
   setTransaction(hash.toLowerCase());setAddress(account);
   setPhase("Submitted. Confirm transaction on Preprod before marking this step complete.");
  }catch(error){setPhase(error instanceof Error?error.message:"Wallet transaction rejected");}
  finally{setBusy(false);}
 }
 async function verify(){
  if(!transaction||!address)return;
  setBusy(true);
  try{
   const res=await fetch("/api/cardano/builder/receipt?hash="+transaction+"&address="+encodeURIComponent(address),{cache:"no-store"});
   const body=await res.json() as {confirmed?:boolean;message?:string};
   if(!res.ok||!body.confirmed)throw Error(body.message||"Transaction has not been confirmed yet");
   setConfirmed(true);setPhase("Verified on Cardano Preprod: same-wallet return confirmed.");
  }catch(e){setPhase(e instanceof Error?e.message:"Preprod confirmation unavailable");}
  finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:16,border:"1px solid #3e5640",padding:22,background:"#101e18"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
   <strong>WALLET SELF-TEST / CARDANO PREPROD</strong>
   <span style={{fontSize:11,color:ready?"#c9ff3d":"#edb28f"}}>{ready?"BUILDER ONLINE":"NOT READY"}</span>
  </div>
  <p style={{fontSize:12,color:"#b5c5b2",lineHeight:1.8}}>This tests unsigned transaction construction, wallet signing and on-chain confirmation with 2 test ADA sent back to the same wallet. You will pay the Cardano network fee. No trading contract is involved.</p>
  <select aria-label="Select Cardano wallet" value={selected} onChange={e=>setSelected(e.target.value)}
   style={{padding:13,color:"#e8f4e2",background:"#1b2e20",border:"1px solid #42604a"}}>
   {wallets.length?wallets.map(name=><option key={name} value={name}>{name}</option>):<option value="">No installed CIP-30 wallets</option>}
  </select>
  <button type="button" disabled={!ready||!selected||busy} onClick={()=>void send()}
   style={{padding:14,border:"1px solid #84a95a",color:"#dafa9e",background:"#253922",opacity:(!ready||busy)?0.5:1,cursor:ready?"pointer":"not-allowed"}}>
   {busy?"WORKING…":"RUN 2 tADA WALLET SELF-TEST"}
  </button>
  <p aria-live="polite" style={{fontSize:12,color:confirmed?"#c9ff3d":"#e0bc9d",lineHeight:1.7}}>{phase}</p>
  {transaction?<div style={{display:"grid",gap:13}}>
   <a style={{color:"#c9ff3d",wordBreak:"break-all",fontSize:11}} href={"https://preprod.cexplorer.io/tx/"+transaction} target="_blank" rel="noreferrer">Transaction {transaction} ↗</a>
   <button type="button" disabled={busy||confirmed} onClick={()=>void verify()} style={{padding:12,background:"#243827",color:"#e9ffae",border:"1px solid #58754b"}}>
    {confirmed?"PREPROD VERIFIED":"VERIFY CONFIRMATION ON PREPROD"}
   </button>
  </div>:null}
  <p style={{fontSize:10,color:"#829b88"}}>Use a funded Preprod-only wallet. Never enter your seed phrase or private key in this application.</p>
 </div>;
}
