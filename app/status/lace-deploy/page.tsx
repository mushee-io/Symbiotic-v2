import Link from "next/link";
import {LaceDemoValidatorDeploy} from "@/components/LaceDemoValidatorDeploy";
export const metadata={
 title:"Deploy with Lace — Symbiotic V2 Cardano Preprod Demo",
 description:"Deploy and independently verify five pinned Aiken Plutus V3 contracts with Lace on Cardano Preprod."
};
export default function LaceDeployPage(){
 return <main style={{minHeight:"100vh",background:"#07130d",color:"#e5f0df",padding:"36px max(20px,8vw)"}}>
  <nav style={{display:"flex",gap:25,marginBottom:45,fontSize:12}}>
   <Link href="/">SYMBIOTIC V2</Link>
   <Link href="/trade">TRADING</Link>
   <Link href="/status/validators">VALIDATOR PROOFS</Link>
  </nav>
  <p style={{color:"#b4dd89",fontSize:12,letterSpacing:2}}>SYMBIOTIC / CARDANO PREPROD</p>
  <h1 style={{fontSize:"clamp(36px,5vw,72px)",letterSpacing:"-.06em",margin:"14px 0 25px"}}>
   SHIP THE CONTRACTS.
  </h1>
  <p style={{maxWidth:750,lineHeight:1.7,marginBottom:33,color:"#b7c7b5"}}>
   Compile once, deploy five contracts, verify receipts. Your wallet stays in Lace,
   and you control every transaction. No new MM wallet, private-key export or mainnet transactions.
  </p>
  <LaceDemoValidatorDeploy/>
 </main>;
}
