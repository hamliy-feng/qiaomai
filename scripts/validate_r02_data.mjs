import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const C=path.join(ROOT,"data","canonical","R02");
const S=path.join(ROOT,"data","collection","R02");
const P=path.join(ROOT,"data","presentation","R02");

function readJsonl(p){
 if(!fs.existsSync(p)) return [];
 return fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map((x,i)=>{
  try{return JSON.parse(x)}catch(e){throw new Error(p+":"+(i+1)+" invalid json "+e.message)}
 });
}
function ids(rows,key="id"){
 const vals=rows.map(x=>x[key]).filter(Boolean), seen=new Set(), dup=[];
 for(const v of vals){if(seen.has(v))dup.push(v);seen.add(v)}
 return {set:new Set(vals),dups:[...new Set(dup)]};
}
const errors=[],warnings=[];
const persons=readJsonl(path.join(C,"persons_1000_candidate.jsonl"));
const events=readJsonl(path.join(C,"events_birth_death_candidate.jsonl"));
const places=readJsonl(path.join(C,"places_candidate_enriched.jsonl"));
const pPlace=readJsonl(path.join(C,"person_place_relations_candidate.jsonl"));
const pOrg=readJsonl(path.join(C,"person_org_relations_candidate.jsonl"));
const fam=readJsonl(path.join(C,"family_relations_candidate.jsonl"));
const sources=readJsonl(path.join(C,"person_source_seed.jsonl"));
const orgInput=fs.existsSync(path.join(C,"organizations_merged_v4.jsonl"))?"organizations_merged_v4.jsonl":"organizations_merged.jsonl";
const orgs=readJsonl(path.join(C,orgInput));
const cards=readJsonl(path.join(P,"persons_1000_preview.jsonl"));
const pCards=readJsonl(path.join(P,"places_top200_preview.jsonl"));
const oCards=readJsonl(path.join(P,"organizations_preview.jsonl"));
const enrichedInput=fs.existsSync(path.join(S,"person_candidates_1000_cleaned_enriched.jsonl"))?"person_candidates_1000_cleaned_enriched.jsonl":"person_candidates_1000_enriched.jsonl";
const enriched=readJsonl(path.join(S,enrichedInput));

const pi=ids(persons), ei=ids(events), pli=ids(places), oi=ids(orgs), si=ids(sources,"source_id");
for(const [label,ds] of [["person",pi.dups],["event",ei.dups],["place",pli.dups],["org",oi.dups],["source",si.dups]])for(const d of ds)errors.push("duplicate "+label+" id: "+d);

const qids=persons.map(x=>x.wikidata_qid).filter(Boolean);
if(new Set(qids).size!==qids.length)errors.push("duplicate person Wikidata QID");
if(persons.length!==1000)errors.push("persons != 1000");
if(cards.length!==1000)errors.push("presentation persons != 1000");

