import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, ChevronRight, CircleCheck, Layers3,
  MoveUpRight, ShieldCheck, Sparkles, Wallet, Waves
} from "lucide-react";
import {LiveHomepageOracle} from "@/components/LiveHomepageOracle";
import {PREPROD_LIVE} from "@/lib/preprod-live";
import styles from "@/app/landing-v2.module.css";

const ART_URL =
 "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85";
const USE_CASE_VIDEO =
 "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4";

const stack = [
  {name:"Cardano",font:"Georgia,serif",size:"21px",spacing:"-.045em",weight:"700"},
  {name:"AIKEN",font:"Arial,sans-serif",size:"17px",spacing:".13em",weight:"800"},
  {name:"PLUTUS V3",font:"Arial,sans-serif",size:"15px",spacing:".09em",weight:"700"},
  {name:"CIP-30",font:"'Courier New',monospace",size:"18px",spacing:".04em",weight:"700"},
  {name:"Mesh SDK",font:"'Trebuchet MS',sans-serif",size:"20px",spacing:"-.04em",weight:"700"},
  {name:"BLOCKFROST",font:"Verdana,sans-serif",size:"15px",spacing:".07em",weight:"700"},
  {name:"Koios",font:"Palatino,serif",size:"23px",spacing:"-.045em",weight:"500"},
] as const;

const features = [
  {
    num:"01",kind:"REAL WORLD ASSETS",title:"Assets, reimagined.",
    description:"Mint, transfer and verify synthetic test certificates on Cardano Preprod. Designed to make experiments visible and auditable.",
    route:"/rwa",action:"Discover RWA",className:styles.productCream,
  },
  {
    num:"02",kind:"COLLATERAL MARKETS",title:"Meet Folder.",
    description:"Explore Longbow for collateral-backed borrowing and Twofold for lending-liquidity infrastructure, currently in testnet development.",
    route:"/folder",action:"Explore Folder",className:styles.productLilac,
  },
  {
    num:"03",kind:"PORTFOLIO INTELLIGENCE",title:"See your positions.",
    description:"Connect a Preprod wallet to review on-chain balances, verified script positions and evidence-backed protocol activity.",
    route:"/portfolio",action:"Open Portfolio",className:styles.productBlue,
  },
  {
    num:"04",kind:"VAULTS & EARN",title:"Capital with clarity.",
    description:"Inspect testnet collateral and real Cardano staking observations while vault deposits and yield execution remain gated.",
    route:"/earn",action:"Explore Vaults",className:styles.productMint,
  },
] as const;

const steps=[
 {num:"01",title:"Connect",description:"Start with a CIP-30 wallet on Cardano Preprod."},
 {num:"02",title:"Discover",description:"Explore markets, test assets and modeled risk."},
 {num:"03",title:"Validate",description:"Read on-chain datums, collateral and oracle evidence."},
 {num:"04",title:"Verify",description:"Confirm transactions on Cardano instead of trusting a UI."},
] as const;

function HaloShape({className=""}:{className?:string}){
 return <svg className={className} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
  <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z"/>
 </svg>;
}

function PillLink({href,children,secondary=false}:{href:string;children:React.ReactNode;secondary?:boolean}){
 return <Link href={href} className={secondary?styles.secondaryPill:styles.pill}>
   <span>{children}</span><span className={styles.pillCircle}><ArrowRight size={19} strokeWidth={1.75} aria-hidden="true"/></span>
 </Link>;
}

