/**
 * Lace-only Cardano Preprod demonstration deployment.
 * Single-wallet authorities are for SHOWCASE TESTNET only.
 * No wallet private keys or server-side signing are used.
 */
import "server-only";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {applyParamsToScript,deserializeAddress,resolveScriptHash,serializePlutusScript} from "@meshsdk/core";

export const PINNED_DEMO_BLUEPRINT="bdb8eea4d9159c9026a66479f6389d5cad4fddf55f32957222855652b05e2855";
export const DEMO_ASSET_POLICY="558015db095bf61d0fd364b484ebddedf16f8d193a884a1c7b9e62f6";
export const DEMO_ASSET_NAME="73555344";
export const DEMO_VALIDATOR_NAMES=["collateral","perpetual","options","notional","registry"] as const;
export type DemoValidatorName=typeof DEMO_VALIDATOR_NAMES[number];
const TITLES:Record<DemoValidatorName,string>={
 collateral:"collateral.collateral.spend",perpetual:"perpetual.perpetual.spend",
 options:"options.options.spend",notional:"notional.notional.spend",registry:"registry.registry.spend"
};
const PREPROD=/^addr_test1[a-z0-9]{35,120}$/;
const HASH56=/^[0-9a-f]{56}$/i;
const MAX_SIZE=1000000;
type Blueprint={preamble?:{plutusVersion?:string;compiler?:{version?:string}};
 validators?:Array<{title:string;compiledCode:string;parameters?:unknown[]}>};
export function validateDemoBlueprint(raw:string):Blueprint {
 if(typeof raw!=="string"||raw.length<100||raw.length>MAX_SIZE)throw Error("Invalid pinned Preprod blueprint length");
 const digest=createHash("sha256").update(raw).digest("hex");
 if(digest!==PINNED_DEMO_BLUEPRINT)throw Error("Pinned Preprod blueprint digest mismatch");
 const obj=JSON.parse(raw) as Blueprint;
 if(obj.preamble?.plutusVersion?.toLowerCase()!=="v3"||
    !obj.preamble?.compiler?.version?.startsWith("v1.1.22")||
    !Array.isArray(obj.validators))
  throw Error("Expected pinned Aiken Plutus V3 blueprint");
 for(const name of DEMO_VALIDATOR_NAMES){
  const matches=obj.validators.filter(x=>x.title===TITLES[name]);
  if(matches.length!==1||!/^[a-f0-9]+$/i.test(matches[0].compiledCode)||
     matches[0].compiledCode.length<100)
   throw Error("Missing or ambiguous compiled core validator "+name);
 }
 return obj;
}
export function readDemoBlueprint(){
 const raw=readFileSync(join(process.cwd(),"public","blueprints","preprod-core-v015.json"),"utf8");
 return validateDemoBlueprint(raw);
}
export function assertDemoWalletAddress(address:string){
 if(typeof address!=="string"||!PREPROD.test(address))throw Error("Lace must be connected to Cardano Preprod");
 const pkh=deserializeAddress(address).pubKeyHash;
 if(!pkh||!HASH56.test(pkh))throw Error("Lace wallet must have a payment signing key");
 return pkh;
}
export function buildLaceDemoPlan(address:string,coinsPerUtxoByte:number|bigint){
 const pkh=assertDemoWalletAddress(address);
 const rate=BigInt(coinsPerUtxoByte);
 if(rate<1000n||rate>30000n)throw Error("Unexpected Preprod UTxO protocol reserve");
 const blueprint=readDemoBlueprint();
 const specs:Array<[DemoValidatorName,Array<string|number>] >=[
  ["collateral",[DEMO_ASSET_POLICY,DEMO_ASSET_NAME]],
  ["perpetual",[pkh,pkh,500,DEMO_ASSET_POLICY,DEMO_ASSET_NAME]],
  ["options",[pkh,DEMO_ASSET_POLICY,DEMO_ASSET_NAME]],
  ["notional",[pkh]],["registry",[pkh,pkh]]
 ];
 const validators=specs.map(([name,params])=>{
  const b=blueprint.validators!.find(v=>v.title===TITLES[name])!;
  if((b.parameters?.length??0)!==params.length)throw Error("Invalid "+name+" parameter count");
  const scriptCbor=applyParamsToScript(b.compiledCode,params);
  const scriptHash=resolveScriptHash(scriptCbor,"V3");
  const scriptAddress=serializePlutusScript({code:scriptCbor,version:"V3"},undefined,0).address;
  if(!HASH56.test(scriptHash)||!PREPROD.test(scriptAddress))throw Error("Applied validator outside Cardano Preprod");
  const scriptBytes=Math.ceil(scriptCbor.length/2);
  const estimate=(BigInt(scriptBytes+320)*rate*125n)/100n;
  const reserve=estimate>5_000_000n?estimate:5_000_000n;
  return {name,title:TITLES[name],scriptCbor,scriptHash,scriptAddress,scriptBytes,
   referenceReserveLovelace:reserve.toString()};
 });
 const distinct=new Set(validators.map(v=>v.scriptHash));
 if(distinct.size!==5)throw Error("Duplicate applied validators");
 return {
  network:"preprod" as const,networkMagic:1 as const,blueprintSha256:PINNED_DEMO_BLUEPRINT,
  mode:"LACE_SINGLE_OPERATOR_PREPROD_DEMO" as const,
  walletAddress:address,authorityKeyHash:pkh,
  operators:"Governor / Guardian / Oracle / Keeper / Settlement / Solver are one Lace key (DEMO ONLY)",
  asset:{symbol:"sUSD",unit:DEMO_ASSET_POLICY+DEMO_ASSET_NAME,decimals:6},
  validators,
  totalReferenceReserveLovelace:validators.reduce((acc,v)=>acc+BigInt(v.referenceReserveLovelace),0n).toString(),
  transactionFeeBufferLovelace:"5000000",
  note:"Only reference scripts are deployed by this flow. This does not seed sUSD or activate the funded derivative/loan lifecycles."
 };
}
