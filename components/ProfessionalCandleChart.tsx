"use client";

import {useEffect,useMemo,useRef} from "react";
import {
 createChart,CandlestickSeries,LineSeries,HistogramSeries,
 CrosshairMode,type UTCTimestamp
} from "lightweight-charts";
import type {TerminalCandle} from "@/lib/terminal-market";

const POSITIVE="#00c781",NEGATIVE="#f23668";
const MOVING=[{n:5,color:"#fbbf24"},{n:10,color:"#e85caa"},{n:20,color:"#24cbde"}] as const;
function ma(candles:TerminalCandle[],period:number){
 return candles.flatMap((c,i)=>{
  if(i+1<period)return [];
  const avg=candles.slice(i-period+1,i+1).reduce((s,x)=>s+x.close,0)/period;
  return [{time:c.time as UTCTimestamp,value:avg}];
 });
}
export function ProfessionalCandleChart({candles,enabled}:{candles:TerminalCandle[];enabled:Record<number,boolean>}){
 const host=useRef<HTMLDivElement|null>(null);
 const seriesData=useMemo(()=>{
  const sorted=candles.filter(c=>Number.isFinite(c.close)&&c.close>0).sort((a,b)=>a.time-b.time);
  return {
   prices:sorted.map(c=>({time:c.time as UTCTimestamp,open:c.open,high:c.high,low:c.low,close:c.close})),
   volumes:sorted.map(c=>({time:c.time as UTCTimestamp,value:c.volume,color:c.close>=c.open?"#00c78185":"#f2366885"})),
   raw:sorted
  };
 },[candles]);
 useEffect(()=>{
  const element=host.current;
  if(!element||seriesData.prices.length<2)return;
  const chart=createChart(element,{
   width:element.clientWidth,height:element.clientHeight||465,
   autoSize:false,
   layout:{background:{type:"solid",color:"#000000"},textColor:"#a1a1a1",fontFamily:"Arial,sans-serif",fontSize:11},
   grid:{vertLines:{color:"#191919"},horzLines:{color:"#191919"}},
   crosshair:{mode:CrosshairMode.Normal},
   timeScale:{timeVisible:true,secondsVisible:false,borderColor:"#262626",rightOffset:6,barSpacing:9,minBarSpacing:3},
   rightPriceScale:{borderColor:"#262626",scaleMargins:{top:.09,bottom:.23}},
   localization:{priceFormatter:val=>Number(val).toLocaleString("en-US",{maximumFractionDigits:6})},
   handleScroll:true,handleScale:true
  });
  const price=chart.addSeries(CandlestickSeries,{
   upColor:POSITIVE,downColor:NEGATIVE,borderVisible:false,wickUpColor:POSITIVE,wickDownColor:NEGATIVE,
   priceLineVisible:true,lastValueVisible:true
  });
  price.setData(seriesData.prices);
  const volume=chart.addSeries(HistogramSeries,{priceScaleId:"volume",priceFormat:{type:"volume"},lastValueVisible:false,priceLineVisible:false});
  chart.priceScale("volume").applyOptions({scaleMargins:{top:.78,bottom:0}});
  volume.setData(seriesData.volumes);
  MOVING.forEach(({n,color})=>{
   if(!enabled[n])return;
   const line=chart.addSeries(LineSeries,{color,lineWidth:1,priceLineVisible:false,lastValueVisible:false,
    crosshairMarkerVisible:false});
   line.setData(ma(seriesData.raw,n));
  });
  chart.timeScale().fitContent();
  const resize=new ResizeObserver(entries=>{
   const r=entries[0]?.contentRect;
   if(r&&r.width>0&&r.height>0)chart.applyOptions({width:r.width,height:r.height});
  });
  resize.observe(element);
  return ()=>{resize.disconnect();chart.remove()};
 },[seriesData,enabled]);
 return <div ref={host} role="img" aria-label="Interactive OHLCV candlestick chart with volume histogram and moving averages" style={{width:"100%",height:"100%",minHeight:400,position:"relative"}}/>;
}
