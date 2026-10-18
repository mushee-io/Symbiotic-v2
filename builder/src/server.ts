import {createServer,type IncomingMessage,type ServerResponse} from "node:http";
import {PreprodBuilder} from "./builder.js";
import {configured,safeEqual} from "./policy.js";

const config=configured();
const builder=new PreprodBuilder(config.key);
function response(res:ServerResponse,status:number,body:object){
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(body));
}
async function json(req:IncomingMessage){
 const parts:Buffer[]=[];let size=0;
 for await (const data of req){
  const b=Buffer.isBuffer(data)?data:Buffer.from(data);
  size+=b.length;if(size>180000)throw Error("Request too large");
  parts.push(b);
 }
 return JSON.parse(Buffer.concat(parts).toString("utf8")) as Record<string,unknown>;
}
const server=createServer(async(req,res)=>{
 try{
  if(req.url==="/healthz"&&req.method==="GET")
   return response(res,200,{service:"symbiotic-preprod-builder",running:true,network:"preprod",actions:["WALLET_SELF_TEST"]});
  if(!safeEqual(req.headers.authorization?.replace(/^Bearer /,""),config.token))
   return response(res,401,{error:"Unauthorized"});
  if(req.method==="GET"&&req.url==="/ready"){
   try{return response(res,200,await builder.ready(config.key));}
   catch{return response(res,503,{ready:false,network:"preprod",error:"Preprod provider not ready"});}
  }
  if(req.method==="POST"&&req.url==="/prepare"){
   const body=await json(req);
   const result=await builder.prepare(body as Parameters<typeof builder.prepare>[0]);
   return response(res,200,result);
  }
  if(req.method==="POST"&&req.url==="/assemble"){
   const body=await json(req);
   const result=builder.assemble(body as Parameters<typeof builder.assemble>[0]);
   return response(res,200,result);
  }
  return response(res,404,{error:"Not found"});
 }catch(error){
  const message=error instanceof Error?error.message:"Builder request failed";
  console.error("Builder rejected request:",message.replace(/preprod[a-z0-9]{15,}/gi,"[BLOCKFROST_KEY]"));
  return response(res,400,{error:"Builder request rejected; check local operator logs"});
 }
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.listen(config.port,config.host,()=>{
 console.log("Symbiotic Preprod-only builder listening on loopback port "+config.port+"; action: WALLET_SELF_TEST; script transactions: disabled");
});
