import {NextResponse} from "next/server";
import {longbowScenario,twofoldScenario,type LongbowScenario,type TwofoldScenario} from "@/lib/folder-risk";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 try{
  // A read-only calculation. No signing, token, loan, deposit, or withdrawal.
  const raw=await request.text();
  if(raw.length>3500) return NextResponse.json({error:"Scenario too large"},{status:413});
  const json:unknown=JSON.parse(raw);
  if(typeof json!=="object"||json===null||Array.isArray(json))
   throw Error("Invalid scenario");
  const input=json as {product?:unknown;scenario?:unknown};
  if(!input.scenario||typeof input.scenario!=="object"||Array.isArray(input.scenario))
   throw Error("Invalid scenario parameters");
  const result=input.product==="longbow"?
   longbowScenario(input.scenario as LongbowScenario):
   input.product==="twofold"?twofoldScenario(input.scenario as TwofoldScenario):null;
  if(!result)throw Error("Unknown Folder product");
  return NextResponse.json({...result,transactionsEnabled:false,note:"Illustrative arithmetic only. These are NOT approved risk limits or quotes."},
   {headers:{"Cache-Control":"no-store"}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Scenario calculation rejected",transactionsEnabled:false},
   {status:400,headers:{"Cache-Control":"no-store"}});
 }
}
