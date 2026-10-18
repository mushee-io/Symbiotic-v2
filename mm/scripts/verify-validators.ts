import "dotenv/config";
import {BlockfrostProvider} from "@meshsdk/core";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {verifyReferenceScriptReceipt} from "../src/reference-script-proof.js";

const file=resolve(process.cwd(),".secrets","preprod-validator-deployment.json");
const projectId=process.env.BLOCKFROST_PROJECT_ID?.trim()??"";
const manifest=JSON.parse(readFileSync(file,"utf8")) as {
 status:string;network:string;networkMagic:number;mmAddress:string;
 validators:Array<{name:string;scriptHash:string;txHash:string;outputIndex:number;referenceUtxo:string;referenceReserveLovelace:string}>;
};
const names=["collateral","perpetual","options","notional","registry"];
if(manifest.status!=="complete"||manifest.network!=="preprod"||
   manifest.networkMagic!==1||manifest.validators.length!==5||
   new Set(manifest.validators.map(v=>v.name)).size!==5||
   names.some(n=>!manifest.validators.some(v=>v.name===n)))
 throw Error("Five-validator Preprod deployment evidence is absent or incomplete");
const refs=new Set<string>();
const proofs=[];
const provider=new BlockfrostProvider(projectId);
const live=await provider.fetchAddressUTxOs(manifest.mmAddress);
const unspent=new Set(live.map(x=>x.input.txHash+"#"+x.input.outputIndex));
for(const r of manifest.validators){
 if(!unspent.has(r.referenceUtxo))
  throw Error("Recorded reference-script UTxO is not unspent at the expected address");
 if(r.referenceUtxo!==r.txHash+"#"+r.outputIndex||refs.has(r.referenceUtxo))
  throw Error("Duplicate or internally inconsistent reference-script UTxO");
 refs.add(r.referenceUtxo);
 const proof=await verifyReferenceScriptReceipt({
  txHash:r.txHash,outputIndex:r.outputIndex,address:manifest.mmAddress,
  scriptHash:r.scriptHash,minLovelace:r.referenceReserveLovelace
 },projectId);
 proofs.push({name:r.name,...proof});
}
console.log(JSON.stringify({status:"REFERENCE_SCRIPTS_VERIFIED",network:"preprod",
 validators:proofs.length,proofs},null,2));
