import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const current=fs.readFileSync(path.join(D,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const currentQ=new Set(current.map(x=>x.qid));
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; Wikidata CC0)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchJson(url){
  let last=null;
  for(let a=0;a<6;a++){
    try{
      const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});
      if(r.status===429){await sleep(3500*(a+1));continue;}
      if(!r.ok)throw new Error("HTTP "+r.status);
      return await r.json();
    }catch(e){last=e;await sleep(2000*(a+1));}
  }
  throw last||new Error("fetch failed");
}
const out=[];
for(const [province,pqid] of provinces){
 const q=`SELECT DISTINCT ?item ?itemLabel ?birthDate ?home ?homeLabel ?citizenship ?citizenshipLabel WHERE {
   ?item wdt:P31 wd:Q5; wdt:P66 ?home; wdt:P27 ?citizenship.
   ?home wdt:P131* wd:${pqid}.
   FILTER(?citizenship != wd:Q148 && ?citizenship != wd:Q8646 && ?citizenship != wd:Q14773)
   OPTIONAL { ?item wdt:P569 ?birthDate. }
   FILTER(!BOUND(?birthDate) || YEAR(?birthDate) <= 1980)
   SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hant,en". }
 } LIMIT 350`;
 const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
 const j=await fetchJson(url);
 for(const b of j.results.bindings){
   const qid=b.item.value.split("/").pop();
   if(currentQ.has(qid))continue;
   out.push({
     qid,canonical_name:b.itemLabel?.value||qid,birth_date:b.birthDate?.value||null,
     ancestral_home_qid:b.home?.value?.split("/").pop()||null,
     ancestral_home_label:b.homeLabel?.value||null,
     province_scope:province,
     citizenship_qid:b.citizenship?.value?.split("/").pop()||null,
     citizenship_label:b.citizenshipLabel?.value||null,
     source_url:"https://www.wikidata.org/wiki/"+qid,source_name:"Wikidata",license:"CC0",
     diaspora_signals:["ancestral_home_"+province.toLowerCase(),"foreign_citizenship"],
     scope_status:"strong_candidate",review_status:"candidate"
   });
 }
 fs.writeFileSync(path.join(D,"person_ancestral_replacements_checkpoint.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+(out.length?"\n":""),"utf8");
 console.log(province,"raw",j.results.bindings.length,"new_total",out.length);
 await sleep(1000);
}
const by=new Map();
for(const x of out){
 if(!by.has(x.qid))by.set(x.qid,{...x,citizenships:[]});
 const z=by.get(x.qid); if(x.citizenship_qid&&!z.citizenships.some(c=>c.qid===x.citizenship_qid))z.citizenships.push({qid:x.citizenship_qid,label:x.citizenship_label});
}
const uniq=[...by.values()];
fs.writeFileSync(path.join(D,"person_ancestral_replacements_raw.jsonl"),uniq.map(x=>JSON.stringify(x)).join("\n")+(uniq.length?"\n":""),"utf8");
console.log(JSON.stringify({unique:uniq.length,gd:uniq.filter(x=>x.province_scope==="Guangdong").length,fj:uniq.filter(x=>x.province_scope==="Fujian").length},null,2));