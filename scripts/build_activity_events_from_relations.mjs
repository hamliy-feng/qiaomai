import fs from "fs";import path from "path";import crypto from "crypto";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
function jl(p){return fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse)}
const persons=jl(path.join(C,"persons_1000_candidate.jsonl"));
const placeR=jl(path.join(C,"person_place_relations_candidate.jsonl"));
const orgR=jl(path.join(C,"person_org_relations_candidate.jsonl"));
const pmap=new Map(persons.map(x=>[x.id,x]));
const out=[];
function hid(s){return crypto.createHash("sha1").update(s).digest("hex").slice(0,12)}
for(const r of placeR){
 if(!["resided_at","worked_at_place"].includes(r.relation_type))continue;
 const p=pmap.get(r.subject_id);if(!p)continue;
 const kind=r.relation_type==="resided_at"?"residence":"work_location";
 const verb=r.relation_type==="resided_at"?"居住于":"在当地工作/活动于";
 const placeLabel=r.object_label||r.object_name||r.object_id;
 out.push({event_id:"event_rel_"+hid(r.relation_id),event_type:kind,title:`${p.canonical_name}${verb}${placeLabel}`,date_raw:null,date_start:null,date_end:null,date_precision:"unknown",person_ids:[p.id],place_ids:[r.object_id],organization_qids:[],source_ids:r.source_ids||[],evidence_basis:"wikidata_relation",relation_id:r.relation_id,front_end_usage:"relation_card_only_until_dated",review_status:"candidate"});
}
for(const r of orgR){
 if(!["educated_at","employed_by","member_of"].includes(r.relation_type))continue;
 const p=pmap.get(r.subject_id);if(!p)continue;
 const kind=r.relation_type==="educated_at"?"education":r.relation_type==="employed_by"?"employment":"association_activity";
 const verb=r.relation_type==="educated_at"?"就读于":r.relation_type==="employed_by"?"任职于":"加入/隶属于";
 const label=r.object_label||r.object_qid;
 out.push({event_id:"event_rel_"+hid(r.relation_id),event_type:kind,title:`${p.canonical_name}${verb}${label}`,date_raw:null,date_start:null,date_end:null,date_precision:"unknown",person_ids:[p.id],place_ids:[],organization_qids:[r.object_qid].filter(Boolean),organization_labels:[label].filter(Boolean),source_ids:r.source_ids||[],evidence_basis:"wikidata_relation",relation_id:r.relation_id,front_end_usage:"relation_card_only_until_dated",review_status:"candidate"});
}
const seen=new Set(),dedup=[];
for(const x of out){const k=x.event_type+"|"+x.person_ids.join("|")+"|"+x.title;if(seen.has(k))continue;seen.add(k);dedup.push(x)}
fs.writeFileSync(path.join(C,"events_activity_candidate.jsonl"),dedup.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const by={};for(const x of dedup)by[x.event_type]=(by[x.event_type]||0)+1;
const summary={count:dedup.length,by_type:by,all_date_precision_unknown:dedup.every(x=>x.date_precision==="unknown"),timeline_eligible:0,relation_card_only:dedup.length};
fs.writeFileSync(path.join(C,"events_activity_candidate_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
