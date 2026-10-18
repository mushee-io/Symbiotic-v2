import {NextResponse} from "next/server";
import {getPreprodJson} from "@/lib/rwa-blockfrost";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const url=new URL(request.url);
 const hash=url.searchParams.get("hash")?.toLowerCase()||"";
 const address=url.searchParams.get("address")||"";
 const headers={"Cache-Control":"no-store"};
 if(!/^[a-f0-9]{64}$/.test(hash)||!/^addr_test1[a-z0-9]{35,120}$/.test(address))
  return NextResponse.json({error:"Invalid Preprod transaction reference"},{status:400,headers});
 try{
  const result=await getPreprodJson("/txs/"+hash+"/utxos");
  const outputs=Array.isArray(result.outputs)?result.outputs:[];
  const changeOutputs=outputs.filter((o):o is Record<string,unknown>=>
   typeof o==="object"&&o!==null&&!Array.isArray(o)&&o.address===address);
  const selfReturned=changeOutputs.some(o=>
   Array.isArray(o.amount)&&o.amount.some((a:unknown)=>
    typeof a==="object"&&a!==null&&
    (a as Record<string,unknown>).unit==="lovelace"&&
    typeof (a as Record<string,unknown>).quantity==="string"&&
    BigInt((a as {quantity:string}).quantity)>=2_000_000n));
  if(!selfReturned)
   return NextResponse.json({confirmed:false,network:"preprod",message:"Transaction has not proven the same-wallet self-test output"},
    {status:409,headers});
  return NextResponse.json({confirmed:true,network:"preprod",txHash:hash,
   walletReturnVerified:true,blockExplorer:"https://preprod.cexplorer.io/tx/"+hash,
   note:"Confirmed output existence on Preprod; not a proof of any trading or protocol deployment."},{headers});
 }catch{return NextResponse.json({confirmed:false,network:"preprod",message:"Preprod transaction not confirmed or provider unavailable"},
  {status:503,headers});}
}
