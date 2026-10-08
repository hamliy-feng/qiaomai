import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const all=fs.readFileSync(path.join(D,"person_candidates_all.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const top=fs.readFileSync(path.join(D,"person_candidates_1000.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const topQ=new Set(top.map(x=>x.qid));
const CJK=/^[\u3400-\u9FFF]{2,6}$/;
function useful(x){return (x.diaspora_signals||[]).some(s=>["foreign_citizenship","foreign_residence","death_abroad","employer_abroad","member_abroad","work_location_abroad"].includes(s))}
const reserve=all.filter(x=>!topQ.has(x.qid)).map(x=>({...x,
 replacement_priority:(CJK.test(x.canonical_name||"")?4:0)+(useful(x)?4:0)+(x.historical_priority?2:0)+(x.scope_status==="strong_candidate"?3:x.scope_status==="medium_candidate"?2:0)
})).sort((a,b)=>b.replacement_priority-a.replacement_priority||b.diaspora_signal_score-a.diaspora_signal_score);
const seeds=reserve.filter(x=>x.replacement_priority>=6).slice(0,100);
fs.writeFileSync(path.join(D,"person_replacement_seed_100.jsonl"),seeds.map(x=>JSON.stringify(x)).join("\n")+(seeds.length?"\n":""),"utf8");
console.log(JSON.stringify({reserve:reserve.length,eligible:reserve.filter(x=>x.replacement_priority>=6).length,selected:seeds.length,samples:seeds.slice(0,15).map(x=>({qid:x.qid,name:x.canonical_name,province:x.province_scope,signals:x.diaspora_signals,score:x.replacement_priority}))},null,2));
