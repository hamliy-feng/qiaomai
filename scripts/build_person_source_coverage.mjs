import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const R=path.join(ROOT,"data","collection","R02");
function jl(p){return fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse):[]}
const people=jl(path.join(R,"person_candidates_1000_scope_audited.jsonl"));
const refs=jl(path.join(R,"person_wikidata_claim_references.jsonl"));
const refMap=new Map(refs.map(x=>[x.qid,x]));
const badHosts=["facebook.com","researchgate.net","twitter.com","x.com","linkedin.com","instagram.com","weibo.com"];
function qualityDomain(d){
 if(!d)return "unknown";
 const x=d.toLowerCase();
 if(badHosts.some(h=>x===h||x.endsWith("."+h)))return "weak";
 if(/\.gov(\.|$)/.test(x)||x.endsWith(".gov")||x.includes("archives.gov")||x.includes("gov.cn"))return "A";
 if(/\.edu(\.|$)/.test(x)||x.endsWith(".edu")||x.includes("ac.uk")||x.includes("edu.cn")||x.includes("nus.edu.sg")||x.includes("yale.edu")||x.includes("harvard.edu"))return "A";
 if(["royalsociety.org","nasonline.org","amacad.org","britannica.com","orcid.org","pub.orcid.org"].some(h=>x===h||x.endsWith("."+h)))return "A/B";
 if(x.endsWith(".org"))return "B";
 return "C";
}
const out=people.map(p=>{
 const r=refMap.get(p.qid)||{};
 const domains=[...new Set(r.reference_domains||[])];
 const strong=domains.filter(d=>["A","A/B"].includes(qualityDomain(d)));
 const medium=domains.filter(d=>qualityDomain(d)==="B");
 const weak=domains.filter(d=>qualityDomain(d)==="weak");
 const hasWiki=!!(p.wikipedia_zh||p.wikipedia_en);
 let source_readiness="needs_more_sources";
 if(strong.length>=2 || (strong.length>=1 && (domains.length>=2||hasWiki))) source_readiness="priority_review_ready";
 else if(strong.length>=1 || medium.length>=2 || (domains.length>=1&&hasWiki)) source_readiness="basic_source_ready";
 else if(hasWiki) source_readiness="wiki_only_plus_wikidata";
 if(["manual_review"].includes(p.scope_audit_status)) source_readiness="scope_manual_review";
 return {
  qid:p.qid,canonical_name:p.canonical_name,province_scope:p.province_scope,scope_audit_status:p.scope_audit_status,
  wikidata_url:p.source_url,wikipedia_zh:p.wikipedia_zh||null,wikipedia_en:p.wikipedia_en||null,
  external_reference_count:r.reference_count||0,external_reference_url_count:r.reference_url_count||0,
  reference_domains:domains,strong_reference_domains:strong,medium_reference_domains:medium,weak_reference_domains:weak,
  source_readiness,review_status:"source_coverage_audited"
 };
});
fs.writeFileSync(path.join(R,"person_source_coverage.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const counts={};for(const x of out)counts[x.source_readiness]=(counts[x.source_readiness]||0)+1;
const summary={total:out.length,reference_rows_available:refs.length,counts,priority_review_ready:out.filter(x=>x.source_readiness==="priority_review_ready").length,basic_source_ready:out.filter(x=>x.source_readiness==="basic_source_ready").length,wiki_only_plus_wikidata:out.filter(x=>x.source_readiness==="wiki_only_plus_wikidata").length,needs_more_sources:out.filter(x=>x.source_readiness==="needs_more_sources").length};
fs.writeFileSync(path.join(R,"person_source_coverage_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
