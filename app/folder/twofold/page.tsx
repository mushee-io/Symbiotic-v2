import type {Metadata} from "next";
import {FolderProductDetail} from "@/components/FolderProductDetail";
export const metadata:Metadata={title:"Twofold | Folder — Symbiotic V2",description:"Proposed liquidity lending and allocation module on Cardano Preprod. No active vault or yield yet."};
export default function TwofoldPage(){return <FolderProductDetail id="twofold"/>;}
