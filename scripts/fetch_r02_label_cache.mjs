import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DIR=path.join(ROOT,"data","collection","R02");
const inputName=fs.existsSync(path.join(DIR,"person_candidates_1000_cleaned_enriched.jsonl"))?"person_candidates_1000_cleaned_enriched.jsonl":"person_candidates_1000_enriched.jsonl";
const rows=fs.readFileSync(path.join(DIR,inputName),"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const ids=new Set();
for(const x of rows){
  for(const k of ["gender_qids","occupation_qids","citizenship_qids","father_qids","mother_qids","spouse_qids","child_qids"]){for(const q of x[k]||[])ids.add(q);}
  if(x.birth_place_qid) ids.add(x.birth_place_qid);
  for(const q of x.ancestral_home_qids||[]) ids.add(q);
}
const list=[...ids];
const cachePath=path.join(DIR,"wikidata_related_label_cache.json");
let cache={};
if(fs.existsSync(cachePath)){try{cache=JSON.parse(fs.readFileSync(cachePath,"utf8"));}catch{}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pending=list.filter(q=>!cache[q]);
console.log("already",Object.keys(cache).length,"pending",pending.length,"total",list.length);
for(let i=0;i<pending.length;i+=40){
 const batch=pending.slice(i,i+40);
 const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids="+encodeURIComponent(batch.join("|"))+"&props=labels|descriptions&languages=zh|zh-hant|zh-cn|en&languagefallback=1&origin=*";
 let j=null,last=null;
 for(let k=0;k<6;k++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":"QiaomaiAcademicProject/1.0 (non-commercial coursework)","Accept":"application/json"}});
   if(r.status===429){
    const retry=Number(r.headers.get("retry-after")||5);
    await sleep(Math.max(5000,retry*1000)*(k+1));
    continue;
   }
   if(!r.ok)throw new Error("HTTP "+r.status);
   j=await r.json();break;
  }catch(e){last=e;await sleep(3000*(k+1));}
 }
 if(!j){console.error("batch_failed",i,last?.message||"429");break;}
 for(const q of batch){
  const e=j.entities?.[q]||{};
  cache[q]={zh:e.labels?.["zh-cn"]?.value||e.labels?.zh?.value||null,zh_hant:e.labels?.["zh-hant"]?.value||null,en:e.labels?.en?.value||null,description_zh:e.descriptions?.zh?.value||e.descriptions?.["zh-cn"]?.value||null,description_en:e.descriptions?.en?.value||null};
 }
 fs.writeFileSync(cachePath,JSON.stringify(cache,null,2),"utf8");
 console.log("cached",Object.keys(cache).length,"/",list.length);
 await sleep(1800);
}
const relevantCached=list.filter(q=>cache[q]).length;
console.log(JSON.stringify({cached_total:Object.keys(cache).length,relevant_cached:relevantCached,total:list.length,complete:relevantCached===list.length},null,2));
