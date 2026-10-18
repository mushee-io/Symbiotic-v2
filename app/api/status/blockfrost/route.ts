import {NextResponse} from "next/server";
import {getPreprodJson} from "@/lib/rwa-blockfrost";
import {SMOKE_TEST_ASSET_UNIT,verifyPreprodSmokeAsset} from "@/lib/rwa-blockfrost-health";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const asset=await getPreprodJson("/assets/"+SMOKE_TEST_ASSET_UNIT);
  const check=verifyPreprodSmokeAsset(asset);
  return NextResponse.json({
   network:"preprod",provider:"blockfrost",readOnly:true,
   connected:check.verified,assetMintVerified:check.verified,
   evidence:check.verified?{
    unit:check.unit,mintTxHash:check.mintTxHash,quantityBaseUnits:check.quantityBaseUnits
   }:null,
   operationalTradingVerified:false,
   message:check.verified?"Blockfrost Preprod known-asset query succeeded. Other protocol services require separate verification.":"Preprod asset identity mismatch"
  },{status:check.verified?200:503,headers:{"Cache-Control":"no-store"}});
 }catch{
  // Keep secret headers, project tokens and provider error internals private.
  return NextResponse.json({
   network:"preprod",provider:"blockfrost",readOnly:true,
   connected:false,assetMintVerified:false,operationalTradingVerified:false,
   message:"Blockfrost Preprod test-asset lookup unsuccessful"
  },{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