for(const p of persons){
 for(const sid of p.source_ids||[]) if(!si.set.has(sid)) errors.push("person "+p.id+" missing source "+sid);
 const bp=p.birth?.place_id;if(bp&&!pli.set.has(bp))errors.push("person "+p.id+" missing birth place "+bp);
 if(p.image_candidate && p.image_candidate.status!=="candidate_requires_license_no_watermark_no_edit_check")errors.push("person "+p.id+" image candidate unsafe state");
 if(p.publication_status==="published")errors.push("candidate person marked published: "+p.id);
}
for(const e of events){
 for(const pid of e.person_ids||[])if(!pi.set.has(pid))errors.push("event "+e.id+" missing person "+pid);
 for(const pl of e.place_ids||[])if(!pli.set.has(pl))errors.push("event "+e.id+" missing place "+pl);
 for(const sid of e.source_ids||[])if(!si.set.has(sid))errors.push("event "+e.id+" missing source "+sid);
}
for(const r of pPlace){
 if(!pi.set.has(r.subject_id))errors.push("place relation missing person "+r.subject_id);
 if(!pli.set.has(r.object_id))errors.push("place relation missing place "+r.object_id);
}
for(const r of pOrg){
 if(!pi.set.has(r.subject_id))errors.push("org relation missing person "+r.subject_id);
 if(!r.object_qid)errors.push("org relation missing object qid "+r.relation_id);
}
for(const r of fam){
 if(!pi.set.has(r.subject_id))errors.push("family relation missing subject "+r.subject_id);
 if(!r.object_qid)errors.push("family relation missing object qid "+r.relation_id);
 if(r.object_person_id&&!pi.set.has(r.object_person_id))errors.push("family relation bad internal person "+r.relation_id);
}
for(const p of places){
 if(p.image_file_name&&p.image_review_status!=="candidate_requires_license_and_visual_cleanliness_check")errors.push("place unsafe image state "+p.id);
}
for(const c of cards){
 if(!pi.set.has(c.id))errors.push("presentation missing canonical person "+c.id);
 if(c.publication_status==="published")errors.push("preview card marked published "+c.id);
 if(c.image_candidate&&c.image_candidate.status!=="candidate_requires_license_no_watermark_no_edit_check")errors.push("presentation unsafe image "+c.id);
}
for(const c of pCards){
 if(!pli.set.has(c.id))errors.push("place preview missing canonical place "+c.id);
 if(!c.coordinates)errors.push("map preview place lacks coords "+c.id);
 if(c.image_candidate&&c.image_candidate.status!=="candidate_requires_license_no_watermark_no_edit_check")errors.push("place preview unsafe image "+c.id);
}
for(const c of oCards){
 if(!oi.set.has(c.id))errors.push("org preview missing canonical org "+c.id);
 if(c.image_candidate&&c.image_candidate.status!=="candidate_requires_license_no_watermark_no_edit_check")errors.push("org preview unsafe image "+c.id);
}
const normName=s=>String(s||"").replace(/^新加坡|^南洋|^星洲/g,"").replace(/[\s·・（）()]/g,"").replace(/總/g,"总").replace(/會/g,"会").replace(/館/g,"馆").replace(/閩/g,"闽").replace(/廣/g,"广").replace(/東/g,"东").replace(/龍/g,"龙").replace(/興/g,"兴").toLowerCase();
const normNames=orgs.map(x=>normName(x.canonical_name));
if(new Set(normNames).size!==normNames.length)warnings.push("organization normalized names still contain possible duplicates: "+(normNames.length-new Set(normNames).size));

const scopeCounts={
 strong_candidate:persons.filter(x=>x.scope_status==="strong_candidate").length,
 medium_candidate:persons.filter(x=>x.scope_status==="medium_candidate").length,
 needs_diaspora_verification:persons.filter(x=>x.scope_status==="needs_diaspora_verification").length
};
if(Object.values(scopeCounts).reduce((a,b)=>a+b,0)!==1000)errors.push("person scope statuses do not sum to 1000");
const report={
 batch:"R02",
 counts:{
  persons:persons.length,
  persons_unique_qids:new Set(qids).size,
  enriched_persons:enriched.length,
  person_preview:cards.length,
  events:events.length,
  places:places.length,
  places_with_coordinates:places.filter(x=>x.coordinates).length,
  place_preview:pCards.length,
  person_place_relations:pPlace.length,
  person_org_relations:pOrg.length,
  family_relations:fam.length,
  family_relations_internal:fam.filter(x=>x.object_person_id).length,
  person_sources:sources.length,
  organizations:orgs.length,
  organizations_reviewed:orgs.filter(x=>x.review_status==="reviewed").length,
  organization_preview:oCards.length,
  person_image_candidates:persons.filter(x=>x.image_candidate).length,
  place_image_candidates:places.filter(x=>x.image_file_name).length
 },
 scope_status:scopeCounts,
 errors,warnings,
 validation_passed:errors.length===0
};
fs.writeFileSync(path.join(S,"R02_AUTO_VALIDATION.json"),JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify(report,null,2));