import {NextResponse} from "next/server";
import {stockReadiness} from "@/lib/rwa-preprod-proof";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const ticker=new URL(request.url).searchParams.get("ticker")?.toUpperCase()||"AAPL";
 if(!/^[A-Z]{1,6}$/.test(ticker))return NextResponse.json({error:"Invalid ticker"},{status:400});
 try{return NextResponse.json(await stockReadiness(ticker),{headers:{"Cache-Control":"no-store"}});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Readiness unavailable"},{status:400,headers:{"Cache-Control":"no-store"}});}
}
