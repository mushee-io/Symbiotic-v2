"use client";

import Link from "next/link";
import {useState} from "react";
import {ArrowUpRight, ChevronRight, Menu, Sparkles, X} from "lucide-react";
import {motion} from "motion/react";

/**
 * RIVR-inspired editorial hero, adapted to the real Symbiotic V2 product.
 * Only the homepage adopts the light theme. Trading and protocol routes retain
 * their existing layout and wallet controls.
 */
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260428_193507_4286c423-2fd9-4efd-92bd-91a939453fc1.mp4";

const sections = [
  {title:"Ecosystem", href:"#rwa", hasDropdown:false},
  {title:"Economics", href:"#liquidity", hasDropdown:true},
  {title:"Developers", href:"#architecture", hasDropdown:false},
  {title:"Governance", href:"#proof", hasDropdown:true},
] as const;

function Navbar(){
  const [open,setOpen]=useState(false);
  return (
    <nav aria-label="Symbiotic homepage navigation" className="relative z-20 flex w-full items-center justify-between px-6 py-6 md:px-10">
      <div className="hidden flex-1 md:block" aria-hidden="true" />
      <ul className="hidden items-center gap-8 text-sm font-normal text-[rgb(45,45,45)] md:flex">
        {sections.map(item=><li key={item.title}>
          <a className="group flex cursor-pointer items-center gap-1 transition-opacity hover:opacity-70" href={item.href}>
            {item.title}
            {item.hasDropdown?<ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5"/>:null}
          </a>
        </li>)}
      </ul>
      <div className="flex flex-1 items-center justify-between md:justify-end">
        <Link href="/" aria-label="Symbiotic home" className="text-xl font-normal tracking-[-.06em] text-[rgba(30,50,90,.9)] md:hidden">
          SYMBIOTIC
        </Link>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{scale:1.02}} whileTap={{scale:.98}}>
            <Link href="/trade" className="group flex items-center gap-2 rounded-full bg-[rgba(30,50,90,.8)] py-1.5 pl-2 pr-4 text-white transition-colors hover:bg-[rgba(30,50,90,1)] md:gap-3 md:py-2 md:pr-6">
              <span className="flex items-center justify-center rounded-full bg-white/20 p-1 md:p-1.5">
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-white md:h-5 md:w-5" />
              </span>
              <span className="text-xs font-normal md:text-sm">Launch App</span>
            </Link>
          </motion.div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-500/20 bg-white/50 text-slate-800 md:hidden"
            type="button"
            aria-label={open?"Close navigation":"Open navigation"}
            aria-expanded={open}
            aria-controls="symbiotic-mobile-nav"
            onClick={()=>setOpen(!open)}
          >
            {open?<X size={18}/>:<Menu size={18}/>}
          </button>
        </div>
      </div>
      {open?<div id="symbiotic-mobile-nav" className="absolute left-6 right-6 top-[76px] z-30 flex flex-col gap-1 rounded-3xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-2xl md:hidden">
        {sections.map(item=><a key={item.title} href={item.href} onClick={()=>setOpen(false)} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-[#233451] hover:bg-[#f0f0f0]">
          {item.title}<ChevronRight size={15} aria-hidden="true"/>
        </a>)}
        <Link href="/portfolio" className="rounded-2xl px-4 py-3 text-sm text-[#233451] hover:bg-[#f0f0f0]">Portfolio</Link>
        <Link href="/folder" className="rounded-2xl px-4 py-3 text-sm text-[#233451] hover:bg-[#f0f0f0]">Folder</Link>
      </div>:null}
    </nav>
  );
}

function HeroBadge(){
  return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
    transition={{duration:.6,ease:"easeOut"}}
    className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 py-2 backdrop-blur-md">
    <Sparkles aria-hidden="true" className="h-4 w-4 text-[rgba(30,50,90,.8)]"/>
    <span className="text-[14px] font-normal text-[rgba(30,50,90,.9)]">Cardano-native DeFi</span>
  </motion.div>;
}

function BottomLeftCard(){
  return <motion.div initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}}
    transition={{duration:.8,delay:.2}}
    className="absolute bottom-28 right-4 left-auto flex w-fit min-w-[140px] flex-col gap-2 rounded-[1.2rem] bg-white/30 p-3 backdrop-blur-xl md:bottom-6 md:right-auto md:left-6 md:min-w-[150px] md:rounded-[1.5rem] md:p-4 lg:bottom-10 lg:left-10 lg:min-w-[180px] lg:gap-3 lg:rounded-[2.2rem] lg:p-5">
    <div className="flex flex-col">
      <span className="text-2xl font-normal tracking-tight text-[rgba(30,50,90,.9)] md:text-3xl">05</span>
      <span className="text-[10px] font-normal uppercase tracking-wider text-[rgba(30,50,90,.6)] md:text-[12px]">Core Aiken validators</span>
      <span className="mt-1 text-[11px] text-[#364862]/70">Compiled · Preprod testing</span>
    </div>
    <motion.div whileHover={{scale:1.02}} whileTap={{scale:.98}} className="self-start">
      <Link href="/trade" className="group flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-5 transition-colors hover:bg-white/90">
        <span className="flex items-center justify-center rounded-full bg-[rgba(30,50,90,.1)] p-1">
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-[rgba(30,50,90,.9)]"/>
        </span>
        <span className="text-[14px] font-normal text-[rgba(30,50,90,.9)]">Explore Markets</span>
      </Link>
    </motion.div>
  </motion.div>;
}

