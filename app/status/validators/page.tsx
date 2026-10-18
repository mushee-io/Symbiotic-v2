import Link from "next/link";
import type {Metadata} from "next";
import {observePreprodValidators,parsePublicPreprodManifest} from "@/lib/preprod-validator-observer";
export const metadata:Metadata={title:"Validator Proofs — Cardano Preprod | Symbiotic V2"};
export const dynamic="force-dynamic";
type Proof={name:string;scriptHash:string;txHash:string;referenceUtxo:string;blockHeight:number};
type Result={referenceValidatorsVerified?:boolean;reason?:string;validators?:Proof[];validatorCount?:number};
export default async function ValidatorsPage(){
 // Server-side only. Never expose Blockfrost credentials in HTML or client JS.
 const raw=process.env.SYMBIOTIC_PREPROD_VALIDATOR_MANIFEST_JSON;
 let data:Result={referenceValidatorsVerified:false,
  reason:"Public five-validator deployment manifest has not yet been connected."};
 if(raw){
  try{
   if(raw.length>50000)throw Error("Oversized manifest");
   const parsed=parsePublicPreprodManifest(JSON.parse(raw) as unknown);
   data=await observePreprodValidators(parsed,
    process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"");
  }catch{
   data={referenceValidatorsVerified:false,
    reason:"Validator manifest or independent Cardano Preprod receipts are incomplete."};
  }
 }
 return <main style={{minHeight:"100vh",background:"#07150e",color:"#e6f5dd",padding:"50px max(22px,8vw)",fontFamily:"system-ui"}}>
  <nav style={{display:"flex",gap:24,marginBottom:60,fontSize:12}}><Link href="/">SYMBIOTIC V2</Link><Link href="/status/builder">WALLET BUILDER</Link><Link href="/status/wiring">17 MODULES</Link></nav>
  <p style={{color:"#afe178",letterSpacing:2,fontSize:12}}>CARDANO PREPROD / ON-CHAIN EVIDENCE</p>
  <h1 style={{fontSize:"clamp(34px,6vw,76px)",letterSpacing:"-.05em",margin:"15px 0"}}>VALIDATOR PROOFS</h1>
  <p>Five Plutus V3 reference scripts must be confirmed on Cardano Preprod, match the exact expected hashes, and remain unspent. A deployed website is not proof.</p>
  <div style={{padding:24,border:"1px solid #45644b",margin:"30px 0"}}>
   <b style={{color:data.referenceValidatorsVerified?"#b8ea77":"#fac18d"}}>{data.referenceValidatorsVerified?"5 / 5 VERIFIED ON-CHAIN":"DEPLOYMENT NOT YET VERIFIED"}</b>
   {!data.referenceValidatorsVerified?<p>{data.reason??"Missing deployment evidence"}</p>:null}
  </div>
  {(data.validators??[]).map(v=><section key={v.name} style={{padding:"20px 0",borderBottom:"1px solid #415845"}}>
   <h2 style={{textTransform:"uppercase",fontSize:20}}>{v.name}</h2>
   <p>BLOCK {v.blockHeight} · UNSPENT REFERENCE SCRIPT</p>
   <p style={{overflowWrap:"anywhere",fontSize:12}}>SCRIPT: {v.scriptHash}</p>
   <a href={"https://preprod.cexplorer.io/tx/"+v.txHash} target="_blank" rel="noreferrer">View Cardano Preprod receipt ↗</a>
  </section>)}
  <p style={{marginTop:35,color:"#a1b5a5"}}>Even five verified scripts do not enable Perps, Options, Notional or RWA trading until their separate funded lifecycles and exit protections pass.</p>
 </main>;
}
