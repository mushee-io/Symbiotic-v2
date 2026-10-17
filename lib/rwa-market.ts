export type RwaMarket = {
 id: string;
 label: string;
 ticker: string;
 symbol: string;
 category: "STOCK" | "ETF";
 tags: readonly ("POPULAR" | "TECH" | "AI" | "ETF")[];
 description: string;
 unit: null;
 timezone: "America/New_York";
 venue: "preprod";
};

// Public-market references ONLY. None of these is a minted Cardano stock,
// an issuer-backed share, an orderable instrument, or a price oracle.
export const RWA_MARKETS: RwaMarket[] = [
 {id:"aapl",ticker:"AAPL",label:"Apple",symbol:"NASDAQ:AAPL",category:"STOCK",tags:["POPULAR","TECH"],description:"Apple Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"nvda",ticker:"NVDA",label:"NVIDIA",symbol:"NASDAQ:NVDA",category:"STOCK",tags:["POPULAR","TECH","AI"],description:"NVIDIA Corp. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"tsla",ticker:"TSLA",label:"Tesla",symbol:"NASDAQ:TSLA",category:"STOCK",tags:["POPULAR","TECH"],description:"Tesla Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"msft",ticker:"MSFT",label:"Microsoft",symbol:"NASDAQ:MSFT",category:"STOCK",tags:["POPULAR","TECH","AI"],description:"Microsoft Corp. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"amzn",ticker:"AMZN",label:"Amazon",symbol:"NASDAQ:AMZN",category:"STOCK",tags:["POPULAR","TECH"],description:"Amazon.com Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"googl",ticker:"GOOGL",label:"Alphabet",symbol:"NASDAQ:GOOGL",category:"STOCK",tags:["POPULAR","TECH","AI"],description:"Alphabet Inc. Class A — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"meta",ticker:"META",label:"Meta",symbol:"NASDAQ:META",category:"STOCK",tags:["POPULAR","TECH","AI"],description:"Meta Platforms Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"amd",ticker:"AMD",label:"AMD",symbol:"NASDAQ:AMD",category:"STOCK",tags:["TECH","AI"],description:"Advanced Micro Devices — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"pltr",ticker:"PLTR",label:"Palantir",symbol:"NASDAQ:PLTR",category:"STOCK",tags:["AI"],description:"Palantir Technologies Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"coin",ticker:"COIN",label:"Coinbase",symbol:"NASDAQ:COIN",category:"STOCK",tags:["TECH"],description:"Coinbase Global Inc. — US listed equity reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"spy",ticker:"SPY",label:"SPDR S&P 500",symbol:"AMEX:SPY",category:"ETF",tags:["POPULAR","ETF"],description:"SPDR S&P 500 ETF Trust — ETF market reference",unit:null,timezone:"America/New_York",venue:"preprod"},
 {id:"qqq",ticker:"QQQ",label:"Invesco QQQ",symbol:"NASDAQ:QQQ",category:"ETF",tags:["POPULAR","ETF"],description:"Invesco QQQ Trust — ETF market reference",unit:null,timezone:"America/New_York",venue:"preprod"}
];

export const RWA_MARKET_OPERATIONAL = false;
// NYSE published 2026–2028 holidays and early closes. Fail closed in other years.
const HOLIDAYS: Record<string,string> = {
 "2026-01-01":"New Year's Day","2026-01-19":"Martin Luther King Jr. Day","2026-02-16":"Washington's Birthday","2026-04-03":"Good Friday",
 "2026-05-25":"Memorial Day","2026-06-19":"Juneteenth","2026-07-03":"Independence Day observed","2026-09-07":"Labor Day",
 "2026-11-26":"Thanksgiving","2026-12-25":"Christmas",
 "2027-01-01":"New Year's Day","2027-01-18":"Martin Luther King Jr. Day","2027-02-15":"Washington's Birthday","2027-03-26":"Good Friday",
 "2027-05-31":"Memorial Day","2027-06-18":"Juneteenth observed","2027-07-05":"Independence Day observed","2027-09-06":"Labor Day",
 "2027-11-25":"Thanksgiving","2027-12-24":"Christmas observed",
 "2028-01-17":"Martin Luther King Jr. Day","2028-02-21":"Washington's Birthday","2028-04-14":"Good Friday","2028-05-29":"Memorial Day",
 "2028-06-19":"Juneteenth","2028-07-04":"Independence Day","2028-09-04":"Labor Day","2028-11-23":"Thanksgiving","2028-12-25":"Christmas"
};
const EARLY_CLOSE: Record<string,number> = {"2026-11-27":780,"2026-12-24":780,"2027-11-26":780,"2028-07-03":780,"2028-11-24":780};
const formatter=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function parts(at:Date){
 const p=formatter.formatToParts(at);const get=(key:string)=>p.find(x=>x.type===key)?.value||"";
 return {date:get("year")+"-"+get("month")+"-"+get("day"),weekday:get("weekday"),minuteOfDay:Number(get("hour"))*60+Number(get("minute"))};
}
export function easternParts(at:Date){const p=parts(at);return {weekday:p.weekday,minuteOfDay:p.minuteOfDay};}
export function marketSession(at:Date){
 const current=parts(at),date=current.date,m=current.minuteOfDay;
 const calendarVerified=/^202[678]-/.test(date);
 const weekend=current.weekday==="Sat"||current.weekday==="Sun";
 const holiday=calendarVerified?HOLIDAYS[date]||null:null;
 const earlyCloseMinutes=calendarVerified?EARLY_CLOSE[date]||null:null;
 const close=earlyCloseMinutes||960;
 const regularOpen=calendarVerified&&!weekend&&!holiday&&m>=570&&m<close;
 const session=!calendarVerified?"CALENDAR_UNVERIFIED":weekend?"WEEKEND":holiday?"HOLIDAY":
  m<240?"OVERNIGHT":m<570?"PRE-MARKET":m<close?"REGULAR":
  earlyCloseMinutes?"EARLY_CLOSED":m<1200?"AFTER-HOURS":"OVERNIGHT";
 let nextRegularOpen:string|null=null;
 if(calendarVerified){
  const cursor=new Date(at.getTime());
  cursor.setUTCSeconds(0,0);cursor.setUTCMinutes(cursor.getUTCMinutes()-(cursor.getUTCMinutes()%30));
  for(let i=0;i<14*48;i++){
   if(cursor.getTime()>at.getTime()){
    const candidate=parts(cursor);
    if(/^202[678]-/.test(candidate.date)&&!HOLIDAYS[candidate.date]&&candidate.weekday!=="Sat"&&candidate.weekday!=="Sun"&&candidate.minuteOfDay===570){nextRegularOpen=cursor.toISOString();break;}
   }
   cursor.setTime(cursor.getTime()+1800000);
  }
 }
 return {session,weekend,regularOpen,nextRegularOpen,timezone:"America/New_York" as const,date,holiday,earlyCloseMinutes,calendarVerified,
 warning:"NYSE regular-session reference only. Instrument-specific halts and calendar updates need verification; no RWA market is executable."};
}
