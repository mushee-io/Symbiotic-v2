import {NextResponse} from "next/server";
import {BlockfrostProvider} from "@meshsdk/core";
import {assertDemoWalletAddress,buildLaceDemoPlan,DEMO_VALIDATOR_NAMES} from "@/lib/lace-demo-deployment";
import {verifyReferenceScriptReceipt} from "@/mm/src/reference-script-proof";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function POST(request:Request){
 try{
  const raw=await request.text();
  if(raw.length>1500)throw Error("Oversized proof request");
  const input=JSON.parse(raw) as {address?:unknown;name?:unknown;txHash?:unknown};
  if(typeof input.address!=="string"||typeof input.name!=="string"||
     !DEMO_VALIDATOR_NAMES.some(n=>n===input.name)||typeof input.txHash!=="string"||
     !/^[a-f0-9]{64}$/i.test(input.txHash))throw Error("Invalid Lace validator receipt");
  assertDemoWalletAddress(input.address);
  const key=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID??"";
  if(!/^preprod[a-z0-9]{10,}$/i.test(key))throw Error("Preprod project ID unavailable");
  const provider=new BlockfrostProvider(key);
  const params=await provider.fetchProtocolParameters();
  const coinsPerByte=BigInt(String((params as unknown as {coinsPerUTxOSize?:unknown}).coinsPerUTxOSize??"4310"));
  const plan=buildLaceDemoPlan(input.address,coinsPerByte);
  const validator=plan.validators.find(v=>v.name===input.name)!;
  const receipt=await verifyReferenceScriptReceipt({
   txHash:input.txHash,outputIndex:0,address:input.address,
   scriptHash:validator.scriptHash,minLovelace:validator.referenceReserveLovelace
  },key);
  // Confirm the reference output remains unspent, not merely historically confirmed.
  const utxos=await provider.fetchAddressUTxOs(input.address);
  const confirmedHash=input.txHash.toLowerCase();
  if(!utxos.some(x=>x.input.txHash.toLowerCase()===confirmedHash&&x.input.outputIndex===0))
   throw Error("Deployed reference output is already spent or missing");
  return NextResponse.json({network:"preprod",verified:true,validator:input.name,
   scriptHash:validator.scriptHash,scriptAddress:validator.scriptAddress,
   referenceUtxo:input.txHash.toLowerCase()+"#0",
   txHash:input.txHash.toLowerCase(),blockHeight:receipt.blockHeight,
   blueprintSha256:plan.blueprintSha256,
   authorityKeyHash:plan.authorityKeyHash,walletAddress:plan.walletAddress,
   demoOnly:true,tradeExecutionEnabled:false
  },{headers});
 }catch{
  return NextResponse.json({network:"preprod",verified:false,
   error:"Validator transaction not yet confirmed, mismatched, or reference UTxO spent. Nothing is marked deployed."},
   {status:409,headers});
 }
}
