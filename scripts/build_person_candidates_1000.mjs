import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUTDIR=path.join(ROOT,"data","collection","R02");
fs.mkdirSync(OUTDIR,{recursive:true});
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; public Wikidata data)";
const provinces=[["Guangdong","Q15175"],["Fujian","Q41705"]];
const foreignCitizenship=["Q30","Q16","Q334","Q833","Q252","Q928","Q869","Q881","Q408","Q145","Q1054923","Q258","Q419","Q241","Q804","Q1027","Q836","Q424","Q921","Q664","Q142","Q55","Q884","Q668","Q878","Q1036","Q712","Q717"];
const signals=[
{name:"foreign_citizenship",weight:3,pattern:()=>"?item wdt:P27 ?target. VALUES ?target { "+foreignCitizenship.map(x=>"wd:"+x).join(" ")+" }"},
{name:"foreign_residence",weight:3,pattern:()=>"?item wdt:P551 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"},
{name:"death_abroad",weight:2,pattern:()=>"?item wdt:P20 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"},
{name:"educated_abroad",weight:1,pattern:()=>"?item wdt:P69 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"},
{name:"employer_abroad",weight:2,pattern:()=>"?item wdt:P108 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"},
{name:"member_abroad",weight:2,pattern:()=>"?item wdt:P463 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"},
{name:"work_location_abroad",weight:2,pattern:()=>"?item wdt:P937 ?target. ?target wdt:P17 ?country. FILTER(?country != wd:Q148 && ?country != wd:Q8646 && ?country != wd:Q14773)"}
];
async function sparql(q,retries=3){
 const url="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(q);
 let last;
 for(let i=0;i<retries;i++){try{const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/sparql-results+json"}});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json();}catch(e){last=e;await new Promise(res=>setTimeout(res,2000*(i+1)));}}
 throw last;
}
const map=new Map();
for(const [province,provQ] of provinces){
 for(const sig of signals){
  const q="SELECT DISTINCT ?item ?itemLabel ?birthPlace ?birthPlaceLabel ?birthDate ?deathDate ?target ?targetLabel ?country ?countryLabel WHERE { "+
   "?item wdt:P31 wd:Q5; wdt:P19 ?birthPlace. "+
   "?birthPlace wdt:P131* wd:"+provQ+". "+
   "OPTIONAL { ?item wdt:P569 ?birthDate. } OPTIONAL { ?item wdt:P570 ?deathDate. } "+
   sig.pattern()+
   " SERVICE wikibase:label { bd:serviceParam wikibase:language \"zh,zh-hant,en\". } } LIMIT 1200";
  let j; try{j=await sparql(q);}catch(e){console.error("QUERY_FAILED",province,sig.name,e.message);continue;}
  for(const b of j.results.bindings){
   const qid=b.item.value.split("/").pop(), name=b.itemLabel?.value||qid;
   if(!map.has(qid))map.set(qid,{qid,canonical_name:name,birth_place_qid:b.birthPlace?.value?.split("/").pop()||null,birth_place_label:b.birthPlaceLabel?.value||null,birth_date:b.birthDate?.value||null,death_date:b.deathDate?.value||null,province_scope:province,diaspora_signals:[],signal_targets:[],source_url:"https://www.wikidata.org/wiki/"+qid,source_name:"Wikidata",license:"CC0",review_status:"candidate"});
   const x=map.get(qid); if(!x.diaspora_signals.includes(sig.name))x.diaspora_signals.push(sig.name);
   const target={signal:sig.name,qid:b.target?.value?.split("/").pop()||null,label:b.targetLabel?.value||null,country_qid:b.country?.value?.split("/").pop()||null,country_label:b.countryLabel?.value||null};
   if(!x.signal_targets.some(t=>t.signal===target.signal&&t.qid===target.qid))x.signal_targets.push(target);
  }
  console.log(province,sig.name,"rows",j.results.bindings.length,"unique",map.size);
  await new Promise(res=>setTimeout(res,750));
 }
}
function yearOf(s){if(!s)return null;const m=String(s).match(/([+-]?\d{3,4})-/);return m?Number(m[1]):null;}
for(const x of map.values()){
 let score=0; for(const s of x.diaspora_signals){const d=signals.find(z=>z.name===s);score+=d?.weight||0;}
 const y=yearOf(x.birth_date); if(y&&y<=1950)score+=1; if(x.canonical_name&&!/^Q\d+$/.test(x.canonical_name))score+=1;
 x.diaspora_signal_score=score;x.historical_priority=!!(y&&y<=1950);
 x.scope_status=x.diaspora_signals.some(s=>["foreign_citizenship","foreign_residence"].includes(s))?"strong_candidate":x.diaspora_signals.some(s=>["death_abroad","employer_abroad","member_abroad","work_location_abroad"].includes(s))?"medium_candidate":"needs_diaspora_verification";
}
const all=[...map.values()].sort((a,b)=>b.diaspora_signal_score-a.diaspora_signal_score||(a.birth_date||"").localeCompare(b.birth_date||""));
const top=all.slice(0,1000);
fs.writeFileSync(path.join(OUTDIR,"person_candidates_all.jsonl"),all.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
fs.writeFileSync(path.join(OUTDIR,"person_candidates_1000.jsonl"),top.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const counts={total_unique:all.length,selected_1000:top.length,province:{Guangong:top.filter(x=>x.ince_scope==="Guangdong").length,Fujian:top.filter(x=>x.province_scope==="Fujian").length},scope_status:Object.fromEntries(["strong_candidate","medium_candidate","needs_diaspora_verification"].map(s=>[s,top.filter(x=>x.iscope_status===s).length])),signals:Object.fromEntries(signals.map(s=>[s.name,top.filter(x=>x.diaspora_signals.includes(s.name)).length])),historical_priority:top.filter(x=>x.historical_priority).length};
fs.writeFileSync(path.join(OUTDIR,"person_candidates_1000_summary.json"),JSON.stringify(counts,null,2),"utf8");
console.log(JSON.stringify(counts,null,2));
