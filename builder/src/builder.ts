import {BlockfrostProvider,MeshTxBuilder,type UTxO} from "@meshsdk/core";
import {Serialization} from "@meshsdk/core-cst";
import {SELF_TEST_LOVELACE,Sessions,validateSelfTest,type BuilderRequest} from "./policy.js";

type HexCbor=Parameters<typeof Serialization.Transaction.fromCbor>[0];
const hex=(s:unknown)=>typeof s==="string"&&s.length>0&&s.length%2===0&&s.length<=300000&&/^[0-9a-f]+$/i.test(s);
export class PreprodBuilder {
 readonly sessions=new Sessions();
 readonly provider:BlockfrostProvider;
 constructor(projectId:string,provider?:BlockfrostProvider){this.provider=provider??new BlockfrostProvider(projectId);}
 status(){return {service:"symbiotic-preprod-builder",network:"preprod",networkMagic:1,actions:["WALLET_SELF_TEST"],contractTransactionsEnabled:false,signingKeysStored:false};}
 async ready(projectId:string){
  const r=await fetch("https://cardano-preprod.blockfrost.io/api/v0/blocks/latest",{
   headers:{project_id:projectId},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error("Preprod Blockfrost unavailable");
  const tip=await r.json() as {time?:number;slot?:number};
  if(!Number.isSafeInteger(tip.time)||!Number.isSafeInteger(tip.slot)||Math.abs(Date.now()/1000-(tip.time??0))>600)
   throw Error("Preprod tip missing or stale");
  return {...this.status(),ready:true,tipTime:new Date((tip.time??0)*1000).toISOString()};
 }
 async prepare(input:BuilderRequest,now=Date.now()){
  const req=validateSelfTest(input);
  const all=await this.provider.fetchAddressUTxOs(req.account);
  const adaOnly:UTxO[]=all.filter(u=>
   u.output.address===req.account&&u.output.amount.length===1&&
   u.output.amount[0].unit==="lovelace"&&
   /^[0-9]+$/.test(u.output.amount[0].quantity)&&
   BigInt(u.output.amount[0].quantity)>=5_000_000n);
  if(!adaOnly.length)throw Error("A Preprod ADA-only wallet UTxO of 5+ tADA is required");
  const slot=await this.provider.resolveSlotNo("now");
  if(!Number.isSafeInteger(slot)||slot<=0)throw Error("Preprod slot unavailable");
  const unsignedTxCborHex=await new MeshTxBuilder({fetcher:this.provider})
   .txOut(req.account,[{unit:"lovelace",quantity:SELF_TEST_LOVELACE.toString()}])
   .invalidBefore(slot)
   .invalidHereafter(slot+100)
   .changeAddress(req.account)
   .selectUtxosFrom(adaOnly)
   .complete();
  if(!hex(unsignedTxCborHex))throw Error("Builder produced invalid transaction CBOR");
  const tx=Serialization.Transaction.fromCbor(unsignedTxCborHex as HexCbor);
  const body=tx.toCore().body;
  const outputs=body.outputs;
  if(outputs.length<1||outputs.some(o=>String(o.address)!==req.account||Boolean(o.value.assets?.size)))
   throw Error("Self-test must return every output to the SAME wallet with no token assets");
  if(!outputs.some(o=>o.value.coins>=SELF_TEST_LOVELACE))
   throw Error("Missing requested wallet-return output");
  const fee=BigInt(tx.body().fee().toString());
  if(fee<=0n||fee>1500000n)throw Error("Transaction fee outside fixed 1.5 ADA cap");
  const txBodyHash=String(tx.getId());
  if(!/^[0-9a-f]{64}$/i.test(txBodyHash))throw Error("Missing Cardano transaction body hash");
  const createdAt=new Date(now).toISOString(),expiresAtMs=now+90000;
  const requestId=this.sessions.store({unsignedTxCborHex,txBodyHash,expiresAt:expiresAtMs,consumed:false},now);
  return {
   requestId,network:"preprod",unsignedTxCborHex,createdAt,
   expiresAt:new Date(expiresAtMs).toISOString(),intentHash:req.intentHash,
   summary:{action:req.action,account:req.account,network:"preprod",feeLovelace:fee.toString(),
    scriptHashes:[],outputs:outputs.map(o=>({address:String(o.address),lovelace:o.value.coins.toString()})),
    changeAddress:req.account,txBodyHash},
   note:"Prepared ADA-only wallet self-test. No script, contract, token, or other destination is permitted."
  };
 }
 assemble(input:{requestId:string;unsignedTxCborHex:string;witnessSetCborHex:string},now=Date.now()){
  if(!input||!/^[a-f0-9-]{36}$/i.test(input.requestId)||!hex(input.unsignedTxCborHex)||!hex(input.witnessSetCborHex))
   throw Error("Invalid assembly request");
  const session=this.sessions.get(input.requestId,input.unsignedTxCborHex,now);
  const tx=Serialization.Transaction.fromCbor(input.unsignedTxCborHex as HexCbor);
  if(String(tx.getId())!==session.txBodyHash)throw Error("Transaction body changed");
  const witness=Serialization.TransactionWitnessSet.fromCbor(input.witnessSetCborHex as HexCbor);
  if(!witness.vkeys()?.values().length)throw Error("Wallet did not provide a verification-key witness");
  if(witness.bootstraps()||witness.nativeScripts()||witness.plutusV1Scripts()||
   witness.plutusV2Scripts()||witness.plutusV3Scripts()||witness.plutusData()||witness.redeemers())
   throw Error("No script or non-vkey witnesses allowed for self-test");
  tx.setWitnessSet(witness);
  if(String(tx.getId())!==session.txBodyHash)throw Error("Assembled transaction body changed");
  this.sessions.consume(input.requestId);
  return {signedTxCborHex:tx.toCbor()};
 }
}
