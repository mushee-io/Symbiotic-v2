// Independent, read-only public Cardano Preprod evidence check.
// Does NOT build, sign or submit transactions.
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
const URL_BASE="https://preprod.koios.rest/api/v1";
const MINT="058fc48598399499694045ae9337cc5d51bb6d28d722f9a82c5a01699603d45c";
const POLICY="558015db095bf61d0fd364b484ebddedf16f8d193a884a1c7b9e62f6";
const ASSET="73555344";
const REQUIRED=["collateral","perpetual","options","notional","registry"];
async function koios(path,body){
 const reply=await fetch(URL_BASE+path,{
  method:body?"POST":"GET",headers:body?{"content-type":"application/json","Accept":"application/json"}:{Accept:"application/json"},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15_000),cache:"no-store"
 });
 if(!reply.ok)throw Error("Preprod Koios "+path+" returned "+reply.status);
 const value=await reply.json();
 if(!Array.isArray(value))throw Error("Provider returned an unexpected response");
 return value;
}
async function main(){
 const report={network:"preprod",generatedAt:new Date().toISOString(),status:"INCOMPLETE",
  checks:[],receipts:[],missing:[]};
 const tip=(await koios("/tip"))[0];
 if(!tip||!Number.isSafeInteger(tip.block_time)||Date.now()/1000-tip.block_time>600)
  throw Error("Public Preprod tip is missing or stale");
 report.checks.push({key:"preprodTip",verified:true,height:tip.block_no,at:new Date(tip.block_time*1000).toISOString()});
 const q=new URLSearchParams({_asset_policy:POLICY,_asset_name:ASSET});
 const info=(await koios("/asset_info?"+q.toString()))[0];
 if(!info||info.policy_id!==POLICY||info.asset_name!==ASSET||info.minting_tx_hash!==MINT||
  !/^[1-9]\d*$/.test(info.total_supply||""))throw Error("Pinned sUSD Preprod mint proof mismatched");
 report.checks.push({key:"sUSDTestMint",verified:true,mintTransaction:MINT,supplyBaseUnits:info.total_supply});
 const manifestArg=process.argv[2]||"mm/.secrets/preprod-validator-deployment.json";
 const manifestPath=resolve(process.cwd(),manifestArg);
 if(!existsSync(manifestPath)){
  report.missing.push("Local five-validator deployment manifest not available: "+manifestArg);
  console.log(JSON.stringify(report,null,2));process.exitCode=2;return;
 }
 const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
 if(manifest.network!=="preprod"||manifest.networkMagic!==1||manifest.status!=="complete")
  throw Error("Manifest must be a completed Cardano Preprod deployment");
 if(!Array.isArray(manifest.validators)||manifest.validators.length!==5||new Set(manifest.validators.map(v=>v.name)).size!==5)
  throw Error("Expected exactly five unique validator receipts");
 for(const name of REQUIRED){
  const entry=manifest.validators.find(v=>v.name===name);
  if(!entry||!/^addr_test1[a-z0-9]+$/.test(entry.scriptAddress)||
   !/^[0-9a-f]{56}$/i.test(entry.scriptHash)||
   !/^[0-9a-f]{64}#[0-9]+$/i.test(entry.referenceUtxo)||
   entry.referenceUtxo!==entry.txHash+"#"+entry.outputIndex)throw Error("Invalid "+name+" validator receipt");
  const records=await koios("/utxo_info",{_utxo_refs:[entry.referenceUtxo]});
  const r=records.find(v=>v.tx_hash+"#"+v.tx_index===entry.referenceUtxo);
  if(!r||r.is_spent!==false||!r.reference_script)
   throw Error("No unspent Preprod reference script at "+entry.referenceUtxo);
  const hash=r.reference_script?.hash||r.reference_script?.script_hash;
  if(hash&&hash!==entry.scriptHash)throw Error("Reference script hash mismatch for "+name);
  report.receipts.push({validator:name,scriptHash:entry.scriptHash,scriptAddress:entry.scriptAddress,ref:entry.referenceUtxo,verified:true});
 }
 report.status="CORE_VALIDATORS_OBSERVED";
 report.missing.push("Stock-pair escrow is NOT deployed or audited");
 report.missing.push("No equity oracle authorization, real matched fill, PnL settlement or refund proof");
 report.missing.push("Missing independent Preprod full lifecycle and release attestation");
 console.log(JSON.stringify(report,null,2));
 // Return nonzero until all stock-specific market proofs are separately delivered.
 process.exitCode=2;
}
main().catch(error=>{console.error("FAIL CLOSED: "+(error instanceof Error?error.message:String(error)));process.exitCode=1;});
