import Link from "next/link";
import {WalletButton} from "@/components/WalletButton";
import styles from "@/app/symbiotic-app-nav.module.css";

export type SymbioticSection="perpetuals"|"options"|"notional"|"rwa"|"folder"|"portfolio"|"earn"|"stats";
const NAV=[
 {label:"PERPETUALS",path:"/trade",section:"perpetuals"},
 {label:"OPTIONS",path:"/trade?view=options",section:"options"},
 {label:"NOTIONAL MARKET",path:"/trade?view=notional",section:"notional"},
 {label:"RWA",path:"/rwa",section:"rwa"},
 {label:"FOLDER",path:"/folder",section:"folder"},
 {label:"PORTFOLIO",path:"/portfolio",section:"portfolio"},
 {label:"VAULT & EARN",path:"/earn",section:"earn"},
 {label:"STATS",path:"/stats",section:"stats"}
] as const;

/** The same top frame as the original Symbiotic BTC perpetual terminal. */
export function SymbioticAppHeader({active}:{active:SymbioticSection}){
 return <header className={styles.header}>
  <Link href="/" className={styles.brand} aria-label="Symbiotic V2 homepage">
   <span>S</span><b>SYMBIOTIC</b>
  </Link>
  <nav className={styles.nav} aria-label="Symbiotic application modules">
   {NAV.map(item=><Link key={item.section} href={item.path}
     className={active===item.section?styles.active:""}
     aria-current={active===item.section?"page":undefined}>{item.label}</Link>)}
   <a href="https://github.com/mushee-io/Symbiotic-v2" target="_blank" rel="noopener noreferrer">GITHUB</a>
  </nav>
  <div className={styles.actions}>
   <span className={styles.network}><i aria-hidden="true"/>PREPROD</span>
   <div className={styles.wallet}><WalletButton/></div>
  </div>
 </header>;
}
