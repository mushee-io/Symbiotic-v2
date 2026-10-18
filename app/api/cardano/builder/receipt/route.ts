import {NextResponse} from "next/server";
import {getPreprodJson} from "@/lib/rwa-blockfrost";
import {verifyPreprodSelfReturn} from "@/lib/preprod-self-test-receipt";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const url=new URL(request.url);
 const hash=url.searchParams.get("hash")?.toLowerCase()??"";
 const address=url.searchParams.get("address")??"";
 const headers={"Cache-Control":"no-store"};
 if(!/^[a-f0-9]{64}$/.test(hash)||!/^addr_test1[a-z0-9]{35,120}$/.test(address))
  return NextResponse.json({error:"Invalid Preprod transaction reference"},{status:400,headers});
 try{
  const [utxos,transaction]=await Promise.all([
   getPreprodJson("/txs/"+hash+"/utxos"),
   getPreprodJson("/txs/"+hash)
  ]);
  return NextResponse.json(verifyPreprodSelfReturn(hash,address,utxos,transaction),{headers});
 }catch(error){
  const message=error instanceof Error?error.message:"Transaction proof unavailable";
  const provider=/provider|lookup|not found|unreachable|project ID/i.test(message);
  return NextResponse.json({network:"preprod",confirmed:false,
   message:provider?"Preprod confirmation provider is temporarily unavailable":message},
   {status:provider?503:409,headers});
 }
}
