import {NextResponse} from "next/server";
import {BlockfrostProvider} from "@meshsdk/core";
import {assertDemoWalletAddress,buildLaceDemoPlan} from "@/lib/lace-demo-deployment";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function POST(request:Request){
 try{
  const raw=await request.text();
  if(raw.length>1000)throw Error("Oversized deployment request");
  const input=JSON.parse(raw) as {address?:unknown};
  if(typeof input.address!=="string")throw Error("Missing Lace address");
  assertDemoWalletAddress(input.address);
  const key=process.env.SYMBIOTIC_RWA_BLOCKFROST_PROJECT_ID;
  if(!key||!/^preprod[a-z0-9]{10,}$/i.test(key))
   throw Error("Existing Preprod project ID not configured");
  const provider=new BlockfrostProvider(key);
  const params=await provider.fetchProtocolParameters();
  const coinsPerByte=String((params as unknown as {coinsPerUTxOSize?:unknown}).coinsPerUTxOSize??"4310");
  return NextResponse.json(buildLaceDemoPlan(input.address,BigInt(coinsPerByte)),{headers});
 }catch(error){
  const message=error instanceof Error?error.message:"Lace demo plan unavailable";
  const status=/blueprint|project ID|provider|fetch|ENOENT/i.test(message)?503:400;
  return NextResponse.json({network:"preprod",error:status===503?
   "Preprod deployment blueprint or chain provider unavailable":message},{status,headers});
 }
}
