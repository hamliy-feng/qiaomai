import fs from "fs";import path from "path";import {fileURLToPath} from "url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const D=path.join(ROOT,"data","collection","R02");
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; Wikidata CC0)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const jl=p=>fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const audited=jl(path.join(D,"person_candidates_1000_scope_audited.jsonl"));
const keep=audited.filter(x=>x.scope_audit_status!=="likely_out_of_scope");
const historical=jl(path.join(D,"person_ancestral_modern_raw.jsonl"));
const young=jl(path.join(D,"person_ancestral_modern_young_raw.jsonl"));
const youngPreferred=young.filter(x=>!(x.citizenships||[]).some(c=>c.qid==="Q1054923")).slice(0,6);
const selected=[...historical,...youngPreferred].slice(0,65);
if(selected.length!==65) throw new Error("replacement selection not 65: "+selected.length);
const ids=selected.map(x=>x.qid);
const out=[];
function vals(claims,p,limit=20){const arr=claims?.[p]||[],r=[];for(const c of arr){const v=c?.mainsnak?.datavalue?.value;if(v&&typeof v==="object"&&v.id)r.push(v.id);if(r.length>=limit)break;}return [...new Set(r)]}
function strClaim(claims,p){for(const c of claims?.[p]||[]){const v=c?.mainsnak?.datavalue?.value;if(typeof v==="string")return v}return null}
function timeClaim(claims,p){for(const c of claims?.[p]||[]){const v=c?.mainsnak?.datavalue?.value;if(v&&typeof v==="object"&&v.time)return v.time.replace(/^\+/,"")}return null}
function label(e,lang){return e?.labels?.[lang]?.value||null}
function aliases(e,lang){return (e?.aliases?.[lang]||[]).map(x=>x.value)}
function sitelink(e,key){const t=e?.sitelinks?.[key]?.title;if(!t)return null;const host=key==="zhwiki"?"zh.wikipedia.org":"en.wikipedia.org";return "https://"+host+"/wiki/"+encodeURIComponent(t.replaceAll(" ","_"))}
for(let i=0;i<selected.length;i+=25){
 const batch=selected.slice(i,i+25), qids=batch.map(x=>x.qid).join("|");
 const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids="+encodeURIComponent(qids)+"&props=labels|aliases|descriptions|sitelinks|claims&languages=zh|zh-hant|zh-cn|en&languagefallback=1&origin=*";
 let j=null,last=null;
 for(let a=0;a<7;a++){
  try{
   const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/json"}});
   if(r.status===429){const retry=Number(r.headers.get("retry-after")||5);await sleep(Math.max(5000,retry*1000)*(a+1));continue;}
   if(!r.ok)throw new Error("HTTP "+r.status);
   j=await r.json();break;
  }catch(e){last=e;await sleep(2500*(a+1));}
 }
 if(!j)throw last||new Error("Wikidata enrichment failed");
 for(const x of batch){
  const e=j.entities?.[x.qid]||{}, claims=e.claims||{};
  const cn=label(e,"zh-cn")||label(e,"zh")||x.canonical_name;
  const hant=label(e,"zh-hant")||null,en=label(e,"en")||null;
  const als=[...aliases(e,"zh"),...aliases(e,"zh-hant"),...aliases(e,"en")].filter(Boolean);
  const unique=[...new Set(als)].filter(a=>a!==cn&&a!==hant&&a!==en).slice(0,20);
  const bp=vals(claims,"P19",2)[0]||null;
  const ah=vals(claims,"P66",4);
  out.push({
   ...x,canonical_name:cn,traditional_name:hant,english_name:en,aliases:unique,
   description_zh:e?.descriptions?.zh?.value||e?.descriptions?.["zh-cn"]?.value||null,
   description_en:e?.descriptions?.en?.value||null,
   wikipedia_zh:sitelink(e,"zhwiki"),wikipedia_en:sitelink(e,"enwiki"),
   birth_date:timeClaim(claims,"P569")||x.birth_date||null,death_date:timeClaim(claims,"P570")||null,
   birth_place_qid:bp,birth_place_label:null,
   ancestral_home_qids:ah.length?ah:[x.ancestral_home_qid].filter(Boolean),
   gender_qids:vals(claims,"P21",2),occupation_qids:vals(claims,"P106",8),
   citizenship_qids:vals(claims,"P27",8),father_qids:vals(claims,"P22",3),mother_qids:vals(claims,"P25",3),
   spouse_qids:vals(claims,"P26",8),child_qids:vals(claims,"P40",12),educated_at_qids:vals(claims,"P69",12),
   employer_qids:vals(claims,"P108",12),member_of_qids:vals(claims,"P463",12),
   image_file_name:strClaim(claims,"P18"),
   image_review_status:strClaim(claims,"P18")?"candidate_requires_license_and_visual_cleanliness_check":"none",
   replacement_reason:"replaced_likely_out_of_scope_with_ancestral_home_overseas_candidate",
   scope_audit_status:"keep_high",
   scope_audit_reasons:["ancestral_home_guangdong_or_fujian_plus_foreign_citizenship"],
   data_enrichment_source:"Wikidata wbgetentities",data_enriched_at:"2026-10-08",
   review_status:"candidate"
  });
 }
 fs.writeFileSync(path.join(D,"person_ancestral_replacements65_enriched_checkpoint.jsonl"),out.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
 console.log("enriched",out.length,"/",selected.length);
 await sleep(1200);
}
const final=[...keep,...out];
if(final.length!==1000)throw new Error("final pool !=1000: "+final.length);
const qset=new Set(final.map(x=>x.qid)); if(qset.size!==1000)throw new Error("final qids not unique: "+qset.size);
fs.writeFileSync(path.join(D,"person_candidates_1000_cleaned_enriched.jsonl"),final.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
const summary={
 count:final.length,unique_qids:qset.size,
 original_kept:keep.length,replacements:out.length,
 scope_audit_status:Object.fromEntries(["keep_high","keep_medium","manual_review","likely_out_of_scope"].map(s=>[s,final.filter(x=>x.scope_audit_status===s).length])),
 province:{Guangdong:final.filter(x=>x.province_scope==="Guangdong").length,Fujian:final.filter(x=>x.province_scope==="Fujian").length},
 with_wikipedia_zh:final.filter(x=>x.wikipedia_zh).length,with_wikipedia_en:final.filter(x=>x.wikipedia_en).length,
 with_image_candidate:final.filter(x=>x.image_file_name).length,
 replacement_samples:out.slice(0,20).map(x=>({qid:x.qid,name:x.canonical_name,traditional:x.traditional_name,english:x.english_name,home:x.ancestral_home_label||null,birth:x.birth_date,citizenships:x.citizenships||[]}))
};
fs.writeFileSync(path.join(D,"person_candidates_1000_cleaned_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));