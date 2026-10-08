import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02");
fs.mkdirSync(OUT,{recursive:true});

const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; structured candidate discovery)";
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const signals=[
  {name:"citizenship_abroad",prop:"P27",weight:5,directCountry:true},
  {name:"residence_abroad",prop:"P551",weight:5},
  {name:"death_abroad",prop:"P20",weight:3},
  {name:"education_abroad",prop:"P69",weight:1},
  {name:"employer_abroad",prop:"P108",weight:3},
  {name:"work_location_abroad",prop:"P937",weight:4},
  {name:"member_abroad",prop:"P463",weight:3},
];
const excluded=["Q148","Q8646","Q14773"]; // PRC, Hong Kong, Macau; Taiwan remains a candidate signal only

async function sparql(q){
  const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
  for(let i=0;i<4;i++){
    const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});
    if(r.ok)return (await r.json()).results.bindings;
    if(r.status===429||r.status>=500){await new Promise(res=>setTimeout(res,2500*(i+1)));continue}
    throw new Error("SPARQL "+r.status+" "+(await r.text()).slice(0,500));
  }
  throw new Error("SPARQL retries exceeded");
}

const map=new Map();
for(const [provLabel,prov] of provinces){
  for(const sig of signals){
    const filter=excluded.map(x=>`?country != wd:${x}`).join(" && ");
    const body=sig.directCountry
      ? `?item wdt:${sig.prop} ?signalValue. BIND(?signalValue AS ?country)`
      : `?item wdt:${sig.prop} ?signalValue. ?signalValue wdt:P17 ?country.`;
    const q=`SELECT DISTINCT ?item ?birthPlace ?signalValue ?country WHERE {
      ?item wdt:P31 wd:Q5; wdt:P19 ?birthPlace.
      ?birthPlace wdt:P131* wd:${prov}.
      ${body}
      FILTER(${filter})
    } LIMIT 2500`;
    const rows=await sparql(q);
    console.log(provLabel,sig.name,rows.length);
    for(const b of rows){
      const item=b.item.value.split("/").pop();
      const bp=b.birthPlace.value.split("/").pop();
      const sv=b.signalValue.value.split("/").pop();
      const country=b.country.value.split("/").pop();
      let rec=map.get(item);
      if(!rec){
        rec={qid:item,province_signal:provLabel,birth_place_qids:new Set(),signals:new Map()};
        map.set(item,rec);
      }
      rec.birth_place_qids.add(bp);
      if(!rec.signals.has(sig.name))rec.signals.set(sig.name,new Set());
      rec.signals.get(sig.name).add(sv+"@"+country);
    }
    await new Promise(res=>setTimeout(res,900));
  }
}

const qids=[...map.keys()];
async function getEntities(ids){
  const params=new URLSearchParams({
    action:"wbgetentities",format:"json",origin:"*",ids:ids.join("|"),
    props:"labels|aliases|claims",languages:"zh|zh-hant|en",languagefallback:"1"
  });
  const r=await fetch("https://www.wikidata.org/w/api.php?"+params.toString(),{headers:{"User-Agent":UA}});
  if(!r.ok)throw new Error("wbgetentities "+r.status);
  return (await r.json()).entities;
}
const entities={};
for(let i=0;i<qids.length;i+=50){
  Object.assign(entities,await getEntities(qids.slice(i,i+50)));
  await new Promise(res=>setTimeout(res,250));
}
function label(e,lang){return e?.labels?.[lang]?.value||""}
function aliases(e,lang){return (e?.aliases?.[lang]||[]).map(x=>x.value)}
function timeClaim(e,p){
  const s=e?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
  return s?.time||null;
}
function score(rec){
  let s=0;
  for(const sig of signals)if(rec.signals.has(sig.name))s+=sig.weight;
  if(rec.province_signal==="Fujian")s+=0.1;
  return s;
}
let rows=[];
for(const [qid,rec] of map){
  const e=entities[qid];
  const sigObj={};
  for(const [k,v] of rec.signals)sigObj[k]=[...v];
  rows.push({
    candidate_id:"WD-"+qid,
    qid,
    canonical_name_candidate:label(e,"zh")||label(e,"zh-hant")||label(e,"en")||qid,
    traditional_name:label(e,"zh-hant")||null,
    english_name:label(e,"en")||null,
    aliases_zh:[...new Set([...aliases(e,"zh"),...aliases(e,"zh-hant")])],
    birth_time_raw:timeClaim(e,"P569"),
    province_signal:rec.province_signal,
    birth_place_qids:[...rec.birth_place_qids],
    overseas_signals:sigObj,
    signal_count:Object.keys(sigObj).length,
    candidate_score:score(rec),
    source_id:"SRC-WIKIDATA",
    source_url:"https://www.wikidata.org/wiki/"+qid,
    source_license:"CC0",
    review_status:"candidate_needs_diaspora_verification",
    note:"海外信号只用于召回，不等同于已确认华侨身份；需继续核生平、长期侨居/移民/海外社团等证据。"
  });
}
rows.sort((a,b)=>b.candidate_score-a.candidate_score||b.signal_count-a.signal_count||a.qid.localeCompare(b.qid));
const selected=rows.slice(0,1000);
fs.writeFileSync(path.join(OUT,"person_candidates_1000.jsonl"),selected.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(OUT,"person_candidates_all.jsonl"),rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");

const stat={
  generated_at:new Date().toISOString(),
  union_candidates:rows.length,
  selected_candidates:selected.length,
  province_counts:Object.fromEntries(["Guangdong","Fujian"].map(p=>[p,selected.filter(x=>x.province_signal===p).length])),
  score_bands:{
    ">=8":selected.filter(x=>x.candidate_score>=8).length,
    "5-7.9":selected.filter(x=>x.candidate_score>=5&&x.candidate_score<8).length,
    "<5":selected.filter(x=>x.candidate_score<5).length
  },
  signal_counts:Object.fromEntries(signals.map(s=>[s.name,selected.filter(x=>x.overseas_signals[s.name]).length]))
};
fs.writeFileSync(path.join(OUT,"person_candidates_1000_stats.json"),JSON.stringify(stat,null,2),"utf8");
console.log(JSON.stringify(stat,null,2));
