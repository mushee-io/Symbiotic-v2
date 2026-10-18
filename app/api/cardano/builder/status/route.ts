import {NextResponse} from "next/server";
import {validatedBuilderReadiness,type BuilderReady} from "@/lib/preprod-builder-health";
import {cloudflareBuilderAccess} from "@/lib/cloudflare-builder-access";
import {assertPreprodBuilderRequest} from "@/lib/preprod-builder-guard";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const endpoint=process.env.SYMBIOTIC_TX_BUILDER_ENDPOINT;
 const token=process.env.SYMBIOTIC_TX_BUILDER_TOKEN;
 const headers={"Cache-Control":"no-store"};
 if(!endpoint||!token||process.env.SYMBIOTIC_WALLET_SELF_TEST_ENABLED!=="true")return NextResponse.json({network:"preprod",ready:false,
  status:"NOT_CONFIGURED",supportedActions:["WALLET_SELF_TEST"],contractTransactionsEnabled:false},
  {status:503,headers});
 try{
  assertPreprodBuilderRequest(process.env,"preprod");
  const parsed=new URL(endpoint);
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.hash)
   throw Error("Builder endpoint must be authenticated HTTPS");
  const res=await fetch(parsed.href.replace(/\/$/,"")+"/ready",{
   headers:{Authorization:"Bearer "+token,...cloudflareBuilderAccess(process.env)},redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw Error("Builder not ready");
  const payload=await res.json() as BuilderReady;
  const proof=validatedBuilderReadiness(payload);
  return NextResponse.json({...proof,status:"READY"}, {headers});
 }catch{
  // No private token or internal provider URL exposed.
  return NextResponse.json({network:"preprod",ready:false,status:"UNAVAILABLE",
   supportedActions:["WALLET_SELF_TEST"],contractTransactionsEnabled:false},
   {status:503,headers});
 }
}