export function SymbioticLanding(){
 return <div className={styles.landing}>
  <section className={styles.dataRibbon} aria-label="Symbiotic network snapshot">
   <div className={styles.container}>
    <div className={styles.dataGrid}>
      <div className={styles.dataItem}><span>NETWORK</span><strong><i className={styles.liveDot}/> CARDANO PREPROD</strong></div>
      <div className={styles.dataItem}><span>REFERENCE MARKET</span><strong>BTC / USD</strong></div>
      <div className={styles.dataItem}><span>REFERENCE PRICE</span><strong className={styles.oracle}><LiveHomepageOracle compact/></strong></div>
      <div className={styles.dataItem}><span>CORE CONTRACTS</span><strong>05 AIKEN VALIDATORS</strong></div>
    </div>
   </div>
  </section>

  <section className={styles.intro} id="ecosystem">
   <div className={styles.container}>
    <div className={styles.introTop}>
     <div>
      <span className={styles.eyebrow}>WELCOME TO THE NEXT GENERATION OF DEFI</span>
      <h2 className={styles.h2}>Meet<br/>Symbiotic V2<span className={styles.punctuation}>.</span></h2>
      <PillLink href="/trade">Discover it</PillLink>
     </div>
     <p className={styles.introBlurb}>A more fluid way to explore onchain finance. Trade the markets, experiment with real-world assets and keep every position in view — all on Cardano.</p>
    </div>
    <div className={styles.featureGrid}>
      <Link href="/trade" className={styles.featureArt} style={{backgroundImage:`url("${ART_URL}")`}}>
       <div className={styles.featureVisualTop}><span className={styles.miniLabel}>01 / YOUR MARKET, REIMAGINED</span><ArrowUpRight size={23} aria-hidden="true"/></div>
       <div className={styles.featureVisualBottom}><h3>Capital in motion.</h3><p>Explore BTC perpetuals and smart execution infrastructure designed for verifiable onchain settlement.</p></div>
      </Link>
      <Link href="/status/validators" className={styles.featurePurple}>
       <div><span className={styles.purpleEyebrow}>02 / BUILT WITH TRUST</span><ShieldCheck size={24} strokeWidth={1.4} aria-hidden="true"/></div>
       <h3>Transparent<br/>by design.</h3>
       <p>Follow validators, testnet receipts and collateral state. Every important claim should have proof behind it.</p>
       <ArrowUpRight className={styles.cardArrow} size={22} aria-hidden="true"/>
      </Link>
      <Link href="/folder" className={styles.featurePurple}>
       <div><span className={styles.purpleEyebrow}>03 / ONE ECOSYSTEM</span><Waves size={25} strokeWidth={1.4} aria-hidden="true"/></div>
       <h3>Fluid by<br/>nature.</h3>
       <p>Explore markets, test vaults, portfolio intelligence and next-generation lending from one connected experience.</p>
       <ArrowUpRight className={styles.cardArrow} size={22} aria-hidden="true"/>
      </Link>
    </div>
   </div>
  </section>

  <section className={styles.stackSection} aria-label="Technology stack">
    <div className={styles.container}>
     <div className={styles.stackGrid}>
      <div className={styles.stackCaption}>Built with open infrastructure.<small>Technology stack, not a list of investors or endorsements.</small></div>
      <div className={styles.marqueeWindow}>
       <div className={styles.marqueeTrack}>
         {[0,1].map(copy=><div className={styles.marqueeGroup} key={copy} aria-hidden={copy===1}>
           {stack.map(item=><span key={item.name} style={{fontFamily:item.font,fontSize:item.size,letterSpacing:item.spacing,fontWeight:item.weight}}>{item.name}</span>)}
         </div>)}
       </div>
      </div>
     </div>
    </div>
  </section>

  <section className={styles.uses} id="markets">
    <div className={styles.container}>
      <div className={styles.useLayout}>
        <div className={styles.useIntro}>
         <span className={styles.eyebrow}>SYMBIOTIC V2 IN PRACTICE</span>
         <h2 className={styles.useHeading}>Built for<br/>every move<span className={styles.punctuation}>.</span></h2>
         <p>Discover a connected ecosystem for traders, builders and treasury teams exploring transparent Cardano-native finance.</p>
         <div className={styles.useLinks}>
          <Link href="/trade">Trading terminal <ChevronRight size={18} aria-hidden="true"/></Link>
          <Link href="/rwa">Real-world assets <ChevronRight size={18} aria-hidden="true"/></Link>
          <Link href="/portfolio">Portfolio <ChevronRight size={18} aria-hidden="true"/></Link>
         </div>
        </div>
        <div className={styles.useVideoCard}>
         <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className={styles.useVideo}>
           <source src={USE_CASE_VIDEO} type="video/mp4"/>
         </video>
         <div className={styles.useVideoWash} aria-hidden="true"/>
         <div className={styles.useVideoContent}>
          <span className={styles.useTag}>01 / MARKETS</span>
          <h3>Trading,<br/>with intention.</h3>
          <p>Explore BTC/USD markets, understand margin and funding, and verify what is — and isn&apos;t — confirmed on Cardano Preprod.</p>
          <Link href="/trade" className={styles.circleAction}><span><ArrowRight size={17} aria-hidden="true"/></span> Explore trading</Link>
         </div>
         <div className={styles.videoBottom}>CARDANO-NATIVE MARKETS <span>↗</span></div>
        </div>
      </div>
    </div>
  </section>

  <section className={styles.products} id="rwa">
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
       <div><span className={styles.eyebrow}>DISCOVER THE ECOSYSTEM</span><h2 className={styles.h2}>A world of<br/>possibility<span className={styles.punctuation}>.</span></h2></div>
       <p>Everything you need to explore a more flexible onchain experience. Built progressively, with testnet proof before live execution.</p>
      </div>
      <div className={styles.productGrid}>
       {features.map(feature=><Link href={feature.route} className={`${styles.productCard} ${feature.className}`} key={feature.num}>
         <div className={styles.productTop}><span>{feature.num} / {feature.kind}</span><ArrowUpRight size={21} aria-hidden="true"/></div>
         <div className={styles.productIcon}>{feature.num==="01"?<Layers3/>:feature.num==="02"?<Waves/>:feature.num==="03"?<Wallet/>:<Sparkles/>}</div>
         <div className={styles.productCopy}><h3>{feature.title}</h3><p>{feature.description}</p></div>
         <span className={styles.productAction}>{feature.action} <ArrowRight size={17} aria-hidden="true"/></span>
       </Link>)}
      </div>
    </div>
  </section>

  <section className={styles.flowSection} id="architecture">
   <div className={styles.container}>
    <div className={styles.sectionHeader}>
      <div><span className={styles.eyebrow}>DESIGNED FOR CONFIDENCE</span><h2 className={styles.h2}>Simple on the surface.<br/>Precise underneath.</h2></div>
      <p>From connecting a wallet to checking contract state, a clear path through the details that matter.</p>
    </div>
    <div className={styles.steps}>
      {steps.map((step,i)=><div className={styles.step} key={step.num}>
       <span className={styles.stepNum}>{step.num}</span>
       <div className={styles.stepIcon}>{i===0?<Wallet/>:i===1?<MoveUpRight/>:i===2?<ShieldCheck/>:<CircleCheck/>}</div>
       <h3>{step.title}</h3>
       <p>{step.description}</p>
       {i<steps.length-1?<ArrowRight className={styles.stepArrow} size={22} aria-hidden="true"/>:null}
      </div>)}
    </div>
   </div>
  </section>

  <section className={styles.riskSection} id="risk">
   <div className={styles.container}>
    <div className={styles.riskBanner}>
      <div className={styles.riskCopy}><span className={styles.eyebrow}>SECURITY-FIRST DESIGN</span>
       <h2>Confidence starts<br/>with what you can verify.</h2>
       <p>Risk controls, oracle checks and fail-closed execution rules are part of the architecture. Production readiness still requires signed Preprod lifecycle evidence and independent review.</p>
       <PillLink href="/status/wiring" secondary>View protocol status</PillLink>
      </div>
      <div className={styles.riskGraphic} aria-hidden="true">
       <HaloShape className={styles.bigHalo}/>
       <div className={styles.riskFloatOne}><ShieldCheck size={18}/> SCRIPT VERIFICATION</div>
       <div className={styles.riskFloatTwo}><Layers3 size={18}/> UTxO STATE</div>
       <div className={styles.riskFloatThree}><CircleCheck size={18}/> FAILURE GATES</div>
      </div>
    </div>
   </div>
  </section>

  <section className={styles.proofSection} id="proof">
   <div className={styles.container}>
    <div className={styles.proofLayout}>
      <div><span className={styles.eyebrow}>EXPLORE THE EVIDENCE</span><h2 className={styles.h2}>Proof in every<br/>step<span className={styles.punctuation}>.</span></h2>
      <p className={styles.proofIntro}>An open approach to validator state, onchain collateral and tested transaction flows. See the underlying records instead of relying on a headline.</p>
      <PillLink href="/status/validators">Explore validators</PillLink></div>
      <div className={styles.proofPanel}>
       <div className={styles.proofPanelHeader}><span>CARDANO / PREPROD</span><span className={styles.testPill}><i/> TEST NETWORK</span></div>
       <div className={styles.proofLine}><span>REFERENCE MARKET</span><strong>BTC-USD</strong></div>
       <div className={styles.proofLine}><span>VALIDATOR SCRIPT HASH</span><code>{PREPROD_LIVE.perpetual.scriptHash}</code></div>
       <div className={styles.proofLine}><span>REFERENCE SCRIPT UTxO</span><code>{PREPROD_LIVE.perpetual.referenceUtxo}</code></div>
       <div className={styles.proofLine}><span>TRADING LIFECYCLE</span><strong>VERIFICATION IN PROGRESS</strong></div>
       <a href={`https://preprod.cexplorer.io/tx/${PREPROD_LIVE.perpetual.referenceUtxo.split("#")[0]}`} target="_blank" rel="noreferrer" className={styles.proofLink}>Inspect reference transaction <ArrowUpRight size={18}/></a>
       <p className={styles.proofNote}>A reference UTxO does not establish that all five validators or trading lifecycles are deployed and verified.</p>
      </div>
    </div>
   </div>
  </section>

  <section className={styles.finalSection} id="liquidity">
   <div className={styles.container}>
    <div className={styles.finalPanel}>
      <span className={styles.eyebrow}>ENTER SYMBIOTIC V2</span>
      <h2>Finance is changing.<br/>Move with it.</h2>
      <p>Explore derivatives, real-world asset experiments and a transparent foundation for onchain capital.</p>
      <PillLink href="/trade">Launch the application</PillLink>
      <HaloShape className={styles.finalHalo}/>
    </div>
   </div>
  </section>

  <footer className={styles.footer}>
   <div className={styles.container}>
    <div className={styles.footerGrid}>
     <div className={styles.footerBrand}><div><HaloShape className={styles.footerLogo}/><strong>Symbiotic V2</strong></div><p>A more fluid future for Cardano-native finance.</p><span>Currently building and testing on Cardano Preprod.</span></div>
     <div className={styles.footerLinks}><h3>Explore</h3><Link href="/trade">Trade</Link><Link href="/rwa">RWA Lab</Link><Link href="/folder">Folder</Link><Link href="/portfolio">Portfolio</Link><Link href="/earn">Vault &amp; Earn</Link></div>
     <div className={styles.footerLinks}><h3>Developers</h3><Link href="/status/validators">Validator Status</Link><Link href="/status/wiring">Product Readiness</Link><Link href="/stats">Network Stats</Link><a href="https://github.com/mushee-io/Symbiotic-v2" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={13}/></a></div>
    </div>
    <div className={styles.footerBottom}><span>© 2026 Symbiotic V2 · Cardano Preprod</span><span>Built for the next wave of DeFi.</span></div>
   </div>
  </footer>
 </div>;
}
