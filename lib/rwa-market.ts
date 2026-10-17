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
export function easternParts(at:Date) { const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(at);const part=(name:string)=>parts.find(p=>p.type===name)?.value||"";return {weekday:part("weekday"),minuteOfDay:Number(part("hour"))*60+Number(part("minute")||0)}; }
export function marketSession(at:Date) { const p=easternParts(at);const weekend=p.weekday==="Sat"||p.weekday==="Sun";const m=p.minuteOfDay;const session=weekend?"WEEKEND":m<240?"OVERNIGHT":m<570?"PRE-MARKET":m<960?"REGULAR":m<1200?"AFTER-HOURS":"OVERNIGHT";const candidate=new Date(at.getTime());candidate.setSeconds(0,0);candidate.setMinutes(candidate.getMinutes()<30?0:30);let next:null|Date=null;for(let i=1;i<=7*48;i++){candidate.setTime(candidate.getTime()+1800000);const t=easternParts(candidate);if(t.weekday!=="Sat"&&t.weekday!=="Sun"&&t.minuteOfDay===570){next=new Date(candidate);break;}}return {session,weekend,regularOpen:!weekend&&m>=570&&m<960,nextRegularOpen:next?.toISOString()||null,timezone:"America/New_York" as const,warning:"Illustrative US Eastern session clock only. Holidays and asset calendars are not configured; no RWA market is executable."}; }
