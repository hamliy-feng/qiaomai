import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),R=path.join(ROOT,"data","collection","R02"),P=path.join(ROOT,"data","presentation","R02");
const people=fs.readFileSync(path.join(R,"person_priority_top100.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const existing=fs.readFileSync(path.join(R,"person_priority_top100_wikipedia.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const map=new Map(existing.map(x=>[x.qid,x]));
function titleFrom(url){try{const u=new URL(url);return decodeURIComponent((u.pathname.split("/wiki/")[1]||"").replaceAll("_"," "))||null}catch{return null}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function one(title){
 const u=new URL("https://zh.wikipedia.org/w/api.php");for(const [k,v] of Object.entries({action:"query",format:"json",prop:"extracts|info",inprop:"url",exintro:"1",explaintext:"1",redirects:"1",titles:title}))u.searchParams.set(k,v);
 for(let a=0;a<4;a++){
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
  try{
   const r=await fetch(u,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (coursework research)","Accept":"application/json"},signal:ac.signal});
   if(r.ok){const j=await r.json();const p=Object.values(j.query?.pages||{})[0];return p&&!p.missing?{status:"ok",pageid:p.pageid||null,extract:p.extract||null,fullurl:p.fullurl||null,title:p.title}:{status:"missing"};}
   if(r.status!==429&&r.status!==503)return {status:"http_"+r.status};
  }catch(e){if(a===3)return {status:"error",error:e.message}} finally{clearTimeout(tm)}
  await sleep(2500*(a+1));
 }
 return {status:"retry_exhausted"};
}
const pending=people.filter(x=>map.get(x.qid)?.status!=="ok");
let n=0;
for(const x of pending){
 const t=titleFrom(x.wikipedia_zh); if(!t)continue;
 const res=await one(t); const rec={qid:x.qid,canonical_name:x.canonical_name,wikipedia_zh:x.wikipedia_zh,input_title:t,retrieved_at:new Date().toISOString(),...res};map.set(x.qid,rec);n++;
 fs.writeFileSync(path.join(R,"person_priority_top100_wikipedia_retry_checkpoint.json"),JSON.stringify({done:n,total:pending.length,last_qid:x.qid,last_status:rec.status},null,2),"utf8");
 await sleep(1200);
}
const all=people.map(x=>map.get(x.qid)||{qid:x.qid,canonical_name:x.canonical_name,wikipedia_zh:x.wikipedia_zh,status:"not_fetched"});
fs.writeFileSync(path.join(R,"person_priority_top100_wikipedia.jsonl"),all.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const old=fs.readFileSync(path.join(P,"persons_top100_basic_ready.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);const oldBy=new Map(old.map(x=>[x.qid,x]));
const updated=people.map(x=>{const b=oldBy.get(x.qid)||{};const w=map.get(x.qid);return {...b,short_bio:(w?.extract||b.short_bio||x.description_zh||x.description_en||"").replace(/\s+/g," ").trim().slice(0,320),wikipedia_status:w?.status||b.wikipedia_status||"unknown",sources:[{name:"Wikidata",url:x.source_url,license:"CC0"},...(w?.status==="ok"?[{name:"Wikipedia 中文",url:w.fullurl||x.wikipedia_zh,license:"CC BY-SA"}]:[])]};});
fs.writeFileSync(path.join(P,"persons_top100_basic_ready.jsonl"),updated.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const sum={count:updated.length,wikipedia_ok:all.filter(x=>x.status==="ok").length,wikipedia_missing_or_error:all.filter(x=>x.status!=="ok").length,with_nonempty_bio:updated.filter(x=>x.short_bio).length,with_image_candidate:updated.filter(x=>x.image_candidate).length};
fs.writeFileSync(path.join(P,"persons_top100_basic_ready_summary.json"),JSON.stringify(sum,null,2),"utf8");console.log(JSON.stringify(sum,null,2));