import {NextResponse} from "next/server";
import {validatedBuilderReadiness,type BuilderReady} from "@/lib/preprod-builder-health";
import {assertPreprodBuilderRequest} from "@/lib/preprod-builder-guard";
import {cloudflareBuilderAccess} from "@/lib/cloudflare-builder-access";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type FailureCode="NOT_CONFIGURED"|"INVALID_ENDPOINT"|"INVALID_NETWORK"|
 "AUTH_REJECTED"|"UPSTREAM_ERROR"|"PROOF_REJECTED"|"NETWORK_UNREACHABLE";
const headers={"Cache-Control":"no-store"};
function fail(reasonCode:FailureCode, upstreamHttpStatus?:number){
 return NextResponse.json({network:"preprod",ready:false,status:"UNAVAILABLE",reasonCode,
  ...(upstreamHttpStatus ? {upstreamHttpStatus} : {}),
  supportedActions:["WALLET_SELF_TEST"],contractTransactionsEnabled:false},
  {status:503,headers});
}
export async function GET(){
 const endpoint=process.env.SYMBIOTIC_TX_BUILDER_ENDPOINT;
 const token=process.env.SYMBIOTIC_TX_BUILDER_TOKEN;
 if(!endpoint||!token||process.env.SYMBIOTIC_WALLET_SELF_TEST_ENABLED!=="true")
  return fail("NOT_CONFIGURED");

 try{assertPreprodBuilderRequest(process.env,"preprod");}
 catch{return fail("INVALID_NETWORK");}

 let url:URL;
 try{
  url=new URL(endpoint);
  if(url.protocol!=="https:"||url.username||url.password||url.hash||url.search)
   return fail("INVALID_ENDPOINT");
 }catch{return fail("INVALID_ENDPOINT");}

 let res:Response;
 try{
  res=await fetch(url.href.replace(/\/$/,"")+"/ready",{
   headers:{Authorization:"Bearer "+token,...cloudflareBuilderAccess(process.env)},
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(9000)
  });
 }catch{return fail("NETWORK_UNREACHABLE");}

 if(res.status===401||res.status===403)return fail("AUTH_REJECTED",res.status);
 if(!res.ok)return fail("UPSTREAM_ERROR",res.status);
 try{
  const payload=await res.json() as BuilderReady;
  const proof=validatedBuilderReadiness(payload);
  return NextResponse.json({...proof,status:"READY"}, {headers});
 }catch{return fail("PROOF_REJECTED");}
}
