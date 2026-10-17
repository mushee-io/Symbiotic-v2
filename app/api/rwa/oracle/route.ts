import {NextResponse} from "next/server";
import {equityFeedConfigFromEnv,verifiedEquityRound} from "@/lib/rwa-equity-oracle";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const ticker=new URL(request.url).searchParams.get("ticker")?.toUpperCase()||"AAPL";
 if(!/^[A-Z]{1,6}$/.test(ticker))return NextResponse.json({error:"Invalid stock ticker"},{status:400});
 try{
  const feeds=equityFeedConfigFromEnv(process.env.SYMBIOTIC_EQUITY_FEEDS_JSON);
  const result=await verifiedEquityRound({ticker,feeds});
  return NextResponse.json({...result,tradeable:false,reason:"Equity price reference is not a contract-authorized settlement attestation."},
    {headers:{"Cache-Control":"no-store"}});
 }catch(error){
  return NextResponse.json({tradeable:false,error:error instanceof Error?error.message:"Equity oracle unavailable"},
    {status:503,headers:{"Cache-Control":"no-store"}});
 }
}
