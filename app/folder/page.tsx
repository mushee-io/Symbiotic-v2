import Link from "next/link";
import type {Metadata} from "next";
import {FolderShell} from "@/components/FolderShell";
import {FOLDER_PRODUCTS} from "@/lib/folder-products";
import styles from "./folder.module.css";

export const metadata:Metadata={title:"Folder — Longbow & Twofold | Symbiotic V2",
 description:"Explore the Longbow stock-backed lending and Twofold lending liquidity modules planned for Symbiotic V2 on Cardano Preprod."};
export default function FolderPage(){
 return <FolderShell>
  <section className={styles.hero}>
   <div><div className={styles.eyebrow}>SYMBIOTIC V2 / FOLDER</div>
    <h1>THE CREDIT &<br/>LIQUIDITY LAYER.</h1>
    <p>One dedicated section for two complementary systems: Longbow for stock-backed borrowing, and Twofold for lending-liquidity management. Both have separate product pages and development scopes.</p>
   </div>
   <aside className={styles.heroAction}>
    <span>PLATFORM</span><strong>CARDANO PREPROD</strong>
    <span>PRODUCTS</span><strong>02 / LONGBOW + TWOFOLD</strong>
    <span>EXECUTION</span><b>CONTRACT PROTOTYPES — NOT LIVE</b>
   </aside>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>CHOOSE A PRODUCT.</h2><span>02 MODULES / SEPARATE EXECUTION PATHS</span></div>
   <div className={styles.grid}>
    {FOLDER_PRODUCTS.map((p,i)=><Link key={p.id} href={p.path} className={styles.card}>
     <div className={styles.cardTop}><span>0{i+1} / {p.eyebrow.split("/")[1].trim()}</span><small>PREPROD BUILD</small></div>
     <h3>{p.name.toUpperCase()}</h3>
     <p>{p.shortDescription}</p>
     <p>{p.description}</p>
     <div className={styles.arrow}>EXPLORE {p.name.toUpperCase()} ↗</div>
    </Link>)}
   </div>
   <div className={styles.callout}>Folder is live as a navigation and product workspace. Lending pools, collateral deposits, debt creation, withdrawals, interest accrual and yield payments are not yet deployed or enabled. Experimental Longbow and Twofold Aiken validators are compiled and tested. Funded origination, onchain collateral/debt lifecycles, withdrawable liquidity and independent review remain outstanding; no live financial transactions are enabled.</div>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>HOW THEY CONNECT.</h2><span>PRODUCT DIRECTION</span></div>
   <div className={styles.summaryGrid}>
    <div className={styles.summary}><span>01 / ASSETS</span><h4>ELIGIBLE COLLATERAL</h4><p>Verify which tokenised stock assets can legally and technically secure loans on Cardano.</p></div>
    <div className={styles.summary}><span>02 / CREDIT</span><h4>LONGBOW</h4><p>Model collateral requirements, credit availability, repayment and liquidation risk.</p></div>
    <div className={styles.summary}><span>03 / LIQUIDITY</span><h4>TWOFOLD</h4><p>Manage lendable capital and the availability required for redemptions and trading.</p></div>
   </div>
  </section>
 </FolderShell>;
}
