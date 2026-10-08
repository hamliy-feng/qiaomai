import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const C=path.join(ROOT,"data","canonical","R02");
const S=path.join(ROOT,"data","collection","R02");
const P=path.join(ROOT,"data","presentation","R02");
fs.mkdirSync(P,{recursive:true});

function readJsonl(p){
  if(!fs.existsSync(p)) return [];
  return fs.readFileSync(p,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map((x,i)=>{
    try{return JSON.parse(x)}catch(e){throw new Error(p+":"+(i+1)+" "+e.message)}
  });
}
function writeJsonl(p,rows){fs.writeFileSync(p,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8")}
function year(v){if(!v)return null;const m=String(v).match(/([+-]?\d{3,4})-/);return m?m[1].replace("+",""):String(v).slice(0,4)}
function cleanText(s,max=150){if(!s)return null;return String(s).replace(/\s+/g," ").trim().slice(0,max)}
function labelsFromQids(qids,cache,limit=4){return (qids||[]).map(q=>cache[q]?.zh||cache[q]?.zh_hant||cache[q]?.en||null).filter(Boolean).slice(0,limit)}

const persons=readJsonl(path.join(C,"persons_1000_candidate.jsonl"));
const places=readJsonl(path.join(C,"places_candidate_enriched.jsonl"));
const orgInput=fs.existsSync(path.join(C,"organizations_merged_v5.jsonl"))?"organizations_merged_v5.jsonl":fs.existsSync(path.join(C,"organizations_merged_v4.jsonl"))?"organizations_merged_v4.jsonl":"organizations_merged.jsonl";
const orgs=readJsonl(path.join(C,orgInput));
const personOrgRels=readJsonl(path.join(C,"person_org_relations_candidate.jsonl"));
const familyRels=readJsonl(path.join(C,"family_relations_candidate.jsonl"));
const sourceSeeds=readJsonl(path.join(C,"person_source_seed.jsonl"));
const enrichedInput=fs.existsSync(path.join(S,"person_candidates_1000_cleaned_enriched.jsonl"))?"person_candidates_1000_cleaned_enriched.jsonl":"person_candidates_1000_enriched.jsonl";
const enriched=readJsonl(path.join(S,enrichedInput));
const cache=JSON.parse(fs.readFileSync(path.join(S,"wikidata_related_label_cache.json"),"utf8"));
const enrichedBy=new Map(enriched.map(x=>[x.qid,x]));

const pCards=[];
for(const p of persons){
  const e=enrichedBy.get(p.wikidata_qid)||{};
  const by=p.birth?.normalized?year(p.birth.normalized):year(e.birth_date);
  const dy=p.death?.normalized?year(p.death.normalized):year(e.death_date);
  const occ=labelsFromQids(e.occupation_qids,cache,4);
  const overseas=[...new Set((e.signal_targets||[]).map(t=>t.country_label||t.label).filter(Boolean))].slice(0,4);
  const relOrgs=personOrgRels.filter(r=>r.subject_id===p.id).slice(0,6).map(r=>({relation:r.relation_type,qid:r.object_qid,label:r.object_label,country:r.country_label||null}));
  const fam=familyRels.filter(r=>r.subject_id===p.id).slice(0,8).map(r=>({relation:r.relation_type,person_id:r.object_person_id||null,qid:r.object_qid,label:r.object_label}));
  const tags=[p.province_scope==="Guangdong"?"广东":"福建",...occ.slice(0,2),...overseas.slice(0,2)].filter(Boolean).slice(0,6);
  pCards.push({
    id:p.id,
    type:"person",
    qid:p.wikidata_qid,
    title:p.canonical_name,
    traditional_name:p.traditional_name||null,
    english_name:p.english_name||null,
    aliases:p.aliases||[],
    years:[by,dy].filter(Boolean).join("–")||null,
    birth_place:p.birth?.place_label||null,
    province_scope:p.province_scope,
    occupations:occ,
    tags,
    summary:cleanText(p.description_zh||p.short_summary,160),
    diaspora_scope_status:p.scope_status,
    diaspora_signals:p.diaspora_signals,
    overseas_links:overseas,
    wikipedia_zh:p.wikipedia_zh||null,
    wikipedia_en:p.wikipedia_en||null,
    source_url:"https://www.wikidata.org/wiki/"+p.wikidata_qid,
    family_candidates:fam,
    organization_candidates:relOrgs,
    image_candidate:e.image_file_name?{
      commons_file_name:e.image_file_name,
      status:"candidate_requires_license_no_watermark_no_edit_check"
    }:null,
    review_status:"candidate_enriched",
    publication_status:"preview_only"
  });
}
writeJsonl(path.join(P,"persons_1000_preview.jsonl"),pCards);

const topPlaces=[...places].sort((a,b)=>(b.linked_person_count||0)-(a.linked_person_count||0)).filter(x=>x.coordinates).slice(0,200).map(x=>({
 id:x.id,type:"place",qid:x.wikidata_qid,title:x.canonical_name,traditional_name:x.traditional_name||null,english_name:x.english_name||null,
 aliases:x.aliases||[],coordinates:x.coordinates,country_qids:x.country_qids||[],admin_parent_qids:x.admin_parent_qids||[],linked_person_count:x.linked_person_count||0,
 roles:x.roles||[],description:cleanText(x.description_zh,140),source_url:x.source_url,
 image_candidate:x.image_file_name?{commons_file_name:x.image_file_name,status:"candidate_requires_license_no_watermark_no_edit_check"}:null,
 review_status:"candidate_authority",publication_status:"preview_only"
}));
writeJsonl(path.join(P,"places_top200_preview.jsonl"),topPlaces);

const orgCards=orgs.map(o=>({
 id:o.id,type:"org",title:o.canonical_name,english_name:o.english_name||null,aliases:o.aliases||[],org_type:o.org_type||null,founded_date:o.founded_date||null,
 headquarters_place_id:o.headquarters_place_id||null,scope_relation:o.scope_relation||o.locality_group||null,
 address:o.sfcca_directory?.address||null,members_raw:o.sfcca_directory?.members_raw||null,website:o.sfcca_directory?.website||null,
 source_ids:o.source_ids||[],summary:cleanText(o.short_summary,150),
 image_candidate:o.sfcca_directory?.image_url?{url:o.sfcca_directory.image_url,status:"candidate_requires_license_no_watermark_no_edit_check"}:null,
 review_status:o.review_status,publication_status:o.review_status==="reviewed"?"eligible_after_media_check":"preview_only"
}));
writeJsonl(path.join(P,"organizations_preview.jsonl"),orgCards);

const summary={
 persons_preview:pCards.length,
 persons_with_summary:pCards.filter(x=>x.summary).length,
 persons_with_occupations:pCards.filter(x=>x.occupations?.length).length,
 persons_with_overseas_links:pCards.filter(x=>x.overseas_links?.length).length,
 persons_with_family_candidates:pCards.filter(x=>x.family_candidates?.length).length,
 persons_with_org_candidates:pCards.filter(x=>x.organization_candidates?.length).length,
 persons_with_image_candidate:pCards.filter(x=>x.image_candidate).length,
 places_preview:topPlaces.length,
 places_preview_with_coordinates:topPlaces.filter(x=>x.coordinates).length,
 organizations_preview:orgCards.length,
 organizations_reviewed:orgCards.filter(x=>x.review_status==="reviewed").length
};
fs.writeFileSync(path.join(P,"R02_presentation_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
