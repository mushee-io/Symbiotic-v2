"use client";
import {useEffect,useRef} from "react";

// This is a third-party public-equities REFERENCE chart, not a Cardano
// oracle, an executed Symbiotic trade, or evidence of any backed RWA token.
export function RwaReferenceChart({symbol,ticker}:{symbol:string;ticker:string}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;
  if(!root)return;
  root.replaceChildren();
  const widget=document.createElement("div");
  widget.className="tradingview-widget-container__widget";
  widget.style.height="calc(100% - 28px)";
  widget.style.width="100%";
  const attribution=document.createElement("div");
  attribution.className="tradingview-widget-copyright";
  attribution.style.cssText="height:28px;padding:7px 12px;font-size:11px;color:#9cb5a5;";
  const link=document.createElement("a");
  link.href="https://www.tradingview.com/symbols/"+encodeURIComponent(symbol.replace(":","-"))+"/";
  link.target="_blank";link.rel="noopener noreferrer nofollow";
  link.style.color="#c9ff3d";
  link.textContent=ticker+" chart by TradingView";
  attribution.appendChild(link);
  const script=document.createElement("script");
  script.async=true;
  script.type="text/javascript";
  script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.textContent=JSON.stringify({
   autosize:true,symbol,interval:"D",timezone:"exchange",theme:"dark",
   style:"1",locale:"en",backgroundColor:"#081711",
   gridColor:"rgba(136,163,144,0.12)",
   allow_symbol_change:false,hide_side_toolbar:true,
   hide_top_toolbar:false,withdateranges:true,hide_legend:false,
   save_image:false,calendar:false,support_host:"https://www.tradingview.com"
  });
  root.append(widget,attribution,script);
  return()=>{root.replaceChildren()};
 },[symbol,ticker]);
 return <div ref={host} className="tradingview-widget-container" style={{width:"100%",height:"100%"}} aria-label={ticker+" external stock price reference chart"}/>;
}
