import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const IN=path.join(ROOT,"data","collection","R02");
const OUT=path.join(ROOT,"data","canonical","R02");
fs.mkdirSync(OUT,{recursive:true});
const readJsonl=p=>fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const personInput=fs.existsSync(path.join(IN,"person_candidates_1000_cleaned_enriched.jsonl"))?"person_candidates_1000_cleaned_enriched.jsonl":"person_candidates_1000_enriched.jsonl";
const rows=readJsonl(path.join(IN,personInput));
const labels=JSON.parse(fs.readFileSync(path.join(IN,"wikidata_related_label_cache.json"),"utf8"));
const qidSet=new Set(rows.map(x=>x.qid));
const personId=q=>"person_wd_"+q;
const sourceId=q=>"source_wd_"+q;
const h=s=>crypto.createHash("sha1").update(String(s)).digest("hex").slice(0,12);
function label(q){const x=labels[q]||{};return x.zh||x.zh_hant||x.en||q}
function normDate(s){
 if(!s)return null;
 const m=String(s).match(/^([+-]?\d{3,4})-(\d\d)-(\d\d)/);
 if(!m)return null;
 const y=m[1].replace(/^\+/,""),mo=m[2],d=m[3];
 if(mo==="00")return y;
 if(d==="00")return y+"-"+mo;
 return y+"-"+mo+"-"+d;
}
function year(s){const d=normDate(s);return d?String(d).slice(0,4):null}
function targetLabels(x,signals){
 const vals=[];
 for(const t of x.signal_targets||[])if(signals.includes(t.signal)&&t.label)vals.push(t.label);
 return [...new Set(vals)].slice(0,5);
}
function shortSummary(x){
 const place=x.birth_place_label||(x.birth_place_qid?label(x.birth_place_qid):null);
 const homes=(x.ancestral_home_qids||[]).map(label).filter(Boolean).slice(0,3);
 const overseas=targetLabels(x,["foreign_citizenship","foreign_residence","death_abroad","employer_abroad","member_abroad","work_location_abroad","educated_abroad"]);
 const occ=(x.occupation_qids||[]).map(label).filter(Boolean).slice(0,3);
 let s=(x.canonical_name||x.qid)+"。";
 if(place)s+="出生地记录为"+place+"。";
 if(homes.length)s+="祖籍记录指向"+homes.join("、")+"。";
 if(occ.length)s+="结构化资料中的职业/身份包括"+occ.join("、")+"。";
 if(overseas.length)s+="与"+overseas.join("、")+"等海外地区或机构存在可核查关联。";
 if(x.scope_status==="needs_diaspora_verification")s+="目前主要依据海外教育等辅助信号召回，华侨属性仍需二次核验。";
 return s;
}
const persons=[],events=[],placeMap=new Map(),placeRels=[],orgRels=[],familyRels=[],sources=[];
for(const x of rows){
 const pid=personId(x.qid);
 const family=[];
 for(const [kind,key] of [["father","father_qids"],["mother","mother_qids"],["spouse","spouse_qids"],["child","child_qids"]]){
  for(const q of x[key]||[]){
   const rel={relation_id:"rel_family_"+h(pid+"|"+kind+"|"+q),subject_id:pid,relation_type:kind,object_qid:q,object_person_id:qidSet.has(q)?personId(q):null,object_label:label(q),source_ids:[sourceId(x.qid)],review_status:"candidate"};
   family.push(rel);familyRels.push(rel);
  }
 }
 const occ=(x.occupation_qids||[]).map(q=>({qid:q,label:label(q)}));
 const p={
  id:pid,wikidata_qid:x.qid,type:"person",canonical_name:x.canonical_name,traditional_name:x.traditional_name,english_name:x.english_name,aliases:x.aliases||[],
  birth:{raw:x.birth_date,normalized:normDate(x.birth_date),place_id:x.birth_place_qid?"place_wd_"+x.birth_place_qid:null,place_label:x.birth_place_label||(x.birth_place_qid?label(x.birth_place_qid):null)},
  death:{raw:x.death_date,normalized:normDate(x.death_date)},
  ancestral_home_qids:x.ancestral_home_qids||[],
  province_scope:x.province_scope,occupations:occ,description_zh:x.description_zh,description_en:x.description_en,
  wikipedia_zh:x.wikipedia_zh,wikipedia_en:x.wikipedia_en,diaspora_signals:x.diaspora_signals,diaspora_signal_score:x.diaspora_signal_score,scope_status:x.scope_status,
  short_summary:shortSummary(x),family_relations:family.map(r=>r.relation_id),
  image_candidate:x.image_file_name?{commons_file_name:x.image_file_name,status:"candidate_requires_license_no_watermark_no_edit_check"}:null,
  source_ids:[sourceId(x.qid)],review_status:"candidate_enriched",publication_status:"not_published"
 };
 persons.push(p);
 sources.push({source_id:sourceId(x.qid),object_id:pid,source_name:"Wikidata",source_url:x.source_url,license:"CC0",wikipedia_zh:x.wikipedia_zh,wikipedia_en:x.wikipedia_en,review_status:"source_seed"});
 if(x.birth_place_qid){
  const q=x.birth_place_qid,id="place_wd_"+q,birthLabel=x.birth_place_label||label(q);
  if(!placeMap.has(q))placeMap.set(q,{id,wikidata_qid:q,canonical_name:birthLabel||q,roles:new Set(),person_ids:new Set(),source_ids:new Set(),review_status:"candidate_authority"});
  const pl=placeMap.get(q);pl.roles.add("birth_place");pl.person_ids.add(pid);pl.source_ids.add(sourceId(x.qid));
  placeRels.push({relation_id:"rel_place_"+h(pid+"|born_at|"+q),subject_id:pid,relation_type:"born_at",object_id:id,source_ids:[sourceId(x.qid)],review_status:"candidate"});
 }
 for(const q of x.ancestral_home_qids||[]){
  const id="place_wd_"+q,homeLabel=label(q);
  if(!placeMap.has(q))placeMap.set(q,{id,wikidata_qid:q,canonical_name:homeLabel||q,roles:new Set(),person_ids:new Set(),source_ids:new Set(),review_status:"candidate_authority"});
  const pl=placeMap.get(q);pl.roles.add("ancestral_home");pl.person_ids.add(pid);pl.source_ids.add(sourceId(x.qid));
  placeRels.push({relation_id:"rel_place_"+h(pid+"|ancestral_home|"+q),subject_id:pid,relation_type:"ancestral_home",object_id:id,source_ids:[sourceId(x.qid)],review_status:"candidate"});
 }
 for(const t of x.signal_targets||[]){
  if(["foreign_residence","death_abroad","work_location_abroad"].includes(t.signal) && t.qid){
   const id="place_wd_"+t.qid;
   if(!placeMap.has(t.qid))placeMap.set(t.qid,{id,wikidata_qid:t.qid,canonical_name:t.label||t.qid,roles:new Set(),person_ids:new Set(),source_ids:new Set(),review_status:"candidate_authority"});
   const pl=placeMap.get(t.qid);pl.roles.add(t.signal);pl.person_ids.add(pid);pl.source_ids.add(sourceId(x.qid));
   const relType=t.signal==="foreign_residence"?"resided_at":t.signal==="death_abroad"?"died_at":"worked_at_place";
   placeRels.push({relation_id:"rel_place_"+h(pid+"|"+relType+"|"+t.qid),subject_id:pid,relation_type:relType,object_id:id,source_ids:[sourceId(x.qid)],review_status:"candidate"});
  }
  if(["educated_abroad","employer_abroad","member_abroad"].includes(t.signal) && t.qid){
   const relType=t.signal==="educated_abroad"?"educated_at":t.signal==="employer_abroad"?"employed_by":"member_of";
   orgRels.push({relation_id:"rel_org_"+h(pid+"|"+relType+"|"+t.qid),subject_id:pid,relation_type:relType,object_qid:t.qid,object_label:t.label||t.qid,country_qid:t.country_qid,country_label:t.country_label,source_ids:[sourceId(x.qid)],review_status:"candidate"});
  }
 }
 if(x.birth_date){
  events.push({id:"event_birth_"+x.qid,event_type:"birth",title:(x.canonical_name||x.qid)+"出生",date_raw:x.birth_date,date_normalized:normDate(x.birth_date),person_ids:[pid],place_ids:x.birth_place_qid?["place_wd_"+x.birth_place_qid]:[],source_ids:[sourceId(x.qid)],review_status:"candidate"});
 }
 if(x.death_date){
  const deathTarget=(x.signal_targets||[]).find(t=>t.signal==="death_abroad");
  events.push({id:"event_death_"+x.qid,event_type:"death",title:(x.canonical_name||x.qid)+"去世",date_raw:x.death_date,date_normalized:normDate(x.death_date),person_ids:[pid],place_ids:deathTarget?.qid?["place_wd_"+deathTarget.qid]:[],source_ids:[sourceId(x.qid)],review_status:"candidate"});
 }
}
const places=[...placeMap.values()].map(x=>({...x,roles:[...x.roles],person_ids:[...x.person_ids],source_ids:[...x.source_ids],linked_person_count:x.person_ids.size}));
const uniq=(arr,key)=>[...new Map(arr.map(x=>[x[key],x])).values()];
const write=(name,arr)=>fs.writeFileSync(path.join(OUT,name),arr.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
write("persons_1000_candidate.jsonl",persons);
write("events_birth_death_candidate.jsonl",uniq(events,"id"));
write("places_candidate.jsonl",places);
write("person_place_relations_candidate.jsonl",uniq(placeRels,"relation_id"));
write("person_org_relations_candidate.jsonl",uniq(orgRels,"relation_id"));
write("family_relations_candidate.jsonl",uniq(familyRels,"relation_id"));
write("person_source_seed.jsonl",sources);
const summary={persons:persons.length,events:uniq(events,"id").length,places:places.length,person_place_relations:uniq(placeRels,"relation_id").length,person_org_relations:uniq(orgRels,"relation_id").length,family_relations:uniq(familyRels,"relation_id").length,family_relations_internal:familyRels.filter(x=>x.object_person_id).length,sources:sources.length,persons_with_image_candidate:persons.filter(x=>x.image_candidate).length};
fs.writeFileSync(path.join(OUT,"R02_entity_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
