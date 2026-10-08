import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DIR=path.join(ROOT,"data","collection","R02");
const input=path.join(DIR,"person_candidates_1000.jsonl");
const rows=fs.readFileSync(input,"utf8").split(String.fromCharCode(10)).map(x=>x.replace(String.fromCharCode(13),"")).filter(Boolean).map(JSON.parse);
const UA="QiaomaiAcademicProject/1.0 (non-commercial coursework; Wikidata API)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function vals(claims,p,limit=20){
  const a=claims?.[p]||[];
  const out=[];
  for(const c of a){
    const v=c?.mainsnak?.datavalue?.value;
    if(v&&typeof v==="object"&&v.id) out.push(v.id);
    if(out.length>=limit) break;
  }
  return [...new Set(out)];
}
function strClaim(claims,p){
  const a=claims?.[p]||[];
  for(const c of a){
    const v=c?.mainsnak?.datavalue?.value;
    if(typeof v==="string") return v;
  }
  return null;
}
function label(e,lang){return e?.labels?.[lang]?.value||null}
function aliases(e,lang){return (e?.aliases?.[lang]||[]).map(x=>x.value)}
function sitelink(e,key){
  const t=e?.sitelinks?.[key]?.title;
  if(!t)return null;
  const host=key==="zhwiki"?"zh.wikipedia.org":"en.wikipedia.org";
  return "https://"+host+"/wiki/"+encodeURIComponent(t.replaceAll(" ","_"));
}

const enriched=[];
for(let i=0;i<rows.length;i+=50){
  const batch=rows.slice(i,i+50);
  const ids=batch.map(x=>x.qid).join("|");
  const url="https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids="+encodeURIComponent(ids)+"&props=labels|aliases|descriptions|sitelinks|claims&languages=zh|zh-hant|zh-cn|en&languagefallback=1&origin=*";
  let j=null,last=null;
  for(let k=0;k<3;k++){
    try{
      const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/json"}});
      if(!r.ok)throw new Error("HTTP "+r.status);
      j=await r.json();break;
    }catch(e){last=e;await sleep(1500*(k+1));}
  }
  if(!j)throw last;
  for(const x of batch){
    const e=j.entities?.[x.qid]||{};
    const cn=label(e,"zh-cn")||label(e,"zh")||x.canonical_name;
    const hant=label(e,"zh-hant");
    const en=label(e,"en");
    const als=[...aliases(e,"zh"),...aliases(e,"zh-hant"),...aliases(e,"en")].filter(Boolean);
    const uniqueAliases=[...new Set(als)].filter(a=>a!==cn&&a!==hant&&a!==en).slice(0,20);
    enriched.push({
      ...x,
      canonical_name:cn||x.canonical_name,
      traditional_name:hant||null,
      english_name:en||null,
      aliases:uniqueAliases,
      description_zh:e?.descriptions?.zh?.value||e?.descriptions?.["zh-cn"]?.value||null,
      description_en:e?.descriptions?.en?.value||null,
      wikipedia_zh:sitelink(e,"zhwiki"),
      wikipedia_en:sitelink(e,"enwiki"),
      gender_qids:vals(e.claims,"P21",2),
      occupation_qids:vals(e.claims,"P106",8),
      citizenship_qids:vals(e.claims,"P27",8),
      father_qids:vals(e.claims,"P22",3),
      mother_qids:vals(e.claims,"P25",3),
      spouse_qids:vals(e.claims,"P26",8),
      child_qids:vals(e.claims,"P40",12),
      educated_at_qids:vals(e.claims,"P69",12),
      employer_qids:vals(e.claims,"P108",12),
      member_of_qids:vals(e.claims,"P463",12),
      image_file_name:strClaim(e.claims,"P18"),
      image_review_status:strClaim(e.claims,"P18")?"candidate_requires_license_and_visual_cleanliness_check":"none",
      data_enrichment_source:"Wikidata wbgetentities",
      data_enriched_at:"2026-10-08"
    });
  }
  console.log("batch",i+batch.length,"/",rows.length);
  await sleep(400);
}
const out=path.join(DIR,"person_candidates_1000_enriched.jsonl");
fs.writeFileSync(out,enriched.map(x=>JSON.stringify(x)).join(String.fromCharCode(10))+String.fromCharCode(10),"utf8");
const summary={
  count:enriched.length,
  with_traditional_name:enriched.filter(x=>x.traditional_name).length,
  with_english_name:enriched.filter(x=>x.english_name).length,
  with_aliases:enriched.filter(x=>x.aliases?.length).length,
  with_description_zh:enriched.filter(x=>x.description_zh).length,
  with_wikipedia_zh:enriched.filter(x=>x.wikipedia_zh).length,
  with_wikipedia_en:enriched.filter(x=>x.wikipedia_en).length,
  with_occupation:enriched.filter(x=>x.occupation_qids?.length).length,
  with_family_candidate:enriched.filter(x=>(x.father_qids?.length||0)+(x.mother_qids?.length||0)+(x.spouse_qids?.length||0)+(x.child_qids?.length||0)>0).length,
  with_image_candidate:enriched.filter(x=>x.image_file_name).length
};
fs.writeFileSync(path.join(DIR,"person_candidates_1000_enriched_summary.json"),JSON.stringify(summary,null,2),"utf8");
console.log(JSON.stringify(summary,null,2));
