"use client";
import {useMemo,useState} from "react";
import {longbowScenario,twofoldScenario,type LongbowScenario,type TwofoldScenario} from "@/lib/folder-risk";
import styles from "@/app/folder/folder.module.css";

function micro(text:string){
 if(!/^(0|[1-9]\d{0,15})(\.\d{1,6})?$/.test(text))throw Error("Use an amount up to 6 decimal places");
 const [whole,frac=""]=text.split(".");
 return (BigInt(whole)*1_000_000n+BigInt(frac.padEnd(6,"0"))).toString();
}
function money(microValue:string){
 const n=BigInt(microValue),whole=(n/1_000_000n).toLocaleString("en-US"),frac=(n%1_000_000n).toString().padStart(6,"0").slice(0,2);
 return "$"+whole+"."+frac;
}
function ratio(value:string|null){
 if(value===null)return "NO DEBT";
 const b=BigInt(value);
 return (Number(b)/10_000).toFixed(2)+"×";
}
function Field({label,value,onChange}: {label:string;value:string;onChange:(next:string)=>void}){
 return <label className={styles.calcField}><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} inputMode="decimal" autoComplete="off"/></label>;
}
type LongbowInputs={shares:string;price:string;debt:string;interest:string;months:string;initial:string;liquidation:string};
type TwofoldInputs={cash:string;loans:string;shares:string;withdraw:string;util:string;reserve:string};
export function FolderScenarioCalculator({product}:{product:"longbow"|"twofold"}){
 const [longbow,setLongbow]=useState<LongbowInputs>({shares:"10",price:"200",debt:"800",interest:"5",months:"12",initial:"50",liquidation:"65"});
 const [twofold,setTwofold]=useState<TwofoldInputs>({cash:"600",loans:"400",shares:"1000",withdraw:"200",util:"80",reserve:"10"});
 const longbowPreview=useMemo(()=>{
  try{
   const days=Number(longbow.months);
   if(!Number.isSafeInteger(days)||days<0||days>60)throw Error("Months must be a whole number from 0 to 60");
   const ltv=Number(longbow.initial),threshold=Number(longbow.liquidation),apr=Number(longbow.interest);
   if(![ltv,threshold,apr].every(Number.isInteger))throw Error("Percentages must be whole numbers");
   const params:LongbowScenario={
    collateralSharesMicros:micro(longbow.shares),priceMicros:micro(longbow.price),principalMicros:micro(longbow.debt),
    aprBps:apr*100,initialLtvBps:ltv*100,liquidationLtvBps:threshold*100,
    accruedSeconds:days*30*86400,oracleAgeSeconds:60,collateralIsVerifiedOnChain:false
   };
   return {data:longbowScenario(params),error:null};
  }catch(e){return {data:null,error:e instanceof Error?e.message:"Invalid loan inputs"};}
 },[longbow]);
 const twofoldPreview=useMemo(()=>{
  try{
   const util=Number(twofold.util),reserve=Number(twofold.reserve);
   if(!Number.isInteger(util)||!Number.isInteger(reserve))throw Error("Percentages must be whole numbers");
   const params:TwofoldScenario={
    cashMicros:micro(twofold.cash),loansOutstandingMicros:micro(twofold.loans),
    totalSharesMicros:micro(twofold.shares),withdrawSharesMicros:micro(twofold.withdraw),
    maxUtilisationBps:util*100,minimumReserveBps:reserve*100
   };
   return {data:twofoldScenario(params),error:null};
  }catch(e){return {data:null,error:e instanceof Error?e.message:"Invalid liquidity inputs"};}
 },[twofold]);
 const long=product==="longbow";
 return <section className={styles.calculator} aria-label={long?"Longbow illustrative loan risk calculator":"Twofold illustrative liquidity calculator"}>
  <div className={styles.sectionHead}><h2>RISK SCENARIO / TEST ONLY</h2><span>OFFCHAIN MATHEMATICAL PREVIEW</span></div>
  <p className={styles.calcNotice}>Edit the scenario below. These inputs are hypothetical assumptions, not live prices, loan quotes, pool deposits or approved interest rates. <strong>No transactions are possible here.</strong></p>
  <div className={styles.calcGrid}>
   <div className={styles.calcForm}>
    {long?<>
     <Field label="Collateral shares" value={longbow.shares} onChange={shares=>setLongbow(s=>({...s,shares}))}/>
     <Field label="Assumed share price (USD)" value={longbow.price} onChange={price=>setLongbow(s=>({...s,price}))}/>
     <Field label="Illustrative outstanding loan (USD)" value={longbow.debt} onChange={debt=>setLongbow(s=>({...s,debt}))}/>
     <Field label="Illustrative annual interest (%)" value={longbow.interest} onChange={interest=>setLongbow(s=>({...s,interest}))}/>
     <Field label="Months accrued (30-day approximation)" value={longbow.months} onChange={months=>setLongbow(s=>({...s,months}))}/>
     <Field label="Initial loan-to-value ceiling (%)" value={longbow.initial} onChange={initial=>setLongbow(s=>({...s,initial}))}/>
     <Field label="Liquidation LTV (%)" value={longbow.liquidation} onChange={liquidation=>setLongbow(s=>({...s,liquidation}))}/>
    </>:<>
     <Field label="Available test pool cash (USD)" value={twofold.cash} onChange={cash=>setTwofold(s=>({...s,cash}))}/>
     <Field label="Outstanding loans (USD)" value={twofold.loans} onChange={loans=>setTwofold(s=>({...s,loans}))}/>
     <Field label="Total pool shares" value={twofold.shares} onChange={shares=>setTwofold(s=>({...s,shares}))}/>
     <Field label="Shares requested for withdrawal" value={twofold.withdraw} onChange={withdraw=>setTwofold(s=>({...s,withdraw}))}/>
     <Field label="Maximum utilisation (%)" value={twofold.util} onChange={util=>setTwofold(s=>({...s,util}))}/>
     <Field label="Required minimum cash reserve (%)" value={twofold.reserve} onChange={reserve=>setTwofold(s=>({...s,reserve}))}/>
    </>}
   </div>
   <div className={styles.calcResults}>
    {long?(longbowPreview.error?<p role="alert" className={styles.calcError}>{longbowPreview.error}</p>:longbowPreview.data?<div className={styles.metrics}>
     <div><span>ASSUMED COLLATERAL VALUE</span><b>{money(longbowPreview.data.collateralValueMicros)}</b></div>
     <div><span>MAX INITIAL BORROW (HYPOTHETICAL)</span><b>{money(longbowPreview.data.maxInitialBorrowMicros)}</b></div>
     <div><span>ACCRUED INTEREST (HYPOTHETICAL)</span><b>{money(longbowPreview.data.accruedInterestMicros)}</b></div>
     <div><span>DEBT INCLUDING INTEREST</span><b>{money(longbowPreview.data.totalDebtMicros)}</b></div>
     <div><span>HEALTH FACTOR (SCENARIO)</span><b>{ratio(longbowPreview.data.healthFactorBps)}</b></div>
     <div><span>LIQUIDATION PRICE (SCENARIO)</span><b>{longbowPreview.data.liquidationAtPriceMicros?money(longbowPreview.data.liquidationAtPriceMicros):"—"}</b></div>
     <div><span>RISK SIGNAL (NOT ONCHAIN)</span><b>{longbowPreview.data.liquidatableByReference?"BELOW REFERENCE THRESHOLD":"ABOVE REFERENCE THRESHOLD"}</b></div>
    </div>:null):(twofoldPreview.error?<p role="alert" className={styles.calcError}>{twofoldPreview.error}</p>:twofoldPreview.data?<div className={styles.metrics}>
     <div><span>TOTAL HYPOTHETICAL ASSETS</span><b>{money(twofoldPreview.data.totalAssetsMicros)}</b></div>
     <div><span>MINIMUM CASH RESERVE</span><b>{money(twofoldPreview.data.minimumReserveMicros)}</b></div>
     <div><span>LENDABLE UNDER ASSUMED LIMITS</span><b>{money(twofoldPreview.data.lendableMicros)}</b></div>
     <div><span>REQUESTED REDEMPTION</span><b>{money(twofoldPreview.data.requestedWithdrawalMicros)}</b></div>
     <div><span>IMMEDIATELY AVAILABLE (SCENARIO)</span><b>{money(twofoldPreview.data.immediatelyRedeemableMicros)}</b></div>
     <div><span>QUEUED / NOT AVAILABLE</span><b>{money(twofoldPreview.data.queuedWithdrawalMicros)}</b></div>
    </div>:null)}
    <div className={styles.calcBlocked}><strong>NO DEPOSIT / BORROW / WITHDRAW</strong><p>The maths works offline, but no issuer-backed stock collateral, loan pool, live cash, deployed debt validator or lender protection is established. Transaction controls are intentionally disabled.</p></div>
   </div>
  </div>
 </section>;
}
