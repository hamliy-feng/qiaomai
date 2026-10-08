import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const currentQ=new Set(fs.readFileSync(path.join(D,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse).map(x=>x.qid));
const alreadyQ=new Set(fs.readFileSync(path.join(D,"person_ancestral_modern_raw.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse).map(x=>x.qid));
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const signals=[
["foreign_residence","?item wdt:P551 ?target. ?target wdt:P17 ?country."],
["death_abroad","?item wdt:P20 ?target. ?target wdt:P17 ?country."],
["employer_abroad","?item wdt:P108 ?target. ?target wdt:P17 ?country."],
["work_location_abroad","?item wdt:P937 ?target. ?target wdt:P17 ?country."]
];
const UA="QiaomaiAcademicProject/1.0";const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sparql(q){const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);let last;for(let a=0;a<6;a++){try{const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});if(r.status===429){await sleep(3500*(a+1));continue;}if(!r.ok)throw new Error("HTTP "+r.status);return await r.json();}catch(e){last=e;await sleep(2200*(a+1));}}throw last;}
const out=[];
for(const [province,pqid] of provinces){
 for(const [sig,pat] of signals){
  const q=`SELECT DISTINCT ?item ?itemLabel ?birthDate ?home ?homeLabel ?target ?targetLabel ?country ?countryLabel WHERE {
    ?item wdt:P31 wd:Q5; wdt:P66 ?home; wdt:P569 ?birthDate.
    ?home wdt:P131* wd:${pqid}.
    ${pat}
    FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)
    FILTER(YEAR(?birthDate) >= 1800 && YEAR(?birthDate) <= 1980)
    SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hant,en". }
  } LIMIT 120`;
  const j=await sparql(q);
  for(const b of j.results.bindings){
   const qid=b.item.value.split("/").pop(); if(currentQ.has(qid)||alreadyQ.has(qid))continue;
   out.push({qid,canonical_name:b.itemLabel?.value||qid,birth_date:b.birthDate?.value||null,ancestral_home_qid:b.home?.value?.split("/").pop()||null,ancestral_home_label:b.homeLabel?.value||null,province_scope:province,diaspora_signals:["ancestral_home_"+province.toLowerCase(),sig],signal_targets:[{signal:sig,qid:b.target?.value?.split("/").pop()||null,label:b.targetLabel?.value||null,country_qid:b.country?.value?.split("/").pop()||null,country_label:b.countryLabel?.value||null}],source_url:"https://www.wikidata.org/wiki/"+qid,source_name:"Wikidata",license:"CC0",scope_status:"strong_candidate",review_status:"candidate"});
  }
  console.log(province,sig,j.results.bindings.length,"acc",out.length);
  fs.writeFileSync(path.join(D,"person_ancestral_extra_checkpoint.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+(out.length?"\n":""),"utf8");
  await sleep(900);
 }
}
const by=new Map();
for(const x of out){
 if(!by.has(x.qid))by.set(x.qid,{...x,diaspora_signals:[],signal_targets:[]});
 const z=by.get(x.qid);
 for(const s of x.diaspora_signals)if(!z.diaspora_signals.includes(s))z.diaspora_signals.push(s);
 for(const t of x.signal_targets)if(!z.signal_targets.some(y=>y.signal===t.signal&&y.qid===t.qid))z.signal_targets.push(t);
}
const uniq=[...by.values()];
fs.writeFileSync(path.join(D,"person_ancestral_extra_raw.jsonl"),uniq.map(x=>JSON.stringify(x)).join("\n")+(uniq.length?"\n":""),"utf8");
console.log(JSON.stringify({unique:uniq.length,sample:uniq.slice(0,25).map(x=>({qid:x.qid,name:x.canonical_name,birth:x.birth_date,home:x.ancestral_home_label,signals:x.diaspora_signals,targets:x.signal_targets}))},null,2));