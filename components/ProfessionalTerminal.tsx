"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {
 ArrowUpRight,
 CandlestickChart,ChartNoAxesCombined,Check,ChevronDown,ChevronsLeft,
 ChevronRight,CircleHelp,History,
 Layers3,LayoutGrid,Menu,MoreHorizontal,PanelLeftClose,PanelLeftOpen,
 Search,Settings2,ShieldCheck,SlidersHorizontal,Star,
 TrendingUp,Wallet,X
} from "lucide-react";
import {motion} from "motion/react";
import {WalletButton} from "@/components/WalletButton";
import {ProfessionalCandleChart} from "@/components/ProfessionalCandleChart";
import {
 TERMINAL_PAIRS,demoSnapshot,isTerminalPair,
 type TerminalPair,type TerminalSnapshot,type TerminalLevel
} from "@/lib/terminal-market";
import styles from "@/app/trade/terminal.module.css";

type Side="BUY"|"SELL";
type Kind="LIMIT"|"MARKET"|"TP/SL";
type Order={
 id:number;createdAt:string;pair:TerminalPair;side:Side;type:Kind;
 price:number;quantity:number;total:number;status:"OPEN"|"FILLED"|"CANCELLED";
};
type Tab="Open orders"|"Order history"|"Trade history"|"Assets";
type WindowTab="Chart"|"Info"|"Trading data"|"Feed";
const intervals=[["1m",60],["5m",300],["15m",900],["1h",3600],["4h",21600],["1D",86400]] as const;
const fmt=(value:number|undefined|null,digits=2)=>typeof value==="number"&&Number.isFinite(value)?
 value.toLocaleString("en-US",{minimumFractionDigits:digits,maximumFractionDigits:digits}):"—";
const compact=(v:number)=>Number.isFinite(v)&&v>0?v.toLocaleString("en-US",{maximumFractionDigits:5}):"—";
const usd=(v:number)=>"$"+fmt(v,2);
function percent(p:number|null|undefined){
 return typeof p==="number"&&Number.isFinite(p)?(p>=0?"+":"")+p.toFixed(2)+"%":"—";
}
const now=()=>new Date().toISOString();
const marketNames=Object.keys(TERMINAL_PAIRS) as TerminalPair[];
const emptyBalances={USD:100000, BTC:2, ETH:6, SOL:100, ADA:1000,DOGE:900,
 XRP:1500,BCH:2,AVAX:10,LTC:8,ZEC:6};
type BalanceKey=keyof typeof emptyBalances;

