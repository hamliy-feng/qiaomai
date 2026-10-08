import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const audited=fs.readFileSync(path.join(D,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const all=fs.readFileSync(path.join(D,"person_candidates_all.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const keep=audited.filter(x=>x.scope_audit_status!=="likely_out_of_scope");
const topQ=new Set(audited.map(x=>x.qid));
const NAT=/^[\u3400-\u9FFF]{2,6}$/;
const strongSignals=new Set(["foreign_citizenship","foreign_residence","death_abroad","employer_abroad","work_location_abroad"]);
function yearOf(s){const m=String(s||"").match(/([+-]?\d{3,4})-/);return m?Number(m[1]):null}
function score(x){
  const sig=new Set(x.diaspora_signals||[]);
  let s=0;
  if(NAT.test(x.canonical_name||""))s+=7;
  if(sig.has("foreign_citizenship"))s+=6;
  if(sig.has("foreign_residence"))s+=6;
  if(sig.has("death_abroad"))s+=4;
  if(sig.has("employer_abroad"))s+=3;
  if(sig.has("work_location_abroad"))s+=3;
  if(sig.has("member_abroad"))s+=1;
  const y=yearOf(x.birth_date); if(y&&y<=1950)s+=3; else if(y&&y<=1980)s+=1;
  if(x.scope_status==="strong_candidate")s+=3; else if(x.scope_status==="medium_candidate")s+=1;
  return s;
}
function eligible(x){
  const sig=new Set(x.diaspora_signals||[]);
  return !topQ.has(x.qid)
    && NAT.test(x.canonical_name||"")
    && [...strongSignals].some(k=>sig.has(k))
    && !(sig.size===1&&sig.has("educated_abroad"))
    && !/^Q\d+$/.test(x.canonical_name||"");
}
const reserve=all.filter(eligible).map(x=>({...x,replacement_quality_score:score(x)}))
  .sort((a,b)=>b.replacement_quality_score-a.replacement_quality_score||b.diaspora_signal_score-a.diaspora_signal_score);
const need=1000-keep.length;
const selected=reserve.slice(0,need);
const out={keep:keep.length,rejected:audited.length-keep.length,reserve_eligible:reserve.length,needed:need,selected:selected.length,
selected_samples:selected.slice(0,20).map(x=>({qid:x.qid,name:x.canonical_name,province:x.province_scope,signals:x.diaspora_signals,score:x.replacement_quality_score}))};
fs.writeFileSync(path.join(D,"person_replacements_selected.jsonl"),selected.map(x=>JSON.stringify(x)).join("\n")+(selected.length?"\n":""),"utf8");
fs.writeFileSync(path.join(D,"person_replacements_selected_summary.json"),JSON.stringify(out,null,2),"utf8");
console.log(JSON.stringify(out,null,2));