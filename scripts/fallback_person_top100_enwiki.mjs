import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),R=path.join(ROOT,"data","collection","R02"),P=path.join(ROOT,"data","presentation","R02");
const pri=fs.readFileSync(path.join(R,"person_priority_top100.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const zh=fs.readFileSync(path.join(R,"person_priority_top100_wikipedia.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const zmap=new Map(zh.map(x=>[x.qid,x]));
function titleFrom(url){try{const u=new URL(url);return decodeURIComponent((u.pathname.split("/wiki/")[1]||"").replaceAll("_"," "))||null}catch{return null}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchOne(lang,title){
 const u=new URL("https://"+lang+".wikipedia.org/w/api.php");for(const [k,v] of Object.entries({action:"query",format:"json",prop:"extracts|info",inprop:"url",exintro:"1",explaintext:"1",redirects:"1",titles:title}))u.searchParams.set(k,v);
 for(let a=0;a<4;a++){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);try{const r=await fetch(u,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0","Accept":"application/json"},signal:ac.signal});if(r.ok){const j=await r.json();const p=Object.values(j.query?.pages||{})[0];if(p&&!p.missing)return {status:"ok",extract:p.extract||null,fullurl:p.fullurl||null,title:p.title};return {status:"missing"};}if(r.status!==429&&r.status!==503)return {status:"http_"+r.status};}catch(e){if(a===3)return {status:"error",error:e.message}}finally{clearTimeout(tm)}await sleep(2500*(a+1));}return {status:"retry_exhausted"};
}
const fallback=[];
for(const x of pri.filter(x=>zmap.get(x.qid)?.status!=="ok")){
 const title=titleFrom(x.wikipedia_en);let rec={qid:x.qid,status:"no_enwiki",canonical_name:x.canonical_name};
 if(title){const r=await fetchOne("en",title);rec={qid:x.qid,canonical_name:x.canonical_name,wikipedia_en:x.wikipedia_en,...r,retrieved_at:new Date().toISOString()};}
 fallback.push(rec);await sleep(1300);
}
fs.writeFileSync(path.join(R,"person_priority_top100_wikipedia_en_fallback.jsonl"),fallback.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const fb=new Map(fallback.map(x=>[x.qid,x]));const profiles=fs.readFileSync(path.join(P,"persons_top100_basic_ready.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const updated=profiles.map(p=>{const f=fb.get(p.qid);if(!f||f.status!=="ok")return p;return {...p,short_bio:(p.wikipedia_status==="ok"?p.short_bio:(f.extract||p.short_bio||"")).replace(/\s+/g," ").trim().slice(0,320),wikipedia_en_status:"ok",sources:[...(p.sources||[]),{name:"Wikipedia English",url:f.fullurl||f.wikipedia_en,license:"CC BY-SA"}]};});
fs.writeFileSync(path.join(P,"persons_top100_basic_ready.jsonl"),updated.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const resolved=pri.filter(x=>zmap.get(x.qid)?.status==="ok"||fb.get(x.qid)?.status==="ok").length;
const sum={count:100,resolved_wikipedia_any_language:resolved,zh_wikipedia_ok:zh.filter(x=>x.status==="ok").length,en_fallback_ok:fallback.filter(x=>x.status==="ok").length,unresolved:100-resolved,with_nonempty_bio:updated.filter(x=>x.short_bio).length,with_image_candidate:updated.filter(x=>x.image_candidate).length};
fs.writeFileSync(path.join(P,"persons_top100_basic_ready_summary.json"),JSON.stringify(sum,null,2),"utf8");console.log(JSON.stringify(sum,null,2));