export function ProfessionalTerminal(){
 const [pair,setPair]=useState<TerminalPair>("BTC-USD");
 const [interval,setIntervalValue]=useState(900);
 const [snapshot,setSnapshot]=useState<TerminalSnapshot>(()=>demoSnapshot("BTC-USD"));
 const [loading,setLoading]=useState(true);
 const [marketError,setMarketError]=useState("");
 const [query,setQuery]=useState("");
 const [marketFilter,setMarketFilter]=useState("All");
 const [favorites,setFavorites]=useState<TerminalPair[]>(["BTC-USD","ETH-USD"]);
 const [navOpen,setNavOpen]=useState(false);
 const [sidebarOpen,setSidebarOpen]=useState(true);
 const [bookOpen,setBookOpen]=useState(true);
 const [bookTab,setBookTab]=useState<"Order book"|"Last trades">("Order book");
 const [orderMode,setOrderMode]=useState<Kind>("LIMIT");
 const [side,setSide]=useState<Side>("BUY");
 const [priceText,setPriceText]=useState("");
 const [quantity,setQuantity]=useState("0.0100");
 const [allocation,setAllocation]=useState(0);
 const [takeProfit,setTakeProfit]=useState("");
 const [stopLoss,setStopLoss]=useState("");
 const [precision,setPrecision]=useState(2);
 const [activeWindow,setActiveWindow]=useState<WindowTab>("Chart");
 const [activeOrders,setActiveOrders]=useState<Tab>("Open orders");
 const [showMA,setShowMA]=useState<Record<number,boolean>>({5:true,10:true,20:true});
 const [orders,setOrders]=useState<Order[]>([]);
 const [balances,setBalances]=useState<Record<string,number>>(emptyBalances);
 const [notification,setNotification]=useState("");
 const [orderId,setOrderId]=useState(1);
 const [selectedTool,setSelectedTool]=useState("Layout 1");
 const [mobileBook,setMobileBook]=useState(false);

 useEffect(()=>{
  try{
   const savedPair=localStorage.getItem("symbiotic-terminal-pair")??"";
   if(isTerminalPair(savedPair))setPair(savedPair);
   const val=Number(localStorage.getItem("symbiotic-terminal-interval"));
   if(intervals.some(([,seconds])=>seconds===val))setIntervalValue(val);
  }catch{/* localStorage might be blocked */}
 },[]);
 useEffect(()=>{
  try{
   localStorage.setItem("symbiotic-terminal-pair",pair);
   localStorage.setItem("symbiotic-terminal-interval",String(interval));
  }catch{/* optional */}
 },[pair,interval]);
 useEffect(()=>{
  let alive=true;
  setLoading(true);
  setSnapshot(demoSnapshot(pair,interval));
  setPriceText("");
  const refresh=async()=>{
   try{
    const response=await fetch(`/api/terminal/markets?pair=${pair}&granularity=${interval}`,{cache:"no-store"});
    if(!response.ok)throw Error("Public market snapshot unavailable");
    const body=await response.json() as TerminalSnapshot;
    if(!alive)return;
    if(body.pair!==pair||!Array.isArray(body.candles)||body.candles.length<5)
     throw Error("Market snapshot mismatch");
    setSnapshot(body);
    setMarketError(body.source==="DEMO"?"Public feed unavailable — deterministic demonstration prices and depth shown.":"");
   }catch{
    if(alive){setSnapshot(demoSnapshot(pair,interval));setMarketError("Public feed unavailable — deterministic demonstration prices and depth shown.");}
   }finally{if(alive)setLoading(false);}
  };
  void refresh();
  const tick=setInterval(()=>void refresh(),20000);
  return ()=>{alive=false;clearInterval(tick)};
 },[pair,interval]);

 const selected=TERMINAL_PAIRS[pair];
 const base=selected.symbol as BalanceKey;
 const marketPrice=snapshot.price;
 const chartPrice=snapshot.candles.at(-1)?.close??marketPrice;
 const limitPrice=Number(priceText)||marketPrice;
 const notional=Number(quantity)*((orderMode==="MARKET")?marketPrice:limitPrice);
 const availableQuote=balances.USD??0,availableBase=balances[base]??0;
 const filtered=marketNames.filter(id=>{
  const m=TERMINAL_PAIRS[id];
  const matched=(id+" "+m.name).toLowerCase().includes(query.trim().toLowerCase());
  if(!matched)return false;
  return marketFilter==="All"||(marketFilter==="Top"&&marketNames.indexOf(id)<5)||(marketFilter==="New"&&marketNames.indexOf(id)>=5)||
   (marketFilter==="Favorites"&&favorites.includes(id))||
   (marketFilter==="Stocks"&&false);
 });
 const sortedBids=useMemo(()=>[...snapshot.bids].sort((a,b)=>b.price-a.price),[snapshot.bids]);
 const sortedAsks=useMemo(()=>[...snapshot.asks].sort((a,b)=>b.price-a.price),[snapshot.asks]);
 const lastCandle=snapshot.candles.at(-1);
 const moveUp=(snapshot.changePct??0)>=0;
 const bookMax=Math.max(.0001,...snapshot.asks.map(x=>x.size),...snapshot.bids.map(x=>x.size));
 const maLegend=Object.entries({5:"#fbbf24",10:"#e85caa",20:"#24cbde"}).map(([k,color])=>{
  const n=Number(k),list=snapshot.candles;
  const value=list.length>=n?list.slice(-n).reduce((sum,c)=>sum+c.close,0)/n:null;
  return {n,color,value};
 });
 const flash=(message:string)=>setNotification(message);
 const choosePrice=(price:number)=>{
  setPriceText(price.toFixed(price>1000?2:Math.min(6,precision+2)));
  setOrderMode("LIMIT");
  setMobileBook(false);
  flash("Order price selected from "+(snapshot.source==="DEMO"?"demo":"public reference")+" order book.");
 };
 const choosePercent=(pct:number)=>{
  setAllocation(pct);
  const qty=side==="BUY"?
   availableQuote*pct/100/(Number.isFinite(limitPrice)&&limitPrice>0?limitPrice:1):
   availableBase*pct/100;
  setQuantity(qty.toFixed(qty>=10?3:qty>=1?4:6));
 };
 const placeOrder=()=>{
  const qty=Number(quantity),executionPrice=orderMode==="MARKET"?marketPrice:Number(priceText||marketPrice);
  const total=qty*executionPrice;
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(executionPrice)||executionPrice<=0||!Number.isFinite(total)||
     total<10||qty>1e8){
   flash("Enter a valid quantity, price and order total of at least $10.");return;
  }
  if(side==="BUY"&&total>availableQuote+1e-7){
   flash("Insufficient simulated USD balance.");return;
  }
  if(side==="SELL"&&qty>availableBase+1e-7){
   flash("Insufficient simulated "+base+" balance.");return;
  }
  if(orderMode==="TP/SL"&&(!Number.isFinite(Number(takeProfit))||Number(takeProfit)<=0||
   !Number.isFinite(Number(stopLoss))||Number(stopLoss)<=0)){
   flash("Set both take-profit and stop-loss trigger prices.");return;
  }
  const filled=orderMode==="MARKET";
  const order:Order={id:orderId,createdAt:now(),pair,side,type:orderMode,price:executionPrice,
   quantity:qty,total,status:filled?"FILLED":"OPEN"};
  setOrderId(id=>id+1);setOrders(old=>[order,...old].slice(0,150));
  if(filled){
   setBalances(old=>{
    const existing=old[base]??0;
    return {...old,USD:(old.USD??0)+(side==="BUY"?-total:total),
     [base]:existing+(side==="BUY"?qty:-qty)};
   });
  }else{
   // Open orders are UI-only and do not escrow simulated balances.
   // Prevent false claims of matching or reserved collateral.
  }
  flash(filled?"Simulated "+side.toLowerCase()+" filled — DEMO ONLY. No wallet transaction.":"Demo order recorded locally — no venue submission.");
 };
 const cancelOrder=(id:number)=>{
  setOrders(old=>old.map(o=>o.id===id&&o.status==="OPEN"?{...o,status:"CANCELLED"}:o));
  flash("Simulated order cancelled.");
 };
 const visibleOrders=orders.filter(o=>activeOrders==="Open orders"?o.status==="OPEN":
   activeOrders==="Order history"?true:activeOrders==="Trade history"?o.status==="FILLED":true);
 const orderBook=(rows:TerminalLevel[],ask:boolean)=>
  rows.slice(0,13).map((row,i)=>{
   const total=rows.slice(0,i+1).reduce((sum,l)=>sum+l.size,0);
   return <button type="button" className={styles.bookRow} key={ask?"a"+i:"b"+i}
    onClick={()=>choosePrice(row.price)} title="Use this reference price in the demo limit order">
    <span className={ask?styles.askPrice:styles.bidPrice}>{fmt(row.price,row.price>=1000?2:4)}</span>
    <span>{fmt(row.size,4)}</span><span>{fmt(total,4)}</span>
    <i className={ask?styles.redDepth:styles.greenDepth}
      style={{width:`${Math.min(95,15+row.size/bookMax*70)}%`}} aria-hidden="true"/>
   </button>;
  });
 return <main className={styles.root} aria-label="Symbiotic professional trading terminal">
  <header className={styles.header}>
   <div className={styles.headerStart}>
    <Link className={styles.brand} href="/" aria-label="Symbiotic V2 homepage"><span className={styles.brandMark}>S</span><strong>SYMBIOTIC<span>V2</span></strong></Link>
    <span className={styles.brandDivider}/>
    <nav className={styles.desktopNav} aria-label="Main application">
     <Link href="/trade" className={styles.navSelected}>Trade <ChevronDown size={14}/></Link>
     <Link href="/rwa">Markets</Link>
     <Link href="/folder">Folder <ChevronDown size={14}/></Link>
     <Link href="/portfolio">Assets</Link>
     <Link href="/earn">Earn</Link>
     <Link href="/stats">Analytics</Link>
     <Link href="/trade/advanced">Derivatives <ChevronDown size={14}/></Link>
    </nav>
   </div>
   <div className={styles.headerEnd}>
    <span className={styles.network}><span/> CARDANO PREPROD</span>
    <div className={styles.wallet}><WalletButton/></div>
    <Link href="/status" className={styles.iconOnly} title="System status" aria-label="System status"><CircleHelp size={20}/></Link>
    <Link href="/portfolio" className={styles.iconOnly} title="Portfolio" aria-label="Portfolio"><Wallet size={20}/></Link>
    <button type="button" className={styles.iconOnly} title="Navigation" aria-label="Toggle navigation" onClick={()=>setNavOpen(v=>!v)}><Menu size={21}/></button>
   </div>
  </header>
  {navOpen&&<motion.nav initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className={styles.mobileNav}>
   {([["Trade","/trade"],["RWA","/rwa"],["Longbow","/folder/longbow"],["Twofold","/folder/twofold"],["Portfolio","/portfolio"],["Vault & Earn","/earn"],["Stats","/stats"],["Options & Notional","/trade/advanced"]] as const).map(([label,to])=><Link key={to} href={to} onClick={()=>setNavOpen(false)}>{label}<ChevronRight size={16}/></Link>)}
  </motion.nav>}

  <div className={styles.workspace} data-sidebar={sidebarOpen?"open":"closed"} data-book={bookOpen?"open":"closed"}>
   {sidebarOpen&&<aside className={styles.markets}>
    <div className={styles.marketsTitle}><strong>Markets</strong><button title="Hide markets" aria-label="Hide markets" onClick={()=>setSidebarOpen(false)}><PanelLeftClose size={18}/></button></div>
    <div className={styles.searchWrap}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search crypto" aria-label="Search crypto markets"/></div>
    <div className={styles.marketTabs}>{["All","Favorites","Top","New","Stocks"].map(name=>
     <button key={name} className={marketFilter===name?styles.tabActive:""} onClick={()=>setMarketFilter(name)}>{name}</button>)}
    </div>
    <div className={styles.assetTitles}><span>Name</span><span>Reference price / 24h</span></div>
    <div className={styles.assetScroll}>
     {filtered.length===0&&<div className={styles.emptyNotice}>No markets match this filter.</div>}
     {filtered.map(id=>{
      const m=TERMINAL_PAIRS[id],isActive=pair===id;
      const reference=id===pair?snapshot.price:null;
      return <div className={`${styles.assetRow} ${isActive?styles.assetActive:""}`} key={id}>
       <button className={styles.star} type="button" aria-label={(favorites.includes(id)?"Remove ":"Add ")+m.symbol+" favourite"} onClick={()=>setFavorites(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}>
        <Star size={17} fill={favorites.includes(id)?"#c7c7c7":"none"}/>
       </button>
       <button className={styles.assetPick} onClick={()=>setPair(id)} type="button" aria-pressed={isActive}>
        <span className={styles.coin} data-coin={m.symbol}>{m.symbol==="BTC"?"₿":m.symbol.slice(0,1)}</span>
        <span className={styles.coinMeta}><b>{m.symbol}</b><small>{m.name}</small></span>
        <span className={styles.coinPrice}><b>{reference!==null?fmt(reference,reference>10?2:4):"—"}</b><small className={moveUp&&isActive?styles.positive:styles.subtle}>{reference!==null?percent(snapshot.changePct):"Select to view"}</small></span>
       </button>
      </div>;
     })}
    </div>
    <div className={styles.marketFooter}><span className={styles.statusIndicator}/>{snapshot.source==="DEMO"?"DEMO MARKET DATA":"COINBASE PUBLIC REFERENCE"} <span>· NO VENUE ORDERS</span></div>
   </aside>}
   <div className={styles.centerArea}>
    <div className={styles.ticker}>
     {!sidebarOpen&&<button className={styles.expandSidebar} title="Show markets" aria-label="Show markets" onClick={()=>setSidebarOpen(true)}><PanelLeftOpen size={20}/></button>}
     <button type="button" className={styles.pairSelect} onClick={()=>setSidebarOpen(true)}><span className={styles.bigCoin}>{selected.symbol==="BTC"?"₿":selected.symbol[0]}</span><strong>{selected.symbol}/USD</strong><ChevronDown size={17}/></button>
     <button type="button" className={styles.tickerStar} aria-label="Toggle current market favourite" onClick={()=>setFavorites(old=>old.includes(pair)?old.filter(x=>x!==pair):[...old,pair])}>
      <Star size={18} fill={favorites.includes(pair)?"#eeeeee":"none"}/>
     </button>
     <div className={styles.mainPrice}><b className={moveUp?styles.positive:styles.negative}>{fmt(marketPrice,marketPrice>10?2:4)}</b><span className={moveUp?styles.positive:styles.negative}>{percent(snapshot.changePct)}</span></div>
     <div className={styles.tickerStats}>
      <div><span>24h high</span><strong>{fmt(snapshot.high24,2)}</strong></div>
      <div><span>24h low</span><strong>{fmt(snapshot.low24,2)}</strong></div>
      <div><span>24h volume ({selected.symbol})</span><strong>{snapshot.volume24===null?"—":fmt(snapshot.volume24,2)}</strong></div>
      <div><span>Market source</span><strong>{snapshot.source==="DEMO"?"DEMO / NOT LIVE":"COINBASE PUBLIC"}</strong></div>
     </div>
    </div>
    <div className={styles.referenceBanner} role="status">
     <span className={snapshot.source==="DEMO"?styles.demoChip:styles.referenceChip}>{snapshot.source==="DEMO"?"DEMO MARKET DATA":"PUBLIC SPOT REFERENCE"}</span>
     <span>{marketError||"Market data is public exchange reference only. Symbiotic Cardano trade execution remains evidence-gated."}</span>
     {loading&&<span>Updating…</span>}
     <Link href="/trade/advanced">PREPROD WORKBENCH <ArrowUpRight size={13}/></Link>
    </div>
    <div className={styles.core}>
     <div className={styles.chartAndTrade}>
      <section className={styles.chartPanel}>
       <div className={styles.panelTabs}>{(["Chart","Info","Trading data","Feed"] as WindowTab[]).map(t=>
        <button key={t} onClick={()=>setActiveWindow(t)} className={activeWindow===t?styles.selectedTab:""}>{t}</button>)}
        <span className={styles.panelSpacer}/>
        <button aria-label="Toggle order book" title="Toggle order book" onClick={()=>setBookOpen(v=>!v)}><LayoutGrid size={16}/></button>
       </div>
       <div className={styles.chartToolbar}>
        <div className={styles.intervalGroup}>{intervals.map(([label,seconds])=><button key={label} type="button"
          className={seconds===interval?styles.intervalSelected:""} onClick={()=>setIntervalValue(seconds)}>{label}</button>)}</div>
        <span className={styles.toolDivider}/>
        <CandlestickChart size={17}/><SlidersHorizontal size={16}/>
        <button title="Toggle MA(5)" aria-label="Toggle MA 5" className={showMA[5]?styles.toolActive:""} onClick={()=>setShowMA(a=>({...a,5:!a[5]}))}>MA5</button>
        <button title="Toggle MA(10)" aria-label="Toggle MA 10" className={showMA[10]?styles.toolActive:""} onClick={()=>setShowMA(a=>({...a,10:!a[10]}))}>MA10</button>
        <button title="Toggle MA(20)" aria-label="Toggle MA 20" className={showMA[20]?styles.toolActive:""} onClick={()=>setShowMA(a=>({...a,20:!a[20]}))}>MA20</button>
        <span className={styles.panelSpacer}/>
        <span className={styles.chartStyle}>Original <ChevronDown size={13}/></span>
       </div>
       {activeWindow==="Chart"?<div className={styles.chartCanvas}>
        <div className={styles.chartLegend}><div>O <b>{fmt(lastCandle?.open,2)}</b> H <b>{fmt(lastCandle?.high,2)}</b> L <b>{fmt(lastCandle?.low,2)}</b> C <b className={styles.positive}>{fmt(lastCandle?.close,2)}</b></div>
        <div className={styles.maLegend}>{maLegend.map(l=><span key={l.n} style={{color:showMA[l.n]?l.color:"#777"}}>MA({l.n}) {showMA[l.n]?fmt(l.value,2):"Off"}</span>)}</div></div>
        <ProfessionalCandleChart candles={snapshot.candles} enabled={showMA}/>
       </div>:
       <div className={styles.infoPanel}>
        <h3>{activeWindow==="Info"?"Market information":activeWindow==="Trading data"?"Market data & methodology":"Public market feed"}</h3>
        <p>{activeWindow==="Info"?`${selected.name} spot price information; not a Symbiotic perp settlement price.`:
          activeWindow==="Trading data"?"OHLCV, moving averages, reference order book and public-exchange trades are displayed only when verified by the read-only market endpoint.":
          "A read-only public market reference is fetched through a server endpoint. If that feed fails, all charts and depth switch to conspicuously labeled deterministic demo data."}</p>
        <div className={styles.infoGrid}><span>Pair</span><b>{pair}</b><span>Data source</span><b>{snapshot.source}</b><span>Observation</span><b>{new Date(snapshot.observedAt).toLocaleTimeString()}</b><span>Cardano execution</span><b>SEPARATE &amp; EVIDENCE-GATED</b></div>
        <Link href="/status/wiring">VIEW SYSTEM READINESS <ArrowUpRight size={14}/></Link>
       </div>}
      </section>
      <section id="symbiotic-order-entry" className={styles.tradeSection} aria-label="Demo order execution">
       <div className={styles.panelTabs}>
        <button className={styles.selectedTab}>Trade</button>
        <button onClick={()=>flash("Use the chart tools above for moving averages and timeframes.")}>Tools</button>
        <span className={styles.panelSpacer}/>
        <span className={styles.demoChip}>SIMULATION ONLY</span>
       </div>
       <div className={styles.executionGrid}>
        <div className={styles.tradeControls}>
         <div className={styles.modeTabs}>{(["LIMIT","MARKET","TP/SL"] as Kind[]).map(name=><button key={name}
          className={orderMode===name?styles.modeActive:""} onClick={()=>setOrderMode(name)}>{name==="LIMIT"?"Limit":name==="MARKET"?"Market":"TP/SL"}</button>)}</div>
         <div className={styles.buySellTabs}><button className={side==="BUY"?styles.buyActive:""} onClick={()=>{setSide("BUY");setAllocation(0)}}>Buy {selected.symbol}</button><button className={side==="SELL"?styles.sellActive:""} onClick={()=>{setSide("SELL");setAllocation(0)}}>Sell {selected.symbol}</button></div>
         <div className={styles.available}>Available <strong>{side==="BUY"?usd(availableQuote):compact(availableBase)+" "+selected.symbol}</strong> <span>· DEMO WALLET</span></div>
         {orderMode!=="MARKET"?<label className={styles.field}><span>Price (USD)</span><input inputMode="decimal" value={priceText} placeholder={fmt(marketPrice,2)} onChange={e=>setPriceText(e.target.value)}/><b>USD</b></label>:
          <label className={styles.field}><span>Price</span><div className={styles.marketOrderField}>Market reference · ~ {usd(marketPrice)}</div></label>}
         <label className={styles.field}><span>Amount ({selected.symbol})</span><input inputMode="decimal" value={quantity} onChange={e=>{setQuantity(e.target.value);setAllocation(0)}}/><b>{selected.symbol}</b></label>
         <div className={styles.percentButtons}>{[25,50,75,100].map(p=><button type="button" key={p} className={allocation===p?styles.percentActive:""} onClick={()=>choosePercent(p)}>{p}%</button>)}</div>
         {orderMode==="TP/SL"&&<div className={styles.triggerInputs}>
          <label>Take profit (USD)<input inputMode="decimal" value={takeProfit} onChange={e=>setTakeProfit(e.target.value)}/></label>
          <label>Stop loss (USD)<input inputMode="decimal" value={stopLoss} onChange={e=>setStopLoss(e.target.value)}/></label>
         </div>}
         <div className={styles.orderSummary}><span>Estimated total <strong>{Number.isFinite(notional)&&notional>=0?usd(notional):"—"}</strong></span>
          <span>Execution <strong>LOCAL DEMO ONLY</strong></span></div>
         <button type="button" className={side==="BUY"?styles.buyButton:styles.sellButton} onClick={placeOrder}>Demo {side==="BUY"?"Buy":"Sell"} {selected.symbol}</button>
         <p className={styles.formNotice}><ShieldCheck size={14}/> No deposit, exchange submission, real balance change or Cardano signing occurs here. <Link href="/trade/advanced">Preprod tools ↗</Link></p>
        </div>
        <div className={styles.tradeAside}>
         <div className={styles.tradeAsideHead}><span>Position preview</span><span>READ ONLY</span></div>
         <div className={styles.tradeAsideGrid}><span>Market</span><strong>{selected.symbol}/USD SPOT REFERENCE</strong><span>Est. order size</span><strong>{compact(Number(quantity))} {selected.symbol}</strong>
          <span>Est. order value</span><strong>{Number.isFinite(notional)?usd(notional):"—"}</strong><span>Fee estimate</span><strong>NOT CALCULATED</strong></div>
         <div className={styles.tradeAsideBottom}><TrendingUp size={20}/> Preprod derivatives risk and wallet-authorised transaction construction remain in the advanced workbench.</div>
         <Link href="/trade/advanced" className={styles.advancedButton}>OPEN ADVANCED DERIVATIVES <ArrowUpRight size={16}/></Link>
        </div>
       </div>
      </section>
      <section className={styles.historySection}>
       <div className={styles.panelTabs}>{(["Open orders","Order history","Trade history","Assets"] as Tab[]).map(t=><button key={t}
        className={activeOrders===t?styles.selectedTab:""} onClick={()=>setActiveOrders(t)}>{t}{t==="Open orders"?" ("+orders.filter(o=>o.status==="OPEN").length+")":""}</button>)}</div>
       {activeOrders==="Assets"?<div className={styles.balancesGrid}>{Object.entries(balances).map(([symbol,value])=><div key={symbol}><span>{symbol}</span><strong>{fmt(value,symbol==="USD"?2:5)}</strong></div>)}<small>SIMULATED BALANCES — NO WALLET CUSTODY OR TOKEN BALANCE CLAIMS.</small></div>:
       <div className={styles.ordersTable}><div className={styles.ordersHead}><span>Time</span><span>Pair</span><span>Side</span><span>Type</span><span>Price</span><span>Amount</span><span>Status</span><span>Action</span></div>
         {visibleOrders.length?visibleOrders.map(order=><div className={styles.ordersRow} key={order.id}>
          <span>{new Date(order.createdAt).toLocaleTimeString()}</span><span>{order.pair}</span><span className={order.side==="BUY"?styles.positive:styles.negative}>{order.side}</span>
          <span>{order.type}</span><span>{fmt(order.price,2)}</span><span>{fmt(order.quantity,5)}</span>
          <span>{order.status}</span><span>{order.status==="OPEN"?<button onClick={()=>cancelOrder(order.id)}>Cancel</button>:"—"}</span>
         </div>):<div className={styles.emptyOrders}><History size={23}/><strong>No {activeOrders.toLowerCase()} yet</strong><span>Demo activity will appear here. No execution is submitted to an exchange or blockchain.</span></div>}
       </div>}
      </section>
     </div>
     {bookOpen&&<aside className={styles.orderBook} aria-label="Reference order book">
      <div className={styles.panelTabs}><button className={bookTab==="Order book"?styles.selectedTab:""} onClick={()=>setBookTab("Order book")}>Order book</button><button className={bookTab==="Last trades"?styles.selectedTab:""} onClick={()=>setBookTab("Last trades")}>Last trades</button><span className={styles.panelSpacer}/><button aria-label="Order book display settings" title="Order book precision" onClick={()=>setPrecision(p=>p===2?3:p===3?4:2)}><SlidersHorizontal size={17}/></button><button title="Hide order book" aria-label="Hide order book" onClick={()=>setBookOpen(false)}><X size={16}/></button></div>
      {bookTab==="Order book"?<>
       <div className={styles.bookModes}><span>Reference depth</span><button onClick={()=>setPrecision(p=>Math.max(0,p-1))}>−</button><span>{Math.pow(10,-precision).toFixed(precision)}</span><button onClick={()=>setPrecision(p=>Math.min(6,p+1))}>+</button></div>
       <div className={styles.bookTitles}><span>Price (USD)</span><span>Amount ({selected.symbol})</span><span>Total</span></div>
       <div className={styles.depthLists}><div>{orderBook([...sortedAsks].reverse(),true)}</div>
       <div className={styles.spotSeparator}><strong className={moveUp?styles.positive:styles.negative}>{fmt(marketPrice,2)} {moveUp?"↑":"↓"}</strong><small>{snapshot.source==="DEMO"?"DEMO DEPTH":"PUBLIC COINBASE DEPTH"}</small></div>
       <div>{orderBook(sortedBids,false)}</div></div>
      </>:<><div className={styles.bookTitles}><span>Time</span><span>Price (USD)</span><span>Amount</span></div><div className={styles.tradesList}>
       {snapshot.trades.length?snapshot.trades.map((t,i)=><div className={styles.tradeRow} key={i}><span>{new Date(t.time).toLocaleTimeString()}</span><span className={t.side==="BUY"?styles.positive:styles.negative}>{fmt(t.price,2)}</span><span>{fmt(t.size,4)}</span></div>):<div className={styles.emptyNotice}>Recent public trades currently unavailable.</div>}
      </div></>}
      <div className={styles.bookFoot}>{snapshot.source==="DEMO"?"DEMO SNAPSHOT · NOT A REAL ORDER BOOK":"EXTERNAL PUBLIC REFERENCE · NOT SYMBIOTIC DEPTH"}</div>
     </aside>}
    </div>
   </div>
   <aside className={styles.rail} aria-label="Trading utilities">
    <button title="Toggle markets sidebar" aria-label="Toggle markets sidebar" onClick={()=>setSidebarOpen(s=>!s)}><ChevronsLeft size={20}/></button>
    <div className={styles.railDivider}/>
    {([["Layout 1",LayoutGrid],["Chart",ChartNoAxesCombined],["Order book",Layers3],["Assets",Wallet],["History",History],["Settings",Settings2]] as const).map(([label,Icon],i)=>
     <button key={label} title={label} aria-label={label} className={selectedTool===label?styles.railActive:""} onClick={()=>{
      setSelectedTool(label);
      if(label==="Order book"){setBookOpen(v=>!v);setBookTab("Order book");}
      if(label==="Assets")setActiveOrders("Assets");
      if(label==="History")setActiveOrders("Order history");
      if(label==="Chart")setActiveWindow("Chart");
      if(label==="Settings")flash("Chart timeframes, MA indicators and order book precision are configurable above.");
      if(label==="Layout 1"){setSidebarOpen(true);setBookOpen(true);}
     }}><Icon size={19}/></button>)}
    <span className={styles.railBottom}>V2</span>
   </aside>
  </div>
  <div className={styles.mobileActions}><button onClick={()=>setMobileBook(v=>!v)}><Layers3 size={17}/> Order book</button><button onClick={()=>{setSide("BUY");document.getElementById("symbiotic-order-entry")?.scrollIntoView({behavior:"smooth"})}} className={styles.positive}>Buy</button><button onClick={()=>{setSide("SELL");document.getElementById("symbiotic-order-entry")?.scrollIntoView({behavior:"smooth"})}} className={styles.negative}>Sell</button></div>
  {mobileBook&&<div className={styles.mobileBook} role="dialog" aria-label="Mobile reference order book"><button onClick={()=>setMobileBook(false)} aria-label="Close order book"><X size={20}/></button><strong>REFERENCE ORDER BOOK</strong>{orderBook(sortedAsks.slice(0,8),true)}<div className={styles.spotSeparator}>{fmt(marketPrice,2)}</div>{orderBook(sortedBids.slice(0,8),false)}</div>}
  {notification&&<motion.div role="status" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={styles.toast}><span>{notification}</span><button onClick={()=>setNotification("")} aria-label="Dismiss notification"><X size={17}/></button></motion.div>}
 </main>;
}
