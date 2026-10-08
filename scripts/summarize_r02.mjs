import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const p=path.join(ROOT,"data","collection","R02","person_candidates_1000.jsonl");
const rows=fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const statuses=["strong_candidate","medium_candidate","needs_diaspora_verification"];
const signals=["foreign_citizenship","foreign_residence","death_abroad","educated_abroad","employer_abroad","member_abroad","work_location_abroad"];
const out={
 count:rows.length,
 unique_qids:new Set(rows.map(x=>x.qid)).size,
 province:{Guangdong:rows.filter(x=>x.province_scope==="Guangdong").length,Fujian:rows.filter(x=>x.province_scope==="Fujian").length},
 scope_status:Object.fromEntries(statuses.map(k=>[k,rows.filter(x=>x.scope_status===k).length])),
 signals:Object.fromEntries(signals.map(k=>[k,rows.filter(x=>(x.diaspora_signals||[]).includes(k)).length])),
 historical_priority:rows.filter(x=>x.historical_priority).length,
 missing_name:rows.filter(x=>!x.canonical_name||(x.canonical_name.startsWith("Q")&&!isNaN(Number(x.canonical_name.slice(1))))).length,
 missing_birth_place:rows.filter(x=>!x.birth_place_qid).length,
 missing_source_url:rows.filter(x=>!x.source_url).length
};
fs.writeFileSync(path.join(ROOT,"data","collection","R02","person_candidates_1000_summary_fixed.json"),JSON.stringify(out,null,2),"utf8");
console.log(JSON.stringify(out,null,2));