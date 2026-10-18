import type {Metadata} from "next";
import {FolderProductDetail} from "@/components/FolderProductDetail";
export const metadata:Metadata={title:"Longbow | Folder — Symbiotic V2",description:"Proposed stock-backed lending module on Cardano Preprod. No active borrowing or collateral deposit yet."};
export default function LongbowPage(){return <FolderProductDetail id="longbow"/>;}
