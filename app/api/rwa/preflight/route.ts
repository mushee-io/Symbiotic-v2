import {NextResponse} from "next/server";
import {verifyPublicPreprodUtxos} from "@/lib/rwa-public-utxo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 try{
  const json:unknown=await request.json();
  const refs=json&&typeof json==="object"&&"utxoRefs" in json?(json as {utxoRefs:unknown}).utxoRefs:null;
  if(!Array.isArray(refs)||!refs.every(x=>typeof x==="string"))
   return NextResponse.json({error:"Supply Preprod UTxO references"},{status:400});
  const result=await verifyPublicPreprodUtxos(refs);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  const message=e instanceof Error?e.message:"Unable to check public Preprod wallet UTxOs";
  const invalid=/invalid|supply|duplicate/i.test(message);
  return NextResponse.json({verified:false,error:message},
   {status:invalid?400:/No verified/.test(message)?409:503,headers:{"Cache-Control":"no-store"}});
 }
}
