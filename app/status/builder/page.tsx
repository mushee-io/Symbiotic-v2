import type {Metadata} from "next";
import Link from "next/link";
import {PreprodBuilderWalletTest} from "@/components/PreprodBuilderWalletTest";
export const metadata:Metadata={title:"Transaction Builder — Cardano Preprod | Symbiotic V2",
 description:"Verified Preprod wallet self-test transaction builder and receipt checker."};
export default function BuilderStatusPage(){
 return <main style={{maxWidth:1050,margin:"0 auto",padding:"40px 20px 65px",minHeight:"100vh",color:"#e4f3db",background:"#08150f"}}>
  <nav style={{display:"flex",gap:25,marginBottom:65,fontSize:11}}>
   <Link href="/">SYMBIOTIC V2 ↗</Link>
   <Link href="/status/wiring">17-MODULE WIRING AUDIT ↗</Link>
  </nav>
  <div style={{fontSize:12,color:"#b7dc78",letterSpacing:".14em"}}>PREPROD INFRASTRUCTURE / 01</div>
  <h1 style={{fontSize:"clamp(36px,6vw,67px)",lineHeight:1.1,letterSpacing:"-.065em",margin:"20px 0"}}>TRANSACTION BUILDER</h1>
  <p style={{color:"#a3b5a5",lineHeight:1.8,maxWidth:750,marginBottom:30}}>This readiness test is deliberately limited to a wallet-to-itself Preprod ADA transaction. Stock contracts, BTC perps, lending and options are not enabled by this service.</p>
  <PreprodBuilderWalletTest/>
  <p style={{marginTop:28,color:"#8ea08e",fontSize:11}}>Backend setup: <Link href="https://github.com/mushee-io/Symbiotic-v2/tree/main/builder">builder/ ↗</Link>. The wallet action stays locked until the backend is connected and authenticated.</p>
 </main>;
}
