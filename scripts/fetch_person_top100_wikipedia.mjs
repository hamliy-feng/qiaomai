import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
const P=path.join(ROOT,"data","presentation","R02");
const rows=fs.readFileSync(path.join(R,"person_priority_top100.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
function titleFrom(url){try{const u=new URL(url);return decodeURIComponent((u.pathname.split("/wiki/")[1]||"").replaceAll("_"," "))||null}catch{return null}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchBatch(titles){
 const params=new URLSearchParams({action:"query",format:"json",origin:"*",prop:"extracts|info",inprop:"url",exintro:"1",explaintext:"1",redirects:"1",converttitles:"1",titles:titles.join("|")});
 const ac=new AbortController(); const timer=setTimeout(()=>ac.abort(),15000);
 try{
  const r=await fetch("https://zh.wikipedia.org/w/api.php?"+params.toString(),{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (coursework research)","Accept":"application/json"},signal:ac.signal});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function norm(s){return String(s||"").replaceAll("_"," ").trim()}
const resultMap=new Map();
for(let i=0;i<rows.length;i+=20){
 const batch=rows.slice(i,i+20);
 const titles=batch.map(x=>titleFrom(x.wikipedia_zh)).filter(Boolean);
 let data=null;
 for(let a=0;a<4;a++){
  try{data=await fetchBatch(titles);break}catch(e){if(a===3)console.error("batch failed",i,e.message);else await sleep(1000*(a+1))}
 }
 if(data){
  const mapping=new Map(titles.map(t=>[norm(t),norm(t)]));
  for(const n of data.query?.normalized||[]) mapping.set(norm(n.from),norm(n.to));
  for(const r of data.query?.redirects||[]){
    const from=norm(r.from),to=norm(r.to);
    for(const [k,v] of mapping) if(v===from) mapping.set(k,to);
    mapping.set(from,to);
  }
  const pages=Object.values(data.query?.pages||{});
  const byTitle=new Map(pages.map(p=>[norm(p.title),p]));
  for(const x of batch){
    const input=norm(titleFrom(x.wikipedia_zh));
    const final=mapping.get(input)||input;
    const p=byTitle.get(final)||byTitle.get(input);
    resultMap.set(x.qid,{qid:x.qid,canonical_name:x.canonical_name,wikipedia_zh:x.wikipedia_zh,input_title:input,final_title:final,status:p&&!p.missing?"ok":"missing",pageid:p?.pageid||null,extract:p?.extract||null,fullurl:p?.fullurl||x.wikipedia_zh,retrieved_at:new Date().toISOString()});
  }
 }else{
  for(const x of batch)resultMap.set(x.qid,{qid:x.qid,canonical_name:x.canonical_name,wikipedia_zh:x.wikipedia_zh,status:"batch_error",retrieved_at:new Date().toISOString()});
 }
 fs.writeFileSync(path.join(R,"person_priority_top100_wikipedia_checkpoint.json"),JSON.stringify({done:Math.min(i+20,rows.length),total:rows.length,last_batch_start:i},null,2),"utf8");
 await sleep(400);
}
const all=rows.map(x=>resultMap.get(x.qid));
fs.writeFileSync(path.join(R,"person_priority_top100_wikipedia.jsonl"),all.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const by=new Map(rows.map(x=>[x.qid,x]));
const profiles=all.map(w=>{const x=by.get(w.qid);return {
 id:"person_wd_"+x.qid,type:"person",qid:x.qid,title:x.canonical_name,traditional_name:x.traditional_name||null,english_name:x.english_name||null,aliases:x.aliases||[],
 birth_date:x.birth_date||null,birth_place:x.birth_place_label||null,province_scope:x.province_scope,diaspora_signal_score:x.diaspora_signal_score,
 diaspora_signals:x.diaspora_signals||[],overseas_links:[...new Set((x.signal_targets||[]).map(t=>t.country_label||t.label).filter(Boolean))].slice(0,6),
 occupations:x.occupation_qids||[],description:x.description_zh||x.description_en||null,
 short_bio:(w?.extract||x.description_zh||x.description_en||"").replace(/\s+/g," ").trim().slice(0,320),
 sources:[{name:"Wikidata",url:x.source_url,license:"CC0"},...(w?.status==="ok"?[{name:"Wikipedia 中文",url:w.fullurl||x.wikipedia_zh,license:"CC BY-SA"}]:[])],
 image_candidate:x.image_file_name?{commons_file_name:x.image_file_name,status:"candidate_requires_license_and_visual_cleanliness_check"}:null,
 wikipedia_status:w?.status||"unknown",review_status:"basic_ready_candidate",publication_status:"preview_only"
}});
fs.writeFileSync(path.join(P,"persons_top100_basic_ready.jsonl"),profiles.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(P,"persons_top100_basic_ready_summary.json"),JSON.stringify({count:profiles.length,wikipedia_ok:all.filter(x=>x?.status==="ok").length,wikipedia_missing_or_error:all.filter(x=>x?.status!=="ok").length,with_nonempty_bio:profiles.filter(x=>x.short_bio).length,with_image_candidate:profiles.filter(x=>x.image_candidate).length},null,2),"utf8");
console.log(JSON.stringify({count:profiles.length,wikipedia_ok:all.filter(x=>x?.status==="ok").length,with_bio:profiles.filter(x=>x.short_bio).length},null,2));
