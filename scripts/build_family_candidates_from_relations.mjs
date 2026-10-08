import fs from "fs";import path from "path";import crypto from "crypto";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const C=path.join(ROOT,"data","canonical","R02");
function jl(p){return fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse)}
const persons=jl(path.join(C,"persons_1000_candidate.jsonl"));
const rels=jl(path.join(C,"family_relations_candidate.jsonl"));
const pmap=new Map(persons.map(x=>[x.id,x]));
const grouped=new Map();
for(const r of rels){
 if(!grouped.has(r.subject_id))grouped.set(r.subject_id,[]);
 grouped.get(r.subject_id).push(r);
}
const out=[];
for(const [pid,rs] of grouped){
 const p=pmap.get(pid);if(!p)continue;
 if(rs.length<2)continue;
 const members=[];
 for(const r of rs)members.push({relation:r.relation_type,person_id:r.object_person_id||null,qid:r.object_qid||null,label:r.object_label||null,source_ids:r.source_ids||[]});
 const internal=members.filter(x=>x.person_id).length;
 const children=members.filter(x=>x.relation==="child").length;
 const spouses=members.filter(x=>x.relation==="spouse").length;
 const parents=members.filter(x=>["father","mother"].includes(x.relation)).length;
 const score=rs.length+internal*2+Math.min(children,4)+parents+spouses;
 const base=(p.canonical_name||p.english_name||p.id)+"家族";
 const familyId="family_wd_"+(p.wikidata_qid||p.id.replace("person_wd_",""));
 out.push({
  id:familyId,type:"family",canonical_name:base,anchor_person_id:p.id,anchor_qid:p.wikidata_qid,
  province_scope:p.province_scope,member_relations:members,relation_count:rs.length,internal_member_count:internal,
  relation_summary:{parents,spouses,children},source_ids:[...new Set(rs.flatMap(x=>x.source_ids||[]))],
  readiness:score>=8?"priority_family_review":score>=5?"basic_family_candidate":"family_candidate",
  review_status:"candidate",score
 });
}
out.sort((a,b)=>b.score-a.score||b.relation_count-a.relation_count);
fs.writeFileSync(path.join(C,"families_generated_candidate.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const top=out.slice(0,30);
fs.writeFileSync(path.join(C,"families_priority30.jsonl"),top.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={families_with_2plus_relations:out.length,priority_family_review:out.filter(x=>x.readiness==="priority_family_review").length,basic_family_candidate:out.filter(x=>x.readiness==="basic_family_candidate").length,top30:top.map(x=>({id:x.id,name:x.canonical_name,relations:x.relation_count,internal:x.internal_member_count,summary:x.relation_summary,score:x.score}))};
fs.writeFileSync(path.join(C,"families_generated_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify({families_with_2plus_relations:summary.families_with_2plus_relations,priority_family_review:summary.priority_family_review,basic_family_candidate:summary.basic_family_candidate,top10:summary.top30.slice(0,10)},null,2));
