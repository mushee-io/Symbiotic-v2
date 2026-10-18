import {NextResponse} from "next/server";
import {FOLDER_PRODUCTS,FOLDER_EXECUTION_ENABLED} from "@/lib/folder-products";
export function GET(){return NextResponse.json({section:"folder",network:"preprod",products:FOLDER_PRODUCTS,executionEnabled:FOLDER_EXECUTION_ENABLED,note:"Navigation and product specifications only. No stock-backed loans or lendable liquidity are live."},{headers:{"Cache-Control":"no-store"}});}
