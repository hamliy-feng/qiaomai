import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
const C=path.join(ROOT,"data","canonical","R02");
const P=path.join(ROOT,"data","presentation","R02");
function j(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function jl(p){return fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse):[]}
const pScope=j(path.join(R,"person_scope_audit_summary.json"));
const pCards=j(path.join(P,"persons_1000_basic_cards_summary.json"));
const pRefs=j(path.join(R,"person_wikidata_claim_references_summary.json"));
const pCov=j(path.join(R,"person_source_coverage_summary.json"));
const org=j(path.join(C,"organizations_merged_v5_summary.json"));
const ev=j(path.join(C,"events_quality_summary.json"));
const act=j(path.join(C,"events_activity_candidate_summary.json"));
const pl=j(path.join(C,"places_quality_summary.json"));
const fam=j(path.join(C,"families_generated_summary.json"));
const media=j(path.join(R,"qiaopi_media_gate_summary.json"));
const errs=[],warn=[];
if(pCards.total!==1000)errs.push("persons basic cards != 1000");
if(pScope.keep_high+pScope.keep_medium+pScope.manual_review+pScope.likely_out_of_scope!==1000)errs.push("person scope counts mismatch");
if(org.front_end_basic_ready<53)errs.push("organization basic-ready <53");
if(ev.front_end_candidate<231)errs.push("dated event front-end candidates <231");
if(pl.map_ready<50)errs.push("map-ready places <50");
if(fam.priority_family_review<10)errs.push("priority family review <10");
if(media.publishable_clean_original!==0) {
  const pub=jl(path.join(R,"qiaopi_media_publishable.jsonl"));
  for(const x of pub){
    if(x.watermark_status!=="none"||x.alteration_status!=="none"||x.crop_status!=="full_page"||x.rights_status!=="allowed") errs.push("unsafe qiaopi media "+x.media_id);
  }
}
if(media.publishable_clean_original===0)warn.push("No qiaopi clean_original media passes the hard gate; production frontend must show metadata/text or empty media state.");
if(pCov.priority_review_ready+pCov.basic_source_ready<100)warn.push("person multi-source-ready pool still low");
const report={
 generated_at:new Date().toISOString(),
 people:{
  total:1000,
  basic_ready_candidate:pCards.basic_ready_candidate,
  manual_review:pCards.manual_review,
  source_reference_rows:pRefs.count,
  with_any_wikidata_reference:pRefs.with_any_reference,
  with_direct_reference_url:pRefs.with_reference_url,
  with_2plus_reference_domains:pRefs.with_2plus_ref_domains,
  with_3plus_reference_domains:pRefs.with_3plus_ref_domains,
  priority_review_ready:pCov.priority_review_ready,
  basic_source_ready:pCov.basic_source_ready,
  wiki_only_plus_wikidata:pCov.wiki_only_plus_wikidata,
  needs_more_sources:pCov.needs_more_sources,
  scope_manual_review:pCov.counts.scope_manual_review
 },
 organizations:org,
 events:{
  dated_or_birth_death_total:ev.total,
  dated_front_end_candidate:ev.front_end_candidate,
  dated_manual_review:ev.manual_review,
  relation_activity_candidates:act.count,
  relation_activity_by_type:act.by_type,
  relation_activity_timeline_eligible:act.timeline_eligible,
  total_research_event_records:ev.total+act.count
 },
 places:pl,
 families:{
  families_with_2plus_relations:fam.families_with_2plus_relations,
  priority_family_review:fam.priority_family_review,
  basic_family_candidate:fam.basic_family_candidate
 },
 qiaopi_media:media,
 errors:errs,warnings:warn,
 structural_quality_passed:errs.length===0,
 production_release_ready:false,
 production_blockers:[
  "1000人物已结构化，但仅174人达到 priority/basic source-ready；其余仍需补独立来源或人工审查。",
  "家族89个为候选关系组，尚未逐户完成第二来源确认。",
  "侨批 clean_original 正式媒体仍为0；禁止去水印、裁切规避或P图。",
  "3000份侨批规范化全文尚未完成。"
 ]
};
fs.writeFileSync(path.join(R,"R02_EXTENDED_QUALITY_VALIDATION.json"),JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify(report,null,2));
