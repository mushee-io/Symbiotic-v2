import Link from "next/link";
import type {Metadata} from "next";
import {wiringSummary} from "@/lib/wiring-milestones";
import styles from "./wiring.module.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Execution Wiring Audit | Symbiotic V2",description:"Live-vs-coded tracking for the 17 remaining Cardano Preprod integration milestones."};
export default function WiringPage(){
 const summary=wiringSummary(process.env);
 return <main className={styles.root}>
  <header className={styles.top}><Link href="/">S / SYMBIOTIC</Link>
   <nav><Link href="/trade">TRADE</Link><Link href="/rwa">STOCKS</Link><Link href="/folder">FOLDER</Link><Link href="/status">RELEASE STATUS</Link></nav>
   <span>● CARDANO PREPROD</span>
  </header>
  <section className={styles.hero}><div className={styles.kicker}>SYMBIOTIC V2 / ENGINEERING EVIDENCE</div><h1>EXECUTION<br/>WIRING AUDIT.</h1>
   <p>This is the 17-module integration backlog. Implemented code, a green CI run, a deployed webpage or an environment variable does not prove live Cardano trades. Each module remains unverified until the indicated receipt or reconciliation proof exists.</p>
   <div className={styles.metrics}><div><span>MODULES REQUIRING WORK</span><b>{summary.incompleteCount} / 17</b></div>
    <div><span>BLOCKFROST INDEXER</span><b>{summary.runtime.blockfrostConfigured?"KEY PRESENT — UNVERIFIED":"NOT CONFIGURED"}</b></div>
    <div><span>EQUITY FEEDS</span><b>{summary.runtime.signedEquityFeedsConfigured?"SET — NOT VALIDATED":"NOT CONFIGURED"}</b></div>
    <div><span>TRANSACTION BUILDER</span><b>{summary.runtime.transactionBuilderConfigured?"CONFIG PRESENT — UNVERIFIED":"NOT CONFIGURED"}</b></div></div>
  </section>
  <section className={styles.section}>
   <h2>MODULES / MISSING EVIDENCE</h2>
   <div className={styles.tableWrap}><table><thead><tr><th>#</th><th>PRODUCT</th><th>PRIORITY</th><th>CODE</th><th>EXECUTION</th><th>REQUIRED PROOF</th></tr></thead>
    <tbody>{summary.modules.map((m,i)=><tr key={m.id}>
     <td>{String(i+1).padStart(2,"0")}</td><td><strong>{m.name}</strong><ul>{m.blockers.map(b=><li key={b}>{b}</li>)}</ul></td>
     <td>{m.priority}</td><td>{m.codeState.toUpperCase()}</td><td className={styles.blocked}>NOT VERIFIED</td>
     <td>{m.evidenceRequired}</td>
    </tr>)}</tbody></table></div>
   <p className={styles.caption}>Configuration is reported by presence only. Sensitive values and signing keys are never exposed. This page does not flip any execution flags.</p>
  </section>
  <footer className={styles.footer}><Link href="/status">CORE RELEASE GATE ↗</Link><Link href="https://github.com/mushee-io/Symbiotic-v2/blob/main/docs/deep-fixing-register.md">ENGINEERING RUNBOOK ↗</Link></footer>
 </main>;
}
