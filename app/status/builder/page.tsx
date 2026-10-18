import type {Metadata} from "next";
import Link from "next/link";
import {PreprodBuilderWalletTest} from "@/components/PreprodBuilderWalletTest";
export const metadata:Metadata={title:"Transaction Builder — Cardano Preprod | Symbiotic V2",
 description:"Verified Preprod wallet self-test transaction builder and receipt checker."};
export const dynamic="force-dynamic";
export default function BuilderStatusPage(){
 const supervisedTestEnabled=process.env.SYMBIOTIC_WALLET_SELF_TEST_ENABLED==="true";
 return <main style={{maxWidth:1050,margin:"0 auto",padding:"40px 20px 65px",minHeight:"100vh",color:"#e4f3db",background:"#08150f"}}>
  <nav style={{display:"flex",gap:25,marginBottom:65,fontSize:11}}>
   <Link href="/">SYMBIOTIC V2 ↗</Link>
   <Link href="/status/wiring">17-MODULE WIRING AUDIT ↗</Link>
   <Link href="/status/validators">VALIDATOR PROOFS ↗</Link>
  </nav>
  <div style={{fontSize:12,color:"#b7dc78",letterSpacing:".14em"}}>PREPROD INFRASTRUCTURE / 01</div>
  <h1 style={{fontSize:"clamp(36px,6vw,67px)",lineHeight:1.1,letterSpacing:"-.065em",margin:"20px 0"}}>TRANSACTION BUILDER</h1>
  <p style={{color:"#a3b5a5",lineHeight:1.8,maxWidth:750,marginBottom:30}}>This readiness test is deliberately limited to a wallet-to-itself Preprod ADA transaction. Stock contracts, BTC perps, lending and options are not enabled by this service.</p>
  {supervisedTestEnabled?<PreprodBuilderWalletTest/>:
  <section style={{border:"1px solid #4b7652",padding:25,margin:"32px 0"}}>
   <h2 style={{color:"#b7e98a",fontSize:22}}>FIRST PREPROD TRANSACTION — CONFIRMED</h2>
   <p>Cardano block 5,308,128. Wallet-to-self transaction confirmed on 18 October 2026. All outputs returned to the originating Preprod address and only the network fee was spent.</p>
   <p style={{overflowWrap:"anywhere",fontFamily:"monospace",fontSize:12}}>40e9baaeeec09755ea05ac6a60766ac9944d7bf3ef0b5596efcace9712f8d09d</p>
   <p><Link href="https://preprod.cexplorer.io/tx/40e9baaeeec09755ea05ac6a60766ac9944d7bf3ef0b5596efcace9712f8d09d">VIEW CONFIRMED PREPROD RECEIPT ↗</Link></p>
   <p>The temporary public wallet self-test is disabled after successful verification. This does not claim that derivatives smart contracts are deployed or trading.</p>
   <Link href="/status/validators">NEXT: FIVE VALIDATOR DEPLOYMENT PROOFS ↗</Link>
  </section>}
  <p style={{marginTop:28,color:"#8ea08e",fontSize:11}}>Backend setup: <Link href="https://github.com/mushee-io/Symbiotic-v2/tree/main/builder">builder/ ↗</Link>. The wallet action stays locked until the backend is connected and authenticated.</p>
 </main>;
}
