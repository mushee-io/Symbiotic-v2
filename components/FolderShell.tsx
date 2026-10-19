import Link from "next/link";
import {SymbioticAppHeader} from "@/components/SymbioticAppHeader";
import type {ReactNode} from "react";
import {FOLDER_PRODUCTS,type FolderProductId} from "@/lib/folder-products";
import styles from "@/app/folder/folder.module.css";

export function FolderShell({active,children}:{active?:FolderProductId;children:ReactNode}){
 return <main className={styles.root}>
  <SymbioticAppHeader active="folder"/>
  <div className={styles.subnav} aria-label="Folder products">
   <Link href="/folder" className={!active?styles.active:""} aria-current={!active?"page":undefined}>FOLDER / OVERVIEW</Link>
   {FOLDER_PRODUCTS.map(p=><Link href={p.path} key={p.id} className={p.id===active?styles.active:""} aria-current={p.id===active?"page":undefined}>{p.name.toUpperCase()}</Link>)}
  </div>
  <div className={styles.wrap}>{children}</div>
  <footer className={styles.foot}><span>SYMBIOTIC V2 / FOLDER / CARDANO PREPROD</span><span>PRODUCT ARCHITECTURE — TRANSACTIONS NOT YET ENABLED</span><Link href="https://github.com/mushee-io/Symbiotic-v2">SOURCE ↗</Link></footer>
 </main>;
}
