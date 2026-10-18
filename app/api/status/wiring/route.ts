import {NextResponse} from "next/server";
import {wiringSummary} from "@/lib/wiring-milestones";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export function GET(){
 return NextResponse.json(wiringSummary(process.env),{headers:{"Cache-Control":"no-store"}});
}
