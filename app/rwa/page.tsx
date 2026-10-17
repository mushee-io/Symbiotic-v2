"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {RwaReferenceChart} from "@/components/RwaReferenceChart";
import {RwaWalletPreflight} from "@/components/RwaWalletPreflight";
import {RWA_MARKETS,type RwaMarket,marketSession} from "@/lib/rwa-market";
import styles from "./markets.module.css";

type MarketResponse={observedAt:string;markets:RwaMarket[];tradingEnabled:boolean;session:ReturnType<typeof marketSession>;reason:string};
type MarketProof={ticker:string;checks:{preprodTipFresh:boolean;demoCollateralMintConfirmed:boolean;stockOracleVerified:boolean;stockLinkedValidatorBound:boolean;orderbookAndSettlementVerified:boolean;nyseCalendarSupported:boolean};collateral:null|{unit:string;mintTxHash:string;supplyBaseUnits:string};failures:string[];tradingEnabled:false;observedAt:string};
type Filter="ALL"|"FAVORITES"|"POPULAR"|"TECH"|"AI"|"ETFS";
const FILTERS:Filter[]=["FAVORITES","ALL","POPULAR","TECH","AI","ETFS"];

export default function RwaMarkets(){
 const [data,setData]=useState<MarketResponse|null>(null);
 const [error,setError]=useState("");
 const [proof,setProof]=useState<MarketProof|null>(null);
 const [proofError,setProofError]=useState("");
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState<Filter>("ALL");
 const [active,setActive]=useState("aapl");
 const [favorites,setFavorites]=useState<string[]>([]);
 const [side,setSide]=useState<"BUY"|"SELL">("BUY");
 const [orderType,setOrderType]=useState<"MARKET"|"LIMIT">("MARKET");
 const [amount,setAmount]=useState("");
 const [now,setNow]=useState<Date|null>(null);
 const [tab,setTab]=useState("OVERVIEW");
 useEffect(()=>{
  setNow(new Date());
  try{const saved=JSON.parse(localStorage.getItem("symbiotic-rwa-favorites")||"[]");if(Array.isArray(saved))setFavorites(saved.filter((s):s is string=>typeof s==="string"));}catch{}
  let on=true;
  fetch("/api/rwa/markets",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Market configuration unavailable");return await r.json() as MarketResponse}).then(r=>{if(on)setData(r)}).catch(e=>{if(on)setError(e instanceof Error?e.message:"Market configuration unavailable")});
  return()=>{on=false};
 },[]);
 useEffect(()=>{const interval=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(interval)},[]);
 useEffect(()=>{
  let mounted=true;
  setProof(null);setProofError("");
  async function inspect(){
   try{
    const response=await fetch("/api/rwa/readiness?ticker="+encodeURIComponent((RWA_MARKETS.find(m=>m.id===active)||RWA_MARKETS[0]).ticker),{cache:"no-store"});
    if(!response.ok)throw new Error("Preprod evidence check unavailable");
    const detail=await response.json() as MarketProof;
    if(mounted){setProof(detail);setProofError("");}
   }catch(issue){if(mounted){setProof(null);setProofError(issue instanceof Error?issue.message:"Preprod proof not available");}}
  }
  void inspect();const interval=setInterval(()=>{void inspect()},60_000);
  return()=>{mounted=false;clearInterval(interval);};
 },[active]);
 const markets=data?.markets||RWA_MARKETS;
 const selected=markets.find(m=>m.id===active)||markets[0];
 const filtered=useMemo(()=>markets.filter(m=>{
  const matches=category==="ALL"||(category==="FAVORITES"?favorites.includes(m.id):category==="ETFS"?m.category==="ETF":m.tags.includes(category as "POPULAR"|"TECH"|"AI"));
  return matches&&(m.ticker+" "+m.label+" "+m.description).toLowerCase().includes(query.trim().toLowerCase());
 }),[markets,category,query,favorites]);
 const session=now?marketSession(now):data?.session;
 const stockProof=proof?.ticker===selected.ticker?proof:null;
 const countdown=session?.nextRegularOpen&&now?Math.max(0,Math.floor((Date.parse(session.nextRegularOpen)-now.getTime())/1000)):null;
 const countdownText=countdown===null?"CLOCK SYNCING":Math.floor(countdown/3600)+"h "+Math.floor(countdown%3600/60)+"m";
 const toggleFavorite=(id:string)=>{
  const next=favorites.includes(id)?favorites.filter(f=>f!==id):[...favorites,id];
  setFavorites(next);
  try{localStorage.setItem("symbiotic-rwa-favorites",JSON.stringify(next));}catch{}
 };
 return <main className={styles.root}>
  <header className={styles.header}>
   <Link href="/" className={styles.logo}><span>S</span><b>SYMBIOTIC</b><small>STOCKS / RWA</small></Link>
   <nav><Link href="/trade">PERPS</Link><Link href="/rwa" className={styles.current}>STOCKS &amp; RWA</Link><Link href="/rwa/issue">ISSUE &amp; VERIFY</Link><Link href="/portfolio">PORTFOLIO</Link><Link href="/earn">VAULT &amp; EARN</Link><Link href="/stats">STATS</Link></nav>
   <span className={styles.preprod}>● CARDANO PREPROD</span>
  </header>
  <div className={styles.banner}><span>STOCKS, ETFS &amp; TOKENIZED-ASSET MARKET DESIGN</span><span>PUBLIC STOCK REFERENCE CHARTS · PREPROD TRADING NOT ENABLED</span></div>
  <section className={styles.grid}>
   <aside className={styles.sidebar}>
    <div className={styles.subhead}>STOCK EXPLORER <span>{filtered.length} SYMBOLS</span></div>
    <input aria-label="Search stocks and ETFs" placeholder="⌕ Search Apple, AAPL, Tesla…" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className={styles.categories}>{FILTERS.map(c=><button key={c} aria-pressed={category===c} className={category===c?styles.activeCategory:""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <div className={styles.listHead}><span>STOCK / ETF</span><span>CHART</span></div>
    <div className={styles.assetList}>
     {filtered.map(m=><div key={m.id} className={styles.marketRow+" "+(selected.id===m.id?styles.marketRowSelected:"")}>
      <button className={styles.favoriteButton} onClick={()=>toggleFavorite(m.id)} title={favorites.includes(m.id)?"Remove from favorites":"Add to favorites"} aria-label={(favorites.includes(m.id)?"Remove ":"Add ")+m.ticker+" favorite"} aria-pressed={favorites.includes(m.id)}>{favorites.includes(m.id)?"★":"☆"}</button>
      <button className={styles.marketPick} onClick={()=>{setActive(m.id);setAmount("");}} aria-current={selected.id===m.id?"true":undefined}>
       <span className={styles.assetIcon}>{m.ticker.slice(0,1)}</span>
       <span className={styles.assetInfo}><strong>{m.ticker} <small>{m.category}</small></strong><small>{m.label}</small></span>
       <span className={styles.assetPrice}>↗<small>REFERENCE</small></span>
      </button>
     </div>)}
     {!filtered.length?<p className={styles.empty}>No matches. Try All or another ticker.</p>:null}
    </div>
    <div className={styles.issuanceCard}><span>ISSUANCE LAB / SEPARATE MODULE</span><strong>Mint and verify Preprod test certificates.</strong><Link href="/rwa/issue">OPEN ISSUE &amp; VERIFY ↗</Link></div>
   </aside>
   <section className={styles.market}>
    <div className={styles.marketTop}>
     <div className={styles.identity}><span className={styles.bigIcon}>{selected.ticker.slice(0,1)}</span><div><strong>{selected.ticker} <span className={styles.companyName}>/ {selected.label}</span></strong><small>{selected.category} · EXTERNAL PUBLIC-MARKET REFERENCE</small></div></div>
     <div className={styles.topMetrics}>
      <div><span>PRICE / CHANGE</span><b>VIEW CHART ↓</b></div>
      <div><span>TRADING SESSION / ET</span><b>{session?.session||"—"}</b></div>
      <div><span>TOKEN STATUS</span><b className={styles.negative}>NOT ISSUED</b></div>
     </div>
    </div>
    <div className={styles.sessionStrip}><span>◷ US EQUITIES REFERENCE SESSION: {session?.session||"UNAVAILABLE"} / NEW YORK</span><span>NEXT REGULAR OPEN: {countdownText} · HOLIDAYS / EARLY CLOSES INCLUDED</span></div>
    <div className={styles.chartHeader}>
     <div><span className={styles.eyebrow}>STOCK MARKET / {selected.symbol}</span><h1>{selected.label} <span className={styles.tickerName}>{selected.ticker}</span></h1><p>{selected.description}</p></div>
     <span className={styles.testTag}>REFERENCE ONLY · NOT TOKENIZED</span>
    </div>
    <div className={styles.chartToolbar}><span>EXTERNAL STOCK PRICE REFERENCE · NOT SYMBIOTIC EXECUTION PRICE</span><span>LINE / CANDLES &amp; TIMEFRAMES IN CHART</span></div>
    <div className={styles.chart+" "+styles.liveReferenceChart}><RwaReferenceChart symbol={selected.symbol} ticker={selected.ticker}/></div>
    <div className={styles.referenceDisclosure}>Charts are supplied by TradingView and may be delayed or unavailable. These prices are for market research only — not a Cardano oracle, an executable quote, or proof that any share-backed token exists.</div>
    <section className={styles.proofPanel} aria-label="Independent Cardano Preprod RWA readiness checks">
      <div className={styles.proofHeader}><strong>PREPROD EXECUTION CHECKS / {selected.ticker}</strong><span className={styles.negative}>TRADING DISABLED</span></div>
      <div className={styles.proofGrid}>
        <div><small>PREPROD CHAIN SYNC</small><b>{stockProof?stockProof.checks.preprodTipFresh?"VERIFIED":"NOT VERIFIED":"CHECKING…"}</b></div>
        <div><small>sUSD TEST COLLATERAL</small><b>{stockProof?stockProof.checks.demoCollateralMintConfirmed?"ONCHAIN MINT VERIFIED":"NOT VERIFIED":"CHECKING…"}</b></div>
        <div><small>STOCK ORACLE</small><b className={styles.negative}>NOT BOUND</b></div>
        <div><small>STOCK SETTLEMENT</small><b className={styles.negative}>NOT DEPLOYED</b></div>
      </div>
      <p>Verified test collateral does not mean Apple or NVIDIA shares exist on Cardano. No real or simulated stock order can be submitted until a separately validated contract, oracle and liquidity path are active.</p>
      {stockProof?.collateral?<a href={"https://preprod.cexplorer.io/tx/"+stockProof.collateral.mintTxHash} target="_blank" rel="noopener noreferrer">VIEW INDEPENDENT TEST COLLATERAL MINT ↗</a>:null}
      {stockProof?.failures.length?<small className={styles.negative}>CHAIN PROOF UNAVAILABLE: {stockProof.failures.join("; ")}</small>:null}
      {proofError?<small className={styles.negative}>{proofError}</small>:null}
    </section>
    <div className={styles.tabs}>{["OVERVIEW","HOLDINGS","OPEN ORDERS","TRADE HISTORY","CORPORATE ACTIONS","ISSUE & VERIFY"].map(t=><button key={t} className={tab===t?styles.activeTab:""} onClick={()=>setTab(t)}>{t}</button>)}</div>
    <div className={styles.tabContent}>
     {tab==="OVERVIEW"?<><h3>{selected.label} market overview</h3><p>The symbol {selected.ticker} refers to an actual public market, but Symbiotic does not currently issue or settle stock-backed tokens for it. Public price charts and market hours do not establish stock ownership.</p><div className={styles.facts}><span>REFERENCE SYMBOL <b>{selected.symbol}</b></span><span>SYMBIOTIC NETWORK <b>CARDANO PREPROD</b></span><span>SYMBIOTIC TOKEN / POLICY <b>NONE DEPLOYED</b></span><span>TRADING <b>DISABLED · NO LIQUIDITY</b></span></div></>:
     tab==="ISSUE & VERIFY"?<><h3>Separate Preprod issuance lab</h3><p>The existing Preprod certificate minting and verification feature is kept separate from this stock market explorer. Issued test certificates are not Apple or other real shares.</p><Link href="/rwa/issue" className={styles.inlineLink}>OPEN ISSUANCE LAB ↗</Link></>:
     <><h3>{tab}</h3><p>{tab==="HOLDINGS"?"No stock-backed Symbiotic holdings exist for this reference symbol. The Portfolio page shows supported on-chain Preprod wallet holdings.":tab==="CORPORATE ACTIONS"?"Issuer-backed dividend, split, redemption and voting events are not integrated. No corporate-action rights are represented.":"No executable stock/RWA orders exist on Symbiotic Preprod yet. We will show verified transaction receipts here after contract deployment."}</p>{tab==="HOLDINGS"?<Link href="/portfolio" className={styles.inlineLink}>OPEN PORTFOLIO ↗</Link>:null}</>}
    </div>
   </section>
   <aside className={styles.ticket}>
    <div className={styles.ticketTitle}><span>{selected.ticker} / ORDER TICKET</span><strong>PREPROD DEMO UI</strong></div>
    <div className={styles.sideToggle}>{(["BUY","SELL"] as const).map(v=><button key={v} className={side===v?(v==="BUY"?styles.buyActive:styles.sellActive):""} onClick={()=>setSide(v)}>{v==="BUY"?"Buy":"Sell"}</button>)}</div>
    <div className={styles.orderTypes}>{(["MARKET","LIMIT"] as const).map(v=><button key={v} className={orderType===v?styles.orderActive:""} onClick={()=>setOrderType(v)}>{v==="MARKET"?"Market":"Limit"}</button>)}</div>
    <div className={styles.ticketInfo}><span>MARKET SESSION</span><b>{session?.session||"—"}</b></div>
    <div className={styles.ticketInfo}><span>EXECUTION</span><b className={styles.negative}>UNAVAILABLE</b></div>
    <div className={styles.ticketInfo}><span>TEST COLLATERAL MINT</span><b>{stockProof?.checks.demoCollateralMintConfirmed?"VERIFIED":stockProof?"UNAVAILABLE":"CHECKING…"}</b></div>
    <label className={styles.ticketLabel}><span>{side==="BUY"?"PAY":"SELL"} / DEMO UNITS</span><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <div className={styles.ticketInfo}><span>QUOTE TOKEN</span><b>NOT CONFIGURED</b></div>
    <div className={styles.ticketInfo}><span>{side==="BUY"?"RECEIVE":"PROCEEDS"} / {selected.ticker}</span><b>NOT ISSUED</b></div>
    {orderType==="LIMIT"?<label className={styles.ticketLabel}><span>LIMIT PRICE</span><input disabled placeholder="No supported RWA oracle / quote"/></label>:null}
    <div className={styles.ticketInfo}><span>AVAILABLE BALANCE</span><b>—</b></div>
    <div className={styles.ticketInfo}><span>FEE / SLIPPAGE</span><b>—</b></div>
    <button className={styles.submit} disabled>{side} {selected.ticker} — NOT LIVE</button>
    <p className={styles.warning}>This is a stock-trading interface prototype. There is no issued {selected.ticker} share-backed Cardano asset, verified price oracle, orderbook, liquidity or deployed settlement contract. No stock trade can be placed.</p>
    <Link className={styles.ticketLink} href="/portfolio">VIEW PREPROD PORTFOLIO ↗</Link>
    <RwaWalletPreflight />
    <div className={styles.sessionNote}><span>STOCK PRICE SAFETY</span><p>Execution-quality prices require two independently signed and fresh sources. The chart is research-only; no settlement authorization is configured.</p></div>
    <div className={styles.sessionNote}><span>STOCK MARKET TIMING</span><p>US regular session: 9:30 am–4 pm New York time, subject to the reviewed NYSE 2026–2028 holidays and early closes. {session?.holiday?"Closed for "+session.holiday+". ":""}Pre-market, after-hours and overnight labels are reference timings only; halts and on-chain execution windows are not integrated.</p></div>
    {error?<p className={styles.error}>{error} — local reference list shown.</p>:null}
   </aside>
  </section>
  <footer className={styles.footer}>SYMBIOTIC V2 / STOCKS &amp; RWA <span>{data?"PREPROD MARKET CONFIG LOADED":"REFERENCE CATALOGUE / CONFIG UNAVAILABLE"}</span><Link href="/rwa/issue">CERTIFICATE ISSUANCE ↗</Link></footer>
 </main>;
}
