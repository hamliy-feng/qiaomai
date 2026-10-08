import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data","collection","R02");
fs.mkdirSync(OUT,{recursive:true});
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; structured candidate discovery)";
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const foreignCitizenships=["Q30","Q16","Q334","Q833","Q252","Q928","Q869","Q881","Q408","Q145","Q258","Q419","Q241","Q804","Q1027","Q836","Q424","Q921","Q664","Q142","Q55","Q17","Q884","Q423","Q851","Q902","Q917","Q1005","Q928","Q212"];
const excludedCountries=["Q148","Q8646","Q14773"];
const signals=[
  {name:"citizenship_abroad",weight:5,kind:"citizenship"},
  {name:"residence_abroad",prop:"P551",weight:5,kind:"place"},
  {name:"death_abroad",prop:"P20",weight:3,kind:"place"},
  {name:"education_abroad",prop:"P69",weight:1,kind:"entityCountry"},
  {name:"employer_abroad",prop:"P108",weight:3,kind:"entityCountry"},
  {name:"work_location_abroad",prop:"P937",weight:4,kind:"place"},
  {name:"member_abroad",prop:"P463",weight:3,kind:"entityCountry"}
];

async function sparql(q){
  const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
  for(let i=0;i<5;i++){
    const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});
    if(r.ok)return (await r.json()).results.bindings;
    const body=await r.text();
    if(r.status===429||r.status>=500){
      const wait=(i+1)*5000;
      console.error("retry",r.status,"after",wait,"ms");
      await new Promise(res=>setTimeout(res,wait));
      continue;
    }
    throw new Error("SPARQL "+r.status+" "+body.slice(0,300));
  }
  throw new Error("SPARQL retries exceeded");
}
function id(v){return v?.value?.split("/").pop()||null}
function lit(v){return v?.value||null}
const map=new Map();
function checkpoint(){
  const arr=[...map.values()].map(r=>({...r,birth_place_qids:[...r.birth_place_qids],signals:Object.fromEntries([...r.signals].map(([k,v])=>[k,[...v]]))}));
  fs.writeFileSync(path.join(OUT,"person_candidates_checkpoint.jsonl"),arr.map(x=>JSON.stringify(x)).join("\n")+(arr.length?"\n":""),"utf8");
}
for(const [provLabel,prov] of provinces){
  for(const sig of signals){
    const notCN=excludedCountries.map(x=>`?country != wd:${x}`).join(" && ");
    let pattern="";
    if(sig.kind==="citizenship"){
      const vals=foreignCitizenships.map(x=>"wd:"+x).join(" ");
      pattern=`?item wdt:P27 ?signalValue. VALUES ?signalValue { ${vals} } BIND(?signalValue AS ?country)`;
    }else if(sig.kind==="place"){
      pattern=`?item wdt:${sig.prop} ?signalValue. ?signalValue wdt:P17 ?country. FILTER(${notCN})`;
    }else{
      pattern=`?item wdt:${sig.prop} ?signalValue. ?signalValue wdt:P17 ?country. FILTER(${notCN})`;
    }
    const q=`SELECT DISTINCT ?item ?itemLabel ?birthPlace ?birthPlaceLabel ?birthDate ?signalValue ?signalValueLabel ?country ?countryLabel WHERE {
      ?item wdt:P31 wd:Q5; wdt:P19 ?birthPlace.
      ?birthPlace wdt:P131* wd:${prov}.
      OPTIONAL { ?item wdt:P569 ?birthDate. }
      ${pattern}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,zh-hant,en". }
    } LIMIT 2500`;
    const rows=await sparql(q);
    console.log(provLabel,sig.name,rows.length);
    for(const b of rows){
      const qid=id(b.item); if(!qid)continue;
      let rec=map.get(qid);
      if(!rec){
        rec={
          candidate_id:"WD-"+qid,qid,
          canonical_name_candidate:lit(b.itemLabel)||qid,
          birth_date_raw:lit(b.birthDate),
          province_signal:provLabel,
          birth_place_qids:new Set(),
          birth_place_labels:new Set(),
          signals:new Map(),
          source_id:"SRC-WIKIDATA",
          source_url:"https://www.wikidata.org/wiki/"+qid,
          source_license:"CC0",
          review_status:"candidate_needs_diaspora_verification"
        };
        map.set(qid,rec);
      }
      rec.birth_place_qids.add(id(b.birthPlace));
      if(lit(b.birthPlaceLabel))rec.birth_place_labels.add(lit(b.birthPlaceLabel));
      if(!rec.signals.has(sig.name))rec.signals.set(sig.name,new Set());
      const sv=[id(b.signalValue),lit(b.signalValueLabel),id(b.country),lit(b.countryLabel)].filter(Boolean).join("|");
      rec.signals.get(sig.name).add(sv);
    }
    checkpoint();
    await new Promise(res=>setTimeout(res,1500));
  }
}
function score(r){
  let s=0;
  for(const sig of signals)if(r.signals.has(sig.name))s+=sig.weight;
  return s;
}
let all=[...map.values()].map(r=>{
  const sigObj=Object.fromEntries([...r.signals].map(([k,v])=>[k,[...v]]));
  return {
    candidate_id:r.candidate_id,qid:r.qid,canonical_name_candidate:r.canonical_name_candidate,
    birth_date_raw:r.birth_date_raw,province_signal:r.province_signal,
    birth_place_qids:[...r.birth_place_qids],birth_place_labels:[...r.birth_place_labels],
    overseas_signals:sigObj,signal_count:Object.keys(sigObj).length,candidate_score:score(r),
    source_id:r.source_id,source_url:r.source_url,source_license:r.source_license,
    review_status:r.review_status,
    note:"海外信号仅用于召回，不等于已确认华侨身份；现代留学/短期海外经历需在人工复核时排除。"
  };
});
all.sort((a,b)=>b.candidate_score-a.candidate_score||b.signal_count-a.signal_count||a.qid.localeCompare(b.qid));
const selected=all.slice(0,1000);
fs.writeFileSync(path.join(OUT,"person_candidates_all.jsonl"),all.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(OUT,"person_candidates_1000.jsonl"),selected.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const stat={
 generated_at:new Date().toISOString(),union_candidates:all.length,selected_candidates:selected.length,
 province_counts:Object.fromEntries(provinces.map(([p])=>[p,selected.filter(x=>x.province_signal===p).length])),
 signal_counts:Object.fromEntries(signals.map(s=>[s.name,selected.filter(x=>x.overseas_signals[s.name]).length])),
 score_bands:{">=8":selected.filter(x=>x.candidate_score>=8).length,"5-7":selected.filter(x=>x.candidate_score>=5&&x.candidate_score<8).length,"<5":selected.filter(x=>x.candidate_score<5).length}
};
fs.writeFileSync(path.join(OUT,"person_candidates_1000_stats.json"),JSON.stringify(stat,null,2),"utf8");
console.log("FINAL",JSON.stringify(stat));
