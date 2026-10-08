import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
const C=path.join(ROOT,"data","canonical","R02");
function j(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function jl(p){return fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse):[]}
const cleanedSummaryPath=path.join(R,"person_candidates_1000_cleaned_summary.json");
const pSum=fs.existsSync(cleanedSummaryPath)?j(cleanedSummaryPath):j(path.join(R,"person_candidates_1000_summary_fixed.json"));
const pEn=fs.existsSync(cleanedSummaryPath)?pSum:j(path.join(R,"person_candidates_1000_enriched_summary.json"));
const pScope=j(path.join(R,"person_scope_audit_summary.json"));
const orgSumPath=fs.existsSync(path.join(C,"organizations_merged_v5_summary.json"))?path.join(C,"organizations_merged_v5_summary.json"):path.join(C,"organizations_merged_v4_summary.json");
const orgSum=j(orgSumPath);
const evSum=j(path.join(C,"events_quality_summary.json"));
const plSum=j(path.join(C,"places_quality_summary.json"));
const mediaSum=j(path.join(R,"qiaopi_media_gate_summary.json"));
const orgReady=jl(path.join(ROOT,"data","presentation","R02","organizations_basic_ready.jsonl"));
const media=jl(path.join(R,"qiaopi_media_review.jsonl"));
const errors=[],warnings=[];
if(pSum.count!==1000||pSum.unique_qids!==1000)errors.push("people pool is not 1000 unique QIDs");
if(pEn.count!==1000)errors.push("people enrichment count != 1000");
if((pScope.keep_high+pScope.keep_medium+pScope.manual_review+pScope.likely_out_of_scope)!==1000)errors.push("person scope audit count mismatch");
if(orgSum.front_end_basic_ready<53)errors.push("front-end basic-ready organizations < 53");
if(orgReady.length!==orgSum.front_end_basic_ready)errors.push("organization presentation snapshot mismatch");
if(evSum.front_end_candidate<231)errors.push("front-end event candidates < 231");
if(plSum.map_ready<50)warnings.push("map-ready places unexpectedly low");
for(const m of media){
 if(m.media_state==="clean_original"){
  if(m.watermark_status!=="none")errors.push("clean_original has watermark: "+m.media_id);
  if(m.alteration_status!=="none")errors.push("clean_original has alteration: "+m.media_id);
  if(m.crop_status!=="full_page")errors.push("clean_original is not full_page: "+m.media_id);
  if(m.rights_status!=="allowed")errors.push("clean_original rights not allowed: "+m.media_id);
 }
}
if(mediaSum.publishable_clean_original===0)warnings.push("No qiaopi image currently passes clean-original publication gate; keep external links/text only.");
if(pScope.likely_out_of_scope>0)warnings.push(pScope.likely_out_of_scope+" people remain likely out-of-scope; do not publish them.");
if(pScope.manual_review>0)warnings.push(pScope.manual_review+" people remain manual-review.");
const report={
 generated_at:new Date().toISOString(),
 people:{candidate_pool:pSum.count,unique_qids:pSum.unique_qids,enriched:pEn.count,with_wikipedia_zh:pEn.with_wikipedia_zh,keep_high:pScope.keep_high,keep_medium:pScope.keep_medium,manual_review:pScope.manual_review,likely_out_of_scope:pScope.likely_out_of_scope},
 organizations:{total:orgSum.total,front_end_basic_ready:orgSum.front_end_basic_ready,reviewed:orgSum.reviewed,reviewed_basic:orgSum.reviewed_basic},
 events:{total:evSum.total,front_end_candidate:evSum.front_end_candidate,manual_review:evSum.manual_review,scope_blocked:evSum.scope_blocked},
 places:{total:plSum.count,map_ready:plSum.map_ready,text_ready_no_coordinates:plSum.text_ready_no_coordinates,needs_authority_review:plSum.needs_authority_review},
 qiaopi_media:mediaSum,
 errors,warnings,
 structural_expansion_passed:errors.length===0,
 full_release_ready:false,
 full_release_blockers:[
  "1000 people are candidates, not 1000 reviewed historical diaspora profiles.",
  "Qiaopi clean-original publishable media is currently "+mediaSum.publishable_clean_original+".",
  "Qiaopi 3000 normalized full-text target is not yet complete."
 ]
};
fs.writeFileSync(path.join(R,"R02_QUALITY_VALIDATION.json"),JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify(report,null,2));
