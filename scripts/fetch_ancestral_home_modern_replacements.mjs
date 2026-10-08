import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const current=fs.readFileSync(path.join(D,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const currentQ=new Set(current.map(x=>x.qid));
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const countries=["Q30","Q16","Q334","Q833","Q252","Q928","Q869","Q881","Q408","Q145","Q1054923","Q258","Q419","Q241","Q804","Q1027","Q836","Q424","Q921","Q664","Q142","Q55","Q884","Q17","Q38","Q183","Q159","Q34","Q29","Q31","Q39","Q189","Q211","Q213","Q36","Q218","Q224","Q27","Q33","Q191","Q40","Q32","Q20"];
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; Wikidata CC0)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sparql(q){
 const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
 let last;
 for(let a=0;a<6;a++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});
   if(r.status===429){await sleep(4000*(a+1));continue;}
   if(!r.ok)throw new Error("HTTP "+r.status);
   return await r.json();
  }catch(e){last=e;await sleep(2500*(a+1));}
 }
 throw last;
}
const out=[];
for(const [province,pqid] of provinces){
 const q=`SELECT DISTINCT ?item ?itemLabel ?birthDate ?home ?homeLabel ?citizenship ?citizenshipLabel WHERE {
   ?item wdt:P31 wd:Q5; wdt:P66 ?home; wdt:P27 ?citizenship; wdt:P569 ?birthDate.
   ?home wdt:P131* wd:${pqid}.
   VALUES ?citizenship { ${countries.map(x=>"wd:"+x).join(" ")} }
   FILTER(YEAR(?birthDate) >= 1800 && YEAR(?birthDate) <= 1980)
   SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hant,en". }
 } ORDER BY ?birthDate LIMIT 500`;
 const j=await sparql(q);
 for(const b of j.results.bindings){
  const qid=b.item.value.split("/").pop(); if(currentQ.has(qid))continue;
  out.push({
   qid,canonical_name:b.itemLabel?.value||qid,birth_date:b.birthDate?.value||null,
   ancestral_home_qid:b.home?.value?.split("/").pop()||null,ancestral_home_label:b.homeLabel?.value||null,
   province_scope:province,citizenship_qid:b.citizenship?.value?.split("/").pop()||null,citizenship_label:b.citizenshipLabel?.value||null,
   source_url:"https://www.wikidata.org/wiki/"+qid,source_name:"Wikidata",license:"CC0",
   diaspora_signals:["ancestral_home_"+province.toLowerCase(),"foreign_citizenship"],
   scope_status:"strong_candidate",review_status:"candidate"
  });
 }
 fs.writeFileSync(path.join(D,"person_ancestral_modern_checkpoint.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+(out.length?"\n":""),"utf8");
 console.log(province,"rows",j.results.bindings.length,"new_total",out.length);
 await sleep(1200);
}
const by=new Map();
for(const x of out){
 if(!by.has(x.qid))by.set(x.qid,{...x,citizenships:[]});
 const z=by.get(x.qid); if(x.citizenship_qid&&!z.citizenships.some(c=>c.qid===x.citizenship_qid))z.citizenships.push({qid:x.citizenship_qid,label:x.citizenship_label});
}
const uniq=[...by.values()];
fs.writeFileSync(path.join(D,"person_ancestral_modern_raw.jsonl"),uniq.map(x=>JSON.stringify(x)).join("\n")+(uniq.length?"\n":""),"utf8");
console.log(JSON.stringify({unique:uniq.length,gd:uniq.filter(x=>x.province_scope==="Guangdong").length,fj:uniq.filter(x=>x.province_scope==="Fujian").length,sample:uniq.slice(0,20).map(x=>({qid:x.qid,name:x.canonical_name,birth:x.birth_date,home:x.ancestral_home_label,cit:x.citizenships}))},null,2));