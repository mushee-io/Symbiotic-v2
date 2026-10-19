import Link from "next/link";
import {FolderShell} from "@/components/FolderShell";
import {FolderScenarioCalculator} from "@/components/FolderScenarioCalculator";
import {getFolderProduct,type FolderProductId} from "@/lib/folder-products";
import styles from "@/app/folder/folder.module.css";

export function FolderProductDetail({id}:{id:FolderProductId}){
 const p=getFolderProduct(id);
 if(!p)throw Error("Unknown Folder product");
 const other=id==="longbow"?getFolderProduct("twofold"):getFolderProduct("longbow");
 return <FolderShell active={id}>
  <section className={styles.hero}>
   <div>
    <div className={styles.eyebrow}>FOLDER / {p.eyebrow}</div>
    <h1>{p.headline}</h1>
    <p>{p.description}</p>
   </div>
   <aside className={styles.heroAction}>
    <span>PRODUCT</span><strong>{p.name.toUpperCase()}</strong>
    <span>NETWORK</span><strong>CARDANO PREPROD</strong>
    <span>EXECUTION STATUS</span><b>VALIDATORS COMPILED / NOT DEPLOYED</b>
   </aside>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>PRODUCT WORKSPACE</h2><span>0{p.features.length} PROTOCOL CAPABILITIES</span></div>
   <div className={styles.features}>
    {p.features.map((feature,i)=><div key={feature.label} className={styles.feature}>
     <div className={styles.featureHeader}><strong>{String(i+1).padStart(2,"0")} / {feature.label.toUpperCase()}</strong><small>{feature.status}</small></div>
     <p>{feature.description}</p>
    </div>)}
   </div>
   <div className={styles.callout}><strong>EXECUTION PROTECTION:</strong> This module is not yet an active lending pool or stock loan market. No deposit, borrow, lend, repay, liquidate, claim-yield or withdrawal action is offered until its contracts, oracle, accounting and exit mechanisms are specified, tested, deployed and independently verified on Cardano Preprod.</div>
   <FolderScenarioCalculator product={id}/>
   <div className={styles.lowerBar}>
    <Link className={styles.link} href={other?.path??"/folder"}>EXPLORE {other?.name.toUpperCase()??"FOLDER"} ↗</Link>
    <Link className={styles.link+" "+styles.faintLink} href="/folder">BACK TO FOLDER ↗</Link>
    <Link className={styles.link+" "+styles.faintLink} href="/rwa">STOCKS & RWA ↗</Link>
   </div>
  </section>
 </FolderShell>;
}
