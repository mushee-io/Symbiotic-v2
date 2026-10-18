import {NextResponse} from "next/server";
import {preprodLiveTradingReadiness} from "@/lib/preprod-live-trading-gate";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export function GET(){
 return NextResponse.json(preprodLiveTradingReadiness(),
  {status:503,headers:{"Cache-Control":"no-store"}});
}