function BottomRightCorner(){
  return <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}}
    transition={{duration:.8,delay:.4}}
    className="absolute right-0 bottom-0 flex items-center gap-3 rounded-tl-[1.5rem] bg-[#f0f0f0] p-3 pt-5 pl-8 sm:gap-4 sm:rounded-tl-[2rem] sm:p-4 sm:pt-6 sm:pl-10 md:gap-6 md:rounded-tl-[3.5rem] md:p-6 md:pt-8 md:pl-14">
    <div aria-hidden="true" className="pointer-events-none absolute -top-[1.5rem] right-0 h-[1.5rem] w-[1.5rem] sm:-top-[2rem] sm:h-[2rem] sm:w-[2rem] md:-top-[3.5rem] md:h-[3.5rem] md:w-[3.5rem]">
      <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M56 56V0C56 30.9279 30.9279 56 0 56H56Z" fill="#f0f0f0"/>
      </svg>
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -left-[1.5rem] h-[1.5rem] w-[1.5rem] sm:-left-[2rem] sm:h-[2rem] sm:w-[2rem] md:-left-[3.5rem] md:h-[3.5rem] md:w-[3.5rem]">
      <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M56 56H0C30.9279 56 56 30.9279 56 0V56Z" fill="#f0f0f0"/>
      </svg>
    </div>
    <Link href="https://github.com/mushee-io/Symbiotic-v2#readme" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 sm:gap-4 md:gap-6" aria-label="Read Symbiotic technical documentation">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(30,50,90,.1)] bg-[rgba(30,50,90,.05)] md:h-14 md:w-14">
        <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-[rgba(30,50,90,.8)] md:h-6 md:w-6"/>
      </span>
      <span className="flex flex-col gap-1 text-left">
        <span className="text-[16px] font-normal text-[rgba(30,50,90,.95)] md:text-[20px]">Documentation</span>
        <span className="flex items-center gap-1 text-[rgba(30,50,90,.6)] transition-colors group-hover:text-[rgba(30,50,90,.8)]">
          <span className="text-[12px] font-normal md:text-[15px]">Library</span>
          <ChevronRight aria-hidden="true" className="h-4 w-4"/>
        </span>
      </span>
    </Link>
  </motion.div>;
}

export function FluidHero(){
  return <div className="flex h-[100dvh] min-h-[650px] w-full items-center justify-center bg-[#f0f0f0] p-3 md:h-screen md:min-h-[690px] md:p-5" style={{fontFamily:'"Helvetica Regular", ui-sans-serif, system-ui, sans-serif'}}>
    <section className="group relative flex h-full w-full max-w-[1536px] flex-col items-center overflow-hidden rounded-[1.5rem] bg-[#d6e0e7] shadow-none md:rounded-[3rem]" aria-label="Symbiotic fluid DeFi homepage hero">
      <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover object-[65%] lg:object-center">
        <source src={HERO_VIDEO} type="video/mp4"/>
      </video>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/35 via-white/5 to-slate-100/10"/>
      <div className="relative z-10 flex h-full w-full flex-col items-center">
        <Navbar/>
        <div className="flex w-full max-w-4xl flex-col items-center px-6 pt-8 text-center">
          <HeroBadge/>
          <motion.h1 initial={{opacity:0,scale:.98}} animate={{opacity:1,scale:1}}
            transition={{duration:.8,delay:.2}}
            className="mb-2 text-4xl leading-[1.05] font-normal tracking-tight text-[#5E6470] sm:text-5xl md:text-6xl lg:text-[80px]">
            Fluid Asset Streams
          </motion.h1>
          <motion.p initial={{opacity:0}} animate={{opacity:1}}
            transition={{duration:.8,delay:.4}}
            className="max-w-xl text-sm leading-relaxed font-normal text-[#5E6470] opacity-80 sm:text-base md:text-lg">
            Explore perpetual markets, testnet vault infrastructure and transparent onchain positions with Symbiotic on Cardano.
          </motion.p>
        </div>
        <BottomLeftCard/>
        <BottomRightCorner/>
      </div>
    </section>
  </div>;
}
