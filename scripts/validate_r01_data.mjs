import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const C=path.join(ROOT,"data","canonical","R01");
const S=path.join(ROOT,"data","collection","R01");
const P=path.join(ROOT,"data","presentation","R01");

function readJsonl(p){
  if(!fs.existsSync(p)) return [];
  return fs.readFileSync(p,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim()).map((x,i)=>{
    try{return JSON.parse(x)}catch(e){throw new Error(`${p}:${i+1}: invalid json: ${e.message}`)}
  });
}
function parseCsvText(s){
  const rows=[]; let row=[],field="",q=false;
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(q){
      if(ch=='"' && s[i+1]=='"'){field+='"';i++;}
      else if(ch=='"') q=false;
      else field+=ch;
    }else{
      if(ch=='"') q=true;
      else if(ch==","){row.push(field);field="";}
      else if(ch=="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}
      else field+=ch;
    }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,""));rows.push(row);}
  if(!rows.length)return [];
  const h=rows[0];
  return rows.slice(1).filter(r=>r.some(x=>x!=="")).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??""])));
}
function readCsv(p){return fs.existsSync(p)?parseCsvText(fs.readFileSync(p,"utf8").replace(/^\uFEFF/,"")):[]}
function splitIds(v){return !v?[]:String(v).trim().replace(/^"|"$/g,"").split("|").map(x=>x.trim()).filter(Boolean)}
function idSet(rows,key="id"){
  const vals=rows.map(x=>x[key]).filter(Boolean), seen=new Set(), dup=[];
  for(const v of vals){if(seen.has(v))dup.push(v);seen.add(v)}
  return {set:new Set(vals),dup:[...new Set(dup)]};
}
const errors=[],warnings=[];
const persons=readJsonl(path.join(C,"persons.jsonl"));
const places=readJsonl(path.join(C,"places.jsonl"));
const orgs=readJsonl(path.join(C,"organizations.jsonl"));
const pres=readJsonl(path.join(P,"persons.jsonl"));
const ps=readJsonl(path.join(S,"person_source_matrix.jsonl"));
const os=readJsonl(path.join(S,"organization_source_matrix.jsonl"));
const qs=readJsonl(path.join(S,"qiaopi_source_matrix.jsonl"));
const qcanon=readJsonl(path.join(C,"qiaopi.jsonl"));
const qdocs=readJsonl(path.join(C,"documents_qiaopi.jsonl"));
const events=readCsv(path.join(C,"events.csv"));
const orgEvents=readCsv(path.join(C,"organization_events.csv"));
const rels=readCsv(path.join(C,"relations.csv"));
const qiaopi=readCsv(path.join(S,"qiaopi_candidates.csv"));
const pi=idSet(persons), pli=idSet(places), oi=idSet(orgs);
const sources=new Set([...ps,...os,...qs].map(x=>x.source_id));
const eventIds=new Set();
for(const e of [...events,...orgEvents]){if(eventIds.has(e.event_id))errors.push("duplicate event_id: "+e.event_id); eventIds.add(e.event_id);}
for(const [label,d] of [["person",pi.dup],["place",pli.dup],["org",oi.dup]]) for(const x of d)errors.push(`duplicate ${label} id: ${x}`);
for(const p of persons){
 for(const sid of p.source_ids||[]) if(!sources.has(sid))errors.push(`person ${p.id} missing source ${sid}`);
 for(const eid of p.event_ids||[]) if(!eventIds.has(eid))errors.push(`person ${p.id} missing event ${eid}`);
}
for(const x of pres){
 if(!pi.set.has(x.id))errors.push(`presentation missing person ${x.id}`);
 for(const id of x.placeIds||[])if(!pli.set.has(id))errors.push(`presentation ${x.id} missing place ${id}`);
 for(const id of x.orgIds||[])if(!oi.set.has(id))errors.push(`presentation ${x.id} missing org ${id}`);
}
for(const r of rels){
 const rid=r.relation_id||"?";
 if(r.subject_id?.startsWith("person_")&&!pi.set.has(r.subject_id))errors.push(`${rid} missing subject ${r.subject_id}`);
 if(r.object_id?.startsWith("place_")&&!pli.set.has(r.object_id))errors.push(`${rid} missing place ${r.object_id}`);
 if(r.object_id?.startsWith("org_")&&!oi.set.has(r.object_id))errors.push(`${rid} missing org ${r.object_id}`);
 for(const sid of splitIds(r.source_ids))if(!sources.has(sid))errors.push(`${rid} missing source ${sid}`);
}
for(const e of [...events,...orgEvents]){
 const eid=e.event_id||"?";
 for(const id of splitIds(e.person_ids))if(!pi.set.has(id))errors.push(`${eid} missing person ${id}`);
 for(const id of splitIds(e.place_ids))if(!pli.set.has(id))errors.push(`${eid} missing place ${id}`);
 for(const id of splitIds(e.organization_ids))if(!oi.set.has(id))errors.push(`${eid} missing org ${id}`);
 for(const sid of splitIds(e.source_ids))if(!sources.has(sid))errors.push(`${eid} missing source ${sid}`);
}
const qids=idSet(qcanon,"qiaopi_id"), docids=idSet(qdocs,"document_id");
for(const d of qids.dup) errors.push("duplicate canonical qiaopi id: "+d);
for(const d of docids.dup) errors.push("duplicate qiaopi document id: "+d);
const docMap=new Map(qdocs.map(x=>[x.document_id,x]));
for(const q of qcanon){
  if(!docMap.has(q.document_id)) errors.push(`canonical qiaopi ${q.qiaopi_id} missing document ${q.document_id}`);
  for(const sid of q.source_ids||[]) if(!sources.has(sid)) errors.push(`canonical qiaopi ${q.qiaopi_id} missing source ${sid}`);
  for(const side of ["sent_from","sent_to"]){
    const id=q?.[side]?.place_id;
    if(id&&!pli.set.has(id)) errors.push(`canonical qiaopi ${q.qiaopi_id} missing place ${id}`);
  }
}
for(const d of qdocs){
  for(const sid of d.source_ids||[]) if(!sources.has(sid)) errors.push(`qiaopi document ${d.document_id} missing source ${sid}`);
}
const archiveSeen=new Set();
for(const q of qiaopi){const n=(q.archive_number||"").trim();if(!n)continue;if(archiveSeen.has(n))errors.push("duplicate qiaopi archive_number: "+n);archiveSeen.add(n)}
const imageChecked=qiaopi.filter(x=>(x.image_status||"").includes("image")&&(x.image_status||"").includes("visible")).length;
const detailUnchecked=qiaopi.filter(x=>(x.image_status||"")==="detail_not_checked").length;
const dateReview=qiaopi.filter(x=>(x.review_status||"").includes("date_needs_review")).length;
const reviewedPersons=persons.filter(x=>x.review_status==="reviewed").length;
const reviewedOrgs=orgs.filter(x=>x.review_status==="reviewed").length;
const reviewedEvents=[...events,...orgEvents].filter(x=>x.review_status==="reviewed").length;
const normDir=path.join(S,"qiaopi_normalized");
let normalizedCount=0;
if(fs.existsSync(normDir)) for(const d of fs.readdirSync(normDir)){const f=path.join(normDir,d,"normalized_text.txt");if(fs.existsSync(f)&&fs.statSync(f).size>0)normalizedCount++}
if(reviewedPersons<5)warnings.push("R01 publish gate: reviewed persons < 5");
if(reviewedOrgs<10)warnings.push("R01 publish gate: reviewed organizations < 10");
if(imageChecked<30)warnings.push("R01 publish gate: page/image checked qiaopi < 30");
if(normalizedCount<10)warnings.push("R01 publish gate: normalized qiaopi text < 10");
const report={batch:"R01",counts:{persons:persons.length,reviewed_persons:reviewedPersons,places:places.length,organizations:orgs.length,reviewed_organizations:reviewedOrgs,person_events:events.length,organization_events:orgEvents.length,reviewed_events_total:reviewedEvents,relations:rels.length,source_records:ps.length+os.length+qs.length,presentation_persons:pres.length,qiaopi_candidates:qiaopi.length,qiaopi_canonical:qcanon.length,qiaopi_metadata_reviewed:qcanon.filter(x=>x.review_status==="metadata_reviewed").length,qiaopi_documents:qdocs.length,qiaopi_image_checked:imageChecked,qiaopi_detail_unchecked:detailUnchecked,qiaopi_date_needs_review:dateReview,qiaopi_normalized_text:normalizedCount},errors,warnings,publish_gate_passed:errors.length===0&&reviewedPersons>=5&&reviewedOrgs>=10&&imageChecked>=30&&normalizedCount>=10};
fs.writeFileSync(path.join(S,"AUTO_VALIDATION.json"),JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify(report,null,2));
