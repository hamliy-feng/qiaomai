import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));const ROOT=path.resolve(HERE,"..");
const C=path.join(ROOT,"data","canonical","R02");
const S=path.join(ROOT,"data","collection","R02");
const persons=fs.readFileSync(path.join(S,"person_candidates_1000_scope_audited.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const pstat=new Map(persons.map(x=>["person_wd_"+x.qid,x.scope_audit_status]));
const events=fs.readFileSync(path.join(C,"events_birth_death_candidate.jsonl"),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const out=events.map(e=>{
 const statuses=(e.person_ids||[]).map(id=>pstat.get(id)||"unknown");
 let quality;
 if(statuses.some(s=>s==="likely_out_of_scope"))quality="scope_blocked";
 else if(statuses.every(s=>s==="keep_high"||s==="keep_medium")&&e.date_normalized)quality="front_end_candidate";
 else quality="manual_review";
 return {...e,event_quality_status:quality,publication_status:"not_published"};
});
fs.writeFileSync(path.join(C,"events_quality_audited.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 total:out.length,
 front_end_candidate:out.filter(x=>x.event_quality_status==="front_end_candidate").length,
 manual_review:out.filter(x=>x.event_quality_status==="manual_review").length,
 scope_blocked:out.filter(x=>x.event_quality_status==="scope_blocked").length,
 by_type:Object.fromEntries(["birth","death"].map(t=>[t,out.filter(x=>x.event_type===t).length])),
 frontend_by_type:Object.fromEntries(["birth","death"].map(t=>[t,out.filter(x=>x.event_type===t&&x.event_quality_status==="front_end_candidate").length]))
};
fs.writeFileSync(path.join(C,"events_quality_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